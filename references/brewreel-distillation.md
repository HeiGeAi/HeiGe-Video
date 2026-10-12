# BrewReel 深度蒸馏：质量机制、验证证据与 HeiGe-Video 升级取舍

研究日期：2026-10-11。研究对象固定为 [Finderchangchang/brewreel，commit 1bf00debaf81462c1d6a8365e8822764ba5fb910](https://github.com/Finderchangchang/brewreel/tree/1bf00debaf81462c1d6a8365e8822764ba5fb910)。本文属于源码研究及本地测试记录，不代表 BrewReel 的付费生成服务或全部成片已经验收。

最有价值的吸收对象是「把强模型的创作判断变成组件、参数、约束、失败反馈和证据」的生产体系。增加风格数量容易复制，建立可靠的出片闭环更有价值。BrewReel 已经把这套思路落实到多处源码，但交付状态、事实绑定和费用账本仍有应避免的缺口。

## 一、它如何蒸馏创作能力

[distill/README.md](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/distill/README.md) 的流程由六个阶段构成：

1. 参考片实测。抽帧、场景切换、音频和逐拍表作为依据，拆解叙事、节奏、动效、镜头及版式。参考片的颜色、角色和招牌细节单独记录。
2. 原理提炼。每条机制说明「是什么、测量证据、为什么有效、是否脱离皮肤仍成立、参数范围、去掉后的损失」。原理应进入可复用部件，而具体配色和造型进入外观。
3. 私下复刻骨架。以可运行的示范片检验理解，随后重新设计配色、字体处理、角色、招牌细节、固定句式及收尾。
4. 组件化。把创作经验变为 tokens、镜头、spec、recipes 和规则；普通生成模型填字段，复杂度由组件承担。
5. 小模型压测。模型只读文档写三份分镜并实际出片，收集写错的地方。
6. 独立评审。逐项提供秒数或帧证据，问题归因到文档、规则或组件，再修复并重测。

这条流程的关键是建立可复用边界。参考片中的「揭晓前倒数」是信息机制；某种固定颜色、位置和造型的倒数图形属于皮肤。只有前者适合进入通用动效库。[principles 提示词](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/distill/prompts/01b-principles.md) 明确禁止为量不到的机制发明参数。

HeiGe-Video 应吸收这种「原理、参数、组件、失败用例」的联动机制，并结合自己的 heige-design 设定集输出独立视觉。每个新风格至少要带四项资产：可执行组件、合法参数范围、真实样例成片、正反例验证。三份样例只是最小压测，不能当作跨题材、跨时长、跨语言的泛化证明。

## 二、原创性检查的能力边界

[check-originality.mjs](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/check-originality.mjs) 使用 CIEDE2000 比较 token 色值，检查主题颜色、背景、主色与强调色组合、描边，以及额外角色色。`parseSignatures()` 和 `checkSignatureRecords()` 要求每个招牌项有替换或删除记录。

它有效防止原样搬运一组颜色，也有可测试的数值实现。它无法单凭色差证明角色、版式、句式或收尾具有原创性。招牌记录的文字完整性也不能证明成片实际执行了替换。[独立评审提示词](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/distill/prompts/04-review.md) 因而另外要求并排帧、最像参考的三处以及混淆度评分。

HeiGe-Video 应把色差检查保留为一种证据，并要求评审人逐帧核对替换记录。颜色通过与完成度通过应是两个不同结果，避免把机器过线写成「原创性已证明」。

## 三、从分镜到成片的质量闭环

### 1. 生成前的确定性约束

[validate.mjs](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/validate.mjs) 把镜头 spec、风格、画幅、字段长度、时长、字幕、核心动作、数字来源、配音配置和行业规则统一为 `errors`、`warnings`、`human`。错误具有字段位置、问题和修改建议，适合直接反馈给生成模型。

[llm_make.py 的生成循环](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/llm_make.py#L642) 将校验器的原始问题和改法反馈给模型，限定修复次数。schema 通过后还有通读检查，检查内容逻辑、拼写及简报一致性，改稿后再次校验。

值得吸收：生成错误必须由程序给出具体位置和可操作改法；修复只改变受影响字段；保留每轮结果和错误；失败后停在可复核产物上。

需要补强：schema 通过、文案通读通过、像素检查通过和人工成片验收必须分开记录。同一个模型的通读属于辅助意见，不能替代独立审片。

### 2. 渲染后的 DOM 位置证据

[LayoutProbe](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/template/src/core/probe.tsx) 在指定 Remotion 帧读取真实浏览器的文字包围盒、祖先透明度、裁切区域和层级关系，通过渲染日志返回 JSON。[layoutCheck()](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/lib/layout-check.mjs#L65) 检查文字裁切、相交、安全区以及必须显示的字段；英文视频还扫描组件写死的汉字。

这比只检查分镜字数更接近最终观众体验。探针缺失也会阻止宣传片交付。[make.mjs 的检查集成](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/make.mjs#L620) 对「未测到」和「测到错误」都有处理。

边界：版式只在指定检查帧判定，动画中途可能发生的遮挡仍可能漏过；DOM 中存在正确字符串，也不能证明实际字体包含字形或图片里的文字正确；纯图像和 Canvas 文字不属于这份 DOM 文字检测。

HeiGe-Video 应保留 DOM 探针，同时检查切换前后、入场峰值和内容停留区间。报告要公开采样时间和覆盖范围。最终还要播放成片核对字幕、字体、声音和信息顺序。

### 3. 直接检查最终视频像素

[blankRuns()](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/lib/blank-check.mjs#L48) 把成片缩采样为 RGB，检测连续近纯色帧。讲课模式另有内容区域裁切和前景像素比例，减少白底文字页的误报。

[scoreFrames()](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/broll/motion-check.mjs#L153) 对相邻灰度帧量差，寻找最安静窗口和孤立跳变。`panelMask()` 把人脸及字幕区排除，防止嘴在动掩盖主卡片停死。这是非常值得吸收的细节。

[checkClip()](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/broll/check-clip.mjs#L29) 另外使用 FFmpeg 的黑帧和冻结检测，并按风格设置噪声容差。

边界：画面有变化不等于变化有信息。无意义漂浮或随机噪声可能通过帧差；正常讲解停留不应被一律视为失败。HeiGe-Video 应按镜头意图声明允许静止的区间，只把应当运动但冻结的区间作为硬错误。镜头的信息增量和节奏仍需人工审看。

### 4. 把交付绑定到本次输入

[delivery.mjs 的 verifyDelivery()](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/lib/delivery.mjs#L117) 核对 manifest 状态、分镜 SHA-256 和成片 SHA-256，防止拿上一轮视频冒充本次交付。[B-roll review](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/broll/review.mjs) 将审片记录绑定到 AI 分镜部分和每个片段的哈希。

HeiGe-Video 应进一步绑定最终音频、字幕、引用素材、风格及模板版本。内容、字体、时间轴或素材变化后，相关质量结果必须失效。一次生成成功应只表示有可播放产物，正式可交付需所有必需证据同时有效。

## 四、事实和素材真实性

[assetTruth()](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/checks/assets.mjs#L277) 要求使用的照片登记来源，拦住插画或截图标成实拍，检查 before/after 同文件、同内容哈希和配对 ID。`fileProblems()` 会拒绝过小、占位和仓库示例素材，连改名后的示例图片也按内容哈希识别。

这套机制来自具体失误，适合转为 HeiGe-Video 的通用素材清单：来源、权利说明、内容哈希、用途、允许声明和演示标签。它检查的是登记一致性，来源标签本身仍由提供者填写；文件存在、登记为商家照片不等于授权、身份和真实性已经由程序证明。

数字事实方面，BrewReel 有 `meta.facts`、镜头 `refs`、来源字段、示例事实分离和限定语核对。[简报绑定实现](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/validate.mjs#L617) 的局限是：有简报时只检查 fact 中的数字是否出现在整个简报数字集合里；`quote` 是可选字段。这不足以确认单位、主体、条件和结论来自同一条证据。

HeiGe-Video 应让每条事实绑定来源文件的具体原文及内容哈希，并记录主体、值、单位、时间和限定条件。改写可以自由，但值、单位和条件要对齐。同一个数字出现在简报其他位置，不能支持一个新结论。

## 五、费用与失败恢复

[decidePaid()](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/broll/ledger.mjs#L55) 的设计有价值：已有任务继续查询；提交结果不明时停止自动重提；失败任务保留；只有明确重做才再提交；每段最多允许两次普通重做。[generateClips()](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/broll/generate.mjs#L125) 在远程提交前持久化 `submitting` 状态，并防止免费占位片覆盖已付费片段。

[make-talk.mjs 的预算入口](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/make-talk.mjs#L119) 先展示估价、检查预算、参考图和 FFmpeg 能力，再进入付费生成。HeiGe-Video 应吸收这些恢复语义；预算还应覆盖累计消费、重试和多次续跑，价格表需要有提供者与版本依据。

应避免的缺口：`loadLedger()` 对损坏 JSON 静默返回空账本。若之前已经提交过付费任务，后续可能把它当第一次生成。安全恢复应区分「从未存在的账本」与「存在但损坏的账本」，后者停止自动提交，保留原文件并要求恢复可核对的记录。

## 六、已执行的本地验证

环境：Node.js v22.22.2。未安装模板依赖，未调用模型 API，未执行付费提交。以下是程序和 fixture 测试；没有把它们称为真实视频审美验收。

1. `node scripts/test-rules.mjs`：43 个行业正反例通过，退出码 0。
2. `node tests/originality/originality.test.mjs`：18 项通过，退出码 0，包括标准色差、色组合、招牌记录和命令行结果。
3. `node scripts/test-privacy-scan.mjs`：4 项通过，退出码 0。
4. `node tests/broll/motion-check.mjs`：16 项通过，退出码 0。这份测试在内存里构造像素，验证冻结、闪帧和掩码算法，不渲染真实视频。
5. `node scripts/test-validate.mjs`：总入口失败，退出码 1。先完成 138 条规则用例通过、1 条跳过、21 个样例通过，随后 custom 测试因缺少 `typescript` 失败；revise 测试又因固定使用不存在的相邻 `v0140-free` 临时目录而失败。不能把前半段通过写成全量通过。[失败的临时目录代码](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/test-revise.mjs#L22)。

以下三个缺口已通过直接调用实际函数复现：

### A. 无关数字可以通过 fact 简报绑定

从 `tests/validate/brief-ok.json` 载入分镜，先给对比右栏补齐 `stat`，片尾补足总时长，消除 fixture 自身两个无关错误。保留事实「手工整理周报平均需要 1 小时」，将简报替换为「本项目开展了 1 次测试，没有任何关于耗时的结论。」。校验返回 `errors: []`。

```javascript
import fs from 'node:fs';
import {validate} from './scripts/validate.mjs';

const sb = JSON.parse(fs.readFileSync('tests/validate/brief-ok.json', 'utf8'));
sb.shots[3].dur = 4.5;
sb.shots[2].params.right.stat = '1 小时';
const brief = '本项目开展了 1 次测试，没有任何关于耗时的结论。';
const result = validate(sb, {brief, baseDir: process.cwd()});
console.log(result.errors);
```

该反例实际通过校验，说明数字集合匹配不足以验证事实关系。

### B. 空帧检查无法运行时返回成功字段

```javascript
import {blankRuns} from './scripts/lib/blank-check.mjs';

const result = blankRuns({
  video: 'nonexistent.mp4',
  fps: 30,
  cmd: () => ['/no-such-command'],
});
console.log(result);
```

实际结果包含 `ok: true`、`frames: 0`、`error: 'ffmpeg 没输出'`。[函数的错误分支](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/lib/blank-check.mjs#L60) 和 [宣传片调用方](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/make.mjs#L715) 显示，宣传片会警告并跳过，仍可能记录空帧检查通过。讲课和 scene 的调用方会拦截同类错误，处理方式存在分歧。此处已运行函数反例，完整宣传片交付路径属于源码推断，未实际渲染复现。

### C. 损坏账本变成首次付费生成

在系统临时目录写入内容为 `{corrupt` 的账本，调用 `loadLedger()` 得到 `{version: 1, clips: {}}`；随后 `decidePaid(ledger.clips.b01, 'hash')` 返回 `submit`。这是本地函数实测，没有真的向远程服务提交。

## 七、源码确认但本轮未渲染复现的交付边界

这些是应设计回归用例的风险，证据级别为源码推断。

1. 讲课 `manifest.status` 只根据 `draft` 参数决定 `draft` 或 `delivered`，没有同时要求 provider 是真实语音。[状态赋值](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/lesson/make-lesson.mjs#L476)；[mock provider](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/lib/tts/mock.mjs) 明确生成音节脉冲占位音。宣传片末尾也直接进入 `finish('delivered', EXIT.OK)`，未单独排除 mock 配音。
2. `make-talk.mjs` 在出片后统一 `markApproved()` AI 片段，赋值过程不看 `draft` 或成片 `motionFailed`。manifest 又用运动失败与否决定 `rejected` 或 `delivered`。[批准与状态代码](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/make-talk.mjs#L422)。正式付费 B-roll 的审片入口确实存在；问题是内部批准状态和正式交付语义没有完全区分。
3. [timing.mjs](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/lib/tts/timing.mjs#L189) 在缺乏逐字时间戳时调用 `estimateWords()` 并标记 `sentence-interp`。这是按句区间或总时长插值，不能宣称实测逐字对齐。
4. 搜索本轮研究范围内的 scripts 和 template 源码，未发现独立的字体 cmap 字形覆盖门槛。字体文件存在、文字 DOM 正确和字号估算各自有帮助，但不是罕见汉字、特殊符号与 emoji 的实际字形保证。

HeiGe-Video 应用独立字段记录渲染、数据真实性、音频模式、时间戳精度、审片和交付资格。mock、placeholder、未审片或未知检查结果只能获得明确的预览状态。批准记录应绑定具体证据、输入哈希与确认者。

## 八、超级版本应优先落地的能力

优先级 0：建立真实交付边界。

- 分开记录 preview、rendered、rejected、approved、delivered。
- 必需检查失败或没有执行时阻止正式交付。
- mock 配音、占位素材和估算时间轴显式记录，不混入正式完成结果。
- 为事实、音频、字幕、素材、模板和最终文件建立哈希绑定。
- 费用账本损坏、提交结果未知时停止自动重提。

优先级 1：把创作质量变为稳定组件能力。

- 按「镜头目的、信息增量、允许静止段、必须显示字段」定义镜头合约。
- heige-design 设定集控制视觉；动效原理与颜色、角色和造型独立。
- 保留真实 DOM 探针、成片空帧、黑帧、冻结和内容区域检查。
- 将失败定位为分镜字段、时间码和组件文件，支持有限次数的局部修复。
- 对字体特殊字形和非 DOM 内容补充实际渲染验收。

优先级 2：建立可比较的创作基准。

- 同一批真实 brief、最终音频和素材用不同版本出片。
- 用盲评或至少独立评审比较钩子、信息清晰度、节奏、字幕可读性、视觉完成度和听感。
- 记录失败率、人工修复时间、每条成本和实际渲染时间，衡量产出改善。
- 新风格通过跨题材样例与真实浏览器、成片播放后才标记为稳定。

## 九、建议的真实验收用例

以下是完整验收矩阵，其中本轮已执行的技术反例子集单列于第十节。其余项目仍属建议。测试必须使用真实浏览器渲染和真实文件，付费动作保持独立授权。

1. 完整样片。使用一份有真实事实原文、授权素材和最终录音的 brief，渲染后播放全片，核对字幕时间、首尾帧、字体、图形及音频；验收报告绑定最终哈希。
2. 质量故障注入。在真实模板中注入文字溢出、中途遮挡、缺字、黑帧、冻结、无声和断链素材，确认每类错误产生明确失败证据，并阻止正式交付。
3. 事实反例。保留相同数字却替换主体或单位，丢掉限定条件，引用不存在的原文；验证都被拒绝。
4. 恢复反例。模拟提交成功但本地响应丢失、账本损坏和两个进程同时续跑；断言不会自动重复付费。
5. 状态反例。mock、placeholder、未审 B-roll、检查执行器失败及字幕采用插值时，检查 manifest 的真实状态，不能仅断言进程退出码 0。
6. 蒸馏压测。普通生成模型只读风格说明，为不同题材写分镜，真实出片；把发现的问题分别回写文档、schema 和组件，再重复原失败样例。

本文只修改研究文档，不引入上游代码或素材。吸收源码实现时，仍应在对应文件和第三方说明中保持上游许可及归属信息。

## 十、HeiGe-Video v4 独立反例验收记录

2026-10-11 至 2026-10-12，在当次新实现工作区执行。独立测试者只拥有 `studio/test/adversarial.test.mjs`，实现修复由对应模块负责人完成，没有把单测通过当作真实审美批准。

当次完整命令与结果：

- 仓库根目录运行 `HEIGE_PYTHON=".venv/bin/python" npm test`。最终 exit 0，48 项通过，0 失败，0 跳过。覆盖 project 契约 28 项、integrity 2 项、独立反例 18 项。
- 仓库根目录运行 `npm run typecheck`。exit 0。覆盖 TypeScript 静态类型检查，不能证明成片布局或视觉完成度。

独立反例包含这些实际检查：

1. 项目根级与嵌套字段出现未知控制项时，明确返回字段错误，不能静默忽略。
2. 把「甲有 2 次，乙有 8 次」的条目身份互换，即使仍引用同一份数字证据也拒绝。进一步用同一条完全真实的整句引文支撑错误交换，初次仍误通过。修复后要求逐行独立主张片段，拒绝跨主体借数；原始引文仍可保留完整上下文。
3. 明确提供却不存在的 brief 拒绝；引文不在原文中拒绝；SRT 重叠或超过实际录音时长拒绝。
4. FFmpeg 实际生成 6 秒声音，分镜只覆盖 4 秒，CLI `validate` 拒绝。没有依靠手写假时长证明音频时钟有效。
5. draft 和 mock 保持预览资格。使用真实 3 秒声音作为 mock，CLI `verify` 拒绝伪造的 `validated` 状态。
6. FFmpeg 实际编码带运动图像和全静音 AAC 的 MP4。初版曾因音轨存在而返回通过；最终音轨静音检测修复后退出 3，并输出 `rejected` 报告。
7. FFmpeg 实际生成全静音旁白 WAV 和可听正弦背景音乐。旁白源轨独立检测修复后，`validate` 在浏览器启动前拒绝，音乐不能掩盖缺失旁白。
8. 输出 MP4 换成指向目录外的符号链接，即使字节与通过时完全相同，也拒绝继承原哈希。项目 JSON 符号链接在 `validate` 与 `build` 入口均拒绝，不能先 canonicalize 掩盖违规来源。
9. 实际改写语音、图片、字幕和 brief 文件，输入指纹逐项改变；实际改写渲染器导入的生产 JSON token，engine 指纹改变。初版漏掉 JSON 的边界已修复。
10. 使用本机 Verdana 的真实字体 cmap，提供中文和未覆盖字符，fontTools 拒绝，且不生成可继承成功的输出字体。
11. 使用实际 Chrome 运行生产 `inspectLayout()`。两个位于画面内部的独立文字框相交 550 × 60 authored pixels，被 `text-overlap` 拒绝。预览缩放到一半仍报告相同的原始像素交集，缩放不能藏掉布局错误；缩放后文字出屏也拒绝。
12. 无证据标题「利润提升１２％」与「效率提升八成」初次误通过，修复后拒绝。NFKC 只用于检测数量和比较数值，原始文字仍必须逐字属于引文。
13. 对实际生产 `insertionPositions()` 检查 3 至 7 个对象的逆序、循环与已排序情况，共 7515 个中间状态。身份保持、起终序正确、归一化卡片矩形不相交。该项是动效函数的不变量验证，不替代真实 Chrome 成片中字号、边距和可读性的验收。

此前的甲乙错误归属、同引文多主体交换、全角数量文案、静音 MP4 和生产 JSON 指纹漏检均有失败反例。新增多主体反例的独立首轮为 15 项通过、1 项失败；新增全角文案反例的首轮为 16 项通过、1 项失败。本节记录的是修复后的最终复测。上游全量测试入口失败的事实保留在第五节，没有被下游通过结果覆盖。

仍需独立完成真实题材样片、完整播放与听音、跨比例和多题材审美评审。DOM 探针只是抽样几何检查；cmap 覆盖只证明字形存在；哈希绑定只证明记录中的内容一致。逐字引用和局部字段归属不能自动证明否定句、条件句或假设句里的数字是现实测量值，真实事实核验仍需要审稿。冻结候选、口播自然度、字幕可读性、镜头钩子与作品质量不能仅凭上述技术测试自动获得批准。此次没有执行付费生成、外部发布或任何上游内部批准操作。
