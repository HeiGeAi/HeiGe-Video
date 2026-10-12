#!/usr/bin/env python3
"""Verify current and historical continuous hashes and declared checks.

This portable inventory does not rerender, decode, play or listen. A declaration
is not a trusted measurement certificate, even when its media hashes agree.
Only this project's local Node modules are used; no upstream code is executed.
"""
import datetime
import argparse
import array
import hashlib
import json
import math
from pathlib import Path
import re
import subprocess
import sys
import wave

from validate_super_release import git, historical_engine


ROOT = Path(__file__).resolve().parents[1]
RATIOS = {'16:9': (1280, 720), '9:16': (720, 1280), '1:1': (1080, 1080)}
SHA256 = re.compile(r'[0-9a-f]{64}')
ID = re.compile(r'[A-Za-z0-9][A-Za-z0-9_.-]{0,63}')
CURRENT_INVENTORY = 'references/v4-forge-status.json'
HISTORICAL_INVENTORY = 'references/v4-continuity-status.json'


def reject(message):
    raise ValueError(message)


def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def local(relative, root):
    """Resolve existing regular files without traversal, URLs or symlink hops."""
    if not isinstance(relative, str) or not relative or relative != relative.strip():
        reject('Invalid local inventory path')
    if (Path(relative).is_absolute() or re.match(r'[A-Za-z][A-Za-z0-9+.-]*:', relative)
            or '\\' in relative or any(ord(char) < 32 for char in relative)
            or any(char in relative for char in '?#')):
        reject('Unsafe inventory path: ' + relative)
    parts = relative.split('/')
    if any(part in ('', '.', '..') for part in parts):
        reject('Unsafe inventory path: ' + relative)
    cursor = root.resolve()
    for part in parts:
        cursor = cursor / part
        if cursor.is_symlink():
            reject('Symlink inventory path: ' + relative)
    if not cursor.is_file() or not cursor.resolve().is_relative_to(root.resolve()):
        reject('Missing or escaping inventory file: ' + relative)
    return cursor


def _unique_pairs(pairs):
    value = {}
    for key, child in pairs:
        if key in value:
            reject('Duplicate JSON key: ' + key)
        value[key] = child
    return value


def read_json(file):
    try:
        return json.loads(file.read_text(encoding='utf-8-sig'),
                          object_pairs_hook=_unique_pairs,
                          parse_constant=lambda constant: reject('Non-finite JSON constant: ' + constant))
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        reject('Cannot read JSON ' + file.name + ': ' + str(error))


def fields(value, required, at, optional=()):
    if not isinstance(value, dict):
        reject(at + ' must be an object')
    missing = set(required) - value.keys()
    unknown = value.keys() - set(required) - set(optional)
    if missing or unknown:
        reject(at + ' missing/unknown fields: ' + repr(sorted(missing)) + '/' + repr(sorted(unknown)))
    return value


def text(value, at):
    if not isinstance(value, str) or not value.strip():
        reject(at + ' must be nonempty text')


def hash_at(value, at):
    if not isinstance(value, str) or not SHA256.fullmatch(value):
        reject(at + ' must be a lowercase SHA256')


def integer(value, at, minimum=0):
    if type(value) is not int or value < minimum:
        reject(at + ' must be an integer >= ' + str(minimum))


def number(value, at, minimum=0, maximum=math.inf, positive=False):
    if (type(value) not in (int, float) or (type(value) is float and not math.isfinite(value))
            or value < minimum or value > maximum or (positive and value == 0)):
        reject(at + ' must be a finite number within range')


def node_json(script, arguments, root):
    try:
        result = subprocess.run(['node', '--input-type=module', '-e', script, *map(str, arguments)],
                                cwd=root, capture_output=True, text=True, timeout=30)
    except (OSError, subprocess.TimeoutExpired) as error:
        reject('Local Node check unavailable: ' + str(error))
    if result.returncode:
        reject('Local Node check failed: ' + result.stderr.strip())
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        reject('Local Node check returned invalid JSON')


def current_engine(root):
    module = local('studio/lib/integrity.mjs', root)
    script = ('import {engineFingerprint} from ' + json.dumps(module.as_uri())
              + ';console.log(JSON.stringify(engineFingerprint(process.argv[1])));')
    value = node_json(script, [root], root)
    hash_at(value, 'Current engine')
    return value


def compiled_plan(root, project_file):
    module = local('studio/lib/project.mjs', root)
    project = read_json(project_file)
    music = project.get('continuity', {}).get('musicScore') if isinstance(project.get('continuity'), dict) else None
    score_script = 'const score=null;'
    if music is not None:
        score_module = local('studio/lib/music-score.mjs', root)
        score_script = ('const {composeMusicScore}=await import(' + json.dumps(score_module.as_uri())
                        + ');const score=plan.issues.errors.length ? null : composeMusicScore(plan);')
    script = ('import fs from "node:fs";import path from "node:path";'
              'import {compileProject} from ' + json.dumps(module.as_uri()) + ';'
              'const file=process.argv[1];const p=JSON.parse(fs.readFileSync(file,"utf8").replace(/^\\uFEFF/u,""));'
              'const plan=compileProject(p,{baseDir:path.dirname(file)});'
              + score_script +
              'console.log(JSON.stringify({errors:plan.issues.errors,width:plan.width,height:plan.height,'
              'fps:plan.fps,duration:plan.duration,frames:plan.durationInFrames,previewOnly:plan.previewOnly,'
              'musicScore:score ? {style:score.config.style,bpm:score.timeline.bpm,bars:score.timeline.bars,'
              'events:score.events.length,duration:score.duration,volume:score.config.volume,rate:score.rate,channels:score.channels} : null}));')
    plan = node_json(script, [project_file], root)
    if not isinstance(plan, dict) or plan.get('errors') != []:
        reject('Project contract failed: ' + json.dumps(plan, ensure_ascii=False))
    return plan


def validate_music_score(item, project, plan, root, at):
    authored = project['continuity'].get('musicScore')
    if authored is None:
        if 'musicScore' in item:
            reject(at + ' declares musicScore without an authored score')
        return
    score = fields(item.get('musicScore'), ['style', 'bpm', 'bars', 'events', 'wav',
                   'wavSha256', 'peak', 'rms', 'duration', 'rate', 'channels', 'volume'], at + '.musicScore')
    composed = plan.get('musicScore')
    if not isinstance(composed, dict):
        reject(at + ' authored music score was not composed')
    for key in ['bpm', 'bars', 'events', 'rate', 'channels']:
        integer(score[key], at + '.musicScore.' + key, 1)
    number(score['duration'], at + '.musicScore.duration', maximum=60, positive=True)
    number(score['volume'], at + '.musicScore.volume', maximum=1, positive=True)
    for key in ['style', 'bpm', 'bars', 'events', 'duration', 'volume', 'rate', 'channels']:
        if score[key] != composed[key]:
            reject(at + ' musicScore ' + key + ' differs from the authored score clock or configuration')
    if score['duration'] != plan['duration'] or not math.isclose(score['duration'], score['bars'] * 4 * 60 / score['bpm'], abs_tol=1e-7, rel_tol=0):
        reject(at + ' musicScore bar clock differs from the final film')
    hash_at(score['wavSha256'], at + '.musicScore.wavSha256')
    wav_file = local(score['wav'], root)
    if digest(wav_file) != score['wavSha256']:
        reject(at + ' original music WAV bytes changed')
    try:
        with wave.open(str(wav_file), 'rb') as pcm:
            if pcm.getcomptype() != 'NONE' or pcm.getsampwidth() != 2:
                reject(at + ' original music must be uncompressed 16-bit PCM')
            if pcm.getframerate() != score['rate'] or pcm.getnchannels() != score['channels']:
                reject(at + ' original music PCM header differs from the score')
            frames = pcm.getnframes()
            raw = pcm.readframes(frames)
    except (wave.Error, EOFError) as error:
        reject(at + ' cannot read original music PCM: ' + str(error))
    if len(raw) != frames * score['channels'] * 2 or frames != round(score['duration'] * score['rate']):
        reject(at + ' original music PCM frame clock is incomplete')
    samples = array.array('h', raw)
    if sys.byteorder != 'little':
        samples.byteswap()
    if not samples:
        reject(at + ' original music PCM is empty')
    peak = max(abs(sample) for sample in samples) / 32767
    rms = math.sqrt(sum((sample / 32767) ** 2 for sample in samples) / len(samples))
    number(score['peak'], at + '.musicScore.peak', maximum=1, positive=True)
    number(score['rms'], at + '.musicScore.rms', maximum=score['peak'], positive=True)
    if not math.isclose(peak, score['peak'], abs_tol=1e-7, rel_tol=0) or not math.isclose(rms, score['rms'], abs_tol=1e-7, rel_tol=0):
        reject(at + ' original music PCM peak/RMS differs from its declaration')


def validate(root=ROOT, inventory_path=CURRENT_INVENTORY):
    root = root.resolve()
    inventory = read_json(local(inventory_path, root))
    fields(inventory, ['schemaVersion', 'version', 'date', 'engine', 'examples'], 'inventory',
           ['environment', 'tests', 'notes', 'upstreamCommit', 'sourceCommit', 'userFeedback'])
    if inventory['schemaVersion'] != 'heige-continuous-release/1' or inventory['version'] not in ['4.0.0-alpha.2', '4.0.0-alpha.3']:
        reject('Unsupported continuous release schema/version')
    if inventory_path == CURRENT_INVENTORY and (inventory['version'] != '4.0.0-alpha.3' or 'sourceCommit' in inventory):
        reject('Current forge inventory must use alpha.3 and the current production engine')
    if 'userFeedback' in inventory:
        text(inventory['userFeedback'], 'inventory.userFeedback')
    try:
        if not isinstance(inventory['date'], str):
            reject('Release date must be ISO text')
        if datetime.date.fromisoformat(inventory['date']).isoformat() != inventory['date']:
            reject('Release date must use YYYY-MM-DD')
    except ValueError:
        reject('Release date must be a valid ISO date')
    source_commit = inventory.get('sourceCommit')
    if 'sourceCommit' in inventory:
        engine = historical_engine(root, source_commit)
        try:
            package = json.loads(git(root, 'show', source_commit + ':package.json').decode('utf-8-sig'),
                                 object_pairs_hook=_unique_pairs,
                                 parse_constant=lambda constant: reject('Non-finite historical package constant: ' + constant))
        except (UnicodeError, json.JSONDecodeError) as error:
            reject('Cannot read historical package version: ' + str(error))
    else:
        package = read_json(local('package.json', root))
        engine = current_engine(root)
    if not isinstance(package, dict) or package.get('version') != inventory['version']:
        reject('Package version differs from continuous release version')
    hash_at(inventory['engine'], 'inventory.engine')
    if inventory['engine'] != engine:
        reject('Continuous release engine differs from ' + ('its historical sourceCommit' if source_commit else 'current production source'))
    examples = inventory['examples']
    if not isinstance(examples, list) or len(examples) != 3:
        reject('Expected three independent continuous examples')
    seen_ids, seen_projects, seen_videos, seen_ratios = set(), set(), set(), set()
    required = ['id', 'project', 'input', 'video', 'mp4Sha256', 'status', 'technical',
                'width', 'height', 'fps', 'duration', 'frames', 'decodedFrames', 'continuity',
                'blur', 'audio', 'layout', 'playback', 'visualReview', 'audioListening']
    for index, item in enumerate(examples):
        at = 'examples[' + str(index) + ']'
        fields(item, required, at, ['musicScore'])
        if not isinstance(item['id'], str) or not ID.fullmatch(item['id']) or item['id'] in seen_ids:
            reject(at + '.id must be valid and unique')
        seen_ids.add(item['id'])
        for key, seen in [('project', seen_projects), ('video', seen_videos)]:
            text(item[key], at + '.' + key)
            if item[key] in seen:
                reject(at + '.' + key + ' must be independent')
            seen.add(item[key])
        project_file = local(item['project'], root)
        project = read_json(project_file)
        if not isinstance(project, dict) or project.get('schemaVersion') != 'heige-video/4':
            reject(at + ' has unsupported project schema')
        ratio = project.get('ratio')
        if not isinstance(ratio, str) or ratio not in RATIOS or ratio in seen_ratios:
            reject('Continuous examples must cover three independent ratios')
        seen_ratios.add(ratio)
        audio_source = project.get('audio', {})
        if not isinstance(audio_source, dict):
            reject(at + ' project audio must be an object when present')
        if project.get('draft') is True or audio_source.get('kind') == 'mock':
            reject(at + ' draft/mock cannot be a production release')
        continuity = project.get('continuity')
        if not isinstance(continuity, dict) or not isinstance(continuity.get('blur'), dict):
            reject(at + ' must declare a native continuous world and blur')
        if inventory_path == CURRENT_INVENTORY and continuity.get('musicScore') is None:
            reject(at + ' current forge release must declare original musicScore')
        if continuity['blur'].get('samples') != 3 or continuity['blur'].get('shutterAngle') != 180:
            reject(at + ' project must request three-sample 180-degree shutter')
        plan = compiled_plan(root, project_file)
        if plan['previewOnly'] is not False:
            reject(at + ' preview cannot be a production release')
        validate_music_score(item, project, plan, root, at)
        for key in ['width', 'height', 'fps', 'frames', 'decodedFrames']:
            integer(item[key], at + '.' + key, 1)
        if (item['width'], item['height']) != RATIOS[ratio] or item['fps'] not in (24, 30):
            reject(at + ' dimensions/fps disagree with its independent ratio')
        number(item['duration'], at + '.duration', maximum=60, positive=True)
        if not math.isclose(item['duration'], item['frames'] / item['fps'], abs_tol=1e-7, rel_tol=0):
            reject(at + ' duration must equal its quantized frame clock')
        for key in ['width', 'height', 'fps', 'duration', 'frames']:
            if plan[key] != item[key]:
                reject(at + ' declared ' + key + ' differs from compiled project')
        if item['decodedFrames'] != item['frames']:
            reject(at + ' must declare complete encoded frame decoding')
        if item['status'] != 'validated' or item['technical'] != 'pass':
            reject(at + ' lacks production technical pass')
        inputs = fields(item['input'], ['project', 'assets', 'subtitles', 'brief'], at + '.input')
        hash_at(inputs['project'], at + '.input.project')
        if digest(project_file) != inputs['project']:
            reject(at + ' project bytes changed')
        if not isinstance(inputs['assets'], dict):
            reject(at + '.input.assets must be an object')
        actual_assets = {asset['id']: digest(local(asset['path'], project_file.parent))
                         for asset in project.get('assets', [])}
        for key, value in inputs['assets'].items():
            hash_at(value, at + '.input.assets.' + key)
        if inputs['assets'] != actual_assets:
            reject(at + ' asset bytes or IDs changed')
        captions = audio_source.get('subtitles')
        actual_captions = digest(local(captions, project_file.parent)) if captions else None
        if inputs['subtitles'] is not None:
            hash_at(inputs['subtitles'], at + '.input.subtitles')
        if inputs['subtitles'] != actual_captions or inputs['brief'] is not None:
            reject(at + ' subtitle bytes or unsupported brief changed')
        hash_at(item['mp4Sha256'], at + '.mp4Sha256')
        if digest(local(item['video'], root)) != item['mp4Sha256']:
            reject(at + ' encoded video bytes changed')
        declared = fields(item['continuity'], ['status', 'coverage'], at + '.continuity')
        if declared['status'] != 'structural-pass':
            reject(at + ' continuity must declare structural-pass')
        coverage = fields(declared['coverage'], ['expectedFrames', 'measuredFrames', 'validFrames',
                          'complete', 'missingFrames', 'invalidFrames', 'duplicateFrames'], at + '.continuity.coverage')
        for key in ['expectedFrames', 'measuredFrames', 'validFrames']:
            integer(coverage[key], at + '.continuity.coverage.' + key, 1)
            if coverage[key] != item['frames']:
                reject(at + ' continuity frame coverage is incomplete')
        if coverage['complete'] is not True:
            reject(at + ' continuity coverage.complete must be true')
        for key in ['missingFrames', 'invalidFrames', 'duplicateFrames']:
            if not isinstance(coverage[key], list) or coverage[key]:
                reject(at + ' continuity ' + key + ' must be an empty list')
        blur = fields(item['blur'], ['samples', 'captures', 'encodedFrames'], at + '.blur')
        for key in ['samples', 'captures', 'encodedFrames']:
            integer(blur[key], at + '.blur.' + key, 1)
        if blur['samples'] != 3 or blur['captures'] != item['frames'] * 3 or blur['encodedFrames'] != item['frames']:
            reject(at + ' shutter must declare three actual captures per encoded frame')
        audio = fields(item['audio'], ['present', 'finite', 'peak', 'rms', 'duration'], at + '.audio')
        if audio['present'] is not True or audio['finite'] is not True:
            reject(at + ' requires a present finite audio track')
        number(audio['peak'], at + '.audio.peak', maximum=1, positive=True)
        number(audio['rms'], at + '.audio.rms', maximum=audio['peak'], positive=True)
        number(audio['duration'], at + '.audio.duration', maximum=61, positive=True)
        if abs(audio['duration'] - item['duration']) > 1 / item['fps'] + 1024 / 48000 + 1e-7:
            reject(at + ' audio duration disagrees with film beyond one frame plus AAC padding')
        layout = fields(item['layout'], ['errors'], at + '.layout')
        integer(layout['errors'], at + '.layout.errors')
        if layout['errors'] != 0:
            reject(at + ' layout has declared errors')
        playback = fields(item['playback'], ['status', 'mp4Sha256', 'droppedFrames'], at + '.playback')
        hash_at(playback['mp4Sha256'], at + '.playback.mp4Sha256')
        integer(playback['droppedFrames'], at + '.playback.droppedFrames')
        if playback['status'] != 'passed' or playback['mp4Sha256'] != item['mp4Sha256']:
            reject(at + ' playback must pass and bind the same MP4 bytes')
        for key in ['visualReview', 'audioListening']:
            review = fields(item[key], ['status', 'scope'], at + '.' + key)
            text(review['scope'], at + '.' + key + '.scope')
            allowed = ['sampled-pass'] if key == 'visualReview' else ['not-tested', 'passed']
            if review['status'] not in allowed:
                reject(at + '.' + key + ' has an unsupported or failed review state')
    if seen_ratios != set(RATIOS):
        reject('Continuous examples must cover all three ratios')
    observed_engine = historical_engine(root, source_commit) if source_commit else current_engine(root)
    if observed_engine != engine:
        reject('Production engine changed during inventory verification')
    return {'schemaVersion': 'heige-continuous-verification/1', 'status': 'pass',
            'continuous_examples_hash_checked': len(examples), 'engine': engine,
            'sourceMode': 'historical' if source_commit else 'current',
            **({'sourceCommit': source_commit} if source_commit else {}),
            'frames': sum(item['frames'] for item in examples),
            'seconds': sum(item['duration'] for item in examples),
            'scope': ('Historical Git source' if source_commit else 'Current engine') + '/input/media hashes and declared checks verified. Original music PCM, when present, is checked for header, sample clock, peak and RMS. No rerender, video redecoding, playback, listening or aesthetic/trust certification performed by this validator.'}


def validate_inventories(root=ROOT):
    current = validate(root, CURRENT_INVENTORY)
    historical = read_json(local(HISTORICAL_INVENTORY, root))
    if 'sourceCommit' not in historical:
        reject('Historical continuous inventory needs sourceCommit')
    old = validate(root, HISTORICAL_INVENTORY)
    return {'schemaVersion': 'heige-continuous-verification/1', 'status': 'pass',
            'current': current, 'historical': old}


def main(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument('--inventory', help='Strictly verify one repository-relative inventory path')
    args = parser.parse_args(argv)
    try:
        print(json.dumps(validate(inventory_path=args.inventory) if args.inventory else validate_inventories(), indent=2))
        return 0
    except (ValueError, OSError) as error:
        print(json.dumps({'status': 'fail', 'error': str(error)}, ensure_ascii=False), file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
