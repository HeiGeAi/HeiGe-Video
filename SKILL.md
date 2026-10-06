---
name: heige-video
description: Design and render original code-driven motion films with distinct editorial typography, cinematic product, ink, whiteboard, or data-storytelling treatments. Use when a video needs meaningful object action, authored composition, deterministic rendering and actual-pixel review; not for a static slide deck or automatic model-quality parity claims.
---

# HeiGe Video · v3 candidate

把题材做成可见的变化：先设计值得拍的物体和决定性动作，再用镜头、材质、文字和声音让它成立。渲染成功只是开始。安装、示例与命令见 [USAGE.md](USAGE.md)；真实能力与验收范围见 [status.md](references/status.md)。

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

默认使用已验证的 Canvas/SVG + FFmpeg。浏览器适配器是独立实验路线；Blender CPU 探针不等于已完成三维全片管线。避免一次引入多个框架。当前实现与研究建议的差别见 [升级机制](references/upgrade-mechanisms.md)。

主观评级不能包装成测量分数。没有真实授权模型调用、同条件样本与盲审，就不宣称低成本优势、模型复现或 Opus 水平。需要比较时使用 [benchmark protocol](references/benchmark.md)。第三方电影、字体、音乐、人物和品牌权利独立于仓库代码许可；保留 [许可与来源](references/source-notices.md)。
