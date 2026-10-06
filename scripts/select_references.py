#!/usr/bin/env python3
"""Select a small, deterministic research packet. Offline; never downloads media."""
import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STYLES = {
    'swiss-tech': 'swiss-editorial', 'swiss-editorial': 'swiss-editorial',
    'dark-keynote': 'cinematic-product', 'cinematic-product': 'cinematic-product',
    'ink': 'ink-narrative', 'ink-narrative': 'ink-narrative',
    'dataviz': 'dataviz', 'whiteboard': 'whiteboard',
}
ALIASES = {
    '水墨': 'ink brush', '纸艺': 'paper material', '产品': 'product camera',
    '排版': 'typography poster', '字体': 'font glyph', '转场': 'transition identity',
    '白板': 'whiteboard diagram', '图表': 'data chart', '数据': 'data chart',
    '声音': 'audio cue', '音效': 'audio cue', '测试': 'test pixel review',
    '相机': 'camera', '材质': 'material', '因果': 'action consequence',
}
PRIORITY = ('lemo-swiss-motion', 'lemo-dark-keynote', 'lemo-ink-wash',
            'lemo-dataviz', 'lemo-whiteboard', 'buck-airbnb-aircover',
            'buck-sonos-move', 'lemo-papercut-red', 'lemo-blueprint')


def select(records, *, query='', style=None, controls='exclude', limit=4, kind='both'):
    if type(limit) is not int or not 1 <= limit <= 20:
        raise ValueError('limit must be an integer from 1 to 20')
    if controls not in ('exclude', 'include', 'only'):
        raise ValueError('controls must be exclude, include or only')
    if style is not None and style not in STYLES:
        raise ValueError('unknown style')
    if kind not in ('both', 'videos', 'projects'):
        raise ValueError('unknown kind')
    expanded = query.lower()
    for token, replacement in ALIASES.items():
        expanded = expanded.replace(token, ' ' + replacement + ' ')
    tokens = list(dict.fromkeys(re.findall(r'[\w-]+', expanded)))
    ranked = []
    for record in records:
        if kind != 'both' and record['kind'] != kind:
            continue
        is_control = record['category'] == 'control-or-negative'
        if (controls == 'exclude' and is_control) or (controls == 'only' and not is_control):
            continue
        if style and STYLES[style] not in record.get('tags', []):
            continue
        text = json.dumps({k:record.get(k) for k in ('title','canonical_repo','purpose','tags','mechanisms','transfer')}, ensure_ascii=False).lower()
        matched = [token for token in tokens if token in text]
        if tokens and not matched:
            continue
        score = len(matched) * 10
        title = (record['title'] + ' ' + ' '.join(record.get('tags', []))).lower()
        score += sum(3 for token in matched if token in title)
        priority = PRIORITY.index(record['id']) if record['id'] in PRIORITY else len(PRIORITY)
        ranked.append((-score, priority, record['id'].lower(), record, matched))
    ranked.sort(key=lambda item:item[:3])
    # Without a query, interleave media and implementation suggestions.
    if not tokens and kind == 'both' and controls != 'only':
        videos = [r for r in ranked if r[3]['kind'] == 'videos']
        projects = [r for r in ranked if r[3]['kind'] == 'projects']
        ranked = [row for pair in __import__('itertools').zip_longest(videos, projects) for row in pair if row]
    results = []
    for score, _, _, r, matched in ranked[:limit]:
        item = {k:r[k] for k in ('id','kind','title','category','source_url','mechanisms','limits','inspection_level')}
        item['selection_reason'] = {'matched_terms': matched, 'style': style, 'score': -score}
        item['transfer'] = r.get('transfer', r['mechanisms'])
        if r['kind'] == 'videos':
            item['rights'] = r['rights']
            item['coverage_note'] = 'Sampled decoded frames and a selected dense interval; no realtime playback or listening. See ledger for exact timestamps.'
        else:
            item['license'] = r['license']
            item['source_evidence'] = r['source_evidence'][:2]
        results.append(item)
    return results


def load_records(root=ROOT):
    records=[]
    for name, key, kind in (('research-cases.json','cases','videos'), ('research-projects.json','projects','projects')):
        for record in json.loads((root/'references'/name).read_text())[key]:
            records.append(dict(record, kind=kind))
    return records


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--query',default='')
    parser.add_argument('--style',choices=sorted(STYLES))
    parser.add_argument('--kind',choices=('both','videos','projects'),default='both')
    parser.add_argument('--controls',choices=('exclude','include','only'),default='exclude')
    parser.add_argument('--limit',type=int,default=4)
    args=parser.parse_args()
    try:results=select(load_records(),**vars(args))
    except ValueError as error:parser.error(str(error))
    print(json.dumps({'selection_method':'deterministic lexical routing, not a quality ranking','controls':args.controls,'results':results,'no_matches':not results},ensure_ascii=False,indent=2))


if __name__ == '__main__':main()
