#!/usr/bin/env python3
"""Check the portable v4 inventory against files; does not approve aesthetics."""
import hashlib
import json
from pathlib import Path
import re
import subprocess


ROOT = Path(__file__).resolve().parents[1]


def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def local(relative, root=ROOT):
    file = (root / relative).resolve()
    if Path(relative).is_absolute() or not file.is_relative_to(root) or not file.is_file():
        raise ValueError('Invalid inventory file: ' + relative)
    return file


def git(root, *args):
    result = subprocess.run(['git', *args], cwd=root, capture_output=True)
    if result.returncode:
        raise ValueError('Historical source commit is unavailable: ' + result.stderr.decode('utf-8', errors='replace').strip())
    return result.stdout


def historical_engine(root, commit):
    """Recompute integrity.mjs engineFingerprint from immutable Git blobs.

    Keep its fixed-file list, studio extensions, excluded directories, duplicate
    entries, UTF-16 filename ordering and compact JSON encoding exactly aligned.
    This reads source; it never checks out or executes the historical code.
    """
    if not isinstance(commit, str) or not re.fullmatch(r'[0-9a-fA-F]{40}', commit):
        raise ValueError('Release inventory needs a full sourceCommit SHA')
    actual = git(root, 'rev-parse', '--verify', commit + '^{commit}').decode().strip()
    if actual.lower() != commit.lower():
        raise ValueError('sourceCommit does not identify the exact source commit')
    tree = {}
    for entry in git(root, 'ls-tree', '-r', '-z', '--full-tree', commit).split(b'\0'):
        if not entry:
            continue
        metadata, filename = entry.split(b'\t', 1)
        mode, kind, _oid = metadata.decode('ascii').split()
        tree[filename.decode('utf-8')] = (mode, kind)
    files = ['package.json', 'package-lock.json', 'tsconfig.json', 'studio/CONTRACT.md', 'studio/requirements.txt']
    for file in files:
        if tree.get(file) not in (('100644', 'blob'), ('100755', 'blob')):
            raise ValueError('Historical production file is missing or not regular: ' + file)
    excluded = {'test', 'node_modules', '__pycache__', '.cache'}
    extensions = re.compile(r'\.(mjs|tsx|ts|css|py|json|ttf|otf|woff2?)$')
    for file, (mode, kind) in tree.items():
        parts = file.split('/')
        if parts[0] != 'studio' or excluded.intersection(parts[1:-1]):
            continue
        if kind == 'commit':
            raise ValueError('Historical studio submodules cannot be fingerprinted as local files')
        if mode in ('100644', '100755') and kind == 'blob' and extensions.search(file):
            files.append(file)
    pairs = [[file, hashlib.sha256(git(root, 'show', commit + ':' + file)).hexdigest()]
             for file in sorted(files, key=lambda name: name.encode('utf-16-be'))]
    encoded = json.dumps(pairs, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    return hashlib.sha256(encoded).hexdigest()


def validate(root=ROOT):
    root = root.resolve()
    inventory = json.loads((root / 'references/v4-example-status.json').read_text())
    if inventory.get('schemaVersion') != 'heige-v4-release/1':
        raise ValueError('Unsupported release inventory')
    engine = historical_engine(root, inventory.get('sourceCommit'))
    if engine != inventory['engine']:
        raise ValueError('Release inventory engine differs from its sourceCommit')
    examples = inventory['examples']
    if len(examples) != 5 or len({item['id'] for item in examples}) != 5:
        raise ValueError('Expected five distinct original v4 examples')
    for item in examples:
        project_file = local(item['project'], root)
        project = json.loads(project_file.read_text())
        inputs = item['input']
        if digest(project_file) != inputs['project']:
            raise ValueError('Project changed: ' + item['id'])
        actual_assets = {asset['id']: digest(local(str(project_file.parent.relative_to(root) / asset['path']), root))
                         for asset in project.get('assets', [])}
        if actual_assets != inputs['assets']:
            raise ValueError('Assets changed: ' + item['id'])
        caption = project.get('audio', {}).get('subtitles')
        caption_hash = digest(local(str(project_file.parent.relative_to(root) / caption), root)) if caption else None
        if caption_hash != inputs['subtitles'] or inputs['brief'] is not None:
            raise ValueError('Subtitle or brief changed: ' + item['id'])
        if digest(local(item['video'], root)) != item['mp4Sha256']:
            raise ValueError('Encoded video changed: ' + item['id'])
        if item['technical'] != 'pass' or item['status'] not in ('validated', 'preview'):
            raise ValueError('No completed technical record: ' + item['id'])
        if (project.get('draft') or project.get('audio', {}).get('kind') == 'mock') and item['status'] != 'preview':
            raise ValueError('Draft/mock incorrectly promoted: ' + item['id'])
        if item['decodedFrames'] != item['frames'] or item['layout']['errors'] != 0:
            raise ValueError('Incomplete technical coverage: ' + item['id'])
        if item['playback']['mp4Sha256'] != item['mp4Sha256']:
            raise ValueError('Playback record belongs to another encoding: ' + item['id'])
    return {'v4_examples_hash_checked': len(examples), 'engine': engine,
            'sourceCommit': inventory['sourceCommit'],
            'frames': sum(item['frames'] for item in examples),
            'seconds': sum(item['duration'] for item in examples),
            'scope': 'Historical Git source/input/media hashes and declared coverage; not current-engine rendering, a signed trust or aesthetic certificate'}


def main():
    print(json.dumps(validate(), indent=2))


if __name__ == '__main__':
    main()
