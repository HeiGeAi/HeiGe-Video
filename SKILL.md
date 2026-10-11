---
name: heige-video
description: Turn a brief, final recording, captions and local assets into original motion films. Use the controlled Remotion production route for explainers, product videos, brand stories and lessons, with factual citations, recording-driven timing, portrait layout and decoded quality checks. Use authored Canvas for bespoke ink, whiteboard and cinematic actions.
---

# HeiGe Video · v4 alpha

把题材做成可见的变化：先设计值得拍的物体和决定性动作，再用镜头、材质、文字和声音让它成立。默认用受控 Remotion 生产线制作结构化讲解、产品、品牌和课程视频。安装、示例与命令见 [Studio 指南](studio/README.md)；旧版能力见 [status.md](references/status.md)。

## 先选择生产路线

| 目标 | 路线 | 输入与输出 |
| :--- | :--- | :--- |
| 讲解、产品流程、品牌、录音课程、多画幅 | v4 controlled Remotion | 版本化 JSON、最终录音／SRT、登记素材 → MP4、抽帧、布局与完整解码报告 |
| 独特主体、笔墨、复杂白板、作者式镜头 | v3 authored Canvas | treatment、持久对象与可信源码 → MP4、decoded action/cut strips |

已有获批作品沿用原路线。不要把需要精细定制的复杂动作硬塞进受控镜头。也不要让简单讲解每次重写渲染引擎。两条路线都先证明关键变化，再交付整片。

## 受控生产工作流

1. 锁定目的、受众、事实来源、品牌、画幅与结尾。只把会改变制作方案的缺失信息交给用户；其他采用可逆默认。模式选择 `explainer`（讲解）、`promo`（产品／品牌）、`lesson`（课程）或 `talk`（口播）
2. 建证据表。逐条保留原文与来源。把主张绑定到同一条原文，数字、主体、单位同时匹配。用 `--brief` 把原始材料带入校验。教学模拟数据显式使用 `demoData: true`，不把生成素材当成纪实证据
3. 有录音时先定稿录音与 SRT，以真实音频时长设连续 `start`／`end`。时长服从最终录音，不能拉伸录音迁就镜头。SRT 保留原始 cue，只去展示句读。没有真实录音时可以用 `kind: mock` 验机制，但成片始终是 preview
4. 选择具体主题：`ledger` 适合精确数据与讲解，`nocturne` 适合产品与品牌。选用八类受控镜头：`hook`、`statement`、`steps`、`compare`、`bars`、`transform`、`media`、`end`。每镜承担一个清楚的认知任务；保留对象 ID，使动作前后对应。各镜头字段只能来自 [CONTRACT.md](studio/CONTRACT.md)
5. 为 `16:9`、`9:16`、`1:1` 选合适结构。竖版减少并列信息，正文留出字幕区。图片、视频、录音与音乐先登记本地路径和权利。禁止在镜头源码中临时请求远程素材
6. 写项目 JSON。此路线只调整内容参数与合法镜头组合，通常不用修改 `studio/src`。先 validate，再用新的目录 build。执行器、字体、资产或媒体检测失败必须阻断，不准把失败降为成功
7. 看实际编码输出的 overview、动作条带和首尾帧。修布局、动作与信息层级后重新渲染。verify 核对源码、输入、依赖、字体、浏览器与全部产物哈希。分别记录技术通过、抽帧审阅、完整播放、听音，不自动批准发布

```sh
node studio/make.mjs validate examples/studio/median.json
node studio/make.mjs build examples/studio/median.json --out /tmp/heige-median-new
node studio/make.mjs verify examples/studio/median.json --out /tmp/heige-median-new
```

本地引擎无需模型 API key。创作 JSON 由当前 coding agent 完成，尚未内置自动 LLM 调用、TTS、ASR、在线素材供应器或课程批处理。不要把人工／agent 编排描述成已实现的全自动服务。方法蒸馏与原创实现见 [BrewReel 分析](references/brewreel-distillation.md)。

## 先确定一件值得看的事

保留用户的目的、题材、事实、时长、画幅、语言、参考和环境。只在缺失信息会改变方案时提问；否则采用可逆假设。检查 [执行能力](references/execution.md)，不把文本 API 当成可运行、可看图的 coding agent。

用一句话写「视觉承诺」：观众将看到谁，通过什么动作，造成什么可辨认的结果。产品片要有具体输入、操作和结果；讲解片要有一次真正的实验、比较或重编码；叙事片要有选择与后果。不要让标题代替动作，也不要把所有题材做成卡片排队。

先设计结束构图，再倒推局部镜头：结尾应改变观众对开场物体的理解。为主角、中层信息对象和环境安排不同尺度，明确每个资产的形状、内容、材质和用途。简单几何可以是最终语言，但不能把未设计的矩形、线条、光圈当作产品或材质的完成态。

## 按需选参考，不把资料库塞满上下文

运行小型 [参考选择器](scripts/select_references.py)，一次取 3–5 条与当前困难相关的机制：构图、动作或材质。阅读返回的用途和缺陷，必要时再查完整台账。默认排除负面对照；只有分析失败方式时显式选 controls。资料库含 100 部作品和 100 个项目，数量不是质量证明，参考资产也不获复用授权。

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
2. 做开场、动作、结果的真实帧，以及最难动作的 2–4 秒连续 proof。检查中间态：谁在动，为什么动，什么被改变？证明不成立就改物体、构图或动作，不靠增加粒子和发光补救
3. 创建真实内容资产和持久对象，再扩展全片。用同一 cue 时钟驱动姿态、相机、字幕与声音事件；让每次运动有准备、变化、反应和落定，具体节奏由风格决定
4. 按 [运行契约](references/runtime-adapter.md) 实现纯时间 render。Canvas 可声明 DURATION、ready、stateAt、TEXT_STRINGS、CUTS，使用共享 motion helpers；纹理噪声固定在对象空间。手机竖版要重新构图，不能仅改分辨率
5. 先通过技术检测，再由实际像素检查对象身份、因果、文字和材质。用 decoded cut/action strips 检查转场与决定性动作；打开图片才算看过。需要更密采样时逐帧提取，不把五帧 cut strip 当成穷尽检查
6. 按 [质量门槛](references/quality-gates.md) 记录带时间戳的缺陷，修根因、重渲、重看。后改字体、相机或素材不能继承旧画面的通过结论
7. 交付成片、源代码、命令、事实/素材出处与版本化 QA。分别说明技术通过、抽帧审阅、完整播放、实际听音；未验证就保持未验证

## 能力和结论边界

v4 增加了 Remotion + FFmpeg 的受控生产线。旧 `runtime/adapters/browser_source.mjs` 仍是另一条实验路线，不能混同。Canvas/SVG 保留给作者式作品；Blender CPU 探针不等于已完成三维全片管线。当前实现与研究建议的差别见 [v4 架构](references/super-video-architecture.md) 与 [v3 升级机制](references/upgrade-mechanisms.md)。

主观评级不能包装成测量分数。没有真实授权模型调用、同条件样本与盲审，就不宣称低成本优势、模型复现或 Opus 水平。需要比较时使用 [benchmark protocol](references/benchmark.md)。第三方电影、字体、音乐、人物和品牌权利独立于仓库代码许可；保留 [许可与来源](references/source-notices.md)。
