/* HEIGE VIDEO V3 — 归岸 / HOMEWARD. Original procedural artwork and animation.
   No source media, proprietary reference code, or bundled fonts. Pure time renderer. */
'use strict';
const {createCanvas, GlobalFonts} = require('@napi-rs/canvas');
const fs = require('fs');
if(fs.existsSync('/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc')) GlobalFonts.registerFromPath('/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc','InkSerif');
const W=1920,H=1080, DURATION=36, FPS=24;
const INK=[21,26,26], PAPER=[240,236,225], RED=[155,49,39];
const PI=Math.PI;
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const mix=(a,b,t)=>a+(b-a)*t;
const ease=(t)=>{t=clamp(t);return t*t*(3-2*t)};
const rng=(seed)=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const color=(c,a=1)=>`rgba(${c[0]},${c[1]},${c[2]},${a})`;
const noise=(u,s=0)=>Math.sin(u*3.9+s)*.41+Math.sin(u*8.13+s*1.73)*.21+Math.sin(u*19.7-s*2.9)*.11+Math.sin(u*37.6+s*.4)*.08;
const cache=new Map();
function layer(key,draw,w=W,h=H){if(!cache.has(key)){const c=createCanvas(w,h);draw(c.getContext('2d'));cache.set(key,c)}return cache.get(key)}
function curve(points, steps=10){const a=[];for(let i=0;i<points.length-1;i++){const p0=points[Math.max(i-1,0)],p1=points[i],p2=points[i+1],p3=points[Math.min(i+2,points.length-1)];for(let j=0;j<steps;j++){let t=j/steps,t2=t*t,t3=t2*t;const v=[0,0];for(let k=0;k<2;k++)v[k]=.5*((2*p1[k])+(-p0[k]+p2[k])*t+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*t2+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*t3);a.push(v)}}a.push(points[points.length-1]);return a}
function smoothPath(c,p,close=false){let a=curve(p);c.beginPath();c.moveTo(a[0][0],a[0][1]);for(let v of a)c.lineTo(v[0],v[1]);if(close)c.closePath()}
function pressureStroke(c,points,width,opts={}){
 let p=curve(points,opts.steps||9), n=p.length; const seed=opts.seed||1,col=opts.col||INK,alpha=opts.alpha??1;
 let lengths=[0],total=0;for(let i=1;i<n;i++){total+=Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]);lengths.push(total)}
 let left=[],right=[],normals=[],widths=[];
 for(let i=0;i<n;i++){let a=p[Math.max(0,i-1)],b=p[Math.min(n-1,i+1)],d=Math.hypot(b[0]-a[0],b[1]-a[1])||1,nx=-(b[1]-a[1])/d,ny=(b[0]-a[0])/d,u=lengths[i]/(total||1);
 let taper=opts.taper===false?1:Math.pow(Math.sin(PI*(.01+.98*u)),opts.power||.55); let r=width*.5*taper*(.86+.15*Math.sin(u*6+seed)+.11*noise(u*14,seed));r=Math.max(.05,r);widths.push(r);normals.push([nx,ny]);let edge=(noise(u*total*.071,seed)+Math.sin(u*total*.23+seed)*.35)*(opts.rough??Math.min(width*.12,2.4));left.push([p[i][0]+nx*(r+edge),p[i][1]+ny*(r+edge)]);right.push([p[i][0]-nx*(r-edge*.7),p[i][1]-ny*(r-edge*.7)])}
 c.save();c.fillStyle=color(col,alpha);c.beginPath();c.moveTo(...left[0]);for(const v of left)c.lineTo(...v);for(const v of right.reverse())c.lineTo(...v);c.closePath();c.fill();
 if(opts.wet){c.globalAlpha=.1;c.lineWidth=width*.35;c.strokeStyle=color(col,.7);c.shadowColor=color(col,.3);c.shadowBlur=width*.6;c.lineCap='round';smoothPath(c,points);c.stroke();c.shadowBlur=0;c.globalAlpha=1}
 const dry=opts.dry||0;
 if(dry){let r=rng(seed*1071+277),count=Math.round(5+width*.24*dry);for(let k=0;k<count;k++){let rel=(r()*2-1)*.89,start=Math.floor(r()*n*.25),end=Math.floor(n*(.58+.42*r()));c.beginPath();for(let i=start;i<end;i++){const q=p[i],nn=normals[i];let jitter=noise(i*.75,k)*.7;let x=q[0]+nn[0]*(widths[i]*rel+jitter),y=q[1]+nn[1]*(widths[i]*rel+jitter);if(i===start)c.moveTo(x,y);else c.lineTo(x,y)}c.strokeStyle=color(PAPER,(.035+.10*r())*dry*alpha);c.lineWidth=.25+r()*.7;c.stroke()}}
 c.restore();
}
function pigment(c,x,y,w,h,amount=.2){
 const tex=layer('pigment',g=>{const sz=512,r=rng(1901),grid=Array.from({length:17*17},()=>r());function cloud(x,y){let fx=x/32,fy=y/32,ix=Math.floor(fx),iy=Math.floor(fy);fx=ease(fx-ix);fy=ease(fy-iy);return mix(mix(grid[iy*17+ix],grid[iy*17+ix+1],fx),mix(grid[(iy+1)*17+ix],grid[(iy+1)*17+ix+1],fx),fy)}const im=g.createImageData(sz,sz);for(let yy=0;yy<sz;yy++)for(let xx=0;xx<sz;xx++){const i=(yy*sz+xx)*4,n=r(),cl=cloud(xx,yy);im.data[i]=PAPER[0];im.data[i+1]=PAPER[1];im.data[i+2]=PAPER[2];im.data[i+3]=Math.round(cl*cl*140+(n>.78?(n-.78)*350:0));}g.putImageData(im,0,0)},512,512);
 c.save();c.globalAlpha*=amount;c.fillStyle=c.createPattern(tex,'repeat');c.fillRect(x,y,w,h);c.restore();
}
function paper(c){c.drawImage(layer('paper',g=>{g.fillStyle=color(PAPER);g.fillRect(0,0,W,H);let r=rng(11235);let im=g.getImageData(0,0,W,H);for(let i=0;i<im.data.length;i+=4){let v=(r()-.5)*9;im.data[i]+=v;im.data[i+1]+=v;im.data[i+2]+=v}g.putImageData(im,0,0);for(let i=0;i<2300;i++){let x=r()*W,y=r()*H;g.strokeStyle=color([93,79,54],.027+r()*.025);g.lineWidth=.45;g.beginPath();g.moveTo(x,y);g.lineTo(x+1+r()*11,y+(r()-.5)*4);g.stroke()}let grad=g.createRadialGradient(960,500,300,960,500,1180);grad.addColorStop(0,'rgba(254,252,244,.09)');grad.addColorStop(1,'rgba(86,67,41,.1)');g.fillStyle=grad;g.fillRect(0,0,W,H)}),0,0)}
function mistMountain(c,x,y,s,seed,alpha=1){
 c.save();c.translate(x,y);c.scale(s,s);c.globalAlpha=alpha;
 const art=layer('mountain-'+seed,g=>{g.translate(530,90);const r=rng(seed);
 let ps=[[-450,290],[-347,244],[-287,187],[-256,119],[-198,128],[-153,35],[-105,-9],[-70,21],[-29,112],[29,138],[81,151],[132,241],[243,273],[420,330]];ps=ps.map(([a,b])=>[a+(r()-.5)*39,b+(r()-.5)*33]);
 smoothPath(g,[...ps,[490,490],[-520,490]],true);let grad=g.createLinearGradient(0,-20,0,395);grad.addColorStop(0,color(INK,.48));grad.addColorStop(.4,color(INK,.22));grad.addColorStop(.86,color(INK,.035));grad.addColorStop(1,color(INK,0));g.fillStyle=grad;g.fill();
 g.save();g.clip();
 // Low-frequency pooled washes, never parallel geometric hatch bars.
 for(let k=0;k<85;k++){let xx=-340+r()*600,yy=30+r()*240,rad=22+r()*65;let f=g.createRadialGradient(xx,yy,0,xx,yy,rad);f.addColorStop(0,color(INK,.014+Math.max(0,180-yy)/7000));f.addColorStop(1,color(INK,0));g.fillStyle=f;g.fillRect(xx-rad,yy-rad,rad*2,rad*2)}
 let ridges=[ [[-104,4],[-151,72],[-161,111],[-198,167],[-220,235]], [[-70,30],[-57,89],[-89,162],[-72,225]], [[-196,131],[-215,167],[-265,235],[-276,278]], [[30,146],[18,185],[58,247],[103,282]] ];
 for(let k=0;k<ridges.length;k++)pressureStroke(g,ridges[k],19-k*2,{alpha:.07,seed:k+seed,dry:.8,wet:true});
 for(let k=0;k<160;k++){let xx=-270+r()*530,yy=65+r()*185;if(r()>.55){g.fillStyle=color(INK,.006+r()*.025);g.beginPath();g.ellipse(xx,yy,2+r()*6,2+r()*12,.3,0,PI*2);g.fill()}}
 pigment(g,-530,-90,1080,650,.35);
 g.restore();pressureStroke(g,ps.slice(4,8),1.4,{alpha:.1,seed,dry:.7});
 // Dissolving lower mountain body leaves actual white mist space.
 g.globalCompositeOperation='destination-out';let fade=g.createLinearGradient(0,200,0,380);fade.addColorStop(0,'rgba(0,0,0,0)');fade.addColorStop(1,'rgba(0,0,0,1)');g.fillStyle=fade;g.fillRect(-530,200,1080,450);g.globalCompositeOperation='source-over';
 },1080,650);c.drawImage(art,-530,-90);c.restore();
}
function rock(c,x,y,s=1,seed=5,alpha=1){
 c.save();c.translate(x,y);c.scale(s,s);c.globalAlpha*=alpha;
 const boundary=[[-231,77],[-201,12],[-179,-89],[-148,-172],[-108,-231],[-66,-215],[-24,-247],[30,-213],[57,-135],[109,-121],[162,-27],[185,24],[230,80],[101,103],[-90,107]];
 smoothPath(c,boundary,true);let gr=c.createLinearGradient(-200,-160,160,90);gr.addColorStop(0,'#313836');gr.addColorStop(.35,'#424842');gr.addColorStop(.67,'#777970');gr.addColorStop(1,'#a3a296');c.fillStyle=gr;c.fill();
 c.save();c.clip();let r=rng(seed);for(let k=0;k<1600;k++){let px=-270+r()*540,py=-260+r()*420,ww=.5+r()*4.5;c.fillStyle=color(k%3?INK:PAPER,.014+r()*.075);c.beginPath();c.ellipse(px,py,ww,ww*(.2+r()),r()*PI,0,2*PI);c.fill()}
 pressureStroke(c,[[-110,-246],[-144,-156],[-162,-90],[-155,38],[-182,89]],34,{alpha:.7,seed:1,dry:.85,wet:true});
 pressureStroke(c,[[-62,-230],[-49,-166],[-80,-128],[-36,-44],[-53,78]],24,{alpha:.62,seed:4,dry:.78});
 pressureStroke(c,[[22,-217],[2,-162],[16,-81],[66,-14],[41,95]],35,{alpha:.44,seed:8,dry:.9});
 pressureStroke(c,[[-171,-122],[-87,-94],[-33,-81],[51,-83],[83,-57]],9,{alpha:.45,seed:4,dry:.9});
 pressureStroke(c,[[-210,15],[-140,-3],[-74,28],[-21,17],[31,52],[118,45],[202,72]],11,{alpha:.48,seed:3,dry:.65});
 for(let k=0;k<35;k++){let x=-220+r()*390,y=-190+r()*245;pressureStroke(c,[[x,y],[x-4+r()*21,y+20],[x+9+r()*21,y+63]],1+r()*4,{alpha:.32,seed:40+k,dry:1})}
 for(let k=0;k<50;k++){let x=-210+r()*400,y=-200+r()*290;pressureStroke(c,[[x,y],[x+8,y+22],[x+3,y+38]],r()*8+2,{alpha:.06,col:PAPER,seed:51+k,dry:.6})}
 pigment(c,-270,-270,550,430,.7);c.restore();
 pressureStroke(c,boundary.slice(0,8),7,{alpha:.68,seed:9,dry:1});
 pressureStroke(c,[[-205,88],[-98,115],[65,114],[224,80]],12,{alpha:.35,seed:3,dry:.8});
 c.restore();
}
function reeds(c,x,y,s,seed=4,wind=0){c.save();c.translate(x,y);c.scale(s,s);let r=rng(seed);for(let i=0;i<19;i++){let bx=(r()-.5)*170,h=70+r()*230,dx=(r()-.5)*120+wind*70;pressureStroke(c,[[bx,0],[bx+dx*.2,-h*.52],[bx+dx,-h]],1+r()*3,{alpha:.45+r()*.4,seed:i,dry:.8});for(let j=0;j<3;j++){let yy=-h*(.25+j*.19),xx=bx+dx*(-yy/h)*.6;pressureStroke(c,[[xx,yy],[xx+20+wind*20,yy-12],[xx+80+wind*20,yy-45]],6+r()*9,{alpha:.58,seed:i*10+j,dry:.8})}}c.restore()}
function pine(c,x,y,s,seed=1){c.save();c.translate(x,y);c.scale(s,s);pressureStroke(c,[[0,0],[-18,-77],[2,-151],[-32,-221],[-9,-273]],20,{alpha:.84,dry:1,seed});pressureStroke(c,[[-10,-153],[-76,-197],[-154,-188]],10,{alpha:.8,dry:.8,seed:3});pressureStroke(c,[[-27,-216],[43,-239],[94,-263]],10,{alpha:.82,dry:.8,seed:4});pressureStroke(c,[[-6,-263],[-51,-295],[-108,-298]],8,{alpha:.83,dry:.8,seed:2});let r=rng(seed);for(let a of [[-107,-197],[-63,-210],[54,-266],[-24,-252],[-65,-303],[-8,-299]])for(let k=0;k<37;k++){let px=a[0]+(r()-.5)*96,py=a[1]+(r()-.5)*26;pressureStroke(c,[[px+4,py+8],[px-4,py-5],[px+(r()-.5)*27,py-11-r()*14]],1+r()*3,{alpha:.3+r()*.55,seed:k,dry:.9})}c.restore()}
function riverMarks(c,t,strength=0,focus=790){
 let r=rng(398);for(let k=0;k<46;k++){let y=520+r()*560,x=-150+r()*2000,len=60+r()*470;let move=t*(5+strength*32)*(1+(y-520)/900);x=(x+move)%2400-180;let a=(.04+.045*r())*(.5+strength*.8);pressureStroke(c,[[x,y],[x+len*.31,y-3-6*strength],[x+len*.7,y+3+7*strength],[x+len,y]],.7+r()*2.6+strength*2,{alpha:a,seed:k,dry:.8})}
 if(strength>.15)for(let k=0;k<8;k++){let y=focus+(k-4)*30,x=(t*95+k*179)%1700-200;pressureStroke(c,[[x,y],[x+180,y-24],[x+360,y-12],[x+620,y+20]],9+20*strength,{alpha:.014+strength*.028,seed:k+71,dry:1,wet:true})}
}
function wake(c,x,y,s,t,force=.3){c.save();c.translate(x,y);c.scale(s,s);for(let k=0;k<5;k++){let off=k*7+6;pressureStroke(c,[[-270-off*2,off*.7],[-180,off],[0,off*1.3],[180,off*.55],[235,-2]],1.5+force*3,{alpha:(.11-k*.017)*(.5+force),seed:k,dry:.85})}c.restore()}
function splash(c,x,y,s,phase,seed=8){if(phase<0||phase>1)return;c.save();c.translate(x,y);c.scale(s,s);let r=rng(seed);for(let i=0;i<22;i++){let ang=PI*(1.1+r()*.8),v=30+r()*100,q=phase,dx=Math.cos(ang)*v*q,dy=Math.sin(ang)*v*q+q*q*74;let a=(1-q)*(.3+r()*.6);c.fillStyle=color(INK,a);c.beginPath();c.ellipse(dx,dy,1+r()*3,2+r()*6,ang,0,PI*2);c.fill()}for(let k=0;k<3;k++){c.beginPath();c.ellipse(0,14,20+phase*160+k*21,5+phase*24+k*3,0,.1,PI*.95);c.lineWidth=1.5;c.strokeStyle=color(INK,.18*(1-phase));c.stroke()}c.restore()}
function scarf(c,x,y,wind,t,scale=1){c.save();c.translate(x,y);c.scale(scale,scale);let len=30+wind*43,dy=Math.sin(t*2.3)*3+wind*4;pressureStroke(c,[[2,-2],[-17,-1],[-len*.55,-6+dy],[-len,3+dy*1.3]],8,{col:RED,alpha:.88,seed:18,dry:.35,taper:false});pressureStroke(c,[[0,0],[-7,17],[-12-wind*10,29+Math.sin(t)*3]],5,{col:RED,alpha:.82,seed:20,dry:.4});c.restore()}
function boat(c,x,y,s,t,opts={}){
 let wind=opts.wind||0,ang=opts.angle||0,stroke=opts.stroke??(.5+.5*Math.sin(t*1.8)),rest=opts.rest||0,reach=opts.reach||0,settle=opts.settle||0,lean=(stroke-.5)*18*(1-rest)+reach*14;
 c.save();c.translate(x,y);c.rotate(ang);c.scale(s,s);
 // Soft, broken reflection under the hull.
 c.save();c.scale(1,-.32);c.translate(0,-37);pressureStroke(c,[[-200,0],[-150,-28],[90,-32],[225,11]],47,{alpha:.065,seed:3,dry:1});c.restore();
 smoothPath(c,[[-235,-17],[-159,13],[-7,21],[153,8],[238,-26],[205,24],[102,54],[-97,51],[-194,30]],true);c.fillStyle=color(INK,.93);c.fill();
 pressureStroke(c,[[-224,-12],[-109,19],[15,22],[132,9],[233,-25]],8,{alpha:.87,seed:11,dry:.85});
 pressureStroke(c,[[-176,28],[-47,43],[89,38],[185,10]],3,{col:PAPER,alpha:.7,seed:12,dry:.65});
 for(let k=0;k<6;k++)pressureStroke(c,[[-148+k*48,20],[-131+k*48,43]],1.5,{col:PAPER,alpha:.25,seed:k,dry:.7});
 // Deck, basket, and mastlet make the same boat identifiable in every shot.
 
 // Rower can move forward, stow the oar, reach the landing and settle.
 c.save();c.translate(reach*100,settle*5);
 let lx=lean*.75;
 smoothPath(c,[[-44,-1],[-43,-38],[-31+lx,-80],[-16+lx,-96],[10+lx,-97],[31+lx,-68],[35,-32],[53,-10],[81,0],[69,9],[12,10]],true);c.fillStyle=color([51,58,55],.96);c.fill();
 c.save();c.clip();pigment(c,-60,-105,155,125,.47);c.restore();
 pressureStroke(c,[[-29+lx,-77],[-30,-49],[-21,-12]],10,{alpha:.48,seed:11,dry:.87});
 pressureStroke(c,[[7+lx,-82],[9,-58],[4,-28]],5,{col:PAPER,alpha:.25,seed:5,dry:.8});
 pressureStroke(c,[[-19+lx,-87],[-4+lx,-69],[9+lx,-89]],5,{col:PAPER,alpha:.72,seed:13,dry:.8});
 pressureStroke(c,[[6,-8],[30,-10],[63,2]],5,{col:PAPER,alpha:.23,seed:2,dry:.85});
 // Head is enclosed: readable forehead, nose and chin in profile.
 smoothPath(c,[[-15+lx,-110],[-15+lx,-124],[-5+lx,-131],[9+lx,-125],[11+lx,-117],[17+lx,-112],[11+lx,-108],[8+lx,-99],[-2+lx,-97],[-12+lx,-101]],true);c.fillStyle=color([222,216,199],1);c.fill();
 pressureStroke(c,[[-13+lx,-104],[-20+lx,-116],[-15+lx,-131],[-1+lx,-135],[10+lx,-128],[11+lx,-122]],13,{alpha:.98,seed:10,dry:.7});
 c.beginPath();c.ellipse(-19+lx,-133,6,6,.2,0,PI*2);c.fillStyle=color(INK);c.fill();
 pressureStroke(c,[[10+lx,-116],[16+lx,-113],[10+lx,-108],[8+lx,-101],[1+lx,-99]],1.7,{alpha:.75,seed:7});
 pressureStroke(c,[[7+lx,-118],[10+lx,-118]],1.4,{alpha:.8,seed:9});
 scarf(c,-1+lx,-94,wind,t);
 let gripx=mix(35+stroke*23,110,reach),gripy=mix(-42,-55,reach);
 pressureStroke(c,[[14+lx,-78],[30+lx,-55],[gripx-3,gripy]],20,{alpha:.94,seed:5,dry:.8});
 pressureStroke(c,[[15+lx,-79],[31+lx,-55],[gripx-9,gripy-1]],4,{col:PAPER,alpha:.36,seed:5,dry:.8});
 pressureStroke(c,[[-24+lx,-74],[-20,-43],[gripx-15,gripy-17]],15,{alpha:.86,seed:15,dry:.75});
 c.beginPath();c.ellipse(gripx-13,gripy-17,6,4,.3,0,PI*2);c.fillStyle=color([222,216,199]);c.fill();
 c.beginPath();c.ellipse(gripx,gripy,6.5,4.5,-.3,0,PI*2);c.fillStyle=color([222,216,199]);c.fill();c.restore();
 // Final oar has an unmistakably different state: lifted, then horizontal on the gunwale.
 let ox=35+stroke*23,oy=-42,tipx=mix(mix(166,-43,stroke),187,rest),tipy=mix(94+Math.sin(stroke*PI)*14,-17,rest);
 let handle=[mix(ox-36,-190,rest),mix(oy-65,-17,rest)],grip=[mix(ox,0,rest),mix(oy,-17,rest)];
 pressureStroke(c,[handle,grip,[tipx,tipy]],5,{alpha:.93,seed:3,dry:.7,taper:false});
 pressureStroke(c,[[mix(grip[0],tipx,.76),mix(grip[1],tipy,.76)],[tipx,tipy],[mix(tipx-9,tipx+16,rest),mix(tipy+12,tipy,rest)]],23,{alpha:.88,seed:6,dry:.86});
 if(rest<.25)pressureStroke(c,[[tipx-57,tipy+5],[tipx-10,tipy+12],[tipx+66,tipy+3]],2,{alpha:.27*(1-rest*4),seed:8,dry:.8});
 if(opts.splash!==undefined&&rest<.1)splash(c,tipx,tipy,.7,opts.splash);

 c.restore();
}
function overheadBoat(c,x,y,s,t,angle=0,pull=0){c.save();c.translate(x,y);c.rotate(angle);c.scale(s,s);
 // bow points right. Red scarf and pale deck retain identity across camera axis.
 smoothPath(c,[[-224,0],[-156,-43],[42,-44],[181,-22],[237,0],[173,31],[9,44],[-159,32]],true);c.fillStyle=color(INK,.96);c.fill();
 smoothPath(c,[[-184,-1],[-127,-27],[32,-28],[165,-11],[181,0],[120,21],[-37,25],[-147,16]],true);c.fillStyle=color([169,162,144],.88);c.fill();
 for(let k=0;k<5;k++)pressureStroke(c,[[-162,-20+k*10],[-44,-22+k*11],[106,-17+k*8],[159,-3+k*2]],2,{alpha:.4,seed:k,dry:.7});
 pressureStroke(c,[[-66,-27],[-66,23]],8,{alpha:.75,seed:1});pressureStroke(c,[[88,-20],[88,21]],7,{alpha:.7,seed:2});
 
 c.save();c.translate(-13,0);c.rotate(-.13-pull*.2);c.beginPath();c.ellipse(-1,0,26,24,0,0,PI*2);c.fillStyle=color([51,58,55]);c.fill();pressureStroke(c,[[-25,-13],[-8,-24],[16,-17]],9,{alpha:.8,seed:3,dry:.9});c.beginPath();c.ellipse(2,0,13,11,0,0,PI*2);c.fillStyle=color(INK);c.fill();c.beginPath();c.ellipse(13,0,5,8,0,0,PI*2);c.fillStyle=color([222,216,199]);c.fill();scarf(c,-15,4,.9,t,.7);c.restore();
 let a=mix(.95,2.22,pull),ox=5,oy=28,tx=ox+165*Math.cos(a),ty=oy+165*Math.sin(a);
 pressureStroke(c,[[-18,-10],[ox,oy],[tx,ty]],5,{alpha:.95,seed:4,taper:false,dry:.65});pressureStroke(c,[[tx-22*Math.cos(a),ty-22*Math.sin(a)],[tx+20*Math.cos(a),ty+20*Math.sin(a)]],26,{alpha:.92,seed:2,dry:.8});
 pressureStroke(c,[[-24,12],[-7,30],[5,29]],15,{alpha:.8,seed:3,dry:.8});pressureStroke(c,[[-24,12],[-7,30],[5,29]],8,{col:PAPER,alpha:.9,seed:3});c.restore();return {tx,ty}}
function lantern(c,x,y,s,t,glow=1){c.save();c.translate(x,y);c.scale(s,s);let sway=Math.sin(t*1.2)*.026*Math.max(.2,1-(t-27)/5);c.rotate(sway);pressureStroke(c,[[0,-143],[0,-87],[0,-48]],3,{alpha:.65,seed:1});
 let gl=c.createRadialGradient(0,0,0,0,0,110);gl.addColorStop(0,`rgba(211,122,51,${.12*glow})`);gl.addColorStop(1,'rgba(211,122,51,0)');c.fillStyle=gl;c.fillRect(-130,-130,260,260);
 smoothPath(c,[[-35,-47],[-49,-21],[-47,29],[-25,51],[25,51],[47,29],[49,-21],[35,-47]],true);let gr=c.createRadialGradient(-4,1,3,0,0,65);gr.addColorStop(0,'#ecc582');gr.addColorStop(.6,'#bd743d');gr.addColorStop(1,'#883e2c');c.fillStyle=gr;c.fill();
 for(let k=-2;k<=2;k++)pressureStroke(c,[[k*13,-43],[k*16,-10],[k*16,28],[k*9,49]],1.9,{alpha:.25,seed:k+8,dry:.8});pressureStroke(c,[[-36,-46],[0,-50],[36,-46]],8,{alpha:.9,seed:4,dry:.7});pressureStroke(c,[[-29,49],[0,55],[29,49]],7,{alpha:.8,seed:2,dry:.7});pressureStroke(c,[[0,56],[0,79],[4,90]],3,{col:RED,alpha:.8,seed:9});c.restore()}
function harbor(c,t,scale=1){
 // Small landing, bent pine and single lamp: simple shape readable from wide shot.
 c.save();c.translate(1590,638);c.scale(scale,scale);
 pressureStroke(c,[[-71,12],[8,-8],[124,9],[228,46],[373,85]],41,{alpha:.46,seed:49,dry:.95,wet:true});
 pressureStroke(c,[[0,-12],[-21,-78],[-39,-157],[-1,-187],[82,-189]],12,{alpha:.93,seed:5,dry:.75});
 // Landing deck projects out to the bow contact point (1450,738).
 smoothPath(c,[[-145,98],[-88,76],[133,71],[214,89],[116,99],[-139,112]],true);c.fillStyle=color([76,77,65],.78);c.fill();
 pressureStroke(c,[[-145,99],[-35,95],[114,95],[211,90]],10,{alpha:.94,seed:3,dry:.9});
 for(let k=0;k<9;k++)pressureStroke(c,[[-122+k*34,89],[-103+k*34,106]],2.6,{col:PAPER,alpha:.33,seed:k,dry:.7});
 pressureStroke(c,[[-140,61],[-140,109],[-144,151]],12,{alpha:.91,seed:11,dry:.8,taper:false});
 pressureStroke(c,[[94,89],[92,155]],9,{alpha:.73,seed:4,dry:.9});
 pine(c,222,31,.77,91);lantern(c,81,-146,.55,t);
 c.restore()
}
function landscape(c,t,opts={}){
 let wind=opts.wind||0,drift=opts.drift||0;
 c.save();c.translate(drift,0);
 c.drawImage(layer('landscape',g=>{mistMountain(g,485,189,1.2,8,.57);mistMountain(g,1010,141,1.05,11,.58);mistMountain(g,1450,136,1.37,27,.65);mistMountain(g,1810,249,.8,91,.7); // wet foreground escarpment, not repeated icons.
 rock(g,1775,515,1.33,8,.92);rock(g,1975,588,1.4,37,.7);pine(g,1714,286,.52,6);
 let fog=g.createLinearGradient(0,449,0,713);fog.addColorStop(0,color(PAPER,0));fog.addColorStop(.65,color(PAPER,.64));fog.addColorStop(1,color(PAPER,0));g.fillStyle=fog;g.fillRect(0,430,W,330);
 pressureStroke(g,[[-60,922],[147,853],[346,895],[553,972]],90,{alpha:.67,seed:6,dry:.82,wet:true});reeds(g,138,901,.7,21);rock(g,-42,978,1.04,59,.83)}),0,0);
 c.restore();riverMarks(c,t,wind);harbor(c,t);
}
function shotWide(c,t){landscape(c,t,{wind:0});let x=mix(352,726,ease(t/6)),y=757+Math.sin(t*1.3)*1.8;wake(c,x,y,.5,t,.2);boat(c,x,y,.5,t,{wind:.15});
 // small birds provide distant living scale, move once rather than pulse.
 for(let k=0;k<3;k++){let bx=700+t*21+k*32,by=294+Math.sin(t*1.5+k)*3+k*8;pressureStroke(c,[[bx-7,by-1],[bx,by+2],[bx+7,by-3]],1.7,{alpha:.32,seed:k})}
}
function shotRower(c,t){let q=t-6,wind=ease((q-1)/3);mistMountain(c,1340,30,1.8,27,.36);riverMarks(c,t,wind,815);let x=905+q*11,y=701+Math.sin(q*1.8)*4;wake(c,x,y,1.7,t,.3+wind*.3);boat(c,x,y,1.68,t,{wind,stroke:.5+.5*Math.sin(q*1.9)});
 // breeze leans the bank reed tips and lifts the scarf; no global shake.
 reeds(c,1857,1150,1.1,4,wind);
}
function shotThreat(c,t){let q=(t-11)/4.5;
 mistMountain(c,397,155,1.6,8,.38);mistMountain(c,1444,44,1.1,37,.2);riverMarks(c,t,.7+q*.3,800);rock(c,1380,730,1.27,61);let x=mix(587,979,ease(q)),y=mix(680,748,ease(q));
 for(let k=0;k<4;k++)pressureStroke(c,[[530+k*50,858+k*20],[955,866+k*18],[1217,909+k*10],[1550,915+k*14],[1850,849+k*22]],7+k*3,{alpha:.07,seed:k,dry:.9,wet:true});
 wake(c,x,y,.82,t,.9);boat(c,x,y,.82,t,{wind:1.1,angle:.08*q,stroke:.4+.5*Math.sin(t*2)});
 reeds(c,-23,1090,.9,18,1);}
function overheadRock(c){
 c.save();c.translate(1408,382);c.rotate(-.22);
 let shape=[[-227,-21],[-210,-85],[-166,-139],[-130,-151],[-96,-198],[-43,-187],[4,-157],[74,-155],[146,-106],[158,-48],[198,-3],[204,57],[158,100],[142,151],[81,178],[5,184],[-31,164],[-107,149],[-141,117],[-173,83]];
 smoothPath(c,shape,true);let gr=c.createLinearGradient(-110,-130,150,150);gr.addColorStop(0,'#333b39');gr.addColorStop(.55,'#535951');gr.addColorStop(1,'#8d8f80');c.fillStyle=gr;c.fill();c.save();c.clip();
 let paths=[ [[-188,-94],[-130,-60],[-135,-10],[-67,32],[-50,169]], [[-75,-191],[-32,-88],[21,-58],[31,46],[112,126]], [[-166,93],[-80,78],[-42,113]], [[61,-145],[113,-57],[169,13],[133,52]] ];
 for(let k=0;k<paths.length;k++){pressureStroke(c,paths[k],28-k*4,{alpha:.53,seed:k+37,dry:1,wet:true});pressureStroke(c,paths[k].map(([x,y])=>[x+9,y-5]),11-k*1.2,{alpha:.25,col:PAPER,seed:k+37,dry:1})}
 let r=rng(16);for(let k=0;k<1100;k++){let x=-240+r()*480,y=-220+r()*440; c.fillStyle=color(k%2?INK:PAPER,.055);c.beginPath();c.ellipse(x,y,.7+r()*3,.7+r()*5,r()*PI,0,PI*2);c.fill()}
 pigment(c,-260,-240,520,480,.6);c.restore();
 pressureStroke(c,shape.slice(0,5),5,{alpha:.72,seed:22,dry:1});c.restore();
}
function routeAt(q){q=clamp(q,0,6);if(q<2.1)return{x:mix(1020,1090,ease(q/2.1)),y:mix(582,608,ease(q/2.1))};return{x:mix(1090,1710,ease((q-2.1)/3.9)),y:mix(608,850,ease((q-2.1)/2.8))}}
function shotTurn(c,t){let q=t-15.5,pull=ease((q-1.7)/1.05),turn=ease((q-2.1)/2.3),pos=routeAt(q),bx=pos.x,by=pos.y;
 // Broader ink currents make the river force legible before the intervention.
 for(let k=0;k<3;k++){let a=[0,61,103][k]+q*3;pressureStroke(c,[[-150,348+a],[230,387+a],[604,449+a],[936,424+a*.9],[1135,293+a*.65],[1530,224+a*.6],[2000,299+a]],8+(k%4)*5,{alpha:.032+(k%3)*.008,seed:k,dry:.9,wet:true});}
 for(let k=0;k<3;k++){let off=[0,42,117][k];pressureStroke(c,[[-80,731+off],[264,700+off],[607,651+off],[882,701+off+pull*47],[1138,820+off+turn*42],[1540,853+off+turn*24],[2060,690+off]],7+k*3,{alpha:.056,seed:k+8,dry:1,wet:true});}
 // Small carried flecks make the fast current visible against world-fixed wash.
 for(let k=0;k<22;k++){let xx=((q*132+k*107)%2170)-120,yy=666+Math.sin(xx/380)*51+(k%4)*21;pressureStroke(c,[[xx,yy],[xx+8,yy+1],[xx+19,yy-1]],1.2,{alpha:.17,seed:k,dry:.7})}
 // Broken pressure marks hug only the upstream edge; no enclosing map-like ring.
 pressureStroke(c,[[1110,371],[1092,279],[1146,208],[1247,172],[1320,173]],37,{alpha:.3,seed:41,dry:1,wet:true,rough:5});
 pressureStroke(c,[[1478,161],[1601,215],[1672,309],[1690,371]],19,{alpha:.19,seed:45,dry:1,rough:3});
 pressureStroke(c,[[1211,586],[1310,640],[1458,638],[1543,609]],26,{alpha:.21,seed:51,dry:1,rough:4});
 pressureStroke(c,[[1721,452],[1679,548],[1643,579]],8,{alpha:.21,seed:15,dry:1});
 for(let k=0;k<8;k++){let st=6+k*3;pressureStroke(c,[[1083-st,303],[1120-st,214],[1221-st,170],[1310,157-st]],.7+(k%3)*.5,{alpha:.09,seed:300+k,dry:1})}
 overheadRock(c);
 // Persistent wake stores the path change on paper for the rest of the shot.
 let tail=[];for(let k=0;k<=24;k++){let p=routeAt(q*k/24);tail.push([p.x-92,p.y+2])}
 for(let k=0;k<4;k++)pressureStroke(c,tail.map(([x,y])=>[x,y+k*8]),3.5-k*.4,{alpha:.16-k*.026,seed:k,dry:.8});
 let ang=.02+turn*.32-Math.max(0,turn-.65)*.3;
 overheadBoat(c,bx,by,.82,t,ang,pull);
 // A planted blade sends a broad fan of ink outward; bend begins afterwards.
 if(q>1.7&&q<3.7){let sp=(q-1.7)/2;splash(c,1108,760,1.7,sp,39);let a=clamp((q-1.7)/.9);pressureStroke(c,[[1184,662],[1135,746],[1033,802],[878,787]],24,{alpha:.44*Math.sin(PI*sp),seed:17,dry:.85,wet:true});}
}
function shotRelease(c,t){let q=(t-21.5)/5;landscape(c,t,{wind:.36*(1-q)});let x=mix(956,1240,ease(q)),y=mix(831,775,ease(q));rock(c,333,916,.83,61,.92);wake(c,x,y,.56,t,.55*(1-q));boat(c,x,y,.56,t,{wind:.6*(1-q),stroke:.5+.35*Math.sin(t*1.6),angle:-.025});}
function shotLamp(c,t){let q=t-26.5;
 mistMountain(c,379,130,2.4,8,.23);riverMarks(c,t,.1);
 pressureStroke(c,[[1548,1180],[1546,642],[1521,264],[1438,113],[1155,70],[873,128]],54,{alpha:.85,seed:7,dry:1,wet:true,rough:4});
 pressureStroke(c,[[1536,266],[1644,156],[1812,101],[1979,88]],29,{alpha:.76,seed:11,dry:.9});
 lantern(c,1010,432,2.56,t);
 pressureStroke(c,[[578,1022],[990,954],[1567,1005],[2012,1125]],47,{alpha:.65,seed:6,dry:.88});
 // A two-second insert with active approach: the vessel reaches beneath the light.
 let x=mix(326,700,ease(q/2));wake(c,x,802,.63,t,.13);boat(c,x,802,.63,t,{wind:.06,stroke:.5+.3*Math.sin(q*2)});
 for(let k=0;k<9;k++)pressureStroke(c,[[899-k*3,694+k*26],[993,689+k*27],[1064+k*2,694+k*26]],3+k*.32,{col:[168,101,54],alpha:.085*(1-k/12),seed:k,dry:.9});
}
function dockingState(t){let q=clamp(t-28.5,0,4.5),travel=ease(q/2.5),contact=q>=2.5;return{x:mix(1240,1348,travel),y:mix(775,750,travel),rest:ease((q-1.15)/1.1),reach:ease((q-2.8)/.85),settle:ease((q-3.55)/.6),contact,stroke:.62}}
function drawDockedBoat(c,t){let st=dockingState(t);wake(c,st.x,st.y,.47,t,st.contact?0:.25);boat(c,st.x,st.y,.47,t,{wind:0,stroke:st.stroke,rest:st.rest,reach:st.reach,settle:st.settle});
 // At contact a short ring comes off the bow, then fades; boat never resumes travel.
 if(t>=31&&t<31.8)splash(c,1460,746,.28,(t-31)/.8,12);
 if(st.reach>.7)pressureStroke(c,[[1449,726],[1451,715],[1452,744],[1436,753]],1.9,{alpha:.68*ease((st.reach-.7)/.3),seed:31,dry:.7});
}
function shotDock(c,t){
 // Continuous world geometry, much closer: bow, end post, hand and stowed oar are readable.
 c.save();c.translate(1060,724);c.scale(2.5,2.5);c.translate(-1450,-738);landscape(c,t,{wind:0});drawDockedBoat(c,t);c.restore();
}
function shotArrival(c,t){landscape(c,t,{wind:0});drawDockedBoat(c,33);
 let a=ease((t-33.15)/.6);c.save();c.globalAlpha=a;c.fillStyle=color(INK,.83);c.font='56px InkSerif';c.textAlign='center';c.fillText('归',497,302);c.fillText('岸',497,376);c.fillStyle=color(RED,.83);c.fillRect(487,405,21,25);c.strokeStyle=color(PAPER,.6);c.lineWidth=1;c.strokeRect(491,409,13,17);c.restore();
}
function render(c,t,env={}){let width=env.width||W,height=env.height||H;t=clamp(t,0,DURATION-1/FPS);c.save();c.scale(width/W,height/H);paper(c);
 if(t<6)shotWide(c,t);else if(t<11)shotRower(c,t);else if(t<15.5)shotThreat(c,t);else if(t<21.5)shotTurn(c,t);else if(t<26.5)shotRelease(c,t);else if(t<28.5)shotLamp(c,t);else if(t<33)shotDock(c,t);else shotArrival(c,t);
 c.restore()}
module.exports={render,duration:DURATION,DURATION,cuts:[6,11,15.5,21.5,26.5,28.5,33],textStrings:['归岸'],routeAt,dockingState,fps:FPS,width:W,height:H,title:'归岸 / Homeward',shots:[{in:0,out:6,name:'A crossing begins',scale:'wide'},{in:6,out:11,name:'Wind meets the rower',scale:'close'},{in:11,out:15.5,name:'The river draws her toward stone',scale:'medium wide'},{in:15.5,out:21.5,name:'One stroke changes the route',scale:'overhead'},{in:21.5,out:26.5,name:'Past the stone',scale:'wide'},{in:26.5,out:28.5,name:'The waiting light',scale:'detail'},{in:28.5,out:33,name:'Bow contact, oar stow, hand to landing',scale:'close'},{in:33,out:36,name:'Homeward, docked and still',scale:'wide hold'}]};
