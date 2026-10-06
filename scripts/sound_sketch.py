"""Original procedural event score, no samples or external services.

Not speech. Stereo event stems are generated from a fixed seed and timeline.
"""
import argparse, json, math, wave
from pathlib import Path
import numpy as np

SR=48000
def make(style,duration):
    rng=np.random.default_rng(5026)
    score=np.zeros((round(duration*SR),2),dtype=np.float64)
    events=[]
    def add(at,length,freq,level,pan=0,kind='bell'):
        if style=='keynote':
            at=at*8/11.5 if at<11.5 else 8+(at-11.5)*19/15.5 if at<27 else at
        n=round(length*SR); t=np.arange(n)/SR
        if kind=='air':
            noise=rng.standard_normal(n)
            # Moving average removes harsh high-frequency texture.
            sig=np.convolve(noise,np.ones(33)/33,mode='same')
            env=np.sin(np.pi*t/length)**2
        elif kind=='tick':
            sig=np.sin(2*np.pi*freq*t)+rng.standard_normal(n)*.12
            env=np.minimum(1,t/.002)*np.exp(-t*42)
        else:
            sig=np.sin(2*np.pi*freq*t)+.19*np.sin(2*np.pi*freq*2.003*t)+.06*np.sin(2*np.pi*freq*3*t)
            env=np.minimum(1,t/.012)*np.exp(-t*3.6/length)*np.minimum(1,(length-t)/.05)
        sig*=env*level
        start=round(at*SR); end=min(len(score),start+n)
        if end<=start:return
        gains=np.array([math.sqrt((1-pan)/2),math.sqrt((1+pan)/2)])
        score[start:end]+=sig[:end-start,None]*gains
        events.append(dict(at=at,duration=length,kind=kind,frequency=freq,level=level,pan=pan))
    if style=='keynote':
        for at,f in [(0.6,220),(2.5,330),(4.1,440),(6.2,293.66),(8.7,440),(10.8,587.33)]:
            add(at,2.1,f,.095,math.sin(at)*.35)
        add(5.6,4,0,.1,0,'air')
        for at,f in [(12.9,293.66),(13.5,369.99),(14.1,440),(15.8,587.33),(16.5,739.99),(17.2,880)]:
            add(at,.55,f,.075,(at-15)*.15)
        for at in [18,19.7,21.4,23.1]:add(at,.12,880,.04,0,'tick')
        for f in [220,330,440]:add(25.4,3.6,f,.085,0)
    elif style=='tech':
        for at in [.3,.65,1,1.35,1.7,2.05,2.4,2.7,7.2,8.2,9.2,10.2,11.2,16.5,18.3,20,22]:
            add(at,.11,340+(at%3)*90,.085,math.sin(at)*.5,'tick')
        for f in [220,330]:add(27.2,2.2,f,.06)
    elif style=='ink':
        add(.3,8,0,.09,0,'air')
        # A deliberate full-bus pause precedes the gust.
        add(12.2,3.5,0,.23,-.2,'air');add(16,8,0,.075,.25,'air')
        for at,f in [(2,146.83),(14.2,196),(22.7,220),(27.2,293.66)]:add(at,2.3,f,.12)
    else:
        for at in [1.4,3.2,7.8,10,12.7,15.8,19.4,22,27.8]:
            add(at,.35,0,.11,math.sin(at)*.3,'air')
        for f in [261.63,392]:add(28,1.8,f,.055)
    # Tail fade is deterministic; prevent clipped exports without hard limiting.
    tail=min(len(score),int(.45*SR));score[-tail:]*=np.linspace(1,0,tail)[:,None]
    peak=float(np.max(np.abs(score)))
    if peak>.78:score*=.78/peak
    return score,events

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--style',choices=['keynote','tech','ink','whiteboard'],required=True);p.add_argument('--out',type=Path,required=True);p.add_argument('--duration',type=float,default=30)
    a=p.parse_args();a.out.parent.mkdir(parents=True,exist_ok=True)
    if a.out.exists():raise SystemExit('Refusing to overwrite existing audio')
    data,events=make(a.style,a.duration)
    with wave.open(str(a.out),'wb') as f:
        f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR);f.writeframes((data*32767).astype('<i2').tobytes())
    a.out.with_suffix('.json').write_text(json.dumps({'style':a.style,'duration':a.duration,'sample_rate':SR,'peak':float(np.max(np.abs(data))),'events':events,'kind':'original generated non-speech sound sketch; listening review not performed'},indent=2))
