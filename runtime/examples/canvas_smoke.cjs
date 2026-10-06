// A test fixture, not an authored film or aesthetic reference.
exports.render = function(ctx, t, {width, height, random, fontFamily}) {
  ctx.fillStyle = '#f4f1e7'; ctx.fillRect(0,0,width,height);
  ctx.strokeStyle = '#171917'; ctx.lineWidth = width/250;
  ctx.beginPath(); ctx.moveTo(width*.12,height*.5); ctx.lineTo(width*.88,height*.5); ctx.stroke();
  ctx.fillStyle = '#d52b23'; ctx.beginPath(); ctx.arc(width*(.15+.7*Math.min(1,t/2)),height*.5,width*.035,0,Math.PI*2); ctx.fill();
  ctx.font = `${width/16}px "${fontFamily}"`; ctx.fillStyle = '#171917'; ctx.fillText('确定性画布',width*.12,height*.25);
  for(let i=0;i<20;i++){ctx.fillStyle='#d5d2c7';ctx.fillRect(random()*width,random()*height,2,2);}
};
