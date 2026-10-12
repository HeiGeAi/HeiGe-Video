import fs from 'node:fs';
import crypto from 'node:crypto';

const rate=48000, duration=16, beat=.5;
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const hz=note=>440*2**((note-69)/12);
const clip=(x,a,b)=>Math.max(a,Math.min(b,x));
const arrangements={
  citrus:{title:'Citrus bounce pop',roots:[48,48,45,45,41,43,48,48],third:4,
    motif:[72,76,79,83,79,76,74,72],lead:'mallet',swing:0,drum:.75,
    cues:[[1,'pop'],[2,'pop'],[3,'paper'],[3.25,'air'],[4.5,'pop'],[5,'air'],[6,'air'],[7.5,'pop'],[9,'pop'],[11,'pop'],[12,'pop'],[12.25,'paper'],[12.75,'air'],[13,'air'],[14,'pop']]},
  paper:{title:'Paper pizzicato flight',roots:[50,47,43,45,50,47,43,50],third:4,
    motif:[74,78,81,78,76,74,69,73],lead:'string',swing:.04,drum:.48,
    cues:[[0,'paper'],[.25,'pop'],[.5,'paper'],[1.25,'paper'],[2,'paper'],[2.5,'paper'],[3.5,'air'],[3.75,'air'],[5.25,'pop'],[6.75,'pop'],[9,'air'],[13.75,'paper'],[14,'pop']]},
  mineral:{title:'Mineral pentatonic bloom',roots:[50,50,45,45,43,43,50,50],third:7,
    motif:[74,76,81,83,86,83,81,76],lead:'bell',swing:0,drum:.28,
    cues:[[.5,'soil'],[.75,'bell'],[1.5,'bell'],[3,'bell'],[4,'bell'],[5.75,'bell'],[6.75,'bell'],[7.75,'bell'],[8.75,'bell'],[10.5,'air'],[11.5,'bell'],[12,'bell'],[12.5,'bell'],[14.5,'bell']]},
};

export function writeShowcaseMusic(style, file) {
  const a=arrangements[style];if(!a)throw new Error('Unknown showcase music');
  const events=[];
  const add=(at,type,gain,length,notes=[],pan=0)=>events.push({id:events.length,at,type,gain,duration:Math.min(length,duration-at),notes,pan,sample:Math.round(at*rate)});
  for(let bar=0;bar<8;bar++){
    const root=a.roots[bar],last=bar===7;
    add(bar*2,'pad',style==='mineral'?.14:.1,1.9,[root+12,root+12+a.third,root+19],-.12);
    for(const b of (last?[0,1]:style==='mineral'?[0,2]:[0,1.5,2,3.5]))add(bar*2+b*beat,'kick',.34*a.drum,.3);
    for(const b of (last?[2]:[1,3]))add(bar*2+b*beat,'clap',.16*a.drum,.16,[],.08);
    for(let b=0;b<(last?4:8);b++)add(bar*2+b*beat/2+(b%2?a.swing:0),'hat',.03*a.drum,.07,[],b%2?.35:-.35);
    for(const b of (last?[0,2]:[0,1.5,2,3]))add(bar*2+b*beat,'bass',style==='mineral'?.09:.19,.32,[root-12]);
    for(let n=0;n<(last?4:8);n++){
      const note=a.motif[(n+bar*2)%a.motif.length]+(bar===6?12:0);
      add(bar*2+n*.25,a.lead,style==='mineral'?.23:.2,style==='paper'?.38:.55,[note],n%2?.24:-.24);
    }
    if([1,3,5].includes(bar)&&style!=='mineral')add(bar*2+1.75,'mallet',.13,.22,[root+24,root+28,root+31],.3);
  }
  for(const [at,type] of a.cues)add(at,type,.13,type==='air'?.3:.18,type==='bell'?[86]:[],0);
  events.sort((x,y)=>x.sample-y.sample||x.id-y.id);
  const count=rate*duration,stereo=[new Float64Array(count),new Float64Array(count)];
  for(const e of events){
    let state=((e.id+17)*19781103+style.length)>>>0;
    const noise=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return(state>>>0)/2147483648-1;};
    const frequency=e.notes.length?hz(e.notes[0]):440;
    const stringLength=Math.max(2,Math.round(rate/frequency));
    const string=new Float64Array(stringLength);for(let j=0;j<stringLength;j++)string[j]=noise();
    let head=0,filtered=0;
    const pan=[Math.cos((e.pan+1)*Math.PI/4),Math.sin((e.pan+1)*Math.PI/4)];
    for(let i=0;i<Math.ceil(e.duration*rate)&&e.sample+i<count;i++){
      const t=i/rate,tail=clip((e.duration-t)/.03,0,1),n=noise();let x=0;
      if(e.type==='kick')x=Math.sin(2*Math.PI*(54*t+95*.025*(1-Math.exp(-t/.025))))*Math.exp(-t*14);
      else if(e.type==='clap')x=n*Math.exp(-t*32)*(.8+.2*Math.sin(t*2300));
      else if(e.type==='hat') {filtered+=.1*(n-filtered);x=(n-filtered)*Math.exp(-t*80);}
      else if(e.type==='bass')x=(Math.sin(2*Math.PI*frequency*t)+.25*Math.sin(4*Math.PI*frequency*t))*Math.min(1,t/.01)*Math.exp(-t*5);
      else if(e.type==='pad')x=e.notes.reduce((s,note)=>s+Math.sin(2*Math.PI*hz(note)*t)+.18*Math.sin(2*Math.PI*hz(note)*1.003*t),0)/e.notes.length*Math.min(1,t/.15)*Math.min(1,(e.duration-t)/.3);
      else if(e.type==='string'){
        x=string[head];string[head]=.495*(string[head]+string[(head+1)%stringLength]);head=(head+1)%stringLength;
        x*=Math.min(1,t/.003);
      }else if(e.type==='mallet'||e.type==='bell'){
        const decay=e.type==='bell'?4:9;
        x=e.notes.reduce((s,note)=>{const f=hz(note);return s+Math.sin(2*Math.PI*f*t+1.4*Math.sin(2*Math.PI*f*2*t)*Math.exp(-t*12));},0)/e.notes.length*Math.exp(-t*decay)*Math.min(1,t/.002);
      }else if(e.type==='air'){filtered+=.04*(n-filtered);x=filtered*Math.sin(Math.PI*t/e.duration);}
      else if(e.type==='paper'){filtered+=.14*(n-filtered);x=(n-filtered)*Math.sin(Math.PI*t/e.duration)*.5;}
      else if(e.type==='pop')x=Math.sin(2*Math.PI*(560*t-120*t*t))*Math.exp(-t*40);
      else if(e.type==='soil')x=n*Math.exp(-t*20)*.3;
      x*=e.gain*tail;
      for(let c=0;c<2;c++){
        stereo[c][e.sample+i]+=x*pan[c];
        if(['mallet','bell','string'].includes(e.type)&&e.sample+i+12000<count)stereo[1-c][e.sample+i+12000]+=x*.14*pan[c];
      }
    }
  }
  let rawPeak=0;for(let i=0;i<count;i++)for(let c=0;c<2;c++){stereo[c][i]=Math.tanh(stereo[c][i]*1.4)*Math.min(1,(count-i)/(rate*.12));rawPeak=Math.max(rawPeak,Math.abs(stereo[c][i]));}
  const gain=.68/rawPeak,pcm=Buffer.alloc(count*4);let peak=0,squares=0;
  for(let i=0;i<count;i++)for(let c=0;c<2;c++){
    const q=Math.round(stereo[c][i]*gain*32767);pcm.writeInt16LE(q,i*4+c*2);
    const actual=q/32767;peak=Math.max(peak,Math.abs(actual));squares+=actual**2;
  }
  const h=Buffer.alloc(44);h.write('RIFF');h.writeUInt32LE(pcm.length+36,4);h.write('WAVEfmt ',8);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(2,22);h.writeUInt32LE(rate,24);h.writeUInt32LE(rate*4,28);h.writeUInt16LE(4,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(pcm.length,40);
  const wav=Buffer.concat([h,pcm]);fs.writeFileSync(file,wav,{flag:'wx'});
  return {schemaVersion:'heige-showcase-music/1',style,title:a.title,bpm:120,bars:8,beats:32,duration,rate,channels:2,samples:count,events,peak,rms:Math.sqrt(squares/(count*2)),wavSha256:hash(wav),pcmSha256:hash(pcm),source:'Original composition and procedural instruments. No reference melody, downloaded samples or model provider.',listening:'not-tested'};
}
