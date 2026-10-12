#!/usr/bin/env python3
"""Check published portrait cases bytes and declared scopes, without aesthetic claims."""
import array
import hashlib
import json
from pathlib import Path
import sys
import wave
ROOT = Path(__file__).resolve().parents[1]

def require(condition, message):
    if not condition:
        raise ValueError(message)

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def local(relative):
    path = Path(relative)
    if path.is_absolute() or any((p in ('..', '.') for p in path.parts)) or '\\' in relative or (':' in relative):
        raise ValueError('Unsafe portrait cases path')
    cursor = ROOT
    for part in path.parts:
        cursor = cursor / part
        if cursor.is_symlink():
            raise ValueError('Symlink portrait cases path')
    if not cursor.is_file():
        raise ValueError('Missing portrait cases file: ' + relative)
    return cursor

def validate(inventory):
    require(inventory['schemaVersion'] == 'heige-portrait-cases/1', 'Portrait cases verification failed')
    extensions = {'.tsx', '.mjs', '.py', '.json', '.woff', '.woff2', '.txt'}
    expected_files = {str(p.relative_to(ROOT)) for p in (ROOT / 'portrait-cases').rglob('*') if p.is_file() and p.suffix in extensions}
    expected_files.update(['package.json', 'package-lock.json', 'tsconfig.json', 'studio/check_media.py'])
    expected_source = {name: sha(local(name)) for name in sorted(expected_files)}
    items = inventory['items']
    require(len(items) == 4, 'Portrait cases verification failed')
    require({item['id'] for item in items} == {f'{theme}-portrait' for theme in ['berry', 'coffee', 'camera', 'rocket']}, 'Portrait cases verification failed')
    for item in items:
        require(item['technical'] == 'pass' and item['visualReview']['status'] == 'sampled-pass', 'Portrait cases verification failed')
        require(item['frames'] == item['decodedFrames'] == item['layoutFrames'] == 480, 'Portrait cases verification failed')
        require(item['layoutErrors'] == 0 and item['fps'] == 30 and (item['duration'] == 16), 'Portrait cases verification failed')
        expected = (1080, 1920)
        require((item['width'], item['height']) == expected, 'Portrait cases verification failed')
        for kind in ['video', 'gif', 'poster']:
            require(sha(local(item[kind]['path'])) == item[kind]['sha256'], 'Portrait cases verification failed')
        require(item['playback']['status'] == 'passed' and item['playback']['mp4Sha256'] == item['video']['sha256'], 'Portrait cases verification failed')
        playback = item['playback']
        require(playback['playbackRate'] == 1 and playback['decodedFrames'] == playback['presentedFrames'] == 480, 'Incomplete normal-speed playback declaration')
        require(playback['droppedFrames'] == 0, 'Observed playback frame drops')
        require(item['audioListening'] in ['not-tested', 'passed'], 'Portrait cases verification failed')
        require(item['source'] == expected_source, 'Incomplete or changed portrait cases source inventory')
        music = item['music']
        file = local(music['path'])
        require(sha(file) == music['wavSha256'], 'Portrait cases verification failed')
        with wave.open(str(file)) as pcm:
            require(pcm.getnchannels() == 2 and pcm.getframerate() == 48000 and (pcm.getsampwidth() == 2), 'Portrait cases verification failed')
            require(pcm.getnframes() == 768000, 'Portrait cases verification failed')
            raw = pcm.readframes(pcm.getnframes())
        require(hashlib.sha256(raw).hexdigest() == music['pcmSha256'], 'Portrait cases verification failed')
        values = array.array('h', raw)
        if sys.byteorder != 'little':
            values.byteswap()
        for channel in range(2):
            peak = max(abs(x) for x in values[channel::2]) / 32767
            require(0 < peak <= .68, 'Original music channel is silent or exceeds its peak contract')
        audio = item['actualAudio']
        require(audio['present'] is True and audio['finite'] is True and audio['rms'] > 1e-06, 'Invalid decoded audio declaration')
        require(audio['channels'] == 2 and audio['sampleRate'] == 48000 and audio['samplesPerChannel'] == 768000, 'Incomplete full-channel audio declaration')
        require(audio['duration'] == 16 and 0 < audio['peak'] <= 1, 'Invalid audio duration or measured peak')
    return {'status': 'pass', 'films': 4, 'encodedFrames': 1920, 'seconds': 64, 'scope': 'Complete current source inventory, published media hashes, original music PCM and declared review/playback scopes. No rerender or aesthetic certification.'}

def main():
    inventory = json.loads(local('references/portrait-cases-status.json').read_text())
    print(json.dumps(validate(inventory), indent=2))
if __name__ == '__main__':
    try:
        main()
    except (AssertionError, ValueError, KeyError, OSError) as error:
        print(json.dumps({'status': 'fail', 'error': str(error)}), file=sys.stderr)
        sys.exit(1)
