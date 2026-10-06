#!/usr/bin/env python3
"""Offline instruction export only. Never calls a provider or executes a response."""
import argparse
import json
from pathlib import Path


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--style',choices=('swiss-tech','whiteboard','ink','dataviz','dark-keynote'),required=True)
    p.add_argument('--brief',type=Path,required=True)
    p.add_argument('--out',type=Path,required=True)
    a=p.parse_args();root=Path(__file__).resolve().parents[1]
    if a.out.exists():raise FileExistsError('Refusing to overwrite '+str(a.out))
    paths=['SKILL.md','references/execution.md','references/model-harness.md','references/runtime-adapter.md','references/shot.schema.json','references/styles/'+a.style+'.md','references/shot-manifest.md','references/quality-gates.md','references/status.md']
    instruction='\n\n'.join('SOURCE FILE: '+name+'\n'+(root/name).read_text() for name in paths)
    instruction+='\n\nOnly the source files explicitly included above are loaded. Ask for needed source/data instead of claiming to have read a linked file. For this export, default to a self-contained Python scene exposing DURATION, FONT and render(t) returning a complete SVG string for the bundled SVG adapter, unless the caller explicitly requests another available adapter. Return reviewable source code, an open shot manifest matching the included schema, assumptions and checks to run. You cannot claim to render or view output unless the calling harness actually gives you that capability and evidence. Never invent a successful test or model-parity result.'
    payload={'messages':[{'role':'system','content':instruction},{'role':'user','content':a.brief.read_text()}]}
    a.out.parent.mkdir(parents=True,exist_ok=True)
    a.out.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'out':str(a.out),'source_files':paths,'characters':len(instruction),'network_requests':0,'credentials_added_by_exporter':False,'scope':'Offline messages payload; caller must supply provider/model/limits and authorized execution'}))


if __name__=='__main__':main()
