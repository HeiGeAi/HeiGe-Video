#!/usr/bin/env python3
"""Inspect real encoded pixels and audio. A machine report does not approve aesthetics."""
import argparse
import array
import hashlib
import json
import math
import os
from pathlib import Path
import subprocess
import sys

from PIL import Image, ImageDraw, ImageStat


def run(args):
    args[0] = os.environ.get('FFMPEG', 'ffmpeg') if args[0] == 'ffmpeg' else os.environ.get('FFPROBE', 'ffprobe') if args[0] == 'ffprobe' else args[0]
    return subprocess.run(args, check=True, capture_output=True)


def prepare_font(args):
    from fontTools.ttLib import TTFont
    font = TTFont(args.font, fontNumber=args.index)
    cmap = font.getBestCmap() or {}
    text = Path(args.text).read_text(encoding='utf-8')
    missing = sorted({char for char in text if not char.isspace() and ord(char) not in cmap})
    if missing:
        raise ValueError('Font does not cover required glyphs: ' + ''.join(missing))
    font.save(args.out)
    font.close()
    print(json.dumps({'glyph_count': len(set(text)), 'missing': missing,
                      'sha256': hashlib.sha256(Path(args.out).read_bytes()).hexdigest(),
                      'weight_scope': 'one actual face; browser may synthesize bold'}, ensure_ascii=False))


def sheet(video, samples, dest, font):
    cell_w, cell_h = 320, 220
    cols = 4
    rows = math.ceil(len(samples) / cols)
    image = Image.new('RGB', (cols * cell_w, rows * cell_h), '#efeeeb')
    draw = ImageDraw.Draw(image)
    for index, seconds in enumerate(samples):
        raw = run(['ffmpeg', '-v', 'error', '-ss', str(seconds), '-i', str(video),
                   '-frames:v', '1', '-vf', 'scale=300:180:force_original_aspect_ratio=decrease',
                   '-f', 'image2pipe', '-vcodec', 'png', '-']).stdout
        from io import BytesIO
        thumb = Image.open(BytesIO(raw)).convert('RGB')
        x, y = index % cols * cell_w, index // cols * cell_h
        image.paste(thumb, (x + (cell_w - thumb.width)//2, y + 4))
        draw.text((x+12, y+187), f'{seconds:.3f}s', fill='#141414', font=font)
    image.save(dest)


def check(args):
    from PIL import ImageFont
    plan = json.loads(Path(args.plan).read_text(encoding='utf-8'))
    video, out = Path(args.video), Path(args.out)
    probe = json.loads(run(['ffprobe', '-v', 'error', '-count_frames', '-show_streams',
                            '-show_format', '-of', 'json', str(video)]).stdout)
    stream = next(s for s in probe['streams'] if s['codec_type'] == 'video')
    from fractions import Fraction
    actual = {'width': stream['width'], 'height': stream['height'],
              'fps': float(Fraction(stream['avg_frame_rate'])),
              'frames': int(stream['nb_read_frames']),
              'duration': float(stream['duration']), 'codec': stream['codec_name']}
    errors = []
    for key, expected in [('width',plan['width']),('height',plan['height']),('fps',plan['fps']),('frames',plan['durationInFrames'])]:
        if actual[key] != expected:
            errors.append(f'{key}: expected {expected}, decoded {actual[key]}')
    if abs(actual['duration'] - plan['duration']) > 1/plan['fps']:
        errors.append('Video duration differs from authored timeline')
    # Complete encoded video, not source frames, sampled down for motion statistics.
    pixels = run(['ffmpeg','-v','error','-i',str(video),'-an','-vf','scale=96:54,format=gray',
                  '-f','rawvideo','-']).stdout
    size = 96*54
    if len(pixels) != actual['frames']*size:
        errors.append('Complete decoded pixel frame count mismatch')
    previous = None
    changes, blank_frames = [], []
    for frame in range(len(pixels)//size):
        current = pixels[frame*size:(frame+1)*size]
        mean = sum(current)/size
        variance = sum((value-mean)**2 for value in current)/size
        if variance < 0.1:
            blank_frames.append(frame)
        if previous is not None:
            changes.append(sum(abs(a-b) for a,b in zip(current,previous))/size)
        previous = current
    if blank_frames:
        errors.append(f'Uniform encoded frames: {blank_frames[:10]}')
    holds = []
    start = None
    for index, delta in enumerate(changes + [float('inf')]):
        if delta < .05 and start is None:
            start = index
        if delta >= .05 and start is not None:
            if index-start > plan['fps']*3:
                holds.append({'start':start/plan['fps'],'end':index/plan['fps']})
            start = None
    audio_streams = [s for s in probe['streams'] if s['codec_type']=='audio']
    expected_audio = bool(plan['project'].get('audio') or plan['project'].get('music') or plan['project'].get('continuity', {}).get('soundEvents'))
    if bool(audio_streams) != expected_audio:
        errors.append('Expected audio track presence mismatch')
    audio_result = {'present':bool(audio_streams),'listening':'not-tested'}
    if audio_streams:
        channels = int(audio_streams[0]['channels'])
        samples = array.array('f', run(['ffmpeg','-v','error','-i',str(video),'-vn','-ar','16000','-f','f32le','-']).stdout)
        if sys.byteorder != 'little': samples.byteswap()
        finite = all(math.isfinite(value) for value in samples)
        peak = max((abs(value) for value in samples), default=0)
        rms = math.sqrt(sum(value*value for value in samples)/max(1,len(samples)))
        audio_duration = len(samples)/(16000*channels)
        audio_result.update({'finite':finite,'peak':peak,'rms':rms,'duration':audio_duration,'channels':channels,'scope':'Every decoded channel; peak is not measured from a downmix'})
        if not finite or not samples: errors.append('Invalid or empty decoded audio')
        if rms < 1e-6: errors.append('Declared audio track is silent')
        if peak > 1.001: errors.append('Decoded audio exceeds full scale')
        if abs(audio_duration-plan['duration']) > .15: errors.append('Audio/video duration mismatch')
    times = sorted(set([0, (plan['durationInFrames']-1)/plan['fps']] +
                       [float(t) for t in range(math.ceil(plan['duration']))] +
                       [min(plan['duration']-1/plan['fps'], s['start']+(s['end']-s['start'])*.72) for s in plan['timeline']]))
    times = [t for t in times if 0 <= t < plan['duration']]
    font = ImageFont.load_default(size=16)
    # Paginate long films rather than creating an unbounded image.
    sheets = []
    for page, first in enumerate(range(0,len(times),32)):
        name = 'sheet.png' if page == 0 else f'sheet-{page+1}.png'
        sheet(video,times[first:first+32],out/name,font)
        sheets.append(name)
    strips = []
    for shot in plan['timeline']:
        if shot['type'] in ('transform','steps','bars','compare'):
            # Dense actual frames throughout the causal operation, with exact encoded seconds.
            t0,t1 = shot['start'],min(shot['end']-1/plan['fps'],shot['start']+3)
            sequence = [t0 + i*(t1-t0)/15 for i in range(16)]
            name = f'action-{shot["id"]}.png'
            sheet(video,sequence,out/name,font)
            strips.append({'shot':shot['id'],'artifact':name,'times':sequence})
    for index, boundary in enumerate(plan['project'].get('continuity', {}).get('boundaries', [])):
        shot = next(s for s in plan['timeline'] if s['id'] == boundary['toShot'])
        center = shot['from'] / plan['fps']
        t0, t1 = max(0, center - .6), min(plan['duration'] - 1 / plan['fps'], center + .6)
        sequence = [t0 + i * (t1 - t0) / 15 for i in range(16)]
        name = f'carry-{index+1}.png'
        sheet(video, sequence, out / name, font)
        strips.append({'boundary': boundary, 'artifact': name, 'times': sequence})
    report = {'status':'pass' if not errors else 'rejected','errors':errors,
              'videoSha256':hashlib.sha256(video.read_bytes()).hexdigest(), 'frameCount': actual['frames'],
              'actual':actual, 'audio':audio_result,
              'pixel_scan':{'decoded_frames':len(pixels)//size,'uniform_frames':blank_frames,'deltas':[0]+changes,
                            'long_hold_candidates':holds,'scope':'Long holds are candidates for human reading-window review, not automatic motion failures.'},
              'sampling':{'overview_times':times,'sheets':sheets,'action_strips':strips},
              'visual_review':'pending','realtime_playback':'not-tested'}
    (out/'media-check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'status':report['status'],'errors':errors,'frames':actual['frames'],'sheets':sheets}))
    return 0 if not errors else 3


def main():
    parser=argparse.ArgumentParser()
    sub=parser.add_subparsers(dest='command',required=True)
    f=sub.add_parser('font')
    f.add_argument('--font',required=True); f.add_argument('--text',required=True)
    f.add_argument('--out',required=True); f.add_argument('--index',type=int,default=0)
    c=sub.add_parser('check')
    c.add_argument('--video',required=True); c.add_argument('--plan',required=True); c.add_argument('--out',required=True)
    args=parser.parse_args()
    if args.command=='font': prepare_font(args); return 0
    return check(args)


if __name__=='__main__':
    try: sys.exit(main())
    except Exception as error:
        print(str(error),file=sys.stderr)
        sys.exit(3)
