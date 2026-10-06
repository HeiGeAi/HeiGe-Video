#!/usr/bin/env python3
"""Stdlib package/manifest checks. Does not execute draw code or approve aesthetics."""
import argparse
import hashlib
import json
import math
import os
import re
from collections import Counter
from urllib.parse import urlparse
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


def contains_private_path(text):
    # Search text assets only; dependency/generated trees remain excluded.
    return bool(re.search(r"/(?:Users|home|workspace|root)/|[A-Za-z]:\\+Users\\+", text))


def validate_research(data):
    require(data.get('schema_version') == 'heige-video-research/3', 'Unexpected research schema')
    kind = data.get('kind')
    require(kind in ('videos', 'projects'), 'Unexpected research kind')
    records = data.get('cases' if kind == 'videos' else 'projects')
    require(isinstance(records, list) and records, 'Missing research records')
    metadata = data.get('metadata', {})
    require(type(metadata.get('record_count')) is int and metadata['record_count'] == len(records), 'Research record count mismatch')
    require(len({r['id'].casefold() for r in records}) == len(records), 'Duplicate research IDs')
    require(metadata.get('categories') == dict(Counter(r['category'] for r in records)), 'Research category counts mismatch')
    require(metadata.get('groups') == dict(Counter(r['research_group'] for r in records)), 'Research group counts mismatch')
    require(not contains_private_path(json.dumps(data)), 'Private source path in portable ledger')
    for r in records:
        for key in ('id', 'title', 'source_url', 'inspection_level'):
            require(isinstance(r.get(key), str) and r[key].strip(), 'Missing research ' + key)
        require(urlparse(r['source_url']).scheme in ('https','http') and urlparse(r['source_url']).netloc, 'Invalid public source URL')
        require(isinstance(r.get('mechanisms'), list) and r['mechanisms'] and all(isinstance(m,str) and m.strip() for m in r['mechanisms']), 'Missing concrete mechanism')
        require(isinstance(r.get('limits'), list) and r['limits'], 'Missing research limits')
        require(isinstance(r.get('tags'), list), 'Missing routing tags')
    if kind == 'videos':
        allowed = {'mechanism-reference','case-study/tutorial-reference','mixed-reference','control-or-negative'}
        require(set(metadata['categories']).issubset(allowed), 'Unknown video category')
        hashes = [r.get('source_sha256','') for r in records]
        require(all(re.fullmatch(r'[a-f0-9]{64}', h) for h in hashes), 'Invalid source media hash')
        require(len(set(hashes)) == len(records) == metadata.get('distinct_media_hashes'), 'Duplicate source media hash or count mismatch')
        urls = [r.get('media_url') for r in records]
        require(all(isinstance(u,str) and urlparse(u).scheme in ('http','https') for u in urls), 'Invalid media URL')
        require(len(set(urls)) == len(records) == metadata.get('distinct_media_urls'), 'Duplicate media URL or count mismatch')
        require(all(type(r.get('baseline_reinspected')) is bool for r in records), 'Missing baseline lineage')
        baseline=sum(r['baseline_reinspected'] for r in records)
        require(metadata.get('baseline_reinspected') == baseline and metadata.get('new_to_baseline') == len(records)-baseline, 'Research lineage count mismatch')
        for r in records:
            c=r.get('coverage',{})
            require(type(c.get('duration_seconds')) in (int,float) and math.isfinite(c['duration_seconds']) and c['duration_seconds'] > 0, 'Invalid source duration')
            overview=c.get('overview_timestamps',c.get('reviewed_timeline_timestamps_nominal_seconds',[]))
            dense=c.get('dense_timestamps',c.get('dense_sample_timestamps_seconds',[]))
            for samples in (overview,dense):
                require(isinstance(samples,list) and samples, 'Missing sampled-frame coverage')
                require(all(type(t) in (int,float) and math.isfinite(t) and 0 <= t <= c['duration_seconds'] for t in samples), 'Invalid sample timestamp')
                require(samples == sorted(samples), 'Unordered sample timestamps')
            for field in ('realtime_playback_completed','audio_listening_completed','all_source_frames_individually_viewed'):
                require(c.get(field) is False, 'Unsupported playback/listening/exhaustive review claim')
            require(isinstance(r.get('rights'),str) and r['rights'], 'Missing media rights note')
        require(metadata.get('reference_media_bundled') is False, 'Unexpected bundled media claim')
    else:
        repos=[r.get('canonical_repo','').casefold() for r in records]
        require(all(re.fullmatch(r'[^/ ]+/[^/ ]+',r) for r in repos), 'Invalid canonical repository')
        require(len(set(repos)) == len(records) == metadata.get('distinct_canonical_repositories'), 'Duplicate canonical repository or count mismatch')
        for r in records:
            require(r.get('execution_verified') is False, 'Unsupported third-party execution claim')
            require(isinstance(r.get('license'),dict) and r['license'], 'Missing project license qualification')
            require(isinstance(r.get('source_evidence'),list) and r['source_evidence'], 'Missing inspected code paths')
            for evidence in r['source_evidence']:
                require(evidence.get('path') and urlparse(evidence.get('url','')).scheme in ('https','http'), 'Invalid source inspection evidence')
        require(metadata.get('third_party_project_execution_verified') is False, 'Unsupported corpus execution claim')
    require(metadata.get('model_benchmark_performed') is False, 'Unsupported model benchmark claim')
    return len(records)

def validate_example_inventory(data, root):
    require(data.get('schema_version') == 'heige-example-status/3', 'Unexpected example status schema')
    examples=data.get('examples')
    require(isinstance(examples,list), 'Missing example inventory')
    require(len({e['id'] for e in examples}) == len(examples), 'Duplicate example IDs')
    for example in examples:
        for field in ('source','media'):
            relative=Path(example.get(field,''))
            require(str(relative) not in ('','.','..') and not relative.is_absolute() and '..' not in relative.parts, 'Example artifact must be package-relative')
            artifact=(root/relative).resolve()
            require(artifact.is_relative_to(root.resolve()) and artifact.is_file(), 'Missing or escaping example artifact')
            hasher=hashlib.sha256()
            with artifact.open('rb') as stream:
                for block in iter(lambda:stream.read(1024*1024),b''):hasher.update(block)
            digest=hasher.hexdigest()
            require(digest == example.get(field+'_sha256'), 'Example '+field+' hash mismatch: '+example['id'])
        require(isinstance(example.get('review_scope'),str) and example['review_scope'], 'Missing example review scope')
        verification=Path(example.get('verification',''))
        require(not verification.is_absolute() and '..' not in verification.parts and (root/verification).resolve().is_relative_to(root.resolve()) and (root/verification).is_file(), 'Missing or escaping example verification receipt')
    return len(examples)

def validate_package(root):
    skill = (root / 'SKILL.md').read_text()
    require(skill.startswith('---\n'), 'Missing frontmatter')
    front = skill.split('---', 2)[1]
    require(re.search(r'^name: heige-video$', front, re.M), 'Unexpected skill name')
    require(re.search(r'^description: .+', front, re.M), 'Missing description')
    package_files = list(authored_package_files(root))
    for path in (p for p in package_files if p.suffix == '.md'):
        text = path.read_text()
        require(not contains_private_path(text), 'Nonportable private path in ' + str(path))
        for target in re.findall(r'\]\(([^)]+)\)', text):
            if '://' in target or target.startswith('#'):
                continue
            require((path.parent / target.split('#')[0]).exists(), 'Broken package link: ' + str(path) + ' -> ' + target)
    for path in (p for p in package_files if p.suffix == '.json'):
        json_text = path.read_text()
        json.loads(json_text)
        require(not contains_private_path(json_text), 'Private source path in authored JSON: ' + str(path))
    n = validate_manifest(json.loads((root / 'examples/open-shot.json').read_text()), root / 'examples')
    video_count = validate_research(json.loads((root / 'references/research-cases.json').read_text()))
    project_count = validate_research(json.loads((root / 'references/research-projects.json').read_text()))
    inventory=root / 'references/v3-example-status.json'
    examples=validate_example_inventory(json.loads(inventory.read_text()),root) if inventory.exists() else 0
    return {'v3_examples_hash_checked': examples, 'package_structure': 'pass', 'local_links': 'pass', 'json_parse': 'pass', 'example_manifest_shots': n, 'research_cases': video_count, 'research_projects': project_count, 'scope': 'Declared metadata, uniqueness, coverage, rights, paths and timeline checks; no execution-safety, render, visual or audio approval'}



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
