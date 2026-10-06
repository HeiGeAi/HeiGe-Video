/* SPECTRA — original fictional concept film. All imagery is authored procedurally.
 * No copied footage, imported artwork, product claims or performance metrics.
 * Canonical coordinates 1600 × 900. Exports the v2-compatible Canvas entry point.
 */
const {createCanvas, GlobalFonts}=require('@napi-rs/canvas');
GlobalFonts.registerFromPath('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc','Noto Sans CJK SC');
GlobalFonts.registerFromPath('/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf','Noto Sans');
GlobalFonts.registerFromPath('/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf','Noto Sans Bold');
const W=1600,H=900, TAU=Math.PI*2;
const C={bg:'#101217',panel:'#191c23',raised:'#23262f',edge:'#3b404a',text:'#f3f0e7',muted:'#abb0be',dim:'#767e8d',accent:'#f4b797',lime:'#d7e5a5',blue:'#a4b6f4'};
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const lerp=(a,b,t)=>a+(b-a)*t;
const ease=x=>(x=clamp(x))<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
const smooth=x=>(x=clamp(x))*x*(3-2*x);
const prog=(t,a,b)=>ease((t-a)/(b-a));
const rgba=(c,a)=>{let h=c.replace('#','');return `rgba(${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)},${a})`;};
function rr(c,x,y,w,h,r=16,fill,stroke){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}
function line(c,x,y,x2,y2,col,width=1){c.beginPath();c.moveTo(x,y);c.lineTo(x2,y2);c.strokeStyle=col;c.lineWidth=width;c.stroke();}
function txt(c,s,x,y,size=20,col=C.text,weight=400,align='left'){c.fillStyle=col;c.font=`${weight} ${size}px "Noto Sans CJK SC"`;c.textAlign=align;c.textBaseline='alphabetic';c.fillText(s,x,y);}
function latin(c,s,x,y,size=18,col=C.muted,weight=400,align='left'){c.fillStyle=col;c.font=`${weight} ${size}px "Noto Sans"`;c.textAlign=align;c.textBaseline='alphabetic';c.fillText(s,x,y);}
function pill(c,s,x,y,w,col=C.accent){rr(c,x,y,w,28,14,rgba(col,.12),rgba(col,.22));latin(c,s,x+w/2,y+19,12,col,500,'center');}
function circle(c,x,y,r,fill,stroke){c.beginPath();c.arc(x,y,r,0,TAU);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}}
function glow(c,x,y,r,col,a=.2){let g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,rgba(col,a));g.addColorStop(1,rgba(col,0));c.fillStyle=g;c.fillRect(x-r,y-r,2*r,2*r);}
function path(c,pts,fill,stroke,width=1){c.beginPath();pts.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function badge(c,n,x,y,col=C.accent){rr(c,x,y,32,24,7,rgba(col,.14),rgba(col,.36));latin(c,String(n).padStart(2,'0'),x+16,y+17,12,col,500,'center');}
function shadow(c,blur=40,alpha=.4,y=20){c.shadowColor=`rgba(0,0,0,${alpha})`;c.shadowBlur=blur;c.shadowOffsetY=y;}
function chevron(c,x,y,col=C.dim){line(c,x,y,x+5,y+5,col,1.5);line(c,x+5,y+5,x,y+10,col,1.5);}
function cross(c,x,y,s,col){line(c,x-s,y,x+s,y,col);line(c,x,y-s,x,y+s,col);}

let grain, cards=[],layerCache={};
function fadeLayer(c,key,draw,alpha){if(!layerCache[key]){const can=createCanvas(W,H);draw(can.getContext('2d'));layerCache[key]=can;}c.save();c.globalAlpha*=alpha;c.drawImage(layerCache[key],0,0);c.restore();}
function noise(){if(grain)return grain;grain=createCanvas(W,H);let c=grain.getContext('2d'),d=c.createImageData(W,H),a=d.data;let seed=21;for(let i=0;i<a.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const v=seed>>>24;a[i]=a[i+1]=a[i+2]=v;a[i+3]=11;}c.putImageData(d,0,0);return grain;}
function back(c,t){let g=c.createLinearGradient(0,0,W,H);g.addColorStop(0,'#151820');g.addColorStop(.45,'#0e1117');g.addColorStop(1,'#171817');c.fillStyle=g;c.fillRect(0,0,W,H);glow(c,1120,180,760,C.blue,.075);glow(c,650,660,650,C.accent,.05);c.save();c.globalAlpha=.18;for(let x=50;x<W;x+=50)for(let y=50;y<H;y+=50)circle(c,x,y,.6,'#7c8498');c.restore();}
function topLabel(c,right='AN ORIGINAL FICTIONAL CONCEPT'){latin(c,'S P E C T R A',68,56,18,C.text,500);circle(c,46,49,4,C.accent);latin(c,right,1533,56,12,C.dim,400,'right');}
function footer(c,left='SOURCE → STORY',num='01 / 04'){latin(c,left,68,860,12,C.dim);latin(c,num,1533,860,12,C.dim,400,'right');}

// Original optical artwork: a multilayer glass element in a photographic studio.
function lens(c,x,y,r,angle=0,phase=0){c.save();c.translate(x,y);c.rotate(angle);c.scale(1,.86);glow(c,0,0,r*1.45,'#a9bdc4',.15);c.save();shadow(c,70,.7,25);circle(c,0,0,r,'#090e15');c.restore();let out=c.createLinearGradient(-r,-r,r,r);out.addColorStop(0,'#d4d9d9');out.addColorStop(.16,'#4a5868');out.addColorStop(.45,'#11151c');out.addColorStop(.8,'#8e9b9f');out.addColorStop(1,'#202e3c');circle(c,0,0,r,out);for(let i=0;i<20;i++){let rad=r*(1-.011*i);c.lineWidth=i%4===0?2.7:1;c.strokeStyle=i%3===0?'rgba(214,226,227,.48)':'rgba(10,16,24,.6)';c.beginPath();c.arc(0,0,rad,0,TAU);c.stroke();}let glass=c.createRadialGradient(-r*.2,-r*.3,r*.1,0,0,r*.8);glass.addColorStop(0,'#819991');glass.addColorStop(.23,'#304b52');glass.addColorStop(.55,'#132a3a');glass.addColorStop(.8,'#0d151f');glass.addColorStop(1,'#768692');circle(c,0,0,r*.78,glass);c.save();c.beginPath();c.arc(0,0,r*.76,0,TAU);c.clip();for(let i=0;i<12;i++){c.strokeStyle=`hsla(${150+i*16+phase*15},75%,78%,${.04+i*.012})`;c.lineWidth=3+i*.5;c.beginPath();c.ellipse(-r*.23+i*4,-r*.05,r*.85,r*.44,-.65,0,TAU);c.stroke();}let band=c.createLinearGradient(-r,-r,r,r);band.addColorStop(0,'rgba(230,255,250,0)');band.addColorStop(.39,'rgba(230,255,250,0)');band.addColorStop(.43,'rgba(230,255,250,.32)');band.addColorStop(.48,'rgba(230,255,250,.03)');band.addColorStop(1,'rgba(230,255,250,0)');c.fillStyle=band;c.fillRect(-r,-r,r*2,r*2);glow(c,-r*.25,-r*.3,r*.3,'#d7e5dc',.1);c.restore();c.lineWidth=2;c.strokeStyle='rgba(235,255,246,.55)';c.beginPath();c.arc(0,0,r*.775,3.6,5.5);c.stroke();c.lineWidth=.8;c.strokeStyle='rgba(194,231,254,.7)';c.beginPath();c.arc(0,0,r*.72,.35,2.3);c.stroke();for(let a=0;a<TAU;a+=Math.PI/30){c.save();c.rotate(a);line(c,0,-r*.94,0,-r*(a%(.6)<.15?.89:.91),'rgba(214,226,228,.45)',1);c.restore();}c.restore();}
function spectrum(c,x,y,w,h,p=0){c.save();c.beginPath();c.roundRect(x,y,w,h,8);c.clip();let bg=c.createLinearGradient(x,y,x+w,y+h);bg.addColorStop(0,'#111c28');bg.addColorStop(1,'#0f1115');c.fillStyle=bg;c.fillRect(x,y,w,h);c.translate(x+w*.45,y+h*.6);c.rotate(-.26);let g=c.createLinearGradient(-w*.4,0,w*.6,0);['#776fd6','#7cadde','#9ad1cb','#b9d888','#e4d094','#efa785','#d47574'].forEach((col,i)=>g.addColorStop(i/6,col));c.globalAlpha=.84;c.fillStyle=g;c.fillRect(-w*.65,-h*.25,w*1.3,h*.48);c.globalAlpha=.2;for(let i=-w;i<w;i+=5)line(c,i,-h,i,h,i%20===0?'#f5fff8':'#010918',1);c.restore();}
function prism(c,x,y,s,phase=0,beam=1){c.save();c.translate(x,y);c.scale(s,s);const A=[-20,-170],B=[-135,125],D=[125,120],off=[-64-8*Math.sin(phase*.32),-42];const Ap=[A[0]+off[0],A[1]+off[1]],Bp=[B[0]+off[0],B[1]+off[1]],Dp=[D[0]+off[0],D[1]+off[1]];
 const entry=[-90.17,10],exit=[80.6,31.2];const light=typeof beam==='number'?{white:beam,spread:beam}:{white:beam.white??1,spread:beam.spread??1,startX:beam.startX??-550,endX:beam.endX??600};
 let sh=c.createRadialGradient(0,430,0,0,430,250);sh.addColorStop(0,'rgba(0,0,0,.6)');sh.addColorStop(1,'rgba(0,0,0,0)');c.save();c.scale(1,.3);c.fillStyle=sh;c.fillRect(-320,0,640,800);c.restore();
 if(light.white>0){c.save();c.globalCompositeOperation='screen';let from=light.startX??-550,end=lerp(from,entry[0],clamp(light.white));c.globalAlpha=.16;path(c,[[from,6],[end,6],[end,14],[from,14]],'#e7ede8');c.globalAlpha=.86;line(c,from,10,end,10,'#ebf0e6',2.2);if(light.white>=.98){line(c,entry[0],entry[1],exit[0],exit[1],'rgba(226,244,242,.73)',2);glow(c,entry[0],entry[1],13,'#e2ede6',.20);}c.restore();}
 if(light.spread>0){c.save();c.globalCompositeOperation='screen';const colors=['#ed8c80','#e9b087','#e3d293','#b9d49b','#8bc4bb','#86b4d5','#ac9bdc'];for(let i=0;i<7;i++){const theta=lerp(.46,.60,i/6),ex=lerp(exit[0],light.endX??600,clamp(light.spread)),ey=exit[1]+Math.tan(theta)*(ex-exit[0]);c.globalAlpha=.07;path(c,[[exit[0],exit[1]],[ex,ey-8],[ex,ey+8]],colors[i]);c.globalAlpha=.65;line(c,exit[0],exit[1],ex,ey,colors[i],1.7);}glow(c,exit[0],exit[1],13,'#dde4e7',.24);c.restore();}
 let g1=c.createLinearGradient(-220,-150,150,180);g1.addColorStop(0,'rgba(149,172,188,.32)');g1.addColorStop(.4,'rgba(31,59,77,.15)');g1.addColorStop(.82,'rgba(190,216,226,.32)');g1.addColorStop(1,'rgba(62,81,111,.15)');path(c,[Ap,Bp,B,A],g1,'rgba(189,213,225,.5)',1.6);
 let g2=c.createLinearGradient(0,-200,40,130);g2.addColorStop(0,'rgba(220,242,246,.11)');g2.addColorStop(.7,'rgba(43,84,112,.16)');g2.addColorStop(.9,'rgba(198,235,242,.13)');g2.addColorStop(1,'rgba(235,244,243,.45)');path(c,[A,B,D],g2,'rgba(196,226,235,.8)',1.8);
 path(c,[Ap,Dp,D,A],'rgba(116,153,175,.09)','rgba(150,193,204,.35)',1);path(c,[Bp,Dp,D,B],'rgba(150,184,205,.1)','rgba(141,183,198,.35)');
 c.save();c.beginPath();c.moveTo(...A);c.lineTo(...B);c.lineTo(...D);c.closePath();c.clip();for(let i=0;i<34;i++){let a=.008+.012*Math.sin(i*.7);line(c,-220+i*11,-200,-110+i*12,160,`rgba(196,235,245,${a})`,2);}path(c,[[0,-129],[112,102],[120,102],[7,-116]],'rgba(228,242,245,.07)');c.restore();line(c,A[0],A[1],B[0],B[1],'rgba(244,255,254,.86)',1.4);line(c,B[0],B[1],D[0],D[1],'rgba(219,239,244,.8)',2);line(c,Ap[0],Ap[1],A[0],A[1],'rgba(244,255,245,.8)',1.2);glow(c,B[0],B[1],16,'#d9f2ff',.22);
 // Front-face ray is deliberately overlaid so its full causal path stays readable.
 if(light.white>=.98){line(c,...entry,...exit,'rgba(231,240,230,.8)',1.5);circle(c,...entry,2,'#eff5e7');circle(c,...exit,2,'#f5f1ed');}c.restore();}
function emitter(c,x,y,scale=1,power=1){c.save();c.translate(x,y);c.scale(scale,scale);let g=c.createLinearGradient(0,-44,0,44);g.addColorStop(0,'#909995');g.addColorStop(.15,'#3c4951');g.addColorStop(.48,'#1b2730');g.addColorStop(.79,'#48545a');g.addColorStop(1,'#111923');rr(c,-112,-44,130,88,12,g,'#74838b');for(let i=0;i<13;i++)line(c,-99+i*7,-42,-99+i*7,42,'rgba(11,20,30,.48)',2);c.beginPath();c.ellipse(21,0,17,43,0,0,TAU);c.fillStyle='#131d26';c.fill();c.strokeStyle='#9aa6a8';c.lineWidth=2;c.stroke();c.beginPath();c.ellipse(24,0,8,27,0,0,TAU);c.fillStyle=power>.01?'#d8e4df':'#324351';c.fill();if(power>.01)glow(c,31,0,33,'#dbe8e1',power*.32);rr(c,-44,45,24,41,4,'#28373e','#4b606c');rr(c,-81,83,98,11,4,'#2d3b40','#60727a');c.restore();}
function targetScreen(c,x,y,show=1){c.save();c.translate(x,y);let g=c.createLinearGradient(-44,-120,75,120);g.addColorStop(0,'#a8b3b2');g.addColorStop(.6,'#77858b');g.addColorStop(1,'#4b5965');path(c,[[-42,-134],[80,-166],[80,118],[-42,150]],g,'#bcc5c6',1.2);c.save();c.globalAlpha=show;let gg=c.createLinearGradient(0,0,0,76);['#e3a79a','#edbd95','#e6d3a1','#bfcc9b','#a4cbbb','#99bfce','#b0a6d2'].forEach((co,i)=>gg.addColorStop(i/6,co));path(c,[[-41,0],[79,-29],[79,47],[-41,76]],gg);glow(c,16,16,100,'#edf7e8',.1);c.restore();line(c,15,145,15,195,'#657984',6);path(c,[[-45,197],[55,181],[87,192],[-14,209]],'#384955','#738790');c.restore();}

function art(c,kind,x,y,w,h,time=0){c.save();c.beginPath();c.roundRect(x,y,w,h,12);c.clip();const g=c.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,'#202d36');g.addColorStop(1,'#0b1017');c.fillStyle=g;c.fillRect(x,y,w,h);if(kind===0){glow(c,x+w*.45,y+h*.5,w*.5,C.blue,.16);prism(c,x+w*.53,y+h*.55,Math.min(w/620,h/440),time,1);}
 if(kind===1){glow(c,x+w*.65,y+h*.2,w*.6,C.lime,.1);lens(c,x+w*.53,y+h*.52,Math.min(w*.35,h*.45),-.22,time);}
 if(kind===2)spectrum(c,x,y,w,h,time);
 if(kind===3){let gx=x+w*.5,gy=y+h*.54;for(let i=0;i<28;i++){c.beginPath();for(let n=0;n<=100;n++){let xx=x+w*n/100;let yy=gy+Math.sin(n*.1-i*.11-time)*h*.13+Math.cos(n*.022+i*.18)*h*.25; if(n===0)c.moveTo(xx,yy);else c.lineTo(xx,yy);}c.strokeStyle=`hsla(${190+i*3},35%,${55+i*.7}%,${.22+i*.011})`;c.lineWidth=1;c.stroke();}circle(c,gx,gy,7,C.text);}
 c.restore();}
const sourceData=[
 {label:'PRISM STUDY',title:'白光里，藏着哪些颜色？',meta:'STUDIO EXPERIMENT  /  01',kind:0,tag:'IMAGE'},
 {label:'FIELD NOTES',title:'光在界面处改变方向',meta:'WORKING NOTE  /  02',kind:-1,tag:'NOTE'},
 {label:'LENS ARCHIVE',title:'看见光走过的路径',meta:'OPTICAL OBJECT  /  03',kind:1,tag:'IMAGE'},
 {label:'COLOR REFERENCE',title:'颜色是一段连续的变化',meta:'SPECTRUM STUDY  /  04',kind:2,tag:'IMAGE'},
 {label:'MOTION TEST',title:'让不可见的过程可见',meta:'MOTION SKETCH  /  05',kind:3,tag:'CLIP'},
 {label:'STORY QUESTION',title:'怎样解释“一束白光”？',meta:'CREATIVE BRIEF  /  06',kind:-2,tag:'IDEA'}
];
function makeCard(i){const w=440,h=370,can=createCanvas(w*3,h*3),c=can.getContext('2d'),d=sourceData[i];c.scale(3,3);let g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,'#282c34');g.addColorStop(1,'#171a20');rr(c,1,1,w-2,h-2,20,g,'#464b55');badge(c,i+1,20,19);latin(c,d.label,66,36,11,C.muted);pill(c,d.tag,350,17,70,i%2?C.lime:C.accent);
 if(d.kind>=0){art(c,d.kind,18,59,404,222);latin(c,d.meta,23,306,10,C.dim);txt(c,d.title,23,337,22,C.text,500);}
 else if(d.kind===-1){rr(c,18,58,404,227,11,'#e4dfd2');latin(c,'OBSERVATION / 001',36,88,11,'#746f65',500);txt(c,'白光包含不同颜色的光。',36,125,22,'#272b2b',500);rr(c,34,145,337,36,4,'#dfc295');txt(c,'不同颜色，偏折程度不同。',39,171,21,'#35332e',500);for(let n=0;n<4;n++)line(c,37,206+n*17,365-(n%2)*46,206+n*17,'#bdb8ad',1);line(c,304,131,355,135,'#a56848',2);latin(c,d.meta,23,306,10,C.dim);txt(c,d.title,23,337,22,C.text,500);}
 else {latin(c,'A QUESTION WORTH MAKING',28,91,11,C.accent);txt(c,'如果把白光拆开，',28,144,29,C.text,500);txt(c,'会看见什么？',28,191,29,C.text,500);line(c,31,219,396,219,C.edge);txt(c,'用 3 个镜头，把过程讲清楚。',28,254,18,C.muted);latin(c,d.meta,23,306,10,C.dim);txt(c,d.title,23,337,22,C.text,500);}
 return can;
}
function getCards(){if(!cards.length)cards=sourceData.map((_,i)=>makeCard(i));return cards;}

// Perspective-correct textured surfaces, subdivided into triangles.
function tri(c,img,s,d){let den=s[0][0]*(s[1][1]-s[2][1])+s[1][0]*(s[2][1]-s[0][1])+s[2][0]*(s[0][1]-s[1][1]);if(Math.abs(den)<1e-5)return;let a=(d[0][0]*(s[1][1]-s[2][1])+d[1][0]*(s[2][1]-s[0][1])+d[2][0]*(s[0][1]-s[1][1]))/den,b=(d[0][1]*(s[1][1]-s[2][1])+d[1][1]*(s[2][1]-s[0][1])+d[2][1]*(s[0][1]-s[1][1]))/den;let cc=(d[0][0]*(s[2][0]-s[1][0])+d[1][0]*(s[0][0]-s[2][0])+d[2][0]*(s[1][0]-s[0][0]))/den,dd=(d[0][1]*(s[2][0]-s[1][0])+d[1][1]*(s[0][0]-s[2][0])+d[2][1]*(s[1][0]-s[0][0]))/den;let e=d[0][0]-a*s[0][0]-cc*s[0][1],f=d[0][1]-b*s[0][0]-dd*s[0][1];c.save();c.beginPath();const mx=(d[0][0]+d[1][0]+d[2][0])/3,my=(d[0][1]+d[1][1]+d[2][1])/3;d.forEach((p,i)=>{let vx=p[0]-mx,vy=p[1]-my,vl=Math.hypot(vx,vy),q=[p[0]+vx/vl*.65,p[1]+vy/vl*.65];i?c.lineTo(...q):c.moveTo(...q);});c.closePath();c.clip();c.transform(a,b,cc,dd,e,f);c.drawImage(img,0,0);c.restore();}
function plane(c,img,x,y,w,h,rx=0,ry=0,rz=0,alpha=1){if(alpha<=0)return;c.save();c.globalAlpha*=alpha;const F=1400;
 const proj=(u,v)=>{let a=(u-.5)*w,b=(v-.5)*h,zz=0;let b1=b*Math.cos(rx),z1=b*Math.sin(rx);let a1=a*Math.cos(ry)+z1*Math.sin(ry),z2=-a*Math.sin(ry)+z1*Math.cos(ry);let a2=a1*Math.cos(rz)-b1*Math.sin(rz),b2=a1*Math.sin(rz)+b1*Math.cos(rz);let k=F/(F+z2);return[x+a2*k,y+b2*k];};
 const q=[proj(0,0),proj(1,0),proj(1,1),proj(0,1)];
 if(Math.abs(rx)+Math.abs(ry)<.001){c.translate(x,y);c.rotate(rz);c.drawImage(img,-w/2,-h/2,w,h);}else{let nx=5,ny=5;for(let iy=0;iy<ny;iy++)for(let ix=0;ix<nx;ix++){const u=ix/nx,v=iy/ny,u1=(ix+1)/nx,v1=(iy+1)/ny;let p=[proj(u,v),proj(u1,v),proj(u1,v1),proj(u,v1)],s=[[u*img.width,v*img.height],[u1*img.width,v*img.height],[u1*img.width,v1*img.height],[u*img.width,v1*img.height]];tri(c,img,[s[0],s[1],s[2]],[p[0],p[1],p[2]]);tri(c,img,[s[0],s[2],s[3]],[p[0],p[2],p[3]]);}}
 c.restore();}
function cursor(c,x,y,pulse=0){c.save();shadow(c,10,.45,3);path(c,[[x,y],[x+5,y+25],[x+10,y+17],[x+22,y+15]],'#f2f0e7','#242a34',1.4);c.restore();if(pulse>0){c.lineWidth=2;circle(c,x+3,y+5,10+22*pulse,null,rgba(C.accent,1-pulse));}}
function chrome(c,alpha=1){c.save();c.globalAlpha*=alpha;rr(c,107,136,1386,646,19,'#171b23','#3a414c');rr(c,108,137,1384,56,18,'#222731');c.fillStyle='#222731';c.fillRect(108,164,1384,29);circle(c,136,165,4,'#d99584');circle(c,153,165,4,'#c6b478');circle(c,170,165,4,'#8ea98a');latin(c,'SPECTRA',206,170,13,C.text,600);line(c,319,150,319,180,'#3c434f');txt(c,'白光研究',339,171,16,C.muted);pill(c,'CONCEPT PROJECT',1301,150,163,C.accent);line(c,300,193,300,780,C.edge);latin(c,'WORKSPACE',134,230,11,C.dim);const nav=[['来源',0],['创作简报',1],['分镜',2],['剪辑',3]];nav.forEach((a,i)=>{let y=271+i*50;rr(c,126,y-27,151,40,7,i===0?'#2a303b':undefined);c.strokeStyle=i===0?C.accent:C.dim;c.lineWidth=1.3;rr(c,144,y-15,13,13,3,null,c.strokeStyle);txt(c,a[0],172,y-3,16,i===0?C.text:C.muted);});line(c,130,514,274,514,C.edge);latin(c,'PROJECT NOTES',136,548,10,C.dim);txt(c,'关于一束白光',136,578,14,C.muted);txt(c,'6 个原创研究素材',136,605,12,C.dim);rr(c,129,698,147,58,9,'#202630');latin(c,'FICTIONAL',142,720,11,C.accent);latin(c,'PRODUCT CONCEPT',142,739,10,C.dim);c.restore();}
function drawLibrary(c,t){chrome(c,prog(t,4.5,6.1));c.save();c.globalAlpha*=prog(t,6,7);txt(c,'从素材开始',330,238,25,C.text,500);latin(c,'6 SOURCES',1457,237,12,C.dim,400,'right');c.restore();}
const scatter=[{x:750,y:460,w:645,rx:-.08,ry:-.28,rz:-.05},{x:280,y:328,w:395,rx:.17,ry:.22,rz:-.15},{x:1328,y:358,w:480,rx:-.15,ry:-.23,rz:.14},{x:1105,y:711,w:452,rx:.11,ry:.23,rz:.10},{x:304,y:720,w:405,rx:-.15,ry:.30,rz:-.12},{x:889,y:140,w:412,rx:.12,ry:-.30,rz:.04}];
function libraryTarget(i){return{x:330+177+(i%3)*382,y:270+149+Math.floor(i/3)*252,w:354,h:219};}
function sourceField(c,t){const ca=getCards();drawLibrary(c,t);let gather=prog(t,4.6,8.1);const order=[5,4,2,3,1,0];order.forEach(i=>{let a=scatter[i],b=libraryTarget(i);let enter=i===0?1:prog(t,.5+i*.16,2.2+i*.25);let explode=prog(t,.6,3.8);let x=lerp(800+(a.x-800)*.15,a.x,explode),y=lerp(420+(a.y-420)*.1,a.y,explode),w=lerp(i===0?1220:20,a.w,explode);x=lerp(x,b.x,gather);y=lerp(y,b.y,gather);w=lerp(w,b.w,gather);let h=lerp(w*370/440,b.h,gather);plane(c,ca[i],x,y,w,h,a.rx*(1-gather),a.ry*(1-gather),a.rz*(1-gather),enter);});
 // Keep the opening macro free of narration. The caption appears only after
 // the card has pulled back, in an opaque protected strip below the image.
 let band=(1-prog(t,4.7,5.1))*prog(t,2.4,2.7),caption=(1-prog(t,4.7,5.1))*prog(t,2.8,3.15);
 c.save();c.globalAlpha=band;c.fillStyle='#101419';c.fillRect(0,749,W,H-749);line(c,68,750,1532,750,'#30353d',1);c.restore();
 c.save();c.globalAlpha=caption;txt(c,'一个问题，散在很多地方。',80,811,38,C.text,500);c.restore();

 c.save();c.globalAlpha=prog(t,7.0,8.2);txt(c,'让线索，先在一起。',82,820,25,C.text,500);c.restore();}
function miniSources(c,t,trans){const ca=getCards();for(let i=0;i<6;i++){let a=libraryTarget(i),b={x:425+(i%2)*151,y:334+Math.floor(i/2)*141,w:140,h:125};plane(c,ca[i],lerp(a.x,b.x,trans),lerp(a.y,b.y,trans),lerp(a.w,b.w,trans),lerp(a.h,b.h,trans),0,0,0,1);}}
function brief(c,t){chrome(c);const p=prog(t,8.3,10.1);miniSources(c,t,p);let x=lerp(1580,668,p);c.save();rr(c,x,222,784,515,15,'#21262e','#414852');latin(c,'CREATIVE BRIEF',x+30,260,11,C.accent);txt(c,'一束白光的旅程',x+30,308,35,C.text,500);latin(c,'A VISUAL EXPLANATION IN THREE SHOTS',x+32,338,12,C.dim);line(c,x+30,363,x+750,363,C.edge);
 const r=prog(t,9.8,11.25);c.save();c.globalAlpha=r;rr(c,x+29,388,723,107,9,'#2d322f','#4a5348');txt(c,'白光包含不同颜色的光。',x+48,427,24,C.text,500);txt(c,'经过棱镜时，不同颜色的偏折程度不同。',x+48,465,20,C.muted);badge(c,2,x+704,404,C.lime);c.restore();
 const headings=['01  提出问题：白光里有什么？','02  看见过程：让光穿过棱镜','03  得到答案：展开连续光谱'];headings.forEach((s,i)=>{let aa=prog(t,10.4+i*.38,11.15+i*.38);c.save();c.globalAlpha=aa;txt(c,s,x+32,543+i*55,21,i===0?C.text:C.muted);c.restore();});c.restore();
 c.save();c.globalAlpha=prog(t,9.5,10);txt(c,'来源',355,252,20,C.text);latin(c,'EVIDENCE, WITH CONTEXT',368,725,10,C.dim);rr(c,503,268,146,132,9,null,rgba(C.lime,.9));c.restore();
 if(t>9.1&&t<11.8){let cp=prog(t,9.1,10.4);cursor(c,lerp(694,1110,cp),lerp(342,438,cp),t<9.8?clamp((t-9.4)/.4):0);}
 // Source-to-claim trail is animated, then rests as a stable citation.
 if(t>9.6&&t<11){let e=prog(t,9.6,10.6);c.save();c.strokeStyle=rgba(C.lime,.6);c.lineWidth=1.5;c.setLineDash([3,6]);c.beginPath();c.moveTo(649,337);c.bezierCurveTo(719,337,660,426,lerp(649,727,e),426);c.stroke();c.restore();}
 txt(c,'每一个判断，都带着来处。',82,820,25,C.text,500);}
function shotCard(c,i,x,y,w,h,alpha=1,time=0){c.save();c.globalAlpha*=alpha;shadow(c,20,.3,10);rr(c,x,y,w,h,16,'#252a33','#4e5662');c.shadowBlur=0;c.shadowOffsetY=0;const label=['问题','过程','答案'][i],cap=['白光里有什么？','让光穿过棱镜','看见连续的颜色'][i];badge(c,i+1,x+20,y+20);latin(c,['THE QUESTION','THE PROCESS','THE REVEAL'][i],x+66,y+38,11,C.muted);art(c,[1,0,2][i],x+15,y+61,w-30,h-165,time);txt(c,label,x+22,y+h-72,17,C.accent,500);txt(c,cap,x+22,y+h-35,25,C.text,500);c.restore();}
function storyboard(c,t){const p=prog(t,12.3,14.1),old=1-prog(t,12.3,12.95);if(old>0)fadeLayer(c,'brief-final',cc=>brief(cc,12.3),old);
 c.save();c.globalAlpha=p;txt(c,'证据，变成镜头。',82,158,42,C.text,500);latin(c,'STORYBOARD  /  WHITE LIGHT',84,196,13,C.dim);pill(c,'3 CONNECTED SHOTS',1320,158,199);line(c,116,706,1480,706,'#393f49');for(let i=0;i<3;i++){let x=104+i*467;circle(c,x+216,706,5,C.accent);latin(c,['SOURCE 03 + 06','SOURCE 01 + 02','SOURCE 04'][i],x+216,744,12,C.dim,400,'center');}c.restore();
 // Source objects themselves travel out of the brief. Each card is composited
 // as one texture, so its prism/body/rays can never acquire different alpha.
 const ids=[2,0,3],starts=[{x:425,y:475},{x:425,y:334},{x:576,y:475}];
 for(let i=0;i<3;i++){let f=prog(t,12.3+i*.10,14.0+i*.10),m=prog(t,12.95+i*.10,13.65+i*.10),sx=starts[i].x,sy=starts[i].y;
 let x=lerp(sx,319+i*467,f),y=lerp(sy,456.5,f)-55*Math.sin(Math.PI*f),w=lerp(140,430,f),h=lerp(125,393,f);
 plane(c,getCards()[ids[i]],x,y,w,h,0,0,0,1-m);plane(c,getShotTextures()[i],x,y,w,h,0,0,0,m);}
 c.save();c.globalAlpha=prog(t,15,15.8);txt(c,'同一个问题。三步，讲清楚。',82,821,25,C.text,500);c.restore();}

let shotTextures;function getShotTextures(){if(!shotTextures)shotTextures=[0,1,2].map(i=>{const can=createCanvas(430,393);shotCard(can.getContext('2d'),i,0,0,430,393,1,16);return can;});return shotTextures;}
function editorChrome(c,t){rr(c,101,132,1398,649,20,'#171c25','#3f4753');rr(c,102,133,1396,52,18,'#242b36');c.fillStyle='#242b36';c.fillRect(102,162,1396,23);latin(c,'SPECTRA',125,166,14,C.text,600);txt(c,'白光研究  /  剪辑',267,166,15,C.muted);pill(c,'ORIGINAL CONCEPT',1305,144,168);line(c,387,185,387,563,C.edge);latin(c,'PROJECT ASSETS',126,219,10,C.dim);for(let i=0;i<3;i++){art(c,[1,0,2][i],125,239+i*95,91,64,t);txt(c,['提出问题','光的路径','光谱展开'][i],231,264+i*95,16,C.muted);latin(c,'SHOT 0'+(i+1),232,288+i*95,10,C.dim);}line(c,102,563,1498,563,C.edge);latin(c,'TIMELINE',124,599,11,C.dim);}
function opticsScene(c,x,y,w,h,t,stage=1){c.save();c.beginPath();c.roundRect(x,y,w,h,12);c.clip();c.translate(x,y);c.scale(w/1200,h/675);let g=c.createLinearGradient(0,0,1200,675);g.addColorStop(0,'#1b2934');g.addColorStop(.48,'#0c131b');g.addColorStop(1,'#172228');c.fillStyle=g;c.fillRect(0,0,1200,675);glow(c,760,220,540,C.blue,.1);glow(c,540,450,500,C.accent,.08);
 line(c,0,533,1200,533,'rgba(114,141,158,.12)',1);for(let i=0;i<7;i++)line(c,600,390,-300+i*330,700,'rgba(114,141,158,.035)',1);
 if(stage===0){lens(c,640+Math.sin(t*.45)*20,337,220,-.28+Math.sin(t*.3)*.06,t);latin(c,'01 / THE QUESTION',56,60,13,C.accent);txt(c,'白光里，有什么？',56,615,37,C.text,500);}
 else {const reveal=clamp((t-22.0)/1.8),spread=prog(t,24.0,25.5),screen=prog(t,26.0,27.4),settle=prog(t,27.8,29.6);c.save();c.translate(lerp(0,-26,settle),lerp(0,-15,settle));c.translate(620,315);c.scale(lerp(1,1.06,settle),lerp(1,1.06,settle));c.translate(-620,-315);
 // The bench assembles, the white beam traverses, then seven schematic wavelengths reach the screen.
 rr(c,174,370,790,12,5,'#203039','#41545f');line(c,188,370,949,370,'#6b818b',1);prism(c,566,260,.87,t,{white:reveal,spread,startX:-450,endX:lerp(600,498,screen)});emitter(c,155,269,.80,reveal);
 if(screen>0){c.save();c.globalAlpha=screen;targetScreen(c,1040+80*(1-screen),465,screen);c.restore();}

 c.restore();latin(c,t<26?'02 / THE PROCESS':'03 / THE REVEAL',56,60,13,C.accent);txt(c,t<24?'先让白光进入棱镜。':t<26?'方向改变，颜色逐渐分开。':'一束白光，包含多种颜色。',56,615,35,C.text,500);latin(c,'WHITE LIGHT',100,370,10,C.muted);latin(c,'PRISM',566,410,10,C.dim,400,'center');txt(c,'光路示意',1141,60,13,C.dim,400,'right');}
 c.restore();}

function editorState(t){const start=18.8,total=11.2,bounds=[0,1.7,7.2,11.2],left=366,span=1090,local=clamp(t-start,0,total);const stage=local+1e-7<bounds[1]?0:local+1e-7<bounds[2]?1:2;return{local,total,stage,playhead:left+span*local/total,clips:[0,1,2].map(i=>({x:left+span*bounds[i]/total,w:span*(bounds[i+1]-bounds[i])/total}))};}
function editor(c,t){let p=prog(t,17,18.6);if(t<17.6){c.save();c.globalAlpha=1-prog(t,17,17.6);txt(c,'证据，变成镜头。',82,158,42,C.text,500);latin(c,'STORYBOARD  /  WHITE LIGHT',84,196,13,C.dim);c.restore();}c.save();c.globalAlpha=p;editorChrome(c,t);let ed=editorState(t);opticsScene(c,505,209,834,334,t,ed.stage);latin(c,'00:'+ed.local.toFixed(1).padStart(4,'0')+' / 00:11.2',1409,549,11,C.dim,400,'right');for(let i=0;i<6;i++){let xx=366+i*2/ed.total*1090;line(c,xx,621,xx,630,C.edge);latin(c,'00:'+String(i*2).padStart(2,'0'),xx,614,10,C.dim);}rr(c,127,639,208,64,8,'#262d36');txt(c,'主画面',144,665,15,C.muted);latin(c,'V1 · ORIGINAL ART',144,688,10,C.dim);rr(c,359,637,1100,72,9,'#1c2430');rr(c,359,722,1100,24,6,'#25362f');for(let i=0;i<130;i++){let xx=365+i*8.3;line(c,xx,734-6*Math.sin(i*1.8)**2,xx,734+6*Math.sin(i*1.8)**2,'#728f7c',1);}c.restore();
 for(let i=0;i<3;i++){let sx=104+i*467,sy=260,sw=430,sh=393;let clip=editorState(t).clips[i],tx=clip.x,ty=643,tw=clip.w,th=59;let pp=prog(t,17+i*.11,18.7+i*.11);if(pp<.85){let mw=lerp(sw,tw,pp),mh=lerp(sh,th,pp);plane(c,getShotTextures()[i],lerp(sx,tx,pp)+mw/2,lerp(sy,ty,pp)+mh/2,mw,mh,0,0,0,1-pp*.45);}else{c.save();c.globalAlpha=prog(t,18.2,18.9);rr(c,tx,ty,tw,th,7,'#344152','#728396');const count=Math.max(2,Math.floor((tw-8)/62)),step=(tw-8)/count;for(let j=0;j<count;j++)art(c,[1,0,2][i],tx+4+j*step,ty+4,step-4,38,t);latin(c,['01 / QUESTION','02 / PROCESS','03 / REVEAL'][i],tx+8,ty+53,9,C.text);c.restore();}}
 if(t>18.8){let px=editorState(t).playhead;line(c,px,621,px,750,C.accent,2);path(c,[[px-6,619],[px+6,619],[px,627]],C.accent);}
 c.save();c.globalAlpha=prog(t,17.8,18.6);txt(c,'从分镜，到正在发生的画面。',82,820,25,C.text,500);c.restore();}
function fullPreview(c,t){const p=prog(t,22.2,23.8);if(p<1)fadeLayer(c,'editor-final',cc=>editor(cc,22.2),1-p);const x=lerp(505,42,p),y=lerp(209,109,p),w=lerp(834,1516,p),h=lerp(334,681,p);opticsScene(c,x,y,w,h,t,t<26?1:2);
 c.save();c.globalAlpha=p;latin(c,'PREVIEW / ORIGINAL OPTICAL STUDY',67,826,12,C.dim);latin(c,'FICTIONAL WORKFLOW · AUTHORED MOTION',1535,826,12,C.dim,400,'right');c.restore();}
function completed(c,t){const p=prog(t,30,31.35),info=prog(t,31.1,31.7);let bx=147,by=173,bw=1306,bh=548;
 // One optical subject shrinks into the finished artifact. There is no
 // old/new experiment crossfade, so two screens or ray paths cannot overlap.
 c.save();c.globalAlpha=p;rr(c,bx,by,bw,bh,22,'#202630','#535c6b');c.restore();
 opticsScene(c,lerp(42,bx+19,p),lerp(109,by+20,p),lerp(1516,792,p),lerp(681,444,p),29.9,2);
 c.save();c.globalAlpha=info;latin(c,'THE FINISHED CONCEPT',1001,240,12,C.accent);txt(c,'一束白光的旅程',997,305,34,C.text,500);txt(c,'从线索，到一部作品。',1000,353,22,C.muted);line(c,1002,383,1411,383,C.edge);['6 个原创素材','3 个相连的镜头','1 个完整的故事'].forEach((s,i)=>{circle(c,1010,419+i*43,3,C.lime);txt(c,s,1029,426+i*43,20,C.text);});rr(c,998,568,409,65,12,'#e5ddc7');txt(c,'创作完成',1202,610,23,'#252b2a',500,'center');latin(c,'SPECTRA  /  WHITE LIGHT',176,681,12,C.muted);latin(c,'ORIGINAL FICTIONAL CONCEPT',1409,681,11,C.dim,400,'right');c.restore();}

function ending(c,t){const outgoing=1-prog(t,33,33.5),p=prog(t,33.55,34.25);if(outgoing>0)fadeLayer(c,'completed-final',cc=>completed(cc,32.8),outgoing);c.save();c.globalAlpha=p;glow(c,800,435,520,C.accent,.08);circle(c,800,234,16,C.accent);circle(c,800,234,25,null,rgba(C.accent,.3));latin(c,'S P E C T R A',800,346,62,C.text,500,'center');txt(c,'把一束光，讲成一个故事。',800,437,38,C.text,400,'center');latin(c,'FROM SOURCES TO A VISUAL STORY',800,489,16,C.dim,400,'center');line(c,721,551,879,551,C.edge);txt(c,'原创虚构概念片 · 不代表真实产品功能或性能',800,605,16,C.dim,400,'center');latin(c,'HEIGE—VIDEO / V3 STUDY',800,775,12,C.dim,400,'center');c.restore();}
exports.editorState=editorState;
exports.DURATION=36;
exports.TEXT_STRINGS=[...new Set(sourceData.flatMap(s=>[s.label,s.title,s.meta,s.tag])), '一个问题，散在很多地方。','让线索，先在一起。','一束白光的旅程','白光包含不同颜色的光。','经过棱镜时，不同颜色的偏折程度不同。','每一个判断，都带着来处。','证据，变成镜头。','同一个问题。三步，讲清楚。','从分镜，到正在发生的画面。','先让白光进入棱镜。','方向改变，颜色逐渐分开。','一束白光，包含多种颜色。','光路示意','把一束光，讲成一个故事。','原创虚构概念片 · 不代表真实产品功能或性能'];
exports.CUTS=[20.5];
exports.render=(ctx,t,{width=W,height=H}={})=>{ctx.save();ctx.scale(width/W,height/H);back(ctx,t);if(t<8.3)sourceField(ctx,t);else if(t<12.3)brief(ctx,t);else if(t<17)storyboard(ctx,t);else if(t<22.2)editor(ctx,t);else if(t<30)fullPreview(ctx,t);else if(t<33)completed(ctx,t);else ending(ctx,t);topLabel(ctx);footer(ctx,t<8.3?'01 / COLLECT':t<12.3?'02 / CONNECT':t<17?'03 / STORYBOARD':t<30?'04 / MAKE':'SPECTRA / ORIGINAL CONCEPT',String(Math.min(36,Math.floor(t))).padStart(2,'0')+' / 36');ctx.save();ctx.globalCompositeOperation='soft-light';ctx.globalAlpha=.22;ctx.drawImage(noise(),0,0);ctx.restore();ctx.restore();};
