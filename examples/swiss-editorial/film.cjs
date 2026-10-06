/* Original HeiGe-Video editorial motion study. No external visual assets.
   A single event-poster composition evolves into a rhythm instrument and back.
   The event and its poster are fictional. */
const {GlobalFonts}=require('@napi-rs/canvas');
const fs=require('node:fs');
if(fs.existsSync('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc')) GlobalFonts.registerFromPath('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc','Editorial CJK');
if(fs.existsSync('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf')) GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf','Editorial Latin');
const P={bg:'#dedbd3',paper:'#f4f1e9',ink:'#131918',red:'#ed4b2b',line:'#cac9c0',muted:'#737770'};
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const ease=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10)};
const ramp=(t,a,b)=>ease((t-a)/(b-a));
const mix=(a,b,u)=>a+(b-a)*u;
function text(c,s,x,y,size,color=P.ink,weight=700,align='left',latin=false){
 c.fillStyle=color;c.font=`${weight} ${size}px "${latin?'Editorial Latin':'Editorial CJK'}"`;c.textAlign=align;c.textBaseline='alphabetic';c.fillText(s,x,y);
}
function tracked(c,s,x,y,size,spacing,color=P.ink,outline=0){
 c.font=`700 ${size}px "Editorial Latin"`;c.fillStyle=color;c.textAlign='left';let at=x;
 for(const ch of s){
  c.save();c.globalAlpha*=1-outline;c.fillText(ch,at,y);c.restore();
  if(outline>0){c.save();c.globalAlpha*=outline;c.strokeStyle=color;c.lineWidth=.9;c.strokeText(ch,at,y);c.restore();}
  at+=c.measureText(ch).width+spacing;
 }
}
function line(c,x,y,X,Y,color=P.line,w=1){c.strokeStyle=color;c.lineWidth=w;c.beginPath();c.moveTo(x,y);c.lineTo(X,Y);c.stroke();}
function circle(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
function round(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r);}
function drawNoise(c,alpha){
 c.save();c.globalAlpha=alpha;c.fillStyle=P.ink;
 for(let i=0;i<1150;i++){let x=((i*127.13)%1280),y=((i*293.73)%720);c.fillRect(x,y,i%3===0?1.3:.65,.65);}c.restore();
}
function motif(c,t,noise,sequence){
 // Twelve persistent ink bands: irregular headlines -> contour -> audible bars.
 const seq=ramp(t,16.1,18.3),energy=t>=18&&t<22.8;
 for(let i=0;i<12;i++){
  const ph=i/11;
  let baseX=-153+ph*306,baseY=25;
  let h=190*(.35+.65*Math.sin(Math.PI*ph)),w=17;
  const localOrder=ramp(t,3.7+i*.13,5.65+i*.13);
  const localNoise=Math.min(noise,1-localOrder);
  const disX=Math.sin(i*13.61)*75*localNoise,disY=Math.cos(i*6.31)*75*localNoise;
  const beatNow=(t-18)/.4;
  const strike=18+i*.4+.24;
  const off=energy?Math.exp(-Math.pow((t-strike)/.065,2)):0;
  h=mix(h,55+155*(.2+.8*(.5+.5*Math.sin(i*1.6+18*.4)))+off*12,seq);
  const posY=mix(baseY,2,seq)+disY;
  c.save();c.translate(baseX+disX,posY);c.rotate(localNoise*Math.sin(i*3.4)*.48);
  const beat=clamp((t-18)/.4,0,11.999), k=Math.floor(beat), phase=beat-k;
  const active=energy&&k===i&&Math.abs(phase-.6)<.16;
  c.fillStyle=active?P.red:P.ink;
  round(c,-w/2,-h/2,w,h,seq*8.5);c.fill();
  // White notch is a designed rhythmic counter-form, not a random artifact.
  if(seq<.98){c.fillStyle=P.paper;round(c,-w/2-1,-h*.22, w+2,11*(1-seq),0);c.fill();}
  c.restore();
 }
}
function poster(c,t){
 const order=ramp(t,3.8,8.2),noise=1-order;
 c.fillStyle=P.paper;c.fillRect(-210,-297,420,594);
 // Typesetting grid appears as a working layer, then recedes.
 const grid=(ramp(t,4,5)-ramp(t,9,10.2))*.65;
 if(grid>0){c.save();c.globalAlpha=grid;for(let x=-184;x<200;x+=30)line(c,x,-265,x,265,P.line,.65);for(let y=-264;y<280;y+=30)line(c,-185,y,185,y,P.line,.65);c.restore();}
 const top=mix(-180,-198,order);
 tracked(c,'NIGHT',-183+noise*16,top,68,mix(2,-2.3,order));
 tracked(c,'SIGNAL',-183-noise*9,top+72,68,mix(-1,-2.6,order),P.ink,ramp(t,11.4,12.15)-ramp(t,14,14.8));
 line(c,-184,-102,184,-102,P.ink,1.3);
 text(c,'夜航',-182,-69,25,P.ink,800);
 text(c,'声音的形状',181,-72,11,P.ink,500,'right');
 c.save();c.translate(0,70);motif(c,t,noise,0);c.restore();
 const redX=mix(15,148,order),redY=mix(92,-28,order);
 const orbit=ramp(t,12.1,14.2)-ramp(t,22.7,24.2);
 const theta=(t-12.1)*.65;
 let ballX=redX+orbit*Math.sin(theta)*30,ballY=redY+orbit*(1-Math.cos(theta))*18,ballR=22+orbit*9;
 const play=ramp(t,17.1,18)-ramp(t,22.8,24);
 const beat=clamp((t-18)/.4,0,11.999),k=Math.floor(beat),phase=beat-k;
 const prev=Math.max(0,k-1),moving=ease(clamp(phase/.4));
 const index=mix(prev,k,moving);
 const hitHeight=j=>55+155*(.2+.8*(.5+.5*Math.sin(j*1.6+18*.4)));
 const h=mix(hitHeight(prev),hitHeight(k),moving);
 ballX=mix(ballX,-153+index*306/11,play);
 ballY=mix(ballY,72+h/2+6*Math.exp(-Math.pow((phase-.6)/.1625,2))+13+Math.max(0,198-(72+h/2+13))*Math.pow(Math.abs(phase-.6)/.6,2),play);
 ballR=mix(ballR,12,play);
 circle(c,ballX,ballY,ballR,P.red);
 if(play>0){c.strokeStyle=P.paper;c.lineWidth=2*play;c.beginPath();c.arc(ballX,ballY,ballR,0,Math.PI*2);c.stroke();}
 line(c,-184,214,184,214,P.ink,1.3);
 text(c,'一场关于夜的声音实验',-183,240,15,P.ink,700);
 tracked(c,'SOUND STUDY  /  01',-183,263,8,1.2,P.muted);
 text(c,'原创概念海报',184,263,8,P.muted,400,'right');
 // Crop/registration marks sit on the ink form, away from narrative text.
 c.strokeStyle=P.red;c.lineWidth=.8;
 for(const [x,y] of [[-194,-278],[194,-278],[-194,281],[194,281]]){line(c,x-5,y,x+5,y,P.red,.8);line(c,x,y-5,x,y+5,P.red,.8);}
}
function drawPosterObject(c,t,x,y,scale,rotation){
 c.save();c.translate(x,y);c.rotate(rotation);c.scale(scale,scale);
 c.shadowColor='#1219182e';c.shadowBlur=34;c.shadowOffsetX=0;c.shadowOffsetY=17;c.fillStyle=P.paper;c.fillRect(-210,-297,420,594);c.shadowColor='transparent';
 poster(c,t);c.restore();
}
exports.DURATION=30;
exports.TEXT_STRINGS=['夜航','声音的形状','一场关于夜的声音实验','原创概念海报','先看见','再读懂','信息有顺序，画面才有主角。','让对比','发生','轻 / 重','节奏，可以被看见。','把重点，','留在眼里。','一张海报，从信息到节奏。'];
exports.CUES=Array.from({length:12},(_,i)=>({id:`strike-${i}`,time:18+i*.4+.24,band:i}));
exports.render=function(c,t,{width,height}){
 c.save();c.scale(width/1280,height/720);c.fillStyle=P.bg;c.fillRect(0,0,1280,720);
 // Camera continuously follows the same paper; no unrelated scene replacement.
 const reveal=ramp(t,.25,3.1),work=ramp(t,3.5,5.3),focus=ramp(t,9.7,11.5),turn=ramp(t,15,17.3),back=ramp(t,22.3,24.6),end=ramp(t,25,27.1);
 let sc=mix(3.4,1,reveal);sc=mix(sc,.96,work);sc=mix(sc,1.04,focus);sc=mix(sc,1.50,turn);sc=mix(sc,1.0,back);sc=mix(sc,.92,end);
 let x=mix(960,650,reveal);x=mix(x,846,work);x=mix(x,640,focus);x=mix(x,375,end);
 let y=mix(906,359,reveal);let angle=mix(-.085,0,reveal);angle=mix(angle,-Math.PI/2,turn);angle=mix(angle,0,back);
 // Keep the complete paper inside the viewing window during both quarter-turns.
 // The opening macro is intentionally cropped; the instrument transformation is not.
 if(t>=14.8 && t<=25){
  const extentH=594*Math.abs(Math.cos(angle))+420*Math.abs(Math.sin(angle));
  const extentW=420*Math.abs(Math.cos(angle))+594*Math.abs(Math.sin(angle));
  sc=Math.min(sc,648/extentH,1192/extentW);
 }
 drawPosterObject(c,t,x,y,sc,angle);
 // Editorial captions occupy deliberate reading windows, never cover the subject.
 const a=(ramp(t,3.2,3.9)-ramp(t,9.4,10));
 if(a>0){c.save();c.globalAlpha=a;line(c,70,82,436,82,P.ink,1);tracked(c,'01 / COMPOSITION',72,112,10,2,P.muted);text(c,'先看见',66,225,74);text(c,'再读懂',66,309,74);text(c,'信息有顺序，画面才有主角。',72,367,20,P.muted,500);line(c,72,411,245,411,P.red,5);tracked(c,'TYPE  /  SPACE  /  RHYTHM',72,456,9,1,P.muted);c.restore();}
 const a2=ramp(t,11.4,12.1)-ramp(t,14.6,15.2);
 if(a2>0){c.save();c.globalAlpha=a2;text(c,'让对比',58,325,36);text(c,'发生',58,373,36);text(c,'轻 / 重',1150,360,16,P.muted,500,'right');c.restore();}
 const a3=ramp(t,17.4,18.1)-ramp(t,22,22.5);
 if(a3>0){c.save();c.globalAlpha=a3;tracked(c,'02 / RHYTHM',44,69,10,2,P.muted);text(c,'节奏，可以被看见。',1236,688,20,P.ink,700,'right');
  let progress=clamp((t-18)/4);for(let i=0;i<12;i++)circle(c,44+i*14,681,2.5,i/12<progress?P.red:P.line);c.restore();}
 const endText=ramp(t,26.5,27.4);
 if(endText>0){c.save();c.globalAlpha=endText;tracked(c,'HEIGE VIDEO / MOTION STUDY',688,147,11,1.2,P.muted);text(c,'把重点，',681,282,71);text(c,'留在眼里。',681,376,71);line(c,688,424,1187,424,P.ink,1);text(c,'一张海报，从信息到节奏。',688,464,23,P.muted,500);tracked(c,'NIGHT SIGNAL  /  ORIGINAL STUDY',688,554,10,1.5,P.muted);c.restore();}
 // Constant paper texture is static in world space, not frame-random flicker.
 drawNoise(c,.07);
 if(t<.3){c.fillStyle=`rgba(222,219,211,${1-ramp(t,0,.3)})`;c.fillRect(0,0,1280,720);}
 c.restore();
};
