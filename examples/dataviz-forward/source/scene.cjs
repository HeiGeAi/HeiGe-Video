// Original film: 拆开平均数. Canvas procedural artwork, no external media.
// Absolute-time source. Data are immutable, projection alone changes.
const data = require('../data.json');
const {createCues, easeInOutCubic, easeOutCubic, lerp, clamp, noiseAt} = require('./motion.cjs');
const DURATION=26, SEED=20261006;
const C={paper:'#f3efe4', ink:'#172f34', mute:'#687772', rule:'#c4c7bb', A:'#167e77', B:'#cf5c3f', white:'#fffcf4', gold:'#eab859'};
const TEXT_STRINGS=['拆开平均数','都写“平均 10 分钟”','为什么等起来，差这么多？','看看藏在平均数里的每一单','把同一批订单，排到一把时间尺上','平均数相同，等待波动不同','这 6 单里，A 更稳定；B 有快有慢','服务 A','服务 B','平均送达','分钟','6 单','实际送达用时 / 分钟','每个纸袋 = 1 单','每一单用时 →','A 集中','B 分成两头','8–12 分钟','1–3 分钟','17–19 分钟','3 单很快','3 单较慢','平均都在这里','60 ÷ 6 = 10','虚构教学数据 · 每组 6 单 · 不代表真实业务','平均 10 分钟','0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20','A1 A2 A3 A4 A5 A6 B1 B2 B3 B4 B5 B6'];
const cues=createCues({uncover:{start:3.4,end:5.0,ease:easeInOutCubic},morph:{start:10.0,end:13.3,ease:easeInOutCubic},ranges:{start:14,end:14.8,ease:easeOutCubic},mean:{start:18,end:19.2,ease:easeInOutCubic},ending:{start:20,end:20.8,ease:easeInOutCubic}});
const records=Object.entries(data.groups).flatMap(([g,values])=>values.map((value,i)=>({id:`${g}${i+1}`,group:g,index:i,value})));
function stateAt(t){let morph=cues.at('morph',t).eased;return {t,uncover:cues.at('uncover',t).eased,morph,ranges:cues.at('ranges',t).eased,mean:cues.at('mean',t).eased,ending:cues.at('ending',t).eased,records:records.map(r=>{const base=r.group==='A'?120:720;const ix=base+r.value*20.5;const iy=270+r.index*49;let fy=r.group==='A'?338:514;if(r.group==='A'&&r.index===3)fy-=62;const p=easeInOutCubic(clamp((t-(r.group==='A'?10:10.4))/(r.group==='A'?1.55:2.9),0,1));const arc=r.group==='B'&&r.index<3?175*(1-Math.exp(-p/.015))*(1-Math.exp(-(1-p)/.15)):0;return {...r,x:lerp(ix,165+r.value*47.5,p),y:lerp(iy,fy,p)+arc,startX:lerp(base,165+r.value*47.5,p),strip:1-p}})}}
function render(ctx,t,options){const s=options.state||stateAt(t),{width,height}=options;ctx.save();ctx.scale(width/1280,height/720);const F=options.fontFamily||'Noto Sans CJK SC';
 function alpha(a,fn){if(a<=0)return;ctx.save();ctx.globalAlpha*=a;fn();ctx.restore()}
 function txt(str,x,y,size=28,color=C.ink,align='left'){ctx.font=`400 ${size}px "${F}"`;ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(str,x,y)}
 function rr(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.2;ctx.stroke()}}
 function line(x,y,x2,y2,col=C.rule,w=1){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.strokeStyle=col;ctx.lineWidth=w;ctx.stroke()}
 function chip(str,x,y,w,col=C.ink,size=24){rr(x-w/2,y-21,w,42,21,col);txt(str,x,y,size,C.white,'center')}
 function bracket(x1,x2,y,col,label){line(x1,y,x2,y,col,2);line(x1,y-8,x1,y+4,col,2);line(x2,y-8,x2,y+4,col,2);txt(label,(x1+x2)/2,y+29,24,col,'center')}
 function bag(r){const col=C[r.group],x=r.x,y=r.y;ctx.save();ctx.translate(x,y);ctx.shadowColor='#172f3420';ctx.shadowBlur=6;ctx.shadowOffsetY=4;ctx.beginPath();ctx.moveTo(-22,-27);ctx.lineTo(21,-27);ctx.lineTo(25,8);ctx.quadraticCurveTo(25,13,20,13);ctx.lineTo(-21,13);ctx.quadraticCurveTo(-25,12,-25,7);ctx.closePath();ctx.fillStyle=col;ctx.fill();ctx.shadowColor='transparent';line(-17,-24,17,-24,'#ffffff55',1);ctx.strokeStyle=col;ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-27,7,Math.PI,0);ctx.stroke();ctx.fillStyle='#ffffff16';ctx.beginPath();ctx.moveTo(14,-25);ctx.lineTo(20,10);ctx.lineTo(24,8);ctx.lineTo(20,-25);ctx.fill();txt(String(r.value),0,-8,26,C.white,'center');txt(r.id,0,7,9,C.white,'center');ctx.restore()}
 // A quiet paper surface, material grain is fixed in screen/object space.
 ctx.fillStyle=C.paper;ctx.fillRect(0,0,1280,720);for(let i=0;i<1150;i++){let x=noiseAt(SEED,`x${i}`)*1280,y=noiseAt(SEED,`y${i}`)*720;ctx.fillStyle=i%2?'#172f3404':'#ffffff28';ctx.fillRect(x,y,1,1)}
 txt('拆开平均数',64,43,20,C.mute);txt('FICTIONAL DATA / 06 + 06',1216,43,15,C.mute,'right');line(64,68,1216,68,C.rule);
 let title=t<3.4?'都写“平均 10 分钟”':t<10?'看看藏在平均数里的每一单':t<13.3?'把同一批订单，排到一把时间尺上':t<20?'同样 10 分钟，分布却不同':'平均数相同，等待波动不同';
 let size=t>=10&&t<13.3?40:47;txt(title,640,113,size,C.ink,'center');
 let sub=t<3.4?'为什么等起来，差这么多？':t<10?'每一单用时 →':t<20?'每个纸袋 = 1 单':'这 6 单里，A 更稳定；B 有快有慢';txt(sub,640,169,27,C.mute,'center');
 // Both notebook panels are one persistent physical substrate; panels disappear as marks spread into a common domain.
 alpha(1-s.morph,()=>{for(let k=0;k<2;k++){let x=76+k*600;rr(x,207,528,370,14,C.white,'#d5d5c8');line(x+43,228,x+43,554,'#cf5c3f35');for(let i=0;i<6;i++){let y=270+i*49;line(x+16,y+23,x+510,y+23,'#e8e8de')}txt('实际送达用时 / 分钟',x+264,603,21,C.mute,'center');[0,5,10,15,20].forEach(v=>{let xx=x+44+v*20.5;txt(String(v),xx,552,17,C.mute,'center')})}});
 // Shared honest 0–20 domain. Fades in only once quantitative projection is settled.
 alpha(clamp((s.morph-.93)/.07,0,1),()=>{for(let v=0;v<=20;v++){let x=165+v*47.5;line(x,240,x,551,v===10?'#a9b2a4':'#deded3',v===10?1.3:.7);line(x,551,x,v%5?557:564,C.mute,v%5?1:1.8);if(v%5===0)txt(String(v),x,588,26,C.ink,'center')}txt('实际送达用时 / 分钟',1115,628,22,C.mute,'right');line(165,551,1115,551,C.ink,1.6)});
 alpha(s.mean,()=>{ctx.setLineDash([6,7]);line(640,239,640,369,C.ink,2.2);line(640,432,640,544,C.ink,2.2);ctx.setLineDash([])});
 // Group names change anchor with the data; no class color changes.
 for(let g of ['A','B']){let k=g==='A'?0:1,x=s.morph<.5?139+k*600:88,y=s.morph<.5?210:(g==='A'?321:497);const labelAlpha=s.morph<.5?1-clamp(s.morph*5,0,1):clamp((s.morph-.8)*5,0,1);alpha(s.uncover*labelAlpha,()=>chip(s.morph>.5?g:`服务 ${g}`,x,y,s.morph<.5?118:58,C[g],26))}
 // Stable row-key mapping: each receipt shortens onto its own original endpoint.
 for(const r of s.records){alpha(s.uncover,()=>{if(r.strip>0.001){let y=r.y;rr(r.startX,y-18,Math.max(2,r.x-r.startX),32,3,`${C[r.group]}22`);line(r.startX,y+14,r.x,y+14,`${C[r.group]}77`,1);txt(r.id,r.startX-13,y-1,16,C.mute,'right')}bag(r)})}
 // Front covers physically lift, revealing the true individual observations.
 const lift=s.uncover;for(let k=0;k<2;k++){let x=76+k*600,col=C[k?'B':'A'];alpha(1-lift,()=>{ctx.save();ctx.beginPath();ctx.rect(55,195,1170,440);ctx.clip();ctx.translate(x+264,390-170*lift);ctx.rotate((k?1:-1)*.065*lift);ctx.shadowColor='#172f3428';ctx.shadowBlur=16;ctx.shadowOffsetY=9;rr(-264,-183,528,370,14,col);ctx.shadowColor='transparent';rr(-253,-173,506,350,10,null,'#ffffff30');for(let n=0;n<7;n++)line(-231+n*71,154,-216+n*71,154,'#ffffff70',3);txt(`服务 ${k?'B':'A'}`,0,-134,28,C.white,'center');txt('平均送达',0,-69,31,C.white,'center');txt('10',-10,23,134,C.white,'center');txt('分钟',95,58,27,C.white,'center');txt('6 单',0,133,23,C.white,'center');ctx.restore()})}
 // Range consequences: actual extents, not arbitrary decoration.
 alpha(s.ranges,()=>{bracket(165+8*47.5-24,165+12*47.5+24,382,C.A,'8–12 分钟');bracket(165+1*47.5-24,165+3*47.5+24,557,C.B,'1–3 分钟');bracket(165+17*47.5-24,165+19*47.5+24,557,C.B,'17–19 分钟');txt('A 集中',1070,339,29,C.A,'right');if(t<18){txt('3 单很快',280,438,25,C.B,'center');txt('3 单较慢',1020,438,25,C.B,'center')}});
 // Both exact means share the same physical reference line; never reassign record values.
 alpha(s.mean,()=>{let x=640;chip('平均 10 分钟',x,218,210,C.ink,26);rr(505,447,270,52,8,C.paper);txt('60 ÷ 6 = 10',640,472,26,C.ink,'center')});
 line(64,657,1216,657,C.rule);txt('虚构教学数据 · 每组 6 单 · 不代表真实业务',640,687,23,C.mute,'center');
 ctx.restore();}
module.exports={DURATION,SEED,CUTS:[],TEXT_STRINGS:[...TEXT_STRINGS,'同样 10 分钟，分布却不同'],ready:async()=>{if(JSON.stringify(data.groups)!==JSON.stringify({A:[8,9,10,10,11,12],B:[1,2,3,17,18,19]}))throw Error('Unexpected source data')},stateAt,render,records};
