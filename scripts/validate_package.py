#!/usr/bin/env python3
"""Stdlib package/manifest checks. Does not execute draw code or approve aesthetics."""
import argparse
import json
import math
import os
import re
from pathlib import Path


# These are dependency, generated-output, interpreter-cache, and VCS folders,
# not authored package content. Prune them at any depth rather than ignoring
# all hidden folders: authored documentation under .github still needs checks.
EXCLUDED_PACKAGE_DIRS = frozenset({
    'node_modules', '.git', '.hg', '.svn',
    'build', 'dist', 'outputs', 'renders', 'coverage', 'htmlcov', '.next',
    '.cache', '__pycache__', '.pytest_cache', '.mypy_cache', '.ruff_cache',
    '.venv', 'venv', '.tox', '.nox',
})


def authored_package_files(root):
    """Walk project files without descending into installed/generated trees."""
    for directory, subdirs, filenames in os.walk(root, followlinks=False):
        subdirs[:] = sorted(name for name in subdirs if name not in EXCLUDED_PACKAGE_DIRS)
        for name in sorted(filenames):
            yield Path(directory) / name


def require(condition, message):
    if not condition:
        raise ValueError(message)


def schema_check(value, schema, where='$'):
    """Validate the exact keyword subset used by bundled shot.schema.json."""
    kind = schema.get('type')
    checks = {
        'object': lambda v: isinstance(v, dict),
        'array': lambda v: isinstance(v, list),
        'string': lambda v: isinstance(v, str),
        'number': lambda v: type(v) in (int, float) and math.isfinite(v),
        'integer': lambda v: type(v) is int,
    }
    if kind:
        require(kind in checks and checks[kind](value), where + ': expected ' + kind)
    if 'minLength' in schema:
        require(len(value) >= schema['minLength'], where + ': empty string')
    if 'minimum' in schema:
        require(value >= schema['minimum'], where + ': below minimum')
    if 'exclusiveMinimum' in schema:
        require(value > schema['exclusiveMinimum'], where + ': below exclusive minimum')
    if 'minItems' in schema:
        require(len(value) >= schema['minItems'], where + ': too few items')
    if isinstance(value, dict):
        for key in schema.get('required', []):
            require(key in value, where + ': missing ' + key)
        for key, subschema in schema.get('properties', {}).items():
            if key in value:
                schema_check(value[key], subschema, where + '.' + key)
    if isinstance(value, list) and 'items' in schema:
        for i, item in enumerate(value):
            schema_check(item, schema['items'], where + '[' + str(i) + ']')
    if 'oneOf' in schema:
        passes = 0
        for branch in schema['oneOf']:
            try:
                schema_check(value, branch, where)
                passes += 1
            except ValueError:
                pass
        require(passes == 1, where + ': exactly one allowed shape is required')
    if 'not' in schema:
        matches = True
        try:
            schema_check(value, schema['not'], where)
        except ValueError:
            matches = False
        require(not matches, where + ': forbidden shape')


def validate_manifest(data, project_dir=None):
    root = Path(__file__).resolve().parents[1]
    schema_check(data, json.loads((root / 'references/shot.schema.json').read_text()))
    ids = [o['id'] for o in data['objects']]
    require(len(ids) == len(set(ids)), 'Duplicate object IDs')
    shot_ids, intervals = [], []
    def timing(record, where):
        for field in ('time', 'start', 'end'):
            if field in record:
                value = record[field]
                require(type(value) in (int, float) and math.isfinite(value), where + ': invalid ' + field)
                require(0 <= value <= data['duration'], where + ': ' + field + ' outside film')
        effective_start=record.get('start',record.get('time'))
        if effective_start is not None and 'end' in record:
            require(effective_start < record['end'], where + ': invalid interval')
        if 'duration' in record:
            span = record['duration']
            require(type(span) in (int, float) and math.isfinite(span) and span >= 0, where + ': invalid duration')
            if effective_start is not None:
                require(effective_start + span <= data['duration'], where + ': event exceeds film')
    event_ids = []
    for event in data.get('events', []):
        timing(event, 'event')
        if 'id' in event:
            require(isinstance(event['id'], str) and event['id'], 'Invalid event ID')
            event_ids.append(event['id'])
    require(len(event_ids) == len(set(event_ids)), 'Duplicate event IDs')
    for target in data.get('qa_targets', []):
        timing(target, 'QA target')
    for shot in data['shots']:
        require(0 <= shot['start'] < shot['end'] <= data['duration'], 'Invalid shot interval: ' + shot['id'])
        require(set(shot['subjects']).issubset(ids), 'Unknown subject ID in ' + shot['id'])
        code = shot['draw_code']
        for cue in shot.get('audio', []):
            timing(cue, 'audio cue')
        if 'artifact' in code:
            path = Path(code['artifact'])
            require(not path.is_absolute() and '..' not in path.parts, 'Code artifact must stay project-relative')
            require(project_dir is not None, 'Artifact validation needs the manifest project directory')
            resolved = (project_dir / path).resolve()
            require(resolved.is_relative_to(project_dir.resolve()), 'Artifact escapes project through symlink')
            require(resolved.is_file(), 'Missing code artifact: ' + str(path))
        for window in shot.get('reading_windows', []):
            if 'start' in window or 'end' in window:
                require(type(window.get('start')) in (int, float) and type(window.get('end')) in (int, float), 'Reading window needs numeric start/end')
                require(shot['start'] <= window['start'] < window['end'] <= shot['end'], 'Reading window outside shot')
        shot_ids.append(shot['id'])
        intervals.append((shot['start'], shot['end']))
    require(len(shot_ids) == len(set(shot_ids)), 'Duplicate shot IDs')
    for gap in data.get('intentional_gaps', []):
        require(isinstance(gap, dict) and gap.get('reason'), 'Intentional gap needs a reason')
        require(type(gap.get('start')) in (int, float) and type(gap.get('end')) in (int, float), 'Gap needs numeric start/end')
        require(0 <= gap['start'] < gap['end'] <= data['duration'], 'Invalid intentional gap')
        intervals.append((gap['start'], gap['end']))
    cursor = 0
    for start, end in sorted(intervals):
        require(start <= cursor + 1e-9, 'Uncovered timeline interval; author a hold or declare intentional_gaps')
        cursor = max(cursor, end)
    require(cursor >= data['duration'] - 1e-9, 'Uncovered final timeline interval')
    return len(data['shots'])


def validate_package(root):
    skill = (root / 'SKILL.md').read_text()
    require(skill.startswith('---\n'), 'Missing frontmatter')
    front = skill.split('---', 2)[1]
    require(re.search(r'^name: heige-video$', front, re.M), 'Unexpected skill name')
    require(re.search(r'^description: .+', front, re.M), 'Missing description')
    package_files = list(authored_package_files(root))
    for path in (p for p in package_files if p.suffix == '.md'):
        text = path.read_text()
        require('/Users/' not in text, 'Nonportable private path in ' + str(path))
        for target in re.findall(r'\]\(([^)]+)\)', text):
            if '://' in target or target.startswith('#'):
                continue
            require((path.parent / target.split('#')[0]).exists(), 'Broken package link: ' + str(path) + ' -> ' + target)
    for path in (p for p in package_files if p.suffix == '.json'):
        json.loads(path.read_text())
    n = validate_manifest(json.loads((root / 'examples/open-shot.json').read_text()), root / 'examples')
    cases = json.loads((root / 'references/research-cases.json').read_text())['cases']
    require(len(cases) == 58, 'Expected supplied baseline of 58 cases')
    require(len({c['id'] for c in cases}) == 58, 'Duplicate research IDs')
    require(sum(c['audit_category'] == 'mechanism-reference' for c in cases) == 51, 'Reference count mismatch')
    require(sum(c['audit_category'] == 'control-or-negative' for c in cases) == 7, 'Control count mismatch')
    require('/Users/' not in json.dumps(cases), 'Private source path in portable ledger')
    return {'package_structure': 'pass', 'local_links': 'pass', 'json_parse': 'pass', 'example_manifest_shots': n, 'research_cases': len(cases), 'scope': 'Bundled-schema subset plus ID/path/timeline checks; no execution-safety, render, visual or audio approval'}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--manifest', type=Path)
    args = parser.parse_args()
    if args.manifest:
        print(json.dumps({'valid_structural_manifest_shots': validate_manifest(json.loads(args.manifest.read_text()), args.manifest.resolve().parent)}))
    else:
        print(json.dumps(validate_package(Path(__file__).resolve().parents[1]), indent=2))


if __name__ == '__main__':
    main()
