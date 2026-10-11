// Original, self-contained launch storyboard. Each format has authored geometry.
export function createContinuousProject(ratio = '16:9', {duration = 16, samples = 3} = {}) {
  const profiles = {
    '16:9': {input:640, app:860, phone:280, final:600, finalHeight:300, heading:680, ui:300},
    '9:16': {input:320, app:340, phone:240, final:340, finalHeight:400, heading:330, ui:270},
    '1:1': {input:560, app:600, phone:280, final:600, finalHeight:300, heading:620, ui:300},
  };
  if (!Object.hasOwn(profiles, ratio) || !Number.isFinite(duration) || duration < 8 || duration > 40 || ![1,3].includes(samples)) throw new Error('Unsupported continuous template configuration');
  const p = profiles[ratio], scale = duration / 16;
  const at = time => Math.round(time * scale * 30) / 30;
  const world = [[0,640,p.input,160],[1.4,640,p.input,160],[2.6,1040,p.app,400],[9.4,1040,p.app,400],[10.6,1520,p.phone,400],[11.4,1520,p.phone,400],[12.6,1520,p.final,p.finalHeight],[16,1520,p.final,p.finalHeight]];
  const carrierY = time => ratio === '9:16' && time >= 12.6 ? 400 : 440;
  const track = (geometry, opacity = () => 1) => world.map(([time,cx,w,h]) => ({at:at(time),...geometry(cx,w,h,time),opacity:opacity(time),rotation:0,radius:18}));
  const shell = {id:'story-shell',semanticIdentity:'The same idea container becomes the working panel and delivery surface',kind:'surface',color:'accent',keyframes:track((cx,w,h,time) => ({x:cx-w/2,y:carrierY(time)-h/2,w,h}))};
  const heading = {id:'heading',semanticIdentity:'Film heading follows the world camera',kind:'text',color:'ink',text:'从想法到成片',keyframes:track(cx => ({x:cx-p.heading/2,y:100,w:p.heading,h:100}))};
  const caption = (id, text, cx, w, y, h, times, color='ink', kind='text', rows) => {
    const base={x:cx-w/2,y,w,h,rotation:0,radius:16};
    return {id,semanticIdentity:`Original workflow label ${id}`,kind,color,...(text ? {text} : {}),...(rows ? {rows} : {}),keyframes:times.map(([time,opacity])=>({at:at(time),...base,opacity}))};
  };
  const input = caption('idea-copy','输入想法',640,Math.min(p.input-48,400),390,100,[[0,1],[1.35,1],[1.55,0],[16,0]]);
  const app = caption('working-ui',null,1040,p.ui,305,270,[[0,0],[2.8,0],[3.2,1],[8.8,1],[9.3,0],[16,0]],'ink','ui',['脚本就绪','画面连贯','声音随动']);
  const phone = caption('phone-copy','随处可看',1520,230,310,190,[[0,0],[10.75,0],[11,1],[11.35,1],[11.65,0],[16,0]]);
  const portrait = ratio === '9:16';
  const delivered = caption('delivery-copy','黑哥视频',1520,Math.min(p.final-48,400),portrait ? 300 : 350,100,[[0,0],[12.7,0],[13.1,1],[16,1]],'accent');
  const promise = caption('delivery-promise',portrait ? '看得清\n连得上' : '看得清 连得上',1520,Math.min(p.final-48,480),portrait ? 410 : 457,portrait ? 172 : 160,[[0,0],[13.1,0],[13.5,1],[16,1]],'muted');
  // A visible action source moves with the carrier. It is never used to pass a boundary.
  const cursor = {id:'action-dot',semanticIdentity:'The action point that triggers original event sounds',kind:'dot',color:'accent',keyframes:track((cx,w,h,time)=>({x:cx+w/2-34-(time===9.4?20:0),y:carrierY(time)-h/2+16,w:14,h:14}))};
  return {
    schemaVersion:'heige-video/4',title:'黑哥视频 连续世界原创演示',mode:'promo',ratio,theme:'nocturne',fps:30,seed:20261012,brand:'HeiGe Video',
    shots:[{id:'idea',type:'beat',title:'输入想法',duration:at(2)},{id:'work',type:'beat',title:'展开工作界面',duration:at(10)-at(2),intentionalHold:true},{id:'mobile',type:'beat',title:'收拢成移动画幅',duration:at(12)-at(10)},{id:'delivery',type:'beat',title:'交付品牌画面',duration:at(16)-at(12),intentionalHold:true}],
    continuity:{objects:[shell,heading,input,app,phone,delivered,promise,cursor],camera:world.map(([time,cx])=>({at:at(time),x:cx,y:360,zoom:1,rotation:0})),
      boundaries:[{fromShot:'idea',toShot:'work',carrier:'story-shell',cause:'输入框沿镜头移动并展开',outcome:'同一容器承接工作界面'},{fromShot:'work',toShot:'mobile',carrier:'story-shell',cause:'工作面板沿镜头移动并收拢',outcome:'同一容器变成移动画幅'},{fromShot:'mobile',toShot:'delivery',carrier:'story-shell',cause:'移动画幅展开为交付面板',outcome:'同一容器承接品牌收尾'}],
      soundEvents:[{id:'input-tick',at:at(1.3),objectId:'action-dot',type:'tick',volume:.22},{id:'open-panel',at:at(2.5),objectId:'action-dot',type:'impact',volume:.24},{id:'follow-camera',at:at(9.6),objectId:'action-dot',type:'whoosh',volume:.26},{id:'mobile-settle',at:at(10.5),objectId:'action-dot',type:'tick',volume:.2},{id:'delivery-settle',at:at(12.5),objectId:'action-dot',type:'impact',volume:.24}],blur:{samples,shutterAngle:180}},
  };
}
