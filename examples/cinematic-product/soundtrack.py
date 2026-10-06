#!/usr/bin/env python3
"""Original deterministic stereo sound design. No samples or borrowed music."""
import numpy as np, wave
from pathlib import Path
SR=48000; DUR=36; N=SR*DUR
rng=np.random.default_rng(20261006)
a=np.zeros((N,2),dtype=np.float64)
def add(start,duration,signal,pan=0):
 n=min(len(signal),int(duration*SR),N-int(start*SR));k=int(start*SR)
 if n<=0:return
 a[k:k+n,0]+=signal[:n]*np.sqrt((1-pan)/2)
 a[k:k+n,1]+=signal[:n]*np.sqrt((1+pan)/2)
def tone(start,duration,freq,amp=.04,pan=0,attack=.015,decay=1.5):
 t=np.arange(int(duration*SR))/SR
 env=np.minimum(t/max(attack,.0001),1)*np.exp(-t/decay)*np.minimum((duration-t)/.08,1)
 sig=(np.sin(2*np.pi*freq*t)+.19*np.sin(2*np.pi*2*freq*t)+.05*np.sin(2*np.pi*3*freq*t))*env*amp
 add(start,duration,sig,pan)
def swell(start,duration,amp=.013,pan=0):
 n=int(duration*SR);t=np.arange(n)/SR
 z=rng.standard_normal(n);z=np.convolve(z,np.ones(45)/45,mode='same')
 env=np.sin(np.pi*np.minimum(t/duration,1))**2
 sig=(z*.5+np.sin(2*np.pi*(48*t+23*t*t/duration))*.12)*env*amp
 add(start,duration,sig,pan)
# A restrained evolving pad under the object choreography.
for start,dur,notes in [(0,13,[146.83,220,261.63,329.63]),(11.4,13.7,[130.81,196,246.94,293.66]),(24,12,[146.83,220,293.66,369.99])]:
 t=np.arange(int(dur*SR))/SR;env=np.sin(np.pi*t/dur)**1.6
 for i,f in enumerate(notes):
  sig=(np.sin(2*np.pi*f*t+.008*np.sin(2*np.pi*.17*t))+ .12*np.sin(2*np.pi*f*2*t))*env*.009
  add(start,dur,sig,[-.6,-.2,.25,.65][i])
# Source field and source-to-library movement.
swell(.8,2.5,.031,-.25);swell(4.8,2.7,.035,.25)
for i,at in enumerate([6.65,6.83,7.01,7.19,7.37,7.55]):tone(at,.3,540+i*52,.017,(-1+i/2.5)*.6,decay=.065)
# Evidence selection and storyboard placement.
tone(9.58,.5,820,.036,-.3,decay=.11);tone(10.48,.8,1100,.018,.3,decay=.17)
for i,at in enumerate([13.35,13.86,14.34]):tone(at,.72,[440,554.37,659.25][i],.028,[-.5,0,.5][i],decay=.23)
swell(17.15,1.7,.035,.1);tone(18.86,.25,880,.025,-.2,decay=.06)
# Light traversal opens into a continuous, airy spectral shimmer.
swell(22.05,1.8,.029,-.5);swell(24.0,2.7,.045,.2)
for i,f in enumerate([587.33,659.25,739.99,880,987.77,1174.66,1318.51]):tone(25.9+i*.20,2.4,f,.014,(-.8+i*.26),attack=.05,decay=.7)
swell(30.1,1.3,.026,.2)
for i,f in enumerate([293.66,440,587.33]):tone(33.0+i*.25,2.4,f,.04,[-.25,0,.25][i],attack=.025,decay=.75)
# Entire piece fades quietly; sample peak stays below full scale before loudness mastering.
fade=np.minimum(np.arange(N)/(SR*.12),1)*np.minimum((N-np.arange(N))/(SR*.7),1)
a*=fade[:,None]
a=np.tanh(a)
out=Path(__file__).parent/'final';out.mkdir(exist_ok=True)
with wave.open(str(out/'sound-design.wav'),'wb') as w:
 w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes((np.clip(a,-.98,.98)*32767).astype('<i2').tobytes())
print(out/'sound-design.wav')
