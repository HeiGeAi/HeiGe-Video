// Original declarative continuous-world contract. No upstream code is loaded.
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const id = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/u.test(value);

export function collectContinuityText(continuity) {
  if (!object(continuity) || !Array.isArray(continuity.objects)) return [];
  return continuity.objects.flatMap(item => object(item) ? [item.text, ...(Array.isArray(item.rows) ? item.rows : []), ...(Array.isArray(item.claims) ? item.claims.flatMap(claim => [claim?.text, claim?.factId]) : [])].filter(text => typeof text === 'string') : []);
}

export function validateContinuity(continuity, plan, issues) {
  const error = (path, message) => issues.errors.push({path, message});
  const fields = (value, allowed, at) => {
    if (!object(value)) {error(at, '必须是普通 JSON 对象'); return false;}
    for (const key of Object.keys(value)) if (!allowed.includes(key)) error(`${at}.${key}`, '未知字段');
    return true;
  };
  const text = (value, at, max = 160) => {
    if (typeof value !== 'string' || !value.trim() || [...value].length > max) error(at, `必须是非空文字，最多 ${max} 个字符`);
  };
  const number = (value, at, min, max) => {
    if (!finite(value) || value < min || value > max) error(at, `必须是 ${min} 至 ${max} 的有限数值`);
  };
  const keyframes = (values, at, camera = false) => {
    if (!Array.isArray(values) || values.length < 2 || values.length > 128) {error(at, '轨迹须有 2 至 128 个完整关键帧'); return;}
    let previous = -1;
    values.forEach((frame, index) => {
      const here = `${at}[${index}]`;
      if (!fields(frame, camera ? ['at','x','y','zoom','rotation','easing'] : ['at','x','y','w','h','opacity','rotation','radius','easing'], here)) return;
      if (frame.easing !== undefined && !['linear','ease-out-cubic','ease-in-out-cubic','ease-out-expo','back-out'].includes(frame.easing)) error(`${here}.easing`, '未知固定运动曲线');
      number(frame.at, `${here}.at`, 0, plan.duration);
      if (finite(frame.at) && frame.at <= previous) error(`${here}.at`, '时间必须严格递增，禁止同一时间双状态');
      previous = frame.at;
      for (const key of ['x','y']) number(frame[key], `${here}.${key}`, -12000, 12000);
      number(frame.rotation, `${here}.rotation`, -360, 360);
      if (camera) number(frame.zoom, `${here}.zoom`, .125, 8);
      else {
        for (const key of ['w','h']) number(frame[key], `${here}.${key}`, 1, 4000);
        number(frame.opacity, `${here}.opacity`, 0, 1);
        number(frame.radius, `${here}.radius`, 0, 2000);
      }
    });
    if (values[0]?.at !== 0 || !finite(values.at(-1)?.at) || Math.abs(values.at(-1).at - plan.duration) > 1e-7) error(at, '首尾轨迹必须完整覆盖 0 至最终帧量化时长');
  };
  const at = 'project.continuity';
  if (!fields(continuity, ['objects','camera','boundaries','soundEvents','blur','musicScore'], at)) return;
  if (plan.duration > 60) error(at, '连续世界本版限 60 秒以内，避免未经验收的长片资源开销');
  if (plan.timeline.length < 2 || plan.timeline.length > 20) error(at, '连续片须有 2 至 20 个 beat');
  if (plan.timeline.some(shot => shot.type !== 'beat')) error('project.shots', '连续世界只接受 beat 时间段，不能静默忽略普通镜头组件');
  const ids = new Set();
  if (!Array.isArray(continuity.objects) || !continuity.objects.length || continuity.objects.length > 24) error(`${at}.objects`, '须有 1 至 24 个持久对象');
  else continuity.objects.forEach((item, index) => {
    const here = `${at}.objects[${index}]`;
    if (!fields(item, ['id','semanticIdentity','kind','text','rows','color','claims','keyframes','typography','appearance','assetId'], here)) return;
    if (!id(item.id) || ids.has(item.id)) error(`${here}.id`, '对象 ID 必须有效且唯一');
    ids.add(item.id);
    text(item.semanticIdentity, `${here}.semanticIdentity`, 120);
    if (!['surface','text','dot','line','ui','image'].includes(item.kind)) error(`${here}.kind`, '未知连续对象类型');
    if (item.kind === 'image') {
      const asset=Array.isArray(plan.project.assets) ? plan.project.assets.find(asset=>asset?.id===item.assetId) : undefined;
      if (!asset || asset.kind!=='image') error(`${here}.assetId`, '连续图像须引用登记的本地图像');
    } else if (item.assetId!==undefined) error(`${here}.assetId`, '仅图像对象可引用素材');
    const tokens = ['paper','ink','muted','accent','line','secondary','on-accent','canvas','heat'];
    if (item.color !== undefined && !tokens.includes(item.color)) error(`${here}.color`, '颜色必须引用受控主题 token');
    if (item.typography !== undefined && fields(item.typography, ['size','weight','tracking','align','lineHeight'], `${here}.typography`)) {
      if (item.kind !== 'text' && item.kind !== 'ui') error(`${here}.typography`, '仅文字或界面可指定排版');
      if (item.typography.size !== undefined) number(item.typography.size, `${here}.typography.size`, 24, 160);
      if (item.typography.weight !== undefined && ![400,500,600,700,800,900].includes(item.typography.weight)) error(`${here}.typography.weight`, '字体重量须为受控档位');
      if (item.typography.tracking !== undefined) number(item.typography.tracking, `${here}.typography.tracking`, -6, 8);
      if (item.typography.align !== undefined && !['left','center','right'].includes(item.typography.align)) error(`${here}.typography.align`, '未知文字对齐');
      if (item.typography.lineHeight !== undefined) number(item.typography.lineHeight, `${here}.typography.lineHeight`, 1.15, 1.7);
    }
    if (item.appearance !== undefined && fields(item.appearance, ['fill','stroke','strokeWidth','shadow','pattern'], `${here}.appearance`)) {
      const a = item.appearance;
      if (a.fill !== undefined && ![...tokens,'transparent'].includes(a.fill)) error(`${here}.appearance.fill`, '填充须为受控主题 token');
      if (a.stroke !== undefined && !tokens.includes(a.stroke)) error(`${here}.appearance.stroke`, '描边须为受控主题 token');
      if (a.strokeWidth !== undefined) number(a.strokeWidth, `${here}.appearance.strokeWidth`, 0, 8);
      if (a.shadow !== undefined && !['none','stamp'].includes(a.shadow)) error(`${here}.appearance.shadow`, '未知硬阴影');
      if (a.pattern !== undefined && !['none','film-perforation','stripe','waveform'].includes(a.pattern)) error(`${here}.appearance.pattern`, '未知受控材质');
    }
    if (item.text !== undefined) text(item.text, `${here}.text`, 160);
    if (item.kind === 'text' && item.text === undefined) error(`${here}.text`, '文字对象需要可显示内容');
    if (item.rows !== undefined) {
      if (item.kind !== 'ui') error(`${here}.rows`, '仅 ui 对象可以声明界面行');
      if (!Array.isArray(item.rows) || !item.rows.length || item.rows.length > 6) error(`${here}.rows`, '界面须有 1 至 6 个短文字行');
      else item.rows.forEach((row, r) => text(row, `${here}.rows[${r}]`, 64));
    }
    keyframes(item.keyframes, `${here}.keyframes`);
  });
  keyframes(continuity.camera, `${at}.camera`, true);
  if (!Array.isArray(continuity.boundaries) || continuity.boundaries.length !== plan.timeline.length - 1) error(`${at}.boundaries`, '每个相邻 beat 边界必须恰有一条承接声明，零边界不能推定通过');
  else continuity.boundaries.forEach((boundary, index) => {
    const here = `${at}.boundaries[${index}]`;
    if (!fields(boundary, ['fromShot','toShot','carrier','cause','outcome'], here)) return;
    if (boundary.fromShot !== plan.timeline[index]?.id || boundary.toShot !== plan.timeline[index + 1]?.id) error(here, '承接必须按顺序覆盖相邻 beat，不能跳段或重复边界');
    if (!ids.has(boundary.carrier)) error(`${here}.carrier`, '承接者必须是存在的持久对象');
    text(boundary.cause, `${here}.cause`, 240);
    text(boundary.outcome, `${here}.outcome`, 240);
  });
  if (continuity.soundEvents !== undefined) {
    if (!Array.isArray(continuity.soundEvents) || continuity.soundEvents.length > 32) error(`${at}.soundEvents`, '事件声须为最多 32 项的数组');
    else {
      const eventIds = new Set();
      continuity.soundEvents.forEach((event, index) => {
        const here = `${at}.soundEvents[${index}]`;
        if (!fields(event, ['id','at','objectId','type','volume'], here)) return;
        if (!id(event.id) || eventIds.has(event.id)) error(`${here}.id`, '声事件 ID 必须有效且唯一');
        eventIds.add(event.id);
        number(event.at, `${here}.at`, 0, Math.max(0, plan.duration - 1 / plan.fps));
        if (!ids.has(event.objectId)) error(`${here}.objectId`, '声事件必须绑定存在的对象');
        if (!['tick','whoosh','impact'].includes(event.type)) error(`${here}.type`, '未知原创声音材质');
        number(event.volume, `${here}.volume`, 0.001, .7);
      });
    }
  }
  if (continuity.blur !== undefined && fields(continuity.blur, ['samples','shutterAngle'], `${at}.blur`)) {
    if (![1,3].includes(continuity.blur.samples)) error(`${at}.blur.samples`, '本版使用 1 或 3 个真实时间采样');
    if (continuity.blur.shutterAngle !== 180) error(`${at}.blur.shutterAngle`, '本版已验收的全局快门角为 180 度');
  }
  if (continuity.musicScore !== undefined && fields(continuity.musicScore, ['style','bpm','volume'], `${at}.musicScore`)) {
    if (continuity.musicScore.style !== 'forge-breakbeat') error(`${at}.musicScore.style`, '未知原创配乐');
    if (continuity.musicScore.bpm !== 128) error(`${at}.musicScore.bpm`, '本版原创配乐锁定 128 BPM');
    if (Math.abs(plan.duration - 15) > 1e-7) error(`${at}.musicScore`, '八小节原创配乐须为 15 秒');
    if (plan.project.music) error(`${at}.musicScore`, '原创配乐与外部 music 素材互斥');
    number(continuity.musicScore.volume, `${at}.musicScore.volume`, .05, 1);
  }
}
