#!/usr/bin/env python3
"""Check the portable v4 inventory against files; does not approve aesthetics."""
import hashlib
import json
from pathlib import Path
import subprocess


ROOT = Path(__file__).resolve().parents[1]


def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def local(relative):
    file = (ROOT / relative).resolve()
    if Path(relative).is_absolute() or not file.is_relative_to(ROOT) or not file.is_file():
        raise ValueError('Invalid inventory file: ' + relative)
    return file


def main():
    inventory = json.loads((ROOT / 'references/v4-example-status.json').read_text())
    if inventory.get('schemaVersion') != 'heige-v4-release/1':
        raise ValueError('Unsupported release inventory')
    command = "import {engineFingerprint} from './studio/lib/integrity.mjs';console.log(engineFingerprint(process.cwd()));"
    engine = subprocess.run(['node', '--input-type=module', '-e', command], cwd=ROOT,
                            capture_output=True, text=True, check=True).stdout.strip()
    if engine != inventory['engine']:
        raise ValueError('Release inventory belongs to a different engine')
    examples = inventory['examples']
    if len(examples) != 5 or len({item['id'] for item in examples}) != 5:
        raise ValueError('Expected five distinct original v4 examples')
    for item in examples:
        project_file = local(item['project'])
        project = json.loads(project_file.read_text())
        inputs = item['input']
        if digest(project_file) != inputs['project']:
            raise ValueError('Project changed: ' + item['id'])
        actual_assets = {asset['id']: digest(local(str(project_file.parent.relative_to(ROOT) / asset['path'])))
                         for asset in project.get('assets', [])}
        if actual_assets != inputs['assets']:
            raise ValueError('Assets changed: ' + item['id'])
        caption = project.get('audio', {}).get('subtitles')
        caption_hash = digest(local(str(project_file.parent.relative_to(ROOT) / caption))) if caption else None
        if caption_hash != inputs['subtitles'] or inputs['brief'] is not None:
            raise ValueError('Subtitle or brief changed: ' + item['id'])
        if digest(local(item['video'])) != item['mp4Sha256']:
            raise ValueError('Encoded video changed: ' + item['id'])
        if item['technical'] != 'pass' or item['status'] not in ('validated', 'preview'):
            raise ValueError('No completed technical record: ' + item['id'])
        if (project.get('draft') or project.get('audio', {}).get('kind') == 'mock') and item['status'] != 'preview':
            raise ValueError('Draft/mock incorrectly promoted: ' + item['id'])
        if item['decodedFrames'] != item['frames'] or item['layout']['errors'] != 0:
            raise ValueError('Incomplete technical coverage: ' + item['id'])
        if item['playback']['mp4Sha256'] != item['mp4Sha256']:
            raise ValueError('Playback record belongs to another encoding: ' + item['id'])
    print(json.dumps({'v4_examples_hash_checked': len(examples), 'engine': engine,
                      'frames': sum(item['frames'] for item in examples),
                      'seconds': sum(item['duration'] for item in examples),
                      'scope': 'Portable source/input/media hashes and declared coverage; not a signed trust or aesthetic certificate'}, indent=2))


if __name__ == '__main__':
    main()
