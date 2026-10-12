# HeiGe Video v4 升级报告

这轮升级把 HeiGe Video 从原创代码电影的创作工具，推进到有严格输入、受控镜头、真实声音时钟和可追溯产物的生产路线。核心价值是把 agent 的创作判断和程序的执行约束贯通，让事实、素材、动作、画幅、检查与交付对应同一个版本。

当前版本为 `4.0.0-alpha.1`。这是一条已写入工程的受控 Remotion 路线，不代表已经证明所有题材都能自动做好，也没有证据支持「全面超过 BrewReel」或「廉价模型达到高端模型水平」。复杂独创镜头继续保留 v3 的自由导演能力。

## 研究到了什么

本轮固定研究 [BrewReel commit 1bf00debaf81462c1d6a8365e8822764ba5fb910](https://github.com/Finderchangchang/brewreel/tree/1bf00debaf81462c1d6a8365e8822764ba5fb910)。研究覆盖输入 schema、镜头 spec、Remotion 调度、事实验证、声音时间轴、字幕、课程增量渲染、B-roll 任务账本、局部修订、质量检查与交付 manifest，分别记录源码推断和实际本地反例。

BrewReel 的有效方法是把高质量创作中的可复用经验转为「有限组件、明确参数、规则、失败反馈和检查证据」。普通模型减少自由发挥，选择已实现的镜头并填写内容；确定性的程序负责计算布局、时间和输出。它的六步蒸馏流程是参考拆解、原理提炼与私下复现、原创再设计、组件化、新内容测试、独立评审。这里的蒸馏是工程方法提炼，没有训练或提取任何模型权重，也没有搬入其角色、模板源码、音乐或字体。

详细研究见 [工程架构蒸馏](brewreel-architecture.md) 与 [质量机制和反例](brewreel-distillation.md)。下面的对照只把实际代码中存在的能力写为已实现。

## 上游机制与本版实现

| 上游机制 | HeiGe Video 实际实现 | 证据及限制 |
| --- | --- | --- |
| 模型填写 JSON，组件承担版式和动效。[schema](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/template/src/schema.ts) | `heige-video/4` 契约、strict 字段检查、统一编译时间轴，agent 选择有限镜头并填内容 | [CONTRACT](../studio/CONTRACT.md)、[project.mjs](../studio/lib/project.mjs)。目前由宿主 agent 读取 Skill 生成 JSON，runner 没有原生在线 LLM 自动计划器 |
| 镜头实现与 spec 配对，风格有明确能力边界。[镜头注册](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/template/src/shots/index.ts) | 8 类原创镜头、两主题、三种比例，文案与组件代码分离 | [scenes.tsx](../studio/src/scenes.tsx)、[theme.ts](../studio/src/theme.ts)。目前组件和契约由项目维护，尚无自动生成的镜头 spec/prompt 注册工厂 |
| 数字事实引用简报与来源。[validate.mjs](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/validate.mjs) | claim 必须逐字来自同一 quote，quote 属于对应 fact；提供简报时还须逐字属于简报。数据行要求主体、值、单位的独立片段 | [validateClaims / validateRows](../studio/lib/project.mjs)、[事实示例](../examples/studio/facts.json)。拦截跨主体借数字、单位改写和无依据数值文案；不证明来源真实性、否定或条件句的现实含义 |
| TTS 的实测声音决定镜头时长。[voice pipeline](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/lib/tts/pipeline.mjs) | 最终本地录音实测时长，镜头从零连续覆盖，帧边界统一量化；旁白源单独完整解码，配乐不能掩盖静音录音 | [checkedRead / mux](../studio/make.mjs)、[compileProject](../studio/lib/project.mjs)。保留原声速度；没有自动 TTS 供应器，音质与表达仍需实际听音 |
| 使用真实时间戳，缺失时区分估算。[timing.mjs](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/lib/tts/timing.mjs) | 导入已有 SRT，保留实际 cue 时码，检查倒序、重叠和越界，显示清理保留数值含义 | [parseSrt](../studio/lib/project.mjs)、[Film.tsx](../studio/src/Film.tsx)。没有原生 ASR、强制对齐或词级时间戳生成，不能把句级字幕当逐字同步 |
| 将信息机制变成可执行动作。[componentize prompt](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/distill/prompts/03-componentize.md) | 步骤游标推进、比较逐侧揭示、柱图从零增长、同一对象可见排序。排序保留对象 ID 和数值 | [scenes.tsx](../studio/src/scenes.tsx)、[motion.ts](../studio/src/motion.ts)。当前 `transform` 只支持排序；有位移不等于有信息，动作因果与阅读节奏仍需看真实成片 |
| 风格与画幅分离，按画幅布局。[StyleManifest](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/template/src/styles/types.ts) | `ledger`、`nocturne` 两主题，`16:9`、`9:16`、`1:1` 分别构图，使用本地实际字体及 cmap 字形检查 | [theme.ts](../studio/src/theme.ts)、[prepare_font](../studio/check_media.py)。竖版按结构重排；一个真实字体 face 的粗体可能由浏览器合成。配置支持三种比例不等于每份内容都完成三比例审美验收 |
| 浏览器读取实际文字几何。[LayoutProbe](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/template/src/core/probe.tsx) | 每镜在 0／25／55／85％及整片首尾进行实际浏览器检查；文字溢出、裁切、碰撞或浏览器错误阻止构建 | [inspect.ts](../studio/src/inspect.ts)、[build](../studio/make.mjs)。覆盖明确记录的采样帧，无法证明全部过渡中间态、图片内文字或非 DOM 画面均正确 |
| 从最终影片检查空帧与运动。[blank-check](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/lib/blank-check.mjs) | 最终 MP4 全帧低分辨率解码，核对帧数、尺寸、帧率、时长、均匀空帧与最终音轨；输出编码帧总览和决定性动作条带 | [check_media.py](../studio/check_media.py)。完整解码不等于人看过每帧；长静止列为阅读窗候选；实际画面与音质需要人工审阅 |
| 交付结论绑定输入与成片哈希。[delivery.mjs](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/lib/delivery.mjs) | 输入、素材、SRT、简报、引擎、依赖、工具、字体、浏览器与产物哈希贯通；构建前后复核，verify 拒绝陈旧结果 | [integrity.mjs](../studio/lib/integrity.mjs)、[build / verify](../studio/make.mjs)。哈希清单证明所核对内容的完整性，不是作者身份、可信时间戳或事实真实性证书；当前无外部数字签名 |
| 状态区分故障、草稿和交付。[make.mjs](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/make.mjs) | `building`、`rejected`、`preview`、`validated`；mock 与 draft 固定 preview，必需检查失败拒绝放行，审美、完整播放、听音单独记录 | [manifest 状态](../studio/make.mjs)、[使用说明](../studio/README.md)。`validated` 只表示本次技术验证成功，不自动授予发布或对外交付资格 |
| TTS 内容缓存、lesson 分页缓存、B-roll 幂等账本。[segments](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/lesson/segments.mjs)、[ledger](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/scripts/broll/ledger.mjs) | 已研究机制，当前接收纯本地媒体，串行渲染并保留素材快照和构建证据 | [make.mjs](../studio/make.mjs)。付费生成、供应器账本、TTS 缓存、B-roll 缓存及增量镜头渲染尚未实现 |

本轮还通过独立反例促成修复，包括不同主体交换数字、同一整句互借数字、全角数量绕过、静音旁白被音乐掩盖、字幕越界、符号链接逃逸以及生产文件指纹漏检。反例与实现边界保存在 [研究与验收记录](brewreel-distillation.md)，没有将测试夹具通过写成真实电影质量通过。

## 使用者现在能做什么

`promo`、`explainer`、`lesson`、`talk` 是四种输入模式，当前共用受控执行器。用户可以让 coding agent 依据素材和事实写镜头 JSON，再执行验证、构建和复核。`lesson` 不表示已经接入自动讲稿生成、章节切片；`talk` 不表示已经接入自动转写和 AI B-roll。

| 组件 | 当前表达能力 |
| --- | --- |
| `hook` | 开场钩子与主视觉标题 |
| `statement` | 结论、章节或重点揭示 |
| `end` | 回收问题与品牌结尾 |
| `steps` | 有序步骤、连线与游标推进 |
| `compare` | 方法或状态的逐侧比较 |
| `bars` | 零基线数值编码，保留标签和数值 |
| `transform` | 同一批对象排序，保留 ID 和数值 |
| `media` | 本地图片或视频，显式标明素材类别 |

图片支持 PNG、JPG、JPEG、WebP；录音、配乐和视频均来自登记的本地文件。素材路径不得穿越项目目录，不接受远程 URL 或符号链接。截图与生成素材不冒充实拍，教学数据持续显示示例身份。字体覆盖、实际版本、浏览器和 Remotion 原生组件缺失都会在构建前或必需步骤中暴露，构建不会暗中联网调用供应商补救。

v3 的 Canvas／SVG 自由导演路线继续用于原创复杂动作、独特材质和非标准场景。它可独立出片，也可以先渲染成本地媒体后接入 v4。受控路线降低常见生产错误，自由导演路线保留表达上限；二者的执行协议与验收证据分别记录。

## 为什么不能用「便宜模型」宣传代替验证

BrewReel 的 [limitations.md](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/docs/limitations.md) 记载：在 v0.2.0 发布前，让 Haiku 级小模型扮演便宜模型，只给简报和 Skill 制作的 9 支早期样片，没有一支达到作者自定的 7 分直接发布线。其文档同时说明后续修复不等于完成新一轮模型重测。这是作者报告的特定批次结果，不能扩大成对最新版或全部低成本模型的结论。

我们的本轮工作没有授权真实模型付费比较，也没有同条件模型盲测。组件减少模型需要决定的事情，理论上有利于降低失败率和修复成本，但实际效果需要新题材、相同简报和素材、相同组件版本、独立审片与成本记录来测量。当前没有依据宣称成本优势、Opus 水平或模型质量超过参考项目。

目前优先让可验证的生产闭环成立。后续价值顺序是：真实录音与多画幅交付基线，少量高复用原创动作，字幕 ASR／对齐适配器，有限轮次的原生模型计划器，再根据长片和供应器需求加入缓存与任务账本。

## 许可与交付边界

原创实现保留本仓库 [MIT License](../LICENSE) 和已有 attribution。BrewReel 固定提交使用 [Apache-2.0](https://github.com/Finderchangchang/brewreel/blob/1bf00debaf81462c1d6a8365e8822764ba5fb910/LICENSE)，本轮提炼其方法，没有重新分发其组件源码和媒体资产。参考画面、字体、音乐、品牌、人物与供应商条款均有独立边界，见 [source-notices.md](source-notices.md)。

Remotion 使用自身许可，不能用本仓库的 MIT 代替。按 2026-10-12 核对的 [官方 LICENSE](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)，个人、最多 3 名员工的营利组织、非营利组织以及尚未商业使用的评估情形属于免费资格；不符合免费资格的组织需要 Company License。商业团队应依据实际主体及用途核对官方条款，升级 Remotion 大版本时重新确认。

技术状态、独立抽帧审阅、完整实时播放和实际听音需要分别交付。录音能够完整解码、没有静音和超限峰值，不代表声音清楚、节奏舒服、没有错读或配乐合适。哈希可以识别本次查看的具体文件；它不会自动成为内容可信证书或发布批准。

## 本轮最终验收记录

最终五条新片采用同一个引擎指纹 `7171a2d581ca0d358261f6a12a342b38e3aee9048599b6d6d5a521928c3454a3`。实际环境为 macOS Apple Silicon、Node 22.22.2、Remotion 4.0.526、Python 3.12.13、FFmpeg 8.1.2、本地 Noto Sans CJK SC 字体、Chrome for Testing 152 渲染及系统 Chrome 155 播放。环境版本及字体、浏览器、原生组件哈希见 [可移植清单](v4-example-status.json)。

| 验收 | 实际结果 | 范围 |
| --- | --- | --- |
| 受控路线测试 | 96／96，0 跳过 | 事实、时码、路径、失效验证、真实浏览器几何、字幕双重清理、锁失败路径 |
| 保留 Canvas／SVG runtime | 44／44 | 包括真实 worker、字体环境与拒绝 group signal 后的安全回收 |
| 既有脚本 | 27／27 | 旧研究、结构和输入工具回归 |
| TypeScript | 通过 | 当前生产源码类型检查 |
| 新片 build＋verify | 5／5 | 输入、素材、字幕、引擎、实际环境、最终产物重新复核 |
| 最终 MP4 完整解码 | 2,220／2,220 帧，74 秒 | 尺寸、帧率、时长、均匀空帧及音轨检查 |
| 实际浏览器布局 | 86 个采样，0 错误 | 每镜 0／25／55／85％与首尾，不扩大为全帧几何证明 |
| 独立成片视审 | 5 条 sampled-pass | 98 个总览采样、128 个动作采样、48 个原分辨率关键帧；时间有重合 |
| 静音自动完整播放 | 5／5 正常速度达到 ended | 使用实际系统 Chrome，记录完整时间轴和帧统计；没有人工完整观看或听音 |
| 原 v3 基线 | 5 条源码及影片哈希一致 | 已有作品与 100＋100 研究库保留 |

48 个原分辨率关键帧中，42 个从最终 release 文件重新解码查看，6 个属于与上一审阅版本字节完全相同的产品片，明确按完整 MP4 SHA256 绑定。其他四条成片哈希变化后均重新审阅，未沿用旧版通过结论。

| 实际成片 | 规格 | 状态与声音 | 主要动作 |
| --- | --- | --- | --- |
| [中位数横版](../demos/super/median.mp4) | 20 秒，16:9，600 帧 | validated，原创合成配乐 | B12、D18、E20、A22、C98 最终排序；中位数20与平均数34 |
| [中位数竖版](../demos/super/median-portrait.mp4) | 20 秒，9:16，600 帧 | validated，原创合成配乐 | 同一批对象重新竖版构图；比较组有各自标题 |
| [产品竖版](../demos/super/product.mp4) | 18 秒，9:16，540 帧 | validated，静音 | 光束、步骤推进、路线比较及结尾回收 |
| [声音时码夹具](../demos/super/audio-clock.mp4) | 8 秒，16:9，240 帧 | preview，mock 合成音及混音 | 真实 cue 边界及全角数字符号保留 |
| [本地媒体方版](../demos/super/media-square.mp4) | 8 秒，1:1，240 帧 | preview，draft，静音 | 原创本地图片及视频、来源身份 |

时码夹具首轮连续播放实际记录 28 个 dropped frames，其余四条为0。相同 MP4 的独立复测解码及呈现240帧、掉帧0。两次记录都保留，首轮掉帧根因未证实，完整播放通过不授予跨机器流畅度认证。所有有声音样片均未实际听音，未验证真人旁白的表达、音素同步或配乐听感。

本轮没有掩盖失败：实际构建曾被字体度量溢出、容器裁切、Remotion 原生可选包缺失、媒体行内基线溢出及一次120秒字体准备超时拒绝；独立审查还复现数字归属、全角字幕和输出初始化留锁的问题。修复后重新跑完整套件及最终批次。字体超时发生时另有本地渲染高负载，重试成功；仅观察到共现，未证明根因。锁回归包含两个真实 chmod 权限拒绝，以及一个明确标记的清理异常注入。锁获取内部 ENOSPC、进程被强制终止和跨机器表现没有全覆盖，异常中断后的过期锁仍需确认进程状态后处理。

本地检查通过不等于 Linux 或 Windows 都已通过。Ubuntu 24.04 CI 会另外实际渲染本地视频与混音夹具、完整解码并 verify，再运行全部回归；结果以该提交的 GitHub checks 为准。Windows 未验收。

验收清单与新增 MP4 已在仓库中，可执行 `python3 scripts/validate_super_release.py` 检查公开源输入、媒体、字幕和引擎哈希。开始创作请阅读 [Studio 指南](../studio/README.md)、[输入契约](../studio/CONTRACT.md) 与 [系统架构](super-video-architecture.md)。
