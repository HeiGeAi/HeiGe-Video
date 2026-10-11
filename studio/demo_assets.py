#!/usr/bin/env python3
"""Generate original, deterministic demo music and an explicitly mock audio-clock fixture."""
import array
import json
import math
from pathlib import Path
import sys
import wave

root=Path(__file__).resolve().parents[1]
out=root/'examples/studio'
rate=24000

def write_audio(path,duration,notes,amplitude=.14):
    samples=array.array('h')
    for index in range(int(rate*duration)):
        t=index/rate
        beat=t%0.5
        note=notes[int(t/0.5)%len(notes)]
        envelope=min(1,beat/.015)*math.exp(-beat*9)
        signal=math.sin(2*math.pi*note*t)+.3*math.sin(2*math.pi*note*2*t)
        fade=min(1,t/.25,(duration-t)/.65)
        samples.append(round(32767*amplitude*envelope*signal*fade))
    if sys.byteorder!='little':samples.byteswap()
    with wave.open(str(path),'wb') as stream:
        stream.setnchannels(1);stream.setsampwidth(2);stream.setframerate(rate);stream.writeframes(samples.tobytes())

write_audio(out/'score.wav',20,[164.81,220,246.94,329.63,220,196,246.94,164.81])
write_audio(out/'clock-mock.wav',8,[440,523.25,659.25,523.25],.10)
(out/'clock.srt').write_text('1\n00:00:00,100 --> 00:00:03,700\n读数１２．５％ 温度－２．５度。\n\n2\n00:00:04,100 --> 00:00:07,700\n比例３：２ 字幕跟随真实时码！\n',encoding='utf-8')
mock={
  'schemaVersion':'heige-video/4','title':'Audio clock fixture','mode':'lesson','ratio':'16:9','theme':'ledger',
  'assets':[{'id':'clock','path':'clock-mock.wav','kind':'audio','source':'original','rights':'Original sine tone. Explicitly mock narration, not a human recording.'}],
  'audio':{'assetId':'clock','kind':'mock','subtitles':'clock.srt'},
  'shots':[{'id':'first','type':'statement','title':'声音就是时间轴','start':0,'end':4,'body':'原始声音不被拉伸'},
           {'id':'second','type':'end','title':'占位音只能预览','start':4,'end':8,'body':'技术通过保留预览身份'}]
}
(out/'audio-clock.json').write_text(json.dumps(mock,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Generated original score, mock audio and cue fixture')
