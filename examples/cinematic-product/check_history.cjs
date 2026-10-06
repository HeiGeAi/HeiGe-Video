// Exact decoded RGBA determinism across seek order; same source process/context.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createCanvas}=require('@napi-rs/canvas');const film=require('./film.cjs');
const out=path.join(__dirname,'validation');fs.mkdirSync(out,{recursive:true});
const times=[0,.5,2.17,3.15,8.1,12.25,12.4,12.75,13.1,13.58,14.2,17.8,20.45,20.58,21.25,22.2,29.9,30.08,30.5,30.92,31.5,33,33.25,33.5,33.55,33.75,34,34.25,35.5];
const shuffled=[...times];let seed=20261006;for(let i=shuffled.length-1;i>0;i--){seed=(1664525*seed+1013904223)>>>0;const j=seed%(i+1);[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
const orders={forward:times,reverse:[...times].reverse(),shuffled};const hashes={};const canvas=createCanvas(1280,720),ctx=canvas.getContext('2d');
for(const [order,list] of Object.entries(orders)){hashes[order]={};for(const t of list){ctx.reset();film.render(ctx,t,{width:1280,height:720});const data=ctx.getImageData(0,0,1280,720).data;hashes[order][String(t)]=crypto.createHash('sha256').update(data).digest('hex');if(global.gc)global.gc();}console.log(order+' complete; RSS '+Math.round(process.memoryUsage().rss/1048576)+' MB');}
const mismatches=times.filter(t=>hashes.forward[t]!==hashes.reverse[t]||hashes.forward[t]!==hashes.shuffled[t]);
const timeline=[20.45,20.5,20.58,21.25,22.2,26].map(t=>{const s=film.editorState(t),cl=s.clips[s.stage];return{time:t,stage:s.stage,playhead:s.playhead,clip_start:cl.x,clip_end:cl.x+cl.w,aligned:s.playhead>=cl.x-1e-7&&s.playhead<=cl.x+cl.w+1e-7};});
const report={source_sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'film.cjs'))).digest('hex'),dimensions:[1280,720],same_source_process:true,reused_context_reset_each_frame:true,sample_count:times.length,orders,all_equal:mismatches.length===0,mismatches,hashes,timeline_alignment:timeline};
fs.writeFileSync(path.join(out,'history-independence.json'),JSON.stringify(report,null,2)+'\n');
if(mismatches.length||timeline.some(x=>!x.aligned))throw new Error('determinism/alignment failed');console.log('PASS: '+times.length+' timestamps × 3 seek orders; timeline alignment PASS');
