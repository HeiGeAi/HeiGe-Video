# BrewReel 工程蒸馏研究

研究日期：2026-10-11。固定源码版本：[Finderchangchang/brewreel@1bf00debaf81462c1d6a8365e8822764ba5fb910](https://github.com/Finderchangchang/brewreel/tree/1bf00debaf81462c1d6a8365e8822764ba5fb910)。本报告以该提交的源码和随附文档为依据，不把 README 的介绍视为实际渲染验证。本文未运行付费服务，未复制其组件代码、品牌角色或风格素材。

## 核心结论

BrewReel 最值得吸收的设计是把模型输出约束为可校验的数据，把版式、动效、时间轴、成本和交付交给确定性的工程。它的强项已经超过「一份写视频的 Skill」，形成了有组件规格、渲染命令、缓存、审片记录和产物清单的本地生产流水线。

HeiGe-Video 应吸收这些机制，同时保留自由创作空间。推荐形成「标准镜头保住下限，受控自定义镜头提高上限」的结构，优先打通一个真实可运行的闭环。没有必要第一版就移植它全部行业规则、角色系统和供应商。

## 一、它实际实现了什么

| 工程层 | 源码证据 | 已实现能力 | 对 HeiGe-Video 的价值 |
| :--- | :--- | :--- | :--- |
| 宣传片输入 | [schema.ts](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/template/src/schema.ts)、[validate()](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/validate.mjs#L395) | `meta` 管产品、事实、素材、行业、主题、画幅和配音，`shots` 管镜头类型、旁白、文案、时长、参数。校验器检查字段、数字依据、文案与镜头约束 | 把可审查的项目数据与临时生成代码分开 |
| 镜头规格 | [hook.spec.json](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/template/src/shots/hook.spec.json)、[镜头注册](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/template/src/shots/index.ts) | 每种镜头有 TSX 实现和 spec。spec 声明用途、适配提示、默认与最短最长时长、必填参数、枚举、字数、字幕和音效规则 | 镜头库由「名字列表」变成机器能验证的创作接口 |
| 风格插件 | [StyleManifest / StyleDef](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/template/src/styles/types.ts)、[gen-styles.mjs](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/gen-styles.mjs) | 风格有 stable、draft、skeleton 状态，声明画幅、节拍、首末镜、字幕策略、主题与公共镜头复用范围。扫描清单生成注册表 | 一套文档与令牌对应一套实际渲染实现，避免风格只存在于提示词 |
| Remotion 调度 | [Root.tsx](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/template/src/Root.tsx)、[Promo.tsx](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/template/src/Promo.tsx) | 注册 Promo、Talk、Lesson、LessonVertical、Scene 和静帧工具。`calculateMetadata` 根据输入计算长度与画幅。渲染器按风格分派，可用逐镜 Sequence 或自定义整片 Film | 预览和正式渲染走同一套组件，控制画面和时间一致性 |
| 单命令生产 | [make.mjs](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/make.mjs) | 依次执行校验、机器预检、素材暂存、TTS、重算时长并重验、配乐、渲染、探针、抽帧和 manifest | 将完成标准写进命令返回值和交付文件，降低人工漏步骤 |
| 一句话修改 | [revise.mjs](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/revise.mjs) | 模型返回 `asks + ops`。修改路径有白名单，拒绝原型污染字段。修改与用户各条要求绑定，应用后重验，通过才备份并写回。宣传片默认只出修改镜头静帧 | 小改稿不必重写全部项目，减少误改和复核成本 |

这里的 JSON 不只是「格式」。模型只能选择已实现的能力和填内容，超长、超时、缺素材或错误枚举会在渲染前得到具体修复信息。构图和画面信息层级仍然依赖镜头组件本身，JSON 校验不可能替代审美评价。

## 二、设计蒸馏的六步流程

[distill/README.md](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/distill/README.md) 提供了明确方法。原文在第 1 步后补了一项 1b，本表把它合并到拆解阶段，保留六步结构。

| 步骤 | 核心动作 | 要留下的产物 | 蒸馏成 HeiGe-Video 的方式 |
| :--- | :--- | :--- | :--- |
| 1．拆解与原理提炼 | 抽帧、观察节奏、镜头、版式、动画曲线、语义与声音关系，列出辨识度强的招牌细节。对每种机制解释证据、起作用的原因、参数范围和替换风险 | 逐拍表、测量结果、tokens 草稿、招牌清单、principles | 保留用户已有的研究和导演能力，但要求每个视觉机制有时间点与可检查证据 |
| 2．私下复刻骨架 | 先跑通决定观感的结构，用于理解机制 | 一支学习样片 | 学习样片和对外交付有不同状态，不混进公开范例 |
| 3．原创再设计 | 更换具体配色、字形处理、角色、签名细节、固定句式和结尾方式 | originality 记录及新风格 | 原理可复用，品牌资产和固定招牌不直接搬运 |
| 4．组件化 | 将机制变成镜头、参数、规格、令牌与使用配方 | 实际可渲染组件和对应 spec | 同时提供标准镜头与扩展接口，内容字段独立于组件代码 |
| 5．换内容测试 | 由未参与设计的模型只读文档生成多份不同内容 | 三份分镜及实际样片 | 测试组件是否能承受新题材、长短文案和不同输入，不能仅验证作者自己写的一个样例 |
| 6．独立评审修复 | 比较完成度、可读性、节奏和混淆程度，问题反馈到规则与组件 | 评审、修复记录和剩余问题 | 机器几何检查和人眼审美检查分别记录，通过机器检查不能自动获得审美通过 |

原项目的颜色差异检查使用 CIEDE2000，并要求完成招牌替换记录。文档也明确说明，颜色和记录检查无法判断角色造型、版式、句式是否足够独立。所谓「混淆度 ≤ 3」是其评审标准，不是经过外部评审证明的普遍结论。

## 三、语音、字幕和时间轴

[runVoiceStep()](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/lib/tts/pipeline.mjs#L78) 对每个有 `vo` 的镜头合成语音，将时长改成「0.15 秒前留白 + 实际音频长度 + 0.35 秒后留白」，向上对齐节拍，并检查镜头允许的最长时长。随后重新排程和校验。人声区间用于配乐 ducking，播放音频有 RMS 与峰值归一化处理。

[synthesizeCached()](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/lib/tts/index.mjs#L82) 用 provider、model、voiceId、speed、emotion、language 和 text 生成 SHA256 缓存键。改画面不重复合成同一句语音。缓存将音频和时间戳一起保存，manifest 记录命中和计费字符。供应商为 MiniMax、阿里云、火山引擎，另有 mock。

必须保留实际时间证据等级。[wordsFromSubtitle()](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/lib/tts/timing.mjs#L191) 会优先使用接口时间戳，对不上时按句子或全文加权估算，并将 `granularity` 标为 `sentence-interp`。这能生成逐字动画，但不证明逐字时间精确。课程真人输入的 [mapExplicitSentences()](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/lesson/timeline.mjs#L20) 接收人工句边界，句内字符采用均分估计。

适合 HeiGe-Video 的约定：先锁录音或最终 TTS，最终声音决定时长；时间来源明确区分 `provider-word`、`asr-word`、`manual-sentence` 和 `estimated`；需要精确同步的动效不把 estimated 当作真实对齐。用户提供真人录音时，原声与字幕映射优先于重新生成配音。

## 四、口播 B-roll 与课程流水线

### 口播路线

[talk.mjs](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/talk.mjs) 组织本地转写、模型生成 `broll.json` 和合成三步。已有 SRT 不覆盖，已有 B-roll 方案不默认重写。重写方案与付费执行有独立参数约束。

[normalizeTalk()](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/broll/normalize.mjs) 处理手机 HEVC、可变帧率、旋转、奇数尺寸、单声道等输入差异，生成 H.264 恒定帧率副本并缓存。原片保留。[buildPlan()](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/broll/plan.mjs#L22) 将 cue 引用变为毫秒窗口、帧数、供应商请求、费用与哈希，模型不自己算这些。动效 B-roll 直接渲染 React，AI B-roll 则有生成与审片过程。

[ledger.mjs](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/broll/ledger.mjs) 是值得学习的成本控制核心。`decidePaid()` 区分 submit、query、check、reuse、hold、stuck 和 redo。已经有 taskId 的任务优先续查；提交结果未知不自动再提交；免费占位素材不得覆盖付费素材；默认每段最多重做两次。请求指纹包括相关风格和参考图，避免输入已改变却误用老素材。

### 课程路线

[generate-lesson.mjs](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/lesson/generate-lesson.mjs) 先生成大纲，再生成讲稿，按版式规格形成模型契约，检查字数、复述、内部用语和领域规则，有限轮次回喂原始错误。法律引用通过本地语料白名单装配，不能把模型自己生成的法条原文当来源。

[make-lesson.mjs](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/lesson/make-lesson.mjs) 支持 TTS 或真人片段，形成帧为基准的 timeline，输出 SRT、章节、拼图、检查帧、manifest。竖版切片和封面是显式选择项。真人输入在该版本仅开放 tech 领域，不能据此宣称各领域真人输入已经完整支持。

[segments.mjs](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/lesson/segments.mjs) 为引擎源码、字体和页面视觉内容计算指纹，输出 `lock.json`。[renderLessonFilm()](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/lesson/render-ranges.mjs#L86) 按页缓存静音视频，修改页才重渲，最后拼接画面并重新混声音，逐段及整片核对帧数。相邻页过渡会影响缓存依赖。这个机制比「把整片文件是否存在当缓存命中」可靠得多。

## 五、质量状态与交付证据

[make.mjs](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/make.mjs) 在正式渲染里采集文字包围盒，检查裁切、重叠和安全区；可检测空帧，自定义镜头另做主体区帧差检查。失败时将视频改名为 `video.rejected.mp4`。返回值区分输入无效、配置错误、拒收、渲染失败、排队超时和中断。

[delivery.mjs](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/lib/delivery.mjs) 将分镜哈希、视频哈希、时长、路径和 checks 放入 manifest。`verifyDelivery()` 检查 delivered 状态、当前输入哈希和视频哈希，不会因为文件还在就宣称它对应最新版输入。[render-lock.mjs](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/lib/render-lock.mjs) 用独占文件、PID 和心跳串行化同一模板的渲染，提供超时和失效锁恢复。

这些检查验证的是各自覆盖的规则。主体帧差不能证明动效有意义，文字包围盒不能证明信息层级好看，规则命中不能证明事实为真。HeiGe-Video 的 manifest 应把「已检查通过」「未检查」「检查无法执行」分别记录，不能将后两者写成通过。

## 六、需要避开的现有短板

以下是固定提交的源码观察，未运行生产服务复现。它们应作为 HeiGe-Video 的设计反例，不能据此推断参考作者的所有公开视频都有问题。

| 观察 | 源码证据 | 对超级版的要求 |
| :--- | :--- | :--- |
| mock 语音仍可能进入 delivered | [make-lesson.mjs 第 476 行](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/lesson/make-lesson.mjs#L476) 状态只依据 draft 参数；Promo 的 finish() 也未按 mock provider 强制草稿 | mock、占位素材和未审核内容自动降级为 preview 或 draft，用户不能只靠遗漏标志获得 delivered |
| B-roll 合成过程会自行标记素材 approved | [make-talk.mjs 第 424 行](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/make-talk.mjs#L424) 在动效检查后统一调用 `markApproved()`，未按 draft 或检查失败隔离；manifest 主状态只按 motionFailed 判定 | 机器检查状态与人工审核状态分别持久化，渲染操作不得伪造人工 approved |
| 某些质量检查无法执行时仍可能放行 | [make.mjs 空帧检查](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/make.mjs#L711) 遇到 `blank.error` 打印跳过，后续 ok 主要依据是否有 bad runs | 必需检查 unknown 应拒收，用户明确豁免时另存原因与审批证据 |
| 多条契约与流水线尚未统一 | [core/timeline.ts](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/template/src/core/timeline.ts) 注释要求与 validate.mjs 同步算法；Promo、Talk、Lesson、Scene 有各自输入和交付实现 | 共享中间 timeline 和统一交付协议，避免时间算法及状态语义分叉 |
| Scene 明确为实验路线 | [docs/scene.md](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/docs/scene.md)、[make-scene.mjs](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/scene/make-scene.mjs) | 可以学习内容、版式、风格、动效、时间、约束六轴分离，但不能宣称新实验已经替代全部生产路线 |
| 安装口径存在能力差异 | [README.md 第 65 行](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/README.md#L65) 写 Node.js 18+；部分 mjs 直接 import TS；[make-scene.mjs](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/scene/make-scene.mjs) 的 ffmpegExe() 写死 python 和 imageio_ffmpeg | doctor 以当前机器实际加载、二进制可执行和渲染 smoke test 为准，不沿用未经检测的最低版本口径 |

## 七、建议吸收顺序

| 优先级 | 最小机制 | 可以接受的完成证据 |
| :--- | :--- | :--- |
| P0 | 项目契约、镜头规格、统一校验入口 | 正常项目通过；未知镜头、缺素材、超长文案、错时间轴明确失败 |
| P0 | Remotion 参考工程及真实短片闭环 | 当前环境真实渲染出可播放 MP4，核对实际音视频时长、字幕和关键帧 |
| P0 | manifest、哈希核验、失败隔离、preview/draft/delivered 状态 | 修改输入、替换输出、mock 语音和未跑必需检查都不能冒充有效交付 |
| P1 | 最终声音驱动时间轴与分级时间证据 | 音频变长后画面跟随；estimated 与真实字时刻的来源在产物中可查 |
| P1 | TTS 内容缓存、素材请求账本和渲染互斥 | 相同输入复用；未知提交不重复付费；并发任务不会互相覆盖 |
| P1 | 可审查的定点修改 | 输出 diff，修改后重验，输入原件有备份，未触及内容保持稳定 |
| P2 | 按镜头或页面增量渲染、引擎版本锁 | 修改一处只重渲必要依赖；引擎更新不会混用旧像素缓存 |
| P2 | 更丰富的风格工厂、AI B-roll 与行业扩展 | 每个扩展至少有跨内容实测样片和独立评审，不能只增加介绍文案 |

## 八、许可证与运行边界

该提交的 [LICENSE](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/LICENSE) 为 Apache License 2.0。[NOTICE](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/NOTICE) 要求分发包含其代码的产品或修改版本时保留许可证和相应出处，修改文件需遵循许可证相关要求。本文采取工程机制研究与原创实现路径，没有导入其源码和媒体。

Remotion、字体、ASR 模型及供应商具有独立许可证或服务条款。仓库的 [THIRD_PARTY_LICENSES.md](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/THIRD_PARTY_LICENSES.md) 提供声明，不能将仓库 Apache-2.0 等同于全部依赖无条件免费商用。需要实际商业分发时应以各依赖当前官方条款核对。

模板 [package.json](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/template/package.json) 固定 Remotion 和 CLI 为 `4.0.529`，另依赖 React、TypeScript、sherpa-onnx-node 和 pinyin-pro；实际依赖安装在模板子目录。Talk 需要功能完整的 ffmpeg，本地转写首次会下载模型，TTS 和 AI B-roll 真服务需要各自配置。离线测试、mock 输出、供应商请求成功与实际视频验收是四种不同证据。
