// Original musical storyboard. Geometry is authored for each output window.
export function createForgeProject(ratio='16:9',{samples=3}={}) {
  const profiles={
    '16:9':{span:1080,hero:120,title:104,brand:112,work:980,small:180,clip:280,charge:280},
    '9:16':{span:326,hero:72,title:60,brand:72,work:326,small:112,clip:94,charge:90},
    '1:1':{span:620,hero:88,title:84,brand:84,work:620,small:160,clip:180,charge:172},
  };
  if(!profiles[ratio] || ![1,3].includes(samples)) throw new Error('Unsupported forge configuration');
  const p=profiles[ratio], portrait=ratio==='9:16';
  const q=t=>Math.round(t*30)/30;
  const track=(points)=>{
    const keys=new Map();let pose={x:0,y:0,w:100,h:100,opacity:1,rotation:0,radius:0};
    for(const [time,next] of points){const {at:ignored,easing,...geometry}=next;pose={...pose,...geometry};keys.set(q(time),{...pose,at:q(time),easing:easing||'linear'});}
    const out=[...keys.values()].sort((a,b)=>a.at-b.at);
    if(out[0].at!==0) out.unshift({...out[0],at:0});
    if(out.at(-1).at!==15) out.push({...out.at(-1),at:15,easing:'linear'});
    return out;
  };
  const C=[640,1840,3040,4240,5440];
  const sceneLeft=c=>c-p.span/2;
  const cubic=v=>v<.5?4*v*v*v:1-Math.pow(-2*v+2,3)/2;
  const formatHandoff=[];
  // Keep the rail's horizontal expansion on the same camera curve while
  // lifting it above the travelling image cards. Authored frame poses avoid
  // a fast lateral snap introduced by splitting the expansion into segments.
  const liftFrom=ratio==='16:9'?207:195;
  for(let frame=liftFrom;frame<=235;frame++){
    const travel=cubic(Math.max(0,Math.min(1,(frame-212)/23)));
    const lift=cubic(Math.max(0,Math.min(1,(frame-liftFrom)/(219-liftFrom))));
    const landFrom=ratio==='1:1'?224:226;
    const land=cubic(Math.max(0,Math.min(1,(frame-landFrom)/(235-landFrom))));
    formatHandoff.push([frame/30,{x:C[2]-22+(C[3]-p.work/2-(C[2]-22))*travel,
      y:360-296*lift+((portrait?208:330)-64)*land,w:44+(p.work-44)*travel,h:242-198*lift,easing:'linear'}]);
  }
  const text=(id,value,c,y,size,start,end,{align='left',color='ink',width=Math.min(p.span,Math.max(160,size*value.length*1.08)),weight=900,tracking=-2,entry=24}={})=>({
    id,semanticIdentity:`Original forge lettering ${id}`,kind:'text',text:value,color,
    typography:{size,weight,tracking,align,lineHeight:1.18},keyframes:track([
      [0,{x:align==='left'?sceneLeft(c):c-width/2,y:y+entry,w:width,h:size*1.18+24,opacity:start===0?1:0}],
      [Math.max(0,start-.14),{easing:'ease-out-cubic'}],[start,{y,opacity:1}],
      ...(end>=15 ? [[15,{}]] : [[end-.14,{easing:'ease-in-out-cubic'}],[end,{y:y-16,opacity:0}],[15,{}]]),
    ]),
  });
  const spine={id:'film-spine',semanticIdentity:'The same acid film strip becomes the editing rail, the rhythm spine and the brand press',kind:'line',color:'accent',appearance:{fill:'accent',pattern:'film-perforation'},keyframes:track([
    [0,{x:C[0]-p.small/2,y:510,w:p.small,h:44,opacity:1,easing:'ease-out-cubic'}],
    [.47,{y:498,w:p.small*1.2,easing:'ease-out-cubic'}],
    [.94,{x:sceneLeft(C[0]),y:portrait?304:322,w:Math.min(p.span,p.hero*3+32),h:p.hero*1.18+28}],
    [1.08,{easing:'ease-out-cubic'}],[1.2,{y:portrait?308:326}],[1.4,{y:portrait?304:322}],
    [1.48,{easing:'ease-in-out-cubic'}],[2.13,{x:C[1]-p.work/2,y:554,w:p.work,h:44}],
    [2.66,{easing:'ease-out-cubic'}],[2.84,{y:546,h:52}],[3.05,{y:554,h:44}],
    [3.6,{easing:'ease-out-cubic'}],[3.78,{y:546,h:52}],[4.0,{y:554,h:44}],
    [4.55,{easing:'ease-out-cubic'}],[4.73,{y:538,h:60}],[4.98,{y:554,h:44}],
    [5.25,{easing:'ease-in-out-cubic'}],[5.98,{x:C[2]-22,y:360,w:44,h:242}],
    [6.25,{easing:'ease-in-out-cubic'}],[6.55,{y:340,h:270}],[6.82,{y:360,h:242}],
    ...formatHandoff,
    [9.0,{easing:'ease-out-cubic'}],[9.4,{y:portrait?202:320,h:54}],[9.7,{y:portrait?208:330,h:44}],
    [10.85,{easing:'ease-out-cubic'}],[11.2,{y:portrait?202:320,h:54}],[11.45,{y:portrait?208:330,h:44}],
    [12.63,{easing:'ease-in-out-cubic'}],[13.13,{x:C[4]-p.work/2,y:portrait?320:300,w:p.work,h:portrait?270:220,easing:'ease-out-cubic'}],
    [13.27,{y:portrait?326:306}],[13.43,{y:portrait?320:300}],
    [15,{}],
  ])};
  const format=(i,c=C[3],focus=0)=>{
    const boards={
      '16:9':[
        [[-490,384,560,315],[190,398,104,185],[335,470,142,142]],
        [[-490,466,220,124],[-117,286,234,416],[328,490,142,142]],
        [[-490,496,240,135],[-168,428,112,199],[114,380,322,322]],
      ],
      '1:1':[
        [[-310,390,360,203],[90,402,88,156],[206,440,96,96]],
        [[-310,474,184,112],[-76,330,188,334],[180,462,110,110]],
        [[-310,520,164,112],[-110,408,100,178],[50,420,240,240]],
      ],
      '9:16':[
        [[-163,266,326,183],[-163,495,96,171],[67,530,96,112]],
        [[-163,480,112,124],[-20,300,174,309],[-163,590,104,112]],
        [[-163,272,124,112],[89,592,74,112],[-85,350,248,248]],
      ],
    };
    const [x,y,w,h]=boards[ratio][focus][i];return {x:c+x,y,w,h};
  };
  const clips=[],labels=[];
  for(let i=0;i<3;i++){
    const start=2.34375+i*.9375;
    const work={x:C[1]-p.work/2+12+i*(p.work-24)/3,y:portrait?364:348,w:p.clip,h:portrait?156:180};
    const charge=portrait?{x:C[2]+(i===0?-142:48),y:364+(i===2?134:0),w:94,h:110}:{x:C[2]+(ratio==='1:1'?75:100),y:(ratio==='1:1'?180:120)+i*(ratio==='1:1'?150:174),w:p.charge,h:ratio==='1:1'?124:148};
    const poses=track([
      [0,{x:work.x,y:work.y+70,w:work.w,h:work.h,opacity:0}],
      [start-.18,{easing:'back-out'}],[start,{...work,opacity:1}],
      [5.25,{easing:'ease-in-out-cubic'}],[5.98,{...charge,rotation:i===1?3:-3}],
      [6.35,{easing:'ease-out-cubic'}],[6.65,{y:charge.y-14,rotation:i===1?-2:2}],[6.9,{...charge,rotation:0}],
      [7.08,{easing:'ease-in-out-cubic'}],[7.83,{...format(i),rotation:0}],
      [8.28+(i===0?0:.1),{easing:'ease-out-cubic'}],[8.44+(i===0?0:.1),{...format(i),y:format(i).y+(i===0?6:3)}],[8.65+(i===0?0:.1),{...format(i)}],
      [(portrait?8.88:9.04)+(i===1?0:.1),{easing:'ease-out-cubic'}],[9.38+(i===1?0:.1),{...format(i,C[3],1)}],
      [10.16+(i===1?0:.1),{easing:'ease-out-cubic'}],[10.31+(i===1?0:.1),{...format(i,C[3],1),y:format(i,C[3],1).y+(i===1?6:3)}],[10.53+(i===1?0:.1),{...format(i,C[3],1)}],
      [(portrait?10.84:10.98)+(i===2?0:.1),{easing:'ease-out-cubic'}],[11.34+(i===2?0:.1),{...format(i,C[3],2)}],
      [12.0+(i===2?0:.1),{easing:'ease-out-cubic'}],[12.18+(i===2?0:.1),{...format(i,C[3],2),y:format(i,C[3],2).y+(i===2?6:3)}],[12.4+(i===2?0:.1),{...format(i,C[3],2)}],
      [12.6,{easing:'ease-in-out-cubic'}],[12.76,{opacity:0}],[15,{}],
    ]);
    const id=['script-clip','picture-clip','sound-clip'][i];
    clips.push({id,semanticIdentity:['Original editorial film becomes the landscape frame','Original optics film becomes the portrait frame','Original ink film becomes the square frame'][i],kind:'image',assetId:['forge-editorial','forge-optics','forge-ink'][i],color:'ink',appearance:{fill:'canvas',stroke:'ink',strokeWidth:2,shadow:i===1?'stamp':'none'},keyframes:poses});
    for(const [phase,values,from,to] of [['work',['脚本','画面','声音'],start+.06,5.06],['format',['横屏','竖屏','方屏'],7.96,12.5]]){
      labels.push({id:`${phase}-${id}`,semanticIdentity:`Original ${phase} label attached to ${id}`,kind:'text',text:values[i],color:'ink',typography:{size:26,weight:700,tracking:0,align:'left',lineHeight:1.18},keyframes:poses.map(key=>({...key,x:key.x+12,y:key.y+18,w:Math.max(64,key.w-24),h:56,rotation:0,opacity:key.at<from||key.at>=to?0:1})).concat([])});
      // Add the exact label entry/exit poses so visibility does not depend on
      // the shape's unrelated keyframe spacing.
      const label=labels.at(-1);
      const rectAt=(t)=>{
        let left=poses[0],right=poses.at(-1);
        for(let k=1;k<poses.length;k++)if(poses[k].at>=t){left=poses[k-1];right=poses[k];break;}
        const v=(t-left.at)/(right.at-left.at||1);
        return {x:left.x+(right.x-left.x)*v+12,y:left.y+(right.y-left.y)*v+18,w:Math.max(64,left.w+(right.w-left.w)*v-24),h:56};
      };
      const captionHandoffs=phase==='format'?[[8.94,{...rectAt(8.94),opacity:1}],[9.01,{...rectAt(9.01),opacity:0}],
        [9.49,{...rectAt(9.49),opacity:0}],[9.56,{...rectAt(9.56),opacity:1}],
        [10.88,{...rectAt(10.88),opacity:1}],[10.95,{...rectAt(10.95),opacity:0}],
        [11.47,{...rectAt(11.47),opacity:0}],[11.54,{...rectAt(11.54),opacity:1}]]:[];
      const mapped=label.keyframes.map(k=>[k.at,{...k,opacity:phase==='format'&&((k.at>=9.01&&k.at<=9.49)||(k.at>=10.95&&k.at<=11.47))?0:k.opacity}]);
      label.keyframes=track([...mapped,...captionHandoffs,[from-.04,{...rectAt(from-.04),opacity:0}],[from,{...rectAt(from),opacity:1}],[to-.1,{...rectAt(to-.1),opacity:1}],[to,{...rectAt(to),opacity:0}]].sort((a,b)=>a[0]-b[0]));
    }
  }
  const headlineY=portrait?146:126;
  const heroTop=portrait?154:108,heroBottom=portrait?304:322;
  const objects=[spine,...clips,...labels,
    text('ignite-top','让想法',C[0],heroTop,p.hero,0,1.43),
    text('ignite-bottom','动起来',C[0]+12,heroBottom+10,p.hero,.94,1.43,{color:'on-accent',width:Math.min(p.span-24,p.hero*3+16),entry:-32}),
    text('write-title','写成脚本',C[1],headlineY,p.title,2.34,3.08),
    text('picture-title','做成画面',C[1],headlineY,p.title,3.28,4.03),
    text('sound-title','接上声音',C[1],headlineY,p.title,4.22,5.05),
    text('charge-top','找准',C[2],portrait?90:80,p.hero,6.02,7.02),
    text('charge-bottom','节奏',C[2],portrait?224:308,p.hero,6.13,7.02,{color:'accent'}),
    text('land-title','横屏有场面',C[3],portrait?78:100,portrait?52:p.title,7.94,9.17),
    text('port-title','竖屏有冲击',C[3],portrait?78:100,portrait?52:p.title,9.5,11.05),
    text('square-title','方屏有章法',C[3],portrait?78:100,portrait?52:p.title,11.38,12.55),
    text('brand-press','黑哥视频',C[4],portrait?394:326,p.brand,13.13,15.14,{color:'on-accent',align:'center',width:Math.min(p.work-32,p.brand*4+16),entry:-16}),
    text('brand-tag','锻造你的下一条作品',C[4],portrait?618:552,portrait?26:32,13.47,15.14,{color:'muted',align:'center',weight:500,tracking:0,entry:12}),
  ];
  // Keep the final keys at the exact film endpoint without fading the lockup.
  for(const item of objects){item.keyframes=item.keyframes.filter(k=>k.at<=15);if(item.id.startsWith('brand-')) item.keyframes.at(-1).opacity=1;}
  const camera=track([[0,{x:C[0],y:360,w:1,h:1,opacity:1,rotation:0,radius:0}],[1.48,{easing:'ease-in-out-cubic'}],[2.13,{x:C[1]}],[5.25,{easing:'ease-in-out-cubic'}],[5.98,{x:C[2]}],[7.08,{easing:'ease-in-out-cubic'}],[7.83,{x:C[3]}],[12.63,{easing:'ease-in-out-cubic'}],[13.13,{x:C[4]}],[15,{}]]).map(({at,x,y,rotation,easing})=>({at,x,y,zoom:1,rotation,easing}));
  const bounds=[0,1.875,5.625,7.5,13.125,15].map(q);
  const names=['ignite','assemble','charge','formats','seal'];
  const titles=['想法点火','脚本画面声音装配','节奏蓄力','画幅重新编排','品牌压印'];
  return {schemaVersion:'heige-video/4',title:'黑哥视频 熔炉原创短片',mode:'promo',ratio,theme:'forge',fps:30,seed:20261012,brand:'HeiGe Video',
    assets:[['forge-editorial','editorial.png'],['forge-optics','optics.png'],['forge-ink','ink.png']].map(([id,name])=>({id,path:`forge-assets/${name}`,kind:'image',source:'original',rights:'HeiGe-Video original demonstration artwork, MIT. See demos/README.md for authored film provenance.'})),
    shots:names.map((id,i)=>({id,type:'beat',title:titles[i],duration:bounds[i+1]-bounds[i]})),
    continuity:{objects,camera,boundaries:names.slice(1).map((name,i)=>({fromShot:names[i],toShot:name,carrier:'film-spine',cause:['酸绿胶片拉开为装配轨道','装配轨道收拢为节奏脊柱','脊柱展开为多画幅导轨','画幅导轨压成品牌印章'][i],outcome:titles[i+1]})),
      soundEvents:[.9375,1.875,2.34375,3.28125,4.21875,5.625,6.5625,7.5,9.375,11.25,13.125,14.0625].map((at,i)=>({id:`forge-action-${i}`,at:q(at),objectId:i===0?'ignite-bottom':i===10||i===11?'brand-press':'film-spine',type:i===0||i===5||i===7||i===10?'impact':i===1||i===6?'whoosh':'tick',volume:i===10?.28:.13})),
      musicScore:{style:'forge-breakbeat',bpm:128,volume:.8},blur:{samples,shutterAngle:180}},
  };
}
