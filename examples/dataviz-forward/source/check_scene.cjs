// Project-authored technical checks. No network or third-party source execution.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {createCanvas,GlobalFonts}=require('@napi-rs/canvas');
const scene=require('./scene.cjs'), data=require('../data.json');
const FONT='/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', FAMILY='Noto Sans CJK SC';
GlobalFonts.registerFromPath(FONT,FAMILY);
const opts={width:1280,height:720,fontFamily:FAMILY};
const canvas=createCanvas(opts.width,opts.height),ctx=canvas.getContext('2d');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function pixel(t){ctx.reset();scene.render(ctx,t,{...opts,state:scene.stateAt(t)});return sha(Buffer.from(ctx.getImageData(0,0,1280,720).data))}
(async()=>{await scene.ready(opts);
let times=[.75,.75+557/24,1.5,4.2,6,11.05,11.5,12,13,16,22];for(const e of[3.4,5,10,13.3,14,14.8,18,19.2,20])for(const d of[-1/24,0,1/24])times.push(e+d);times=[...new Set(times)].sort((a,b)=>a-b);
const ascending=times.map(t=>({t,hash:pixel(t),state:JSON.stringify(scene.stateAt(t))}));
const order=times.map((_,i)=>i).sort((a,b)=>((a*17)%times.length)-((b*17)%times.length));
for(const i of order){assert.equal(pixel(times[i]),ascending[i].hash,`Pixel mismatch t=${times[i]}`);assert.equal(JSON.stringify(scene.stateAt(times[i])),ascending[i].state)}
let maxCrossOverlap=0,maxCrossAt=null;const ids=new Set(scene.records.map(r=>r.id));assert.equal(ids.size,12);
for(let f=0;f<558;f++){const s=scene.stateAt(.75+f/24);assert.equal(s.records.length,12);for(const r of s.records){assert.equal(r.value,data.groups[r.group][r.index]);for(const k of ['x','y','startX','strip'])assert(Number.isFinite(r[k]));assert(r.x>=0&&r.x<=1280&&r.y>=0&&r.y<=640)}
 if((.75+f/24)>=10&&(.75+f/24)<13.3)for(const a of s.records.filter(x=>x.group==='A'))for(const b of s.records.filter(x=>x.group==='B')){let area=Math.max(0,48-Math.abs(a.x-b.x))*Math.max(0,40-Math.abs(a.y-b.y));if(area>maxCrossOverlap){maxCrossOverlap=area;maxCrossAt=.75+f/24}}
}
for(const t of[.75,6,9.9])for(const r of scene.stateAt(t).records){const base=r.group==='A'?120:720;assert.equal(r.x,base+r.value*20.5)}
for(const t of[13.3,16,22,.75+557/24])for(const r of scene.stateAt(t).records){assert(Math.abs(r.x-(165+r.value*47.5))<1e-7);assert.equal(r.strip,0)}
const report={source_sha256:sha(fs.readFileSync(path.join(__dirname,'scene.cjs'))),data_sha256:sha(fs.readFileSync(path.join(__dirname,'../data.json'))),font_sha256:sha(fs.readFileSync(FONT)),font_path:FONT,font_weight:'400 only',font_family:FAMILY,renderer:require('@napi-rs/canvas/package.json').version,width:1280,height:720,seed:scene.SEED,randomness:'object-keyed noiseAt only',frame_contract:'Output [0,23.25), 24fps, 558 frames; source_time=output_time+0.75; authored source duration26' ,checks:{raster_shuffled_order_repeat:true,state_shuffled_order_repeat:true,all_558_output_frames_finite_coordinates:true,all_558_output_frames_conserve_12_ids_and_exact_values:true,receipt_projection_exact:true,final_projection_exact:true,axis_domain:[0,20],final_duplicate_A10_count:2},maximum_cross_group_bag_body_overlap_px2:maxCrossOverlap,maximum_cross_group_overlap_time:maxCrossAt,determinism_samples:ascending.map(({t,hash})=>({time:t,pixel_sha256:hash}))};
fs.writeFileSync(path.join(__dirname,'../qa/determinism-and-geometry.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({tested_times:times.length,checks:report.checks,maximum_cross_group_overlap_px2:maxCrossOverlap,at:maxCrossAt},null,2));})();
