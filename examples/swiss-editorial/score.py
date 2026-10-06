"""Original score driven by the film's exported strike cues. No samples or API."""
import json,math,subprocess,wave
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parent
SR=48000; DURATION=30
cues=json.loads(subprocess.check_output(['node','-e',f"console.log(JSON.stringify(require({json.dumps(str(ROOT/'film.cjs'))}).CUES))"],text=True))
score=np.zeros((SR*DURATION,2),dtype=np.float64);events=[]
def put(at,length,freq,amp,kind='tone',pan=0):
 n=round(length*SR);t=np.arange(n)/SR;rng=np.random.default_rng(round(at*1000)+117)
 if kind=='paper':
  z=rng.standard_normal(n);x=np.convolve(z,np.ones(33)/33,mode='same');env=np.sin(np.pi*np.minimum(1,t/length))**2
 elif kind=='strike':
  x=np.sin(2*np.pi*freq*t+1.5*np.sin(2*np.pi*freq*2.01*t)*np.exp(-t*14))+.14*np.sin(2*np.pi*freq*3*t)*np.exp(-t*9)
  env=np.minimum(1,t/.004)*np.exp(-t*4.8)*np.minimum(1,np.maximum(0,length-t)/.12)
 else:
  x=np.sin(2*np.pi*freq*t)+.08*np.sin(2*np.pi*freq*2*t);env=np.minimum(1,t/.14)*np.exp(-t*1.3)*np.minimum(1,np.maximum(0,length-t)/.15)
 x=x*env*amp;start=round(at*SR);end=min(len(score),start+n)
 score[start:end]+=x[:end-start,None]*np.array([math.sqrt((1-pan)/2),math.sqrt((1+pan)/2)])
 events.append(dict(time=at,length=length,frequency=freq,gain=amp,kind=kind,pan=pan))
# A restrained opening and tactile composition cues. Silence remains between phrases.
for at,f in [(.55,130.8128),(2.7,196),(4.5,261.6256),(8.15,329.6276),(11.7,220),(14.9,146.8324)]: put(at,2.2,f,.07)
for at,length,amp in [(3.6,.55,.09),(6.2,.7,.07),(11.45,.7,.055),(15.1,1.9,.12),(22.8,1.1,.085)]: put(at,length,0,amp,'paper')
notes=[60,64,67,69,67,64,62,65,69,71,69,67]
for cue,midi in zip(cues,notes):
 f=440*2**((midi-69)/12);put(cue['time'],1.25,f,.15,'strike',.25)
for midi in [48,55,60,64]:put(25.5,3.7,440*2**((midi-69)/12),.045,'tone',0)
fade=round(.8*SR);score[-fade:]*=np.linspace(1,0,fade)[:,None]
peak=float(np.max(np.abs(score)));rms=float(np.sqrt(np.mean(score**2)))
assert np.isfinite(score).all() and peak<.9
out=ROOT/'swiss-score.wav'
with wave.open(str(out),'wb') as f:f.setnchannels(2);f.setsampwidth(2);f.setframerate(SR);f.writeframes((score*32767).astype('<i2').tobytes())
(ROOT/'score-events.json').write_text(json.dumps({'duration':DURATION,'sample_rate':SR,'peak':peak,'rms':rms,'shared_visual_cues':cues,'events':events,'perceptual_listening_review':False},ensure_ascii=False,indent=2))
print(out,peak,rms)
