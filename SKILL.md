---
name: heige-video
description: Create original motion films from a brief, final recording, captions and local assets. Default init creates a 15-second Forge continuous Remotion world with original images, fast easing and a complete 128 BPM score. Use persistent objects, camera handoffs and event sounds, or controlled scenes for explainers and lessons. Preserve facts, recording timing, independent layouts and decoded checks. Keep authored Canvas for bespoke ink, whiteboard and cinematic actions.
---

# HeiGe Video · v4.0.0-alpha.3

把题材做成可见的变化：先设计值得拍的物体和决定性动作，再用镜头、材质、文字和声音让它成立。v4 alpha 3（2026-10-12）默认采用原创 Remotion 生产线。`init` 提供 15 秒 Forge 熔炉起点，包含原创图像、快速运动、完整 128 BPM 配乐和独立三画幅构图。具体题材与已批准风格优先，不能强迫所有作品使用工业视觉。需要同一对象贯穿全片时用原生连续世界，结构化讲解继续使用八类普通镜头。安装见 [使用指南](USAGE.md)，连续对象见 [CONTINUITY.md](studio/CONTINUITY.md)，旧版能力见 [status.md](references/status.md)。

## 先选择生产路线

| 目标 | 路线 | 输入与输出 |
| :--- | :--- | :--- |
| 同一主体、产品流程、连续 UI 示意、跨 beat 的视觉变化 | v4 native continuous Remotion | 持久对象、原创本地图像、完整轨迹、相机、承接、配乐与事件声音 → MP4、逐帧连续结构报告与编码检查 |
| 结构化讲解、独立图表、录音课程、本地素材、多画幅 | v4 controlled scenes | 八类合法镜头 JSON、最终录音／SRT、登记素材 → MP4、抽帧、布局与完整解码报告 |
| 独特主体、笔墨、复杂白板、作者式镜头 | v3 authored Canvas | treatment、持久对象与可信源码 → MP4、decoded action/cut strips |

已有获批作品沿用原路线。不要把需要精细定制的复杂动作硬塞进受控镜头。也不要让简单讲解每次重写渲染引擎。两条路线都先证明关键变化，再交付整片。

## 受控生产工作流

1. 锁定目的、受众、事实来源、品牌、画幅与结尾。只把会改变制作方案的缺失信息交给用户；其他采用可逆默认。模式选择 `explainer`（讲解）、`promo`（产品／品牌）、`lesson`（课程）或 `talk`（口播）
2. 建证据表。逐条保留原文与来源。把主张绑定到同一条原文，数字、主体、单位同时匹配。用 `--brief` 把原始材料带入校验。教学模拟数据显式使用 `demoData: true`，不把生成素材当成纪实证据
3. 有录音时先定稿录音与 SRT，以真实音频时长设连续 `start`／`end`。时长服从最终录音，不能拉伸录音迁就镜头。SRT 保留原始 cue，只去展示句读。没有真实录音时可以用 `kind: mock` 验机制，但成片始终是 preview
4. 选择具体主题：`forge` 是铁黑与酸绿的工业熔炉视觉，`ledger` 适合精确数据与讲解，`nocturne` 适合暗色产品与品牌。连续世界使用 `beat` 与统一 `continuity`；普通镜头使用 `hook`、`statement`、`steps`、`compare`、`bars`、`transform`、`media`、`end`，两种结构不能混用。每段承担一个清楚的认知任务。字段只能来自 [CONTRACT.md](studio/CONTRACT.md) 与 [连续指南](studio/CONTINUITY.md)
5. 为 `16:9`、`9:16`、`1:1` 选合适结构。竖版减少并列信息，正文留出字幕区。图片、视频、录音与音乐先登记本地路径和权利。禁止在镜头源码中临时请求远程素材
6. 用 `init` 创建 15 秒 Forge JSON 与同名 `<stem>-assets` 目录内的三张原创 PNG，选择横版、竖版或方版后重新设计内容和动作。初始化拒绝覆盖已有 JSON 或素材目录，迁移项目要一起保留相对资产。已有项目也可直接校验。此路线调整合法契约参数，通常不用修改 `studio/src`。先 validate，再用新的目录 build。执行器、字体、资产或媒体检测失败必须阻断，不准把失败降为成功
7. 看实际编码输出的 overview、动作条带和首尾帧。修布局、动作与信息层级后重新渲染。verify 核对源码、输入、依赖、字体、浏览器与全部产物哈希。分别记录技术通过、抽帧审阅、完整播放、听音，不自动批准发布

```sh
node studio/make.mjs init /tmp/heige-project-new.json --ratio 9:16
node studio/make.mjs validate /tmp/heige-project-new.json
node studio/make.mjs build /tmp/heige-project-new.json --out /tmp/heige-project-new
node studio/make.mjs verify /tmp/heige-project-new.json --out /tmp/heige-project-new
```

本地引擎无需模型 API key。创作 JSON 由当前 coding agent 完成，尚未内置自动 LLM 调用、TTS、ASR、在线素材供应器、B-roll 缓存或课程批处理。不要把人工／agent 编排描述成已实现的全自动服务。方法蒸馏见 [BrewReel 分析](references/brewreel-distillation.md) 与 [OneTake 固定提交研究](references/onetake-architecture.md)。

## 原生连续世界的创作约束

| 对象与时钟 | 创作要求 |
| :--- | :--- |
| 持久身份 | 使用稳定 `id` 与 `semanticIdentity`。`surface`、`text`、`dot`、`line`、`ui`、`image` 六种对象从零覆盖到最终量化时长，同一时刻不能声明双状态 |
| 本地图像 | `image.assetId` 只引用已登记的 `kind: image`，其他对象不得借用素材字段。支持 PNG／JPEG／WebP，拒绝 URL、路径逃逸、软链接、SVG 与 GIF。图像内部文字和事实须人工审稿 |
| 轨迹与样式 | 关键帧使用合法固定 `easing` 控制后续区间；`back-out` 只让位置／旋转超调，尺寸等受控量保持端点范围。`typography` 只用于 text／ui，lineHeight 为 1.15 至 1.7（缺省 1.55）；`appearance` 只接受受控 token 和字段，不臆造 CSS 或语义动作 |
| 镜头与承接 | 使用一条全片 `camera`；每个相邻 beat 恰有一条 `boundaries`，声明承接对象、cause 和 outcome。相机连续不能证明叙事成立，须看编码后的承接窗口 |
| 数值事实 | 数值 `text` 与 UI `rows` 由本对象自己的合法 `claims` 逐字支持，不能借用 beat 或其他对象的引文。教学数据使用 `demoData: true` |
| 事件声音 | `soundEvents` 绑定对象与同一秒时钟，类型为原创 `tick`、`whoosh`、`impact`。事件音效不能代替完整 BGM |
| 原创配乐 | `musicScore: {style: "forge-breakbeat", bpm: 128, volume: 0.8}` 实际生成鼓组、低音、和弦、主 hook 与推进音。只接受 15 秒，不能与外部 `project.music` 同时使用；其他时长改用登记的本地音乐 |
| 混音与听审 | 配乐音量只应用一次，旁白触发音乐 ducking，事件音效以固定增益加入。实际试听 WAV 与最终 MP4 的节奏、主 hook 和收尾；有限值、响度和 RMS 不等于好听 |
| 时间积分 | `blur: {samples: 3, shutterAngle: 180}` 采三个真实时刻并在线性光空间合成；`samples: 1` 关闭。先证明动作可读，再检查重影和成本 |

Forge 默认是 128 BPM、8 小节、15 秒：点火、装配、蓄力、画幅编排、压印五段。音乐保持实际采样时钟，视频 cue 取最近帧，误差至多半帧。真实旁白必须服从最终录音，不把录音改速以塞进 15 秒配乐模板。

通用连续世界限 60 秒、2 至 20 个 beat，每段量化后为 0.25 至 20 秒。检查包括每帧实际 DOM 观测、近似可见性与最终编码像素变化；`cause`／`outcome` 没有语义证明。不得把结构通过包装为创意或真实产品行为认证。

当前作品入口：[横版](demos/forge/horizontal.mp4)、[竖版](demos/forge/portrait.mp4)、[方版](demos/forge/square.mp4)。范围与哈希以 [Forge 清单](references/v4-forge-status.json)和[交付记录](references/v4-forge-report.md)为准。alpha.2 [历史三片](demos/continuous/README.md)已被用户否决节奏与审美，不能继承其 `sampled-pass` 证明新片；未验证的完整播放或听音保持原状态。

## 先确定一件值得看的事

保留用户的目的、题材、事实、时长、画幅、语言、参考和环境。只在缺失信息会改变方案时提问；否则采用可逆假设。检查 [执行能力](references/execution.md)，不把文本 API 当成可运行、可看图的 coding agent。

用一句话写「视觉承诺」：观众将看到谁，通过什么动作，造成什么可辨认的结果。产品片要有具体输入、操作和结果；讲解片要有一次真正的实验、比较或重编码；叙事片要有选择与后果。不要让标题代替动作，也不要把所有题材做成卡片排队。

先设计结束构图，再倒推局部镜头：结尾应改变观众对开场物体的理解。为主角、中层信息对象和环境安排不同尺度，明确每个资产的形状、内容、材质和用途。简单几何可以是最终语言，但不能把未设计的矩形、线条、光圈当作产品或材质的完成态。

## 按需选参考，不把资料库塞满上下文

运行小型 [参考选择器](scripts/select_references.py)，一次取 3 至 5 条与当前困难相关的机制：构图、动作或材质。阅读返回的用途和缺陷，必要时再查完整台账。默认排除负面对照；只有分析失败方式时显式选 controls。资料库含 100 部作品和 100 个项目，数量不是质量证明，参考资产也不获复用授权。

```sh
python3 scripts/select_references.py --style ink --query 'brush identity consequence' --limit 4
```

只加载主风格：

- [Swiss/editorial](references/styles/swiss-tech.md)：同一张设计通过可见编辑变成另一种用途；精确、无超调
- [Cinematic product](references/styles/dark-keynote.md)：真实设计的主体、明确空间与可见操作结果；概念 UI 必须标注
- [Ink narrative](references/styles/ink.md)：笔触和墨色承担造型，动作改变同一片世界；留白和停顿有目的
- [Whiteboard](references/styles/whiteboard.md)：同一板面上的可执行推演，工具和图形共同证明结论
- [Dataviz](references/styles/dataviz.md)：同一批数据经历排序、分配或编码变化，身份和数值不丢失

融合风格时指定主语言和一次有动机的媒介转换，使用同一物件承接。不同题材要重新设计，不能只给示例换字换色。

## 先做动作证据，再做整片

1. 写短 treatment：视觉承诺、事实依据、主物体 ID、结束构图、镜头尺度、材质、动作规则、文字阅读窗。用 [镜头清单](references/shot-manifest.md) 记录状态前后和实现入口，避免只有 shot title 的空分镜
2. 做开场、动作、结果的真实帧，以及最难动作的 2 至 4 秒连续 proof。检查中间态：谁在动，为什么动，什么被改变？证明不成立就改物体、构图或动作，不靠增加粒子和发光补救
3. 创建真实内容资产和持久对象，再扩展全片。用同一 cue 时钟驱动姿态、相机、字幕与声音事件；让每次运动有准备、变化、反应和落定，具体节奏由风格决定
4. 按 [运行契约](references/runtime-adapter.md) 实现纯时间 render。Canvas 可声明 DURATION、ready、stateAt、TEXT_STRINGS、CUTS，使用共享 motion helpers；纹理噪声固定在对象空间。手机竖版要重新构图，不能仅改分辨率
5. 先通过技术检测，再由实际像素检查对象身份、因果、文字和材质。用 decoded cut/action strips 检查转场与决定性动作；打开图片才算看过。需要更密采样时逐帧提取，不把五帧 cut strip 当成穷尽检查
6. 按 [质量门槛](references/quality-gates.md) 记录带时间戳的缺陷，修根因、重渲、重看。后改字体、相机或素材不能继承旧画面的通过结论
7. 交付成片、源代码、命令、事实/素材出处与版本化 QA。分别说明技术通过、抽帧审阅、完整播放、实际听音；未验证就保持未验证

## 能力和结论边界

v4 增加了 Remotion + FFmpeg 的受控生产线与原生连续世界。旧 `runtime/adapters/browser_source.mjs` 仍是另一条实验路线，不能混同。Canvas/SVG 保留给作者式作品；Blender CPU 探针不等于已完成三维全片管线。v4 alpha 1 的五条样片按固定历史 Git 提交验证，不能证明 alpha.3 引擎已通过。哈希只证明完整性。当前实现与研究建议的差别见 [v4 架构历史](references/super-video-architecture.md)、[连续指南](studio/CONTINUITY.md) 与 [v3 升级机制](references/upgrade-mechanisms.md)。

主观评级不能包装成测量分数。没有真实授权模型调用、同条件样本与盲审，就不宣称低成本优势、模型复现或 Opus 水平。需要比较时使用 [benchmark protocol](references/benchmark.md)。第三方电影、字体、音乐、人物和品牌权利独立于仓库代码许可；保留 [许可与来源](references/source-notices.md)。
