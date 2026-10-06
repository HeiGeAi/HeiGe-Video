'use strict';
// Original illustration and film by HeiGe-Video. Persistent world coordinates.
// Chinese labels are typeset; line art is constructed by actual path-length reveal.
const runtimePath=require('node:fs').existsSync(require('node:path').join(__dirname,'../../runtime/motion.cjs'))?'../../runtime/motion.cjs':'../../heige-video/runtime/motion.cjs';
const {clamp,lerp,smoothstep,easeInOutCubic,trimPolyline,applyCamera}=require(runtimePath);
const DURATION=42;
const C={paper:'#faf9f3',ink:'#283431',muted:'#7d8b85',faint:'#dce1d6',blue:'#28649b',orange:'#c75a32',green:'#2d8068',lightblue:'#d7e6ed',lightorange:'#f2d9c9'};
const P=(x,y)=>({x,y});
const textStrings=[
 '38 微秒，为什么关乎你在哪里？','GPS × 相对论','-1001020304050','位置，','才有依据','定位，先是一道','计时题','你在这里','传播时间 × 光速 ≈ 距离','卫星发出时间戳','手机收到信号','轨道上的钟','地面钟 · 基准','运动效应','高速运动，让钟慢一点','−7','微秒 / 天','引力效应','引力势更高，让钟快一点','+45','同一颗卫星，两种效应','相对地面钟 · 未校正','+45 − 7 =','+38','每天快约 38 微秒','这点时间，能差多远？','38 微秒 × 光速','≈ 11.4 km','信号测距等效量','不是手机每天漂移 11.4 公里','现实中的 GPS 会做相对论与其他校正','校正时间','再用多颗卫星定位','4 路信号 · 共同求解','让时间对齐','位置，才有依据','空间关系与钟速差异为示意','数值为近似值 · 来源：NIST','运动','引力','合计','01','02','03','04','05','06','07','微秒 / 天（相对地面钟）','时间戳 → 传播时间 → 测距','两种效应，方向相反','更高的引力势，把钟速推向另一边','先合并钟差，再看它意味着什么','时间差乘光速，得到测距等效量','校正后，多路信号共同约束位置','你的蓝点背后，有相对论'
];
function q(t,start,duration=1){return clamp((t-start)/duration)}
function alpha(t,start,end=1e6,d=.32){return smoothstep(q(t,start,d))*(1-smoothstep(q(t,end,d)))}
function points(xs){return xs.map(([x,y])=>P(x,y));}
function line(x,y,x2,y2,n=24,seed=1,amp=.8){let a=[];for(let i=0;i<=n;i++){let p=i/n;a.push(P(lerp(x,x2,p)+Math.sin(i*1.7+seed)*amp*Math.sin(Math.PI*p),lerp(y,y2,p)+Math.sin(i*1.1+seed*2)*amp*Math.sin(Math.PI*p)));}return a;}
function arc(x,y,r,a,b,n=90,sx=1,sy=1){let v=[];for(let i=0;i<=n;i++){let p=i/n,ang=lerp(a,b,p),j=.6*Math.sin(i*.77);v.push(P(x+Math.cos(ang)*(r+j)*sx,y+Math.sin(ang)*(r+j)*sy));}return v;}
function bezier(p0,p1,p2,p3,n=70){let out=[];for(let i=0;i<=n;i++){let t=i/n,u=1-t;out.push(P(u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0],u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1]));}return out;}
function roundedRect(x,y,w,h,r=25){return [].concat(arc(x+r,y+r,r,Math.PI,1.5*Math.PI,12),line(x+r,y,x+w-r,y),arc(x+w-r,y+r,r,-Math.PI/2,0,12),line(x+w,y+r,x+w,y+h-r),arc(x+w-r,y+h-r,r,0,Math.PI/2,12),line(x+w-r,y+h,x+r,y+h),arc(x+r,y+h-r,r,Math.PI/2,Math.PI,12),line(x,y+h-r,x,y+r));}
let tip=null;
function path(ctx,pts,t,start,dur=1,color=C.ink,width=4,{fill=null,opacity=1,pen=true}={}){let p=q(t,start,dur);if(!p)return;ctx.save();ctx.globalAlpha*=opacity;ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=width;ctx.strokeStyle=color;if(fill&&p===1){ctx.fillStyle=fill;ctx.beginPath();pts.forEach((a,i)=>i?ctx.lineTo(a.x,a.y):ctx.moveTo(a.x,a.y));ctx.closePath();ctx.fill();}let ps=trimPolyline(pts,p);ctx.beginPath();ps.forEach((a,i)=>i?ctx.lineTo(a.x,a.y):ctx.moveTo(a.x,a.y));ctx.stroke();ctx.restore();if(p>0&&p<1&&pen){let a=ps[ps.length-1],b=ps[Math.max(0,ps.length-3)];tip={x:a.x,y:a.y,angle:Math.atan2(a.y-b.y,a.x-b.x),color};}}
function txt(ctx,text,x,y,size=48,color=C.ink,opacity=1,weight=600,align='left'){if(ctx._worldText){const m=ctx.getTransform(),bottom=(m.b*x+m.d*y+m.f+size*m.d*.12)/ctx._pixelScale;opacity*=clamp((960-bottom)/8);}if(opacity<=0)return;ctx.save();ctx.globalAlpha*=opacity;ctx.fillStyle=color;ctx.font=`${weight} ${size}px "${ctx._font||'Noto Sans CJK SC'}"`;ctx.textAlign=align;ctx.textBaseline='alphabetic';ctx.fillText(text,x,y);ctx.restore();}
function circle(ctx,x,y,r,color,opacity=1){ctx.save();ctx.globalAlpha*=opacity;ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.restore();}
function arrow(ctx,pts,t,start,dur,color=C.ink,w=4){path(ctx,pts,t,start,dur,color,w);const a=pts.at(-1),b=pts.at(-3),ang=Math.atan2(a.y-b.y,a.x-b.x),s=17;path(ctx,[P(a.x-Math.cos(ang-.5)*s,a.y-Math.sin(ang-.5)*s),a,P(a.x-Math.cos(ang+.5)*s,a.y-Math.sin(ang+.5)*s)],t,start+dur,.15,color,w,{pen:false});}
const phone={x:310,y:645,w:340,h:620};
function phoneArt(ctx,t){let{x,y,w,h}=phone;
 path(ctx,roundedRect(x,y,w,h,42),t,.12,1.1,C.ink,6,{fill:C.paper});
 path(ctx,line(x+118,y+27,x+220,y+27),t,1.22,.24,C.ink,6);
 path(ctx,line(x+135,y+h-23,x+205,y+h-23),t,1.48,.2,C.ink,6);
 // The street geometry is authored once and reused unchanged on return.
 const streets=[[[x+24,y+185],[x+316,y+133]],[[x+24,y+335],[x+316,y+283]],[[x+24,y+490],[x+316,y+445]],[[x+85,y+70],[x+125,y+560]],[[x+227,y+70],[x+263,y+560]]];
 streets.forEach((a,i)=>path(ctx,line(...a[0],...a[1],30,i,.5),t,1.1+i*.22,.22,C.muted,2.2));
 const blocks=[[141,88,56,62],[31,210,45,82],[138,212,66,52],[40,369,55,67],[154,365,65,72],[156,491,67,49],[274,326,35,75]];
 blocks.forEach((b,i)=>path(ctx,roundedRect(x+b[0],y+b[1],b[2],b[3],4),t,1.75+i*.12,.33,C.faint,2,{fill:'#e8eadf',pen:false}));
 const route=points([[x+49,y+526],[x+122,y+512],[x+111,y+367],[x+194,y+351],[x+190,y+298]]);
 path(ctx,route,t,2.1,1.2,C.blue,9);
 const final= smoothstep(q(t,34.4,1.5));
 const loc={x:x+190,y:y+298};
 if(t>2.8){circle(ctx,loc.x,loc.y,34,C.lightblue,alpha(t,2.8)*(.65+.08*Math.sin(t*2)));circle(ctx,loc.x,loc.y,15,C.blue,alpha(t,2.8));circle(ctx,loc.x-4,loc.y-4,4,'#fff',alpha(t,2.8));}
 if(t>33.3){ctx.save();ctx.beginPath();ctx.rect(x+14,y+60,w-28,h-105);ctx.clip();[[-105,60,430],[545,86,416],[198,-166,462],[530,632,494]].forEach((v,i)=>path(ctx,arc(x+v[0],y+v[1],Math.hypot(loc.x-x-v[0],loc.y-y-v[1]),0,Math.PI*2,140),t,33.3+i*.35,.7,C.green,2.3,{opacity:.6}));ctx.restore();}
 if(final>0){path(ctx,arc(loc.x,loc.y,31,0,Math.PI*2,60),t,34.6,.7,C.green,3,{pen:false});path(ctx,points([[x+247,y+549],[x+261,y+564],[x+291,y+531]]),t,35,.4,C.green,7);}
 txt(ctx,'你在这里',x+w/2,y+h+50,42,C.blue,alpha(t,2.7)*(t>25.8&&t<32.3?0:1),600,'center');
}
function satellite(ctx,t,x=1240,y=285,s=1,begin=4.7,passive=false){ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.rotate(-.16);
 path(ctx,roundedRect(-55,-60,110,125,8),t,begin,.55,C.ink,4,{fill:'#f1ebd9',pen:false});
 path(ctx,points([[-55,-14],[-220,-14],[-220,74],[-55,74]]),t,begin+.18,.55,C.ink,4,{fill:C.lightblue,pen:false});
 path(ctx,points([[55,-14],[220,-14],[220,74],[55,74]]),t,begin+.28,.55,C.ink,4,{fill:C.lightblue,pen:false});
 for(let i=1;i<5;i++){path(ctx,line(-220+i*33,-14,-220+i*33,74,10),t,begin+.5+i*.055,.18,C.blue,1.6,{pen:false});path(ctx,line(55+i*33,-14,55+i*33,74,10),t,begin+.54+i*.055,.18,C.blue,1.6,{pen:false});}
 path(ctx,line(-220,31,-55,31),t,begin+.65,.25,C.blue,1.6,{pen:false});path(ctx,line(55,31,220,31),t,begin+.67,.25,C.blue,1.6,{pen:false});
 path(ctx,line(-9,-60,-9,-91),t,begin+.7,.2,C.ink,3,{pen:false});path(ctx,arc(-9,-104,22,.12,Math.PI-.12,30),t,begin+.86,.3,C.ink,3,{pen:false});
 path(ctx,points([[-28,65],[-41,102],[37,102],[25,65]]),t,begin+.86,.28,C.ink,3,{pen:false});
 ctx.restore();
}
function clockArt(ctx,t,x,y,start,label,satelliteClock){const r=106,color=satelliteClock?C.orange:C.ink;
 path(ctx,arc(x,y,r,-Math.PI/2,Math.PI*1.5),t,start,.65,color,5,{fill:C.paper});
 for(let i=0;i<12;i++){let a=i*Math.PI/6-Math.PI/2;path(ctx,line(x+Math.cos(a)*89,y+Math.sin(a)*89,x+Math.cos(a)*99,y+Math.sin(a)*99,5),t,start+.5+i*.035,.17,color,i%3?2:4,{pen:false});}
 if(t>start+.8){let phase=(t-start)*.8;if(satelliteClock)phase+= t<15?-q(t,11,3)*.38:q(t,16,4)*.6-.38;let a=phase-Math.PI/2;path(ctx,points([[x,y-54],[x,y],[x+Math.cos(a)*76,y+Math.sin(a)*76]]),t,start+.8,.45,color,5,{pen:false});circle(ctx,x,y,8,color);}
 txt(ctx,label,x,y+141,40,color,alpha(t,start+.9),600,'center');
}
function field(ctx,t){
 const focus=(t>25.6&&t<32.3)?0:1;ctx.save();ctx.globalAlpha*=focus;
 path(ctx,arc(410,1630,450,Math.PI*1.08,Math.PI*1.93,130),t,4.7,1.4,C.ink,4,{pen:false});
 path(ctx,arc(410,1630,430,Math.PI*1.11,Math.PI*1.87,120),t,5.4,1.5,C.faint,2,{pen:false});
 // Latitude arcs and a small ground-clock tower make a physical ground anchor.
 path(ctx,bezier([230,1220],[390,1330],[690,1330],[829,1250]),t,6,1,C.faint,2,{pen:false});
 ctx.restore();
 for(let i=0;i<5;i++)path(ctx,bezier([940+i*95,1220],[1080+i*75,1000],[1190+i*62,800],[1260+i*54,655]),t,15.1+i*.13,1.1,C.orange,1.8,{opacity:.27,pen:false});
}
function board(ctx,t){field(ctx,t);phoneArt(ctx,t);satellite(ctx,t);
 // Constant geometric signal connection between the same two subjects.
 arrow(ctx,line(1220,392,500,853,85,6,.35),t,5.8,1.4,C.blue,3.8);
 if(t>6.8&&t<33){let p=((t-6.8)*.7)%1;circle(ctx,lerp(1220,500,p),lerp(392,853,p),8,C.blue,.9);}
 txt(ctx,'卫星发出时间戳',1110,130,41,C.ink,alpha(t,6.2,8.7),500);
 txt(ctx,'手机收到信号',260,1387,41,C.ink,alpha(t,6.5,8.7),500);
 txt(ctx,'传播时间 × 光速 ≈ 距离',690,680,57,C.blue,(t<9?alpha(t,7.1,8.65):alpha(t,38.8)),600);
 // Typeset opening premise, not a handwriting wipe.
 txt(ctx,'定位，先是一道',800,849,82,C.ink,alpha(t,.35,4.25),700);
 txt(ctx,'计时题',800,960,122,C.blue,alpha(t,.62,4.25),700);
 path(ctx,bezier([804,995],[963,978],[1129,1007],[1268,985]),t,1.25,.65,C.orange,6,{opacity:alpha(t,0,4.25),pen:false});
 // Clocks are the same objects throughout effects, budget and final overview.
 clockArt(ctx,t,1410,575,9,'轨道上的钟',true);
 clockArt(ctx,t,1410,1055,9.45,'地面钟 · 基准',false);
 arrow(ctx,bezier([1210,233],[1260,116],[1450,129],[1544,274]),t,10.6,.9,C.blue,5);
 path(ctx,line(1470,282,1570,311),t,11.05,.3,C.blue,3,{pen:false});
 txt(ctx,'运动效应',1710,368,56,C.blue,alpha(t,10.3),700);
 txt(ctx,'高速运动，让钟慢一点',1710,444,49,C.ink,alpha(t,10.65),500);
 txt(ctx,'−7',1730,622,167,C.blue,alpha(t,11.4),700);
 txt(ctx,'微秒 / 天',2000,610,49,C.blue,alpha(t,11.65),500);
 arrow(ctx,bezier([1514,575],[1595,575],[1588,574],[1654,574]),t,11.25,.55,C.blue,4);
 // Gravity is shown by a vertical potential/altitude construction.
 arrow(ctx,line(1140,1090,1140,544),t,15.3,1.1,C.orange,4);
 path(ctx,line(1108,1090,1172,1090),t,15.25,.25,C.orange,4,{pen:false});
 txt(ctx,'引力效应',1710,814,56,C.orange,alpha(t,15.2),700);
 txt(ctx,'引力势更高，让钟快一点',1710,890,49,C.ink,alpha(t,15.65),500);
 txt(ctx,'+45',1720,1078,167,C.orange,alpha(t,16.5),700);
 txt(ctx,'微秒 / 天',2100,1066,49,C.orange,alpha(t,16.75),500);
 arrow(ctx,bezier([1502,631],[1605,702],[1570,1033],[1654,1033]),t,16.15,.85,C.orange,4);
 txt(ctx,'同一颗卫星，两种效应',1550,1310,58,C.ink,alpha(t,21.0),700);
 // A common-scale signed budget uses 13 world units per microsecond.
 const bx=1750,by=1450,unit=13;
 path(ctx,line(bx-150,by+228,bx+675,by+228),t,21.6,.75,C.muted,2);
 for(let v=-10;v<=50;v+=10){let x=bx+v*unit;path(ctx,line(x,by+219,x,by+241),t,21.7+(v+10)*.008,.18,C.muted,2,{pen:false});txt(ctx,String(v),x,by+280,26,C.muted,alpha(t,22),500,'center');}
 txt(ctx,'引力',1525,by+31,39,C.orange,alpha(t,21.3),600);
 txt(ctx,'运动',1525,by+106,39,C.blue,alpha(t,22.2),600);
 txt(ctx,'合计',1525,by+185,39,C.green,alpha(t,23.45),600);
 path(ctx,line(bx,by+158,bx+38*unit,by+158),t,23.45,.55,C.green,19,{pen:false});
 const grav=q(t,21.45,1.25),mov=q(t,22.7,.8);
 path(ctx,line(bx,by,bx+45*unit,by),t,21.45,1.25,C.orange,26,{pen:false});
 arrow(ctx,line(bx+45*unit,by+78,bx+38*unit,by+78),t,22.7,.8,C.blue,16);
 path(ctx,line(bx+45*unit,by-33,bx+45*unit,by+36),t,22.4,.25,C.orange,3,{pen:false});
 path(ctx,line(bx+38*unit,by+52,bx+38*unit,by+219),t,23.25,.4,C.green,3,{pen:false});
 txt(ctx,'+45 − 7 =',1538,1848,74,C.ink,alpha(t,23.4),500);
 txt(ctx,'+38',2055,1861,150,C.green,alpha(t,23.7),700);
 txt(ctx,'每天快约 38 微秒',1538,1961,55,C.green,alpha(t,24.05),600);
 txt(ctx,'相对地面钟 · 未校正',1538,2040,39,C.muted,alpha(t,24.05),500);
 // Conversion is physically a signal-distance equivalent; disclaimer remains large.
 arrow(ctx,bezier([2010,1930],[1420,2100],[1230,1645],[1110,1578]),t,25.8,1.1,C.green,4);
 ctx.save();ctx.translate(-1560,-650);
 const conversionLabelContext=1; // Subtitle-safe world clipping preserves the spatial argument during travel.
 txt(ctx,'38 微秒 × 光速',1550,2220,64,C.ink,alpha(t,25.9)*conversionLabelContext,600);
 txt(ctx,'≈ 11.4 km',1530,2420,156,C.orange,alpha(t,26.55)*conversionLabelContext,700);
 txt(ctx,'信号测距等效量',1550,2520,55,C.orange,alpha(t,27.2)*conversionLabelContext,700);
 const ruler=points([[1530,2580],[2520,2580]]);
 path(ctx,ruler,t,27.3,1.1,C.orange,4,{pen:false});
 for(let i=0;i<12;i++)path(ctx,line(1530+i*90,2580,1530+i*90,2604+(i%3?0:15)),t,27.4+i*.07,.18,C.orange,3,{pen:false});
 txt(ctx,'不是手机每天漂移 11.4 公里',1530,2726,47,C.ink,alpha(t,28.35)*conversionLabelContext,700);
 ctx.restore();
 // Correction returns to the original phone; extra satellites add distinct signals.
 if(t>32.3){satellite(ctx,t,10,407,.3,32.3,true);satellite(ctx,t,668,270,.29,32.45,true);satellite(ctx,t,1720,708,.3,32.65,true);
 [[20,449],[668,308],[1715,750]].forEach((a,i)=>arrow(ctx,line(...a,500,943,55,i,.3),t,32.9+i*.25,.95,C.green,2.6));
 path(ctx,line(1220,392,500,943,60),t,33.25,1,C.green,3.5,{pen:false});
 }
 txt(ctx,'校正时间',-290,899,96,C.green,alpha(t,33.1,38.4),700);
 txt(ctx,'再用多颗卫星定位',-289,1006,56,C.ink,alpha(t,33.8,38.4),600);
 txt(ctx,'4 路信号 · 共同求解',-289,1088,38,C.muted,alpha(t,34.7,38.4),500);
 path(ctx,points([[-278,1180],[-244,1213],[-184,1140]]),t,35.2,.5,C.green,10,{opacity:alpha(t,32,38.4)});
}
// Long continuous moves and true scale changes; no slide swaps or hidden icon replacement.
const cameraKeys=[
 [0,820,980,1.15],[4.2,820,980,1.15],[6.2,870,720,.70],[8.2,870,720,.70],
 [10.0,1830,750,.91],[20.2,1830,750,.91],[22.0,2030,1660,.98],[25.3,2030,1660,.98],
 [27.1,480,1840,1.04],[31.6,480,1840,1.04],[34.0,430,980,1.15],[37.6,430,980,1.15],
 [40.0,1500,1120,.43],[42,1500,1120,.43]
];
function cameraAt(t){let k=0;while(k+1<cameraKeys.length&&t>cameraKeys[k+1][0])k++;let a=cameraKeys[k],b=cameraKeys[Math.min(k+1,cameraKeys.length-1)],p=a===b?0:easeInOutCubic((t-a[0])/(b[0]-a[0]));return{x:lerp(a[1],b[1],p),y:lerp(a[2],b[2],p),zoom:lerp(a[3],b[3],p)};}
const captions=[
 [0,4.45,'01','GPS × 相对论','你的蓝点背后，有相对论'],
 [4.45,9.0,'02','时间戳 → 传播时间 → 测距','定位，离不开精确计时'],
 [9,15.15,'03','两种效应，方向相反','运动效应：约 −7 微秒 / 天'],
 [15.15,21,'04','更高的引力势，把钟速推向另一边','引力效应：约 +45 微秒 / 天'],
 [21,26.15,'05','先合并钟差，再看它意味着什么','净效应：卫星钟每天快约 38 微秒'],
 [26.15,32.2,'06','时间差乘光速，得到测距等效量','这个量不是实际手机的每日位置漂移'],
 [32.2,38.1,'07','校正后，多路信号共同约束位置','现实中的 GPS 会做相对论与其他校正'],
 [38.1,42,'','GPS × 相对论','你的蓝点背后，有相对论']
];
function stateAt(t){return{camera:cameraAt(t),chapter:captions.findIndex(a=>t>=a[0]&&t<a[1]),phone:{...phone},satellite:{x:1240,y:285},groundClock:{x:1410,y:1055},orbitClock:{x:1410,y:575},clockBudget:{motion:-7,gravity:45,net:38},signalDistanceEquivalentKm:38e-6*299792458/1000};}
function render(ctx,t,options={}){const{width=1920,height=1080,fontFamily='Noto Sans CJK SC'}=options;ctx.save();ctx.scale(width/1920,height/1080);ctx._font=fontFamily;ctx._pixelScale=height/1080;ctx._worldText=false;ctx.fillStyle=C.paper;ctx.fillRect(0,0,1920,1080);
 // Stable light board grain. It is stationary material, not frame-to-frame noise.
 ctx.strokeStyle='#e7e8dc';ctx.lineWidth=.55;ctx.globalAlpha=.48;for(let i=0;i<45;i++){let y=(i*193+31)%1080;ctx.beginPath();ctx.moveTo((i*139)%1920,y);ctx.lineTo(Math.min(1920,(i*139)%1920+70+(i*67)%210),y+((i%3)-1)*3);ctx.stroke();}ctx.globalAlpha=1;
 const st=options.state||stateAt(t);tip=null;ctx.save();ctx.beginPath();ctx.rect(0,0,1920,960);ctx.clip();applyCamera(ctx,st.camera,{width:1920,height:1080});ctx._worldText=true;board(ctx,t);
 // Small inking stylus is tied to the computed stroke front, not a looping gesture.
 if(tip&&t<38){ctx.save();ctx.translate(tip.x,tip.y);ctx.rotate(-.6);ctx.shadowColor='#00000020';ctx.shadowBlur=7;ctx.shadowOffsetX=5;ctx.shadowOffsetY=6;ctx.fillStyle=C.ink;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(6,-17);ctx.lineTo(12,-14);ctx.closePath();ctx.fill();ctx.fillStyle='#e5e6dd';ctx.fillRect(6,-104,15,89);ctx.fillStyle=tip.color;ctx.fillRect(6,-105,15,29);ctx.shadowColor='transparent';ctx.strokeStyle=C.ink;ctx.lineWidth=1;ctx.strokeRect(6,-104,15,89);ctx.restore();}
 ctx.restore();ctx._worldText=false;
 // Restrained chapter and footer labels, never slide panels.
 let cap=captions[Math.max(0,st.chapter)]||captions.at(-1);let fade=Math.min(alpha(t,cap[0],cap[1]-.2,.2),1);
 const top=ctx.createLinearGradient(0,0,0,140);top.addColorStop(0,C.paper);top.addColorStop(.68,C.paper);top.addColorStop(1,'#faf9f300');ctx.fillStyle=top;ctx.fillRect(0,0,1920,140);
 const bot=ctx.createLinearGradient(0,948,0,966);bot.addColorStop(0,'#faf9f300');bot.addColorStop(1,C.paper);ctx.fillStyle=bot;ctx.fillRect(0,948,1920,132);
 txt(ctx,cap[2],64,66,29,C.orange,fade,700);txt(ctx,cap[3],126,67,31,C.ink,fade,600);
 txt(ctx,cap[4],960,1010,38,C.ink,fade,500,'center');
 txt(ctx,'空间关系与钟速差异为示意',64,1053,22,C.muted,.95,400);
 txt(ctx,'数值为近似值 · 来源：NIST',1856,1053,22,C.muted,.95,400,'right');
 ctx.fillStyle=C.faint;ctx.fillRect(64,1070,1792,2);ctx.fillStyle=C.blue;ctx.fillRect(64,1070,1792*clamp(t/DURATION),2);
 if(t>=39.4){let a=alpha(t,39.4,100,.6);txt(ctx,'让时间对齐',1440,447,63,C.green,a,700);txt(ctx,'位置，',1440,538,60,C.ink,a,700);txt(ctx,'才有依据',1440,626,60,C.ink,a,700);path(ctx,bezier([1442,668],[1531,660],[1670,681],[1777,661]),t,40.05,.7,C.orange,4,{pen:false});}
 ctx.restore();}
module.exports={render,DURATION,TEXT_STRINGS:textStrings.concat(captions.flatMap(x=>x.slice(2))),CUTS:[],stateAt};
