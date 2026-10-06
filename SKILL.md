---
name: heige-video
description: Direct and build original code-rendered motion videos with distinct Swiss-tech, whiteboard, ink, dataviz, or dark-keynote visual languages. Use for explanatory films, product demonstrations, kinetic typography, and visual stories that need shot design, deterministic animation, and actual-frame review; not for a generic slide deck or a promise of model-independent quality.
---

# HeiGe Video

v2-RC 的运行入口与五种样片命令见 [USAGE.md](USAGE.md)

把题材变成有主体、有空间、有动作后果的视频。共同底座负责可靠渲染；风格包决定画面和声音怎样成立。不要把所有题材压进标题、卡片、图表的固定模板。

## 先确认真实能力

1. 保留用户的题材、用途、时长、画幅、语言、事实与授权边界。只有缺失信息会改变方案时才问；否则说明可逆假设并开始
2. 读 [执行与能力适配](references/execution.md)。检查代码执行、逐时刻渲染、合法字体、编码、真实看图及听音能力；不要假设某个品牌的 coding agent、浏览器或 API 必然可用
3. 读 [当前实施状态](references/status.md)。五组原创示例均有连续片技术通过与有明确范围的独立抽帧／针对性审阅记录；没有完成整片实时播放或实际听音验收。按「源代码草稿、连续片技术通过、导演审阅通过」分别记录，不因有 MP4 就标为最终合格

纯文本模型 API 不等于 coding agent 或渲染器。使用本 Skill 需要能读写文件、运行代码、取得真实帧并审图的工具环境；无视觉模型须配独立视觉评审或人工。具体的无 SDK / 离线提示词导入导出见 [模型与执行环境](references/model-harness.md)

## 只加载所需风格

- [Swiss-tech](references/styles/swiss-tech.md)：字与模块通过精确重排表达关系，禁止弹簧与超调
- [Whiteboard](references/styles/whiteboard.md)：在同一块板上绘制、推导、回访；真正绘制图形路径，中文默认正常排版
- [Ink](references/styles/ink.md)：用笔触构形、浓淡和空白组织动作；允许停顿与全总线静音
- [Dataviz](references/styles/dataviz.md)：同一数据对象跨尺度与编码保持身份，动作必须对应数据操作
- [Dark-keynote](references/styles/dark-keynote.md)：同一批界面对象经历问题、操作与可见结果，不拿假 UI 证明产品性能

每片可以只用一种风格。融合时声明主风格和一次明确的媒介转换，用同一物件连接两套规则，不能平均混合互相冲突的运动规则。

## 工作流程

1. 用一句话写观众最后应理解或感受到的改变；指定一个可追踪的主体和决定性动作。依据用户需求给足够不同的方向，不为流程凑方案数
2. 从真实事实或明确标注的示意建立故事。产品片优先展示具体操作和结果；抽象图形本身不能充当功能证据
3. 写 [开放镜头清单](references/shot-manifest.md)：主体 ID、前后状态、世界坐标、镜头理由、动作、阅读窗、声音事件与绘制入口。代码可以任意绘制，镜头类型不受 card/title/chart 枚举限制
4. 先做开场、标志动作、结果与结束的真实帧，以及最高风险的 2–4 秒连续小样。看真实输出后再扩展全片；好看的海报不证明运动成立
5. 按 [执行协议](references/execution.md) 生成 render(t)、声音事件及不同画幅的布局。手机竖版需要重新设计主体、文字和相机，不能用中心裁切替代
6. 分别通过 [技术、风格、独立导演验收](references/quality-gates.md)。评审先看 brief、事实和实际成片证据，再看代码。失败要修复和重渲；不得用总分掩盖硬伤
7. 交付成片、源代码、可复现命令、事实/素材来源、版本及 QA 证据。准确说明已看帧、已播放、已听音和未测内容

## 可移植，不许诺模型神效

能力不足时交付诚实的分镜、源代码或待审预览，并明确缺口。低价模型可执行已约束的小任务；独立视觉判断、选题、构图与导演决策不能由“更多提示词”保证。比较模型时严格执行 [基准协议](references/benchmark.md)，没有真实调用、同条件样本和盲审结果就不宣称达到 Opus 或任何模型的水平。

方法出处与许可边界见 [来源](references/sources.md) 和 [58 例研究阅读版](references/research-cases.md) 与 [机器台账](references/research-cases.json)。参考媒体、角色、配乐和专有字体不随这个 Skill 分发。
