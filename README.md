# HeiGe-Video v4.0.0-alpha.2

**让同一个对象，从开场一路带出结果。**

从视觉承诺、完整物体和结束构图出发，先证明最关键的动作，再制作整片。v4 alpha 2 在原创 Remotion 引擎中加入原生连续世界：对象保留身份，相机揭示关系，动作跨越 beat 边界，事件声音与画面共用时钟。BrewReel 的受控生产思想继续约束事实、录音、素材与交付，OneTake 的连续创作方法只作为研究参考，代码与示例由本项目原创实现。

[安装与使用](USAGE.md) · [连续世界指南](studio/CONTINUITY.md) · [Skill 入口](SKILL.md) · [English](README_EN.md) · [BrewReel 研究](references/brewreel-distillation.md) · [OneTake 研究](references/onetake-architecture.md)

## 从一个项目开始

安装环境后，用同一个执行器创建、校验、构建和复核。`init` 按画幅复制原创模板，生成不依赖外部素材的独立项目 JSON，并拒绝覆盖已有文件。模板是可编辑起点，创作时需要重新设计内容与动作。

```sh
npm ci
python3 -m venv .venv
.venv/bin/python -m pip install -r studio/requirements.txt
# 安装本地 FFmpeg、Noto Sans CJK SC 字体与 Chromium，具体见 Studio 指南
npx remotion browser ensure
node studio/make.mjs doctor
node studio/make.mjs init /tmp/heige-launch-new.json --ratio 16:9
node studio/make.mjs validate /tmp/heige-launch-new.json
node studio/make.mjs build /tmp/heige-launch-new.json --out /tmp/heige-launch-new
node studio/make.mjs verify /tmp/heige-launch-new.json --out /tmp/heige-launch-new
```

三种原创构图：[横版](examples/studio/continuous-launch.json) · [竖版](examples/studio/continuous-portrait.json) · [方版](examples/studio/continuous-square.json)。持续对象、相机和事件声音由同一项目契约驱动，各画幅分别构图。

## 三条原生连续世界样片

| 成片 | 画幅 | 原创项目 |
| :--- | :--- | :--- |
| [横版 MP4](demos/continuous/horizontal.mp4) | 16:9 | [continuous-launch.json](examples/studio/continuous-launch.json) |
| [竖版 MP4](demos/continuous/portrait.mp4) | 9:16 | [continuous-portrait.json](examples/studio/continuous-portrait.json) |
| [方版 MP4](demos/continuous/square.mp4) | 1:1 | [continuous-square.json](examples/studio/continuous-square.json) |

实际编码、抽帧与播放范围见 [连续样片目录](demos/continuous/README.md)，输入、当前引擎、视频哈希与声明检查见 [本版清单](references/v4-continuity-status.json)，真实测试与失败修复见 [交付记录](references/v4-continuity-report.md)。技术、连续结构、抽帧、完整播放与听音分别记录；清单校验不等于重新渲染或听过声音，也不引用历史样片的数据证明新引擎。

## v4 受控生产线

| 能力 | 当前实现 |
| :--- | :--- |
| 创作入口 | `init`、`validate`、`build`、`verify` 共用执行器；`promo`、`explainer`、`lesson`、`talk` 四种模式，`ledger`／`nocturne` 两套主题，三种画幅 |
| 连续世界 | 持久对象 ID、语义身份声明、完整关键帧与全局相机；所有时间段使用 `beat`，不能混入普通镜头 |
| 承接与声音 | 相邻 beat 恰有一条对象承接，声明 cause／outcome；原创 `tick`、`whoosh`、`impact` 绑定对象与事件时码 |
| 时间积分模糊 | 可选 3 次真实时间采样，180° 全局快门，在线性光空间平均后编码；单采样可关闭 |
| 普通镜头生产 | 保留 `hook`、`statement`、`steps`、`compare`、`bars`、`transform`、`media`、`end` 八类镜头 |
| 时间轴 | 最终录音作为时钟，原始 SRT cue，不拉伸人声；mock／draft 保持 preview |
| 数据与证据 | 引用逐字归属、主体与数值单位关联；连续对象的数值文字与界面行使用本对象自己的 claims；教学数据持续标记 |
| 素材 | 本地图片／视频／录音／音乐登记，安全路径检查与权利声明登记，生成素材与截图明确标注 |
| 多画幅 | 16:9、9:16、1:1 的独立布局，字体覆盖与真实浏览器几何检查 |
| 成片 QA | 全部编码帧解码、尺寸／帧数／时长、空帧、旁白与总音轨检测；连续世界另取每帧实际 DOM 几何、可见性与最终 MP4 像素变化 |
| 可复核交付 | 输入、字幕、素材、源码、依赖、字体、浏览器与产物哈希，修改后旧验证失效 |

连续世界本版限 60 秒、2 至 20 个 beat，每段量化后为 0.25 至 20 秒。`cause`／`outcome` 是作者声明，结构检测不能证明叙事因果、真实产品行为或观众能否认出对象。几何可见性采用点阵近似，像素变化也没有图像语义；仍须看实际成片。时间多采样增加计算成本，不等于物理 HDR、逐对象速度模糊或自动改善审美。

创作由 coding agent 读取 Skill 后生成项目 JSON。本地渲染不需要模型 API key。当前没有自动 LLM／TTS／ASR／在线素材调用或 B-roll 供应缓存。技术检测不代替审美、完整播放与听音；v4 是 alpha，哈希证明完整性，不是信任证书。

## 五条 v4 alpha 1 历史成片

这五条影片保留原始媒体、输入与验收范围，绑定历史提交 `29135480806d061f1af65734b17dcecad3a31f4a`。历史校验从该 Git 提交重算生产源码哈希，所需提交缺失即失败；它们不能代表 alpha 2 连续世界引擎已通过验收。

| 样片 | 规格 | 验证重点 |
| :--- | :--- | :--- |
| [中位数横版](demos/super/median.mp4) | 20 秒，16:9 | 零基线柱图、同一对象可见排序、数值与中间项保持 |
| [中位数竖版](demos/super/median-portrait.mp4) | 20 秒，9:16 | 重新构图，比较内容按上下分组 |
| [产品竖版](demos/super/product.mp4) | 18 秒，9:16 | 暗色光束、步骤推进与结尾回收 |
| [声音时码夹具](demos/super/audio-clock.mp4) | 8 秒，16:9 | 原始字幕时码、混音及全角数字符号，mock 保持 preview |
| [本地媒体方版](demos/super/media-square.mp4) | 8 秒，1:1 | 实际本地图片／视频与素材说明，draft 保持 preview |

[历史截帧、源码与验收范围](demos/super/README.md) · [历史哈希清单](references/v4-example-status.json)。声音均为原创程序合成或静音，未做真人口播体验验证。

保留 Canvas 创作底座与已有获批作品。受控镜头适合稳定生产，作者式 Canvas 适合精细的水墨、白板和电影动作。下面的 v3 作品继续作为原始基线。

## 五支 v3 原创样片

### 《夜航》

30 秒 · 1080p · 原创合成声音。同一海报从信息重排变成节奏乐器。

https://github.com/user-attachments/assets/1099994b-4ec2-4553-a94b-3c98fe149200

[MP4](demos/swiss-editorial-v3.mp4) · [源码与复现](examples/swiss-editorial/README.md)

### SPECTRA

36 秒 · 720p · 原创合成声音。素材 → 证据 → 分镜 → 时间轴 → 光路成片。

https://github.com/user-attachments/assets/740bf648-3140-4980-a571-0edb1af79381

[MP4](demos/spectra-product-v3.mp4) · [源码与复现](examples/cinematic-product/README.md)

### 《归岸》

36 秒 · 720p · 静音。水墨行舟、避礁、可见靠岸与停稳。

https://github.com/user-attachments/assets/84201db2-fc4e-47c5-997a-b54ecf40af07

[MP4](demos/homeward-ink-v3.mp4) · [源码与复现](examples/ink-narrative/README.md)

### 《38 微秒》

42 秒 · 1080p · 静音。同一白板推演 GPS 与相对论。

https://github.com/user-attachments/assets/b3ee0e0a-bdc0-4db8-a041-245a720380d8

[MP4](demos/gps-relativity-v3.mp4) · [源码与复现](examples/whiteboard-navigation/README.md)

### 《拆开平均数》

23.25 秒 · 720p · 静音。同一批订单从收据变成分布。

https://github.com/user-attachments/assets/690365d1-e2f4-411e-8178-d0c30952e0fe

[MP4](demos/unpacking-average-v3.mp4) · [源码与复现](examples/dataviz-forward/README.md)

五支均有完整技术输出及独立抽帧／针对性修复复核。前两支含原创合成声音，后三支静音；声音测量过但未试听。技术、抽帧、完整播放、实际听音分开记录。没有专家参考同水平或模型成本结论。

具体提升、真实修复与剩余差距见 [中文升级报告](UPGRADE_REPORT_ZH.md)；源码／媒体哈希和验收范围见 [当前状态](references/status.md)。另外五支 v2 影片保留作回归对照，未换名冒充升级。

## 这次升级的重点

- **导演方法**：同一物件经历有意义的变化；结尾回收开场，镜头负责揭示关系。先看 2 至 4 秒动作 proof，再扩展全片
- **可执行底座**：Canvas 作者时长、资产就绪、纯时间状态、文字声明、硬切点，以及共享 cue / 相机 / 笔触 / seeded noise helpers
- **真实成片 QA**：从编码后的 MP4 提取逐帧动作条带、切点邻帧、精确时间映射和哈希；看实际像素并修复，生成报告本身不算通过
- **100 + 100 研究库**：100 部独立作品与 100 个 canonical 项目，提取具体机制、缺陷、许可和核验边界。小型选择器每次只返回相关的几条

方法及已实现／仅研究的区别见 [升级机制](references/upgrade-mechanisms.md)。这不是增加规则和风格名称来许诺更好的画面。

## 快速开始

保留整个文件夹，让支持 Skill 的 coding agent 读取 `SKILL.md`。无需模型 SDK 或 API key 就能渲染已有源码；创作新片需要能读写文件、运行代码、取得帧并实际看图的环境。

```sh
git clone https://github.com/HeiGeAi/HeiGe-Video.git
cd HeiGe-Video
python3 runtime/render_video.py doctor
python3 scripts/select_references.py --style ink --query 'brush identity consequence' --limit 4
python3 scripts/validate_package.py
```

你可以这样提需求：

> 用 heige-video 做一支 20 秒的中文短片，解释「为什么中位数不怕极端值」。横版，数字都用明确标注的示例数据。先设计结束构图，让同一批数值经历两种真实可见的统计操作，给我看关键动作小样，再制作整片。

完整安装、显式 Canvas 源码命令和 QA 用法见 [USAGE.md](USAGE.md)。`--style tech/whiteboard/ink` 是保留兼容的 **v2 SVG 旧样片入口**，不会自动变成 v3。

## 研究有什么，没证明什么

[影片索引](references/research-cases.md)：79 部机制参考、3 部 case-study/tutorial、1 部混合参考、17 部负面／对照。51 部来自旧基线但本轮重新看图，49 部新增。逐片保存来源、媒体哈希和精确采样覆盖；较长影片的 overview 较稀疏。并非 100 部都优秀，也不等于 100 部完整实时观看或听音。

[项目索引](references/research-projects.md)：50 个 agent/编排/创作项目与 50 个渲染/运动/QA 项目。包含有明确标签的指令型 Skill，不能说成 100 个已验证渲染器。研究检查代码与文档，没有安装或运行第三方项目。

```sh
python3 scripts/select_references.py --kind videos --style swiss-tech --limit 3
python3 scripts/select_references.py --kind projects --query 'font shaping' --limit 3
python3 scripts/select_references.py --controls only --limit 3
```

默认排除 controls。选择器是离线关键词路由，不是审美打分。没有付费模型对比、成本优势测量或 Opus 水平认证。参考作者的模型宣传没有独立核验。

## 文件导航

- [SKILL.md](SKILL.md)：简短创作入口与按需风格路线
- [USAGE.md](USAGE.md)：安装、运行、审阅和测试
- [Runtime contract](references/runtime-adapter.md)：Canvas/SVG API、motion helpers、decoded QA
- [Quality gates](references/quality-gates.md)：技术、风格、实际感知三层验收
- [100 视频 JSON](references/research-cases.json) / [100 项目 JSON](references/research-projects.json)：可移植、无私人路径的研究台账

v4 使用 Remotion + FFmpeg。旧 Canvas/SVG + FFmpeg 路线保留；旧浏览器适配器单独实验，不能混同 v4。Blender CPU 小探针成功不代表通用三维电影管线已完成。

## 许可

原创项目代码和文档沿用 [MIT License](LICENSE)，保留已有版权及 [第三方 notices](references/source-notices.md)。研究包不分发第三方影片、截帧、音乐、字体或源码快照。公开仓库许可不自动覆盖参考画面与素材。所有系统依赖另行遵守自身许可。

当前为 v4.0.0-alpha.2（2026-10-12）。Remotion 使用独立许可。OneTake 固定研究提交采用非商业许可，本项目未导入其源码或资产；原创实现的 MIT 不授予上游材料复用权。商业团队使用前阅读 [第三方 notices](references/source-notices.md)。详见 [更新日志](CHANGELOG.md)。
