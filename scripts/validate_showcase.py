#!/usr/bin/env python3
"""Check published showcase bytes and declared scopes, without aesthetic claims."""
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
        raise ValueError('Unsafe showcase path')
    cursor = ROOT
    for part in path.parts:
        cursor = cursor / part
        if cursor.is_symlink():
            raise ValueError('Symlink showcase path')
    if not cursor.is_file():
        raise ValueError('Missing showcase file: ' + relative)
    return cursor

def validate(inventory):
    require(inventory['schemaVersion'] == 'heige-showcase/1', 'Showcase verification failed')
    extensions = {'.tsx', '.mjs', '.py', '.json', '.woff', '.woff2', '.txt'}
    expected_files = {str(p.relative_to(ROOT)) for p in (ROOT / 'showcase').rglob('*') if p.is_file() and p.suffix in extensions}
    expected_files.update(['package.json', 'package-lock.json', 'tsconfig.json', 'studio/check_media.py'])
    expected_source = {name: sha(local(name)) for name in sorted(expected_files)}
    items = inventory['items']
    require(len(items) == 6, 'Showcase verification failed')
    require({item['id'] for item in items} == {f'{theme}-{ratio}' for theme in ['citrus', 'paper', 'mineral'] for ratio in ['horizontal', 'portrait']}, 'Showcase verification failed')
    for item in items:
        require(item['technical'] == 'pass' and item['visualReview']['status'] == 'sampled-pass', 'Showcase verification failed')
        require(item['frames'] == item['decodedFrames'] == item['layoutFrames'] == 480, 'Showcase verification failed')
        require(item['layoutErrors'] == 0 and item['fps'] == 30 and (item['duration'] == 16), 'Showcase verification failed')
        expected = (720, 1280) if item['id'].endswith('portrait') else (1280, 720)
        require((item['width'], item['height']) == expected, 'Showcase verification failed')
        for kind in ['video', 'gif', 'poster']:
            require(sha(local(item[kind]['path'])) == item[kind]['sha256'], 'Showcase verification failed')
        require(item['playback']['status'] == 'passed' and item['playback']['mp4Sha256'] == item['video']['sha256'], 'Showcase verification failed')
        require(item['audioListening'] in ['not-tested', 'passed'], 'Showcase verification failed')
        require(item['source'] == expected_source, 'Incomplete or changed showcase source inventory')
        music = item['music']
        file = local(music['path'])
        require(sha(file) == music['wavSha256'], 'Showcase verification failed')
        with wave.open(str(file)) as pcm:
            require(pcm.getnchannels() == 2 and pcm.getframerate() == 48000 and (pcm.getsampwidth() == 2), 'Showcase verification failed')
            require(pcm.getnframes() == 768000, 'Showcase verification failed')
            raw = pcm.readframes(pcm.getnframes())
        require(hashlib.sha256(raw).hexdigest() == music['pcmSha256'], 'Showcase verification failed')
        values = array.array('h', raw)
        if sys.byteorder != 'little':
            values.byteswap()
        require(max((abs(x) for x in values)) > 0, 'Showcase verification failed')
        require(item['actualAudio']['present'] and item['actualAudio']['finite'] and (item['actualAudio']['rms'] > 1e-06), 'Showcase verification failed')
    return {'status': 'pass', 'films': 6, 'encodedFrames': 2880, 'seconds': 96, 'scope': 'Complete current source inventory, published media hashes, original music PCM and declared review/playback scopes. No rerender or aesthetic certification.'}

def main():
    inventory = json.loads(local('references/bright-showcase-status.json').read_text())
    print(json.dumps(validate(inventory), indent=2))
if __name__ == '__main__':
    try:
        main()
    except (AssertionError, ValueError, KeyError, OSError) as error:
        print(json.dumps({'status': 'fail', 'error': str(error)}), file=sys.stderr)
        sys.exit(1)
