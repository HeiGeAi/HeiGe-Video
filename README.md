# HeiGe-Video v4.0.0-alpha.3

**让想法动起来。用同一个主体，带出画面、节奏与结果。**

现在先看三组明亮样片：柠檬汽水的棉粉、薄荷与柠檬黄；纸飞机的奶油白、钴蓝与红黄贴纸；花开有声的矿彩纸面。每组有横版和竖版，共六条 16 秒原创动画，分别设计主体、构图、动作和配乐。

[![六条明亮样片实际编码封面](demos/bright-showcase/cover.png)](demos/bright-showcase/README.md)

| 题材 | 横版 16:9 | 竖版 9:16 | 视觉与动作 |
| --- | --- | --- | --- |
| 柠檬汽水 | [MP4](demos/bright-showcase/citrus-horizontal.mp4) | [MP4](demos/bright-showcase/citrus-portrait.mp4) | 弹跳糖，挤汁、喷泡与弹性落地 |
| 让点子飞 | [MP4](demos/bright-showcase/paper-horizontal.mp4) | [MP4](demos/bright-showcase/paper-portrait.mp4) | 贴纸俱乐部，折纸、飞行与创意落章 |
| 花开有声 | [MP4](demos/bright-showcase/mineral-horizontal.mp4) | [MP4](demos/bright-showcase/mineral-portrait.mp4) | 明亮矿彩，萌芽、莲瓣与纹样汇聚 |

[打开六条动态预览](demos/bright-showcase/README.md) · [编辑与重新渲染](showcase/README.md) · [实际验收清单](references/bright-showcase-status.json)

这些影片通过本项目的 Remotion 自由创作路线生成，使用原创 SVG、真实本地字体和三支原创配乐。`showcase/render.mjs` 会渲染、解码、记录 DOM 与产物哈希，源码可编辑。原有严格 JSON 路线仍由 `studio/make.mjs` 提供，`init` 目前创建 Forge 模板。新样片没有被冒充为已接入旧主题枚举的模板。

原先铁黑 Forge 的[三画幅样片](demos/forge/README.md)保留为另一种视觉方向，当前展示入口改为明亮、多变的作品。其输入和引擎见 [Forge 清单](references/v4-forge-status.json)。技术检查、抽帧审阅、自动完整播放与人工听音分别记录。

[安装与使用](USAGE.md) · [连续世界指南](studio/CONTINUITY.md) · [Skill 入口](SKILL.md) · [English](README_EN.md) · [BrewReel 研究](references/brewreel-distillation.md) · [OneTake 研究](references/onetake-architecture.md)

## 从自己的项目开始

安装环境后，用同一个执行器创建、校验、构建和复核。`init` 默认生成 15 秒 Forge 项目，按画幅复制原创 JSON 和三张本地 PNG。比如 `./my-film/project.json` 对应 `./my-film/project-assets/`，不依赖仓库外的素材位置。已有 JSON 或素材目录会被拒绝覆盖；搬动项目时要一起保留相对素材目录。

```sh
npm ci
python3 -m venv .venv
.venv/bin/python -m pip install -r studio/requirements.txt
# 安装本地 FFmpeg、Noto Sans CJK SC 字体与 Chromium，具体见 Studio 指南
npx remotion browser ensure
node studio/make.mjs doctor
node studio/make.mjs init ./my-film/project.json --ratio 16:9
node studio/make.mjs validate ./my-film/project.json
node studio/make.mjs build ./my-film/project.json --out ./outputs/my-film-v1
node studio/make.mjs verify ./my-film/project.json --out ./outputs/my-film-v1
```

`--ratio 9:16` 和 `--ratio 1:1` 创建各自的几何布局。创建后调整合法契约字段，通常不用修改渲染器。原生 `image` 绑定登记的本地 PNG／JPEG／WebP；对象的身份、图像与相机投影保持在同一连续世界中。

## alpha.3 的声音与动作

| 机制 | 实际实现与范围 |
| :--- | :--- |
| Forge 视觉 | `forge` 主题、受控字体尺寸、字重与行高、描边、硬阴影、胶片孔／条纹／波形图案；`ledger` 与 `nocturne` 保留 |
| 快速运动 | 固定 `linear`、`ease-out-cubic`、`ease-in-out-cubic`、`ease-out-expo`、`back-out` 曲线；同一时刻纯函数求值，关键帧控制后续区间 |
| 本地图像 | `image.assetId` 只引用登记的图像素材，保留原图身份并进行受控裁切；Forge 示例使用三张原创 PNG |
| 完整配乐 | `forge-breakbeat` 为 128 BPM、4/4、8 小节、15 秒；原创鼓组、切分低音、和弦、主 hook 与推进音实际生成立体声 WAV |
| 音画 cue | 点火、装配、蓄力、画幅编排、压印五段共用秒时钟；视频拍点量化误差不超过半帧，不宣称每个音乐拍点正好是整数帧 |
| 混音 | 配乐音量在生成时应用一次；只有旁白触发音乐 ducking，事件音效按固定增益加入，最终限幅与独立测量 |

配乐配置是 `continuity.musicScore: {style: "forge-breakbeat", bpm: 128, volume: 0.8}`，当前只接受 15 秒，不能与外部 `project.music` 同时使用。其他时长可使用登记的本地音乐，真实旁白仍以最终录音为时钟。音效和配乐是不同层；完整编排、峰值与 RMS 不能证明好听。[配乐来源与机制](references/music-score.md)记录原创方法和听审边界。

## v4 受控生产线

| 能力 | 当前实现 |
| :--- | :--- |
| 创作入口 | `init`、`validate`、`build`、`verify` 共用执行器；`promo`、`explainer`、`lesson`、`talk` 四种模式，三套主题与三种画幅 |
| 连续世界 | 持久对象 ID、完整关键帧、全局相机和逐边界承接；所有时间段使用 `beat`，不能混入普通镜头 |
| 时间积分模糊 | 可选 3 次真实时间采样，180° 全局快门，在线性光空间平均后编码；单采样可关闭 |
| 普通镜头 | 保留 `hook`、`statement`、`steps`、`compare`、`bars`、`transform`、`media`、`end` 八类镜头 |
| 录音与字幕 | 最终录音作为时钟，保留原始 SRT cue，不拉伸人声；mock／draft 保持 preview |
| 数据与证据 | 引用逐字归属、主体与数值单位关联；连续对象的数值文字与 UI 行使用本对象自己的 claims；教学数据持续标记 |
| 素材与布局 | 本地图片／视频／录音／音乐登记，安全路径与权利声明；独立横竖方布局、字体覆盖和真实浏览器几何 |
| 成片 QA | 全部编码帧解码、尺寸／帧数／时长、空帧、旁白与总音轨检测；连续世界另取每帧实际 DOM 几何、可见性与最终 MP4 像素变化 |
| 可复核交付 | 输入、字幕、素材、源码、依赖、字体、浏览器与产物哈希；修改后旧验证失效 |

连续世界限 60 秒、2 至 20 个 beat，每段量化后为 0.25 至 20 秒。`cause`／`outcome` 是作者声明，结构检测不能证明叙事因果、真实产品行为或观众能否认出对象。几何可见性使用点阵近似，像素变化没有图像语义。三次时间采样增加计算成本，不等于物理 HDR、逐对象速度模糊或自动改善审美。图像内部的文字和事实仍需人工核对。

创作由 coding agent 读取 Skill 后生成项目 JSON。本地渲染不需要模型 API key。当前没有自动 LLM／TTS／ASR／在线素材调用或 B-roll 供应缓存。BrewReel 提供受控生产研究方法，OneTake 提供连续创作研究方法，源码与资产均未导入。本版是 alpha，哈希证明完整性，不是信任证书；技术检测不代替审美、播放与听音。

## alpha.2 连续世界历史

[横版](demos/continuous/horizontal.mp4)、[竖版](demos/continuous/portrait.mp4)、[方版](demos/continuous/square.mp4)保留为原生连续性实现的历史样片。用户明确否决这一版的节奏与审美，并指出缺少完整 BGM。历史抽帧状态 `sampled-pass` 只代表当次所记范围，不能改写为用户认可，也不能用于证明 alpha.3 Forge 的审美。历史输入与检查范围见 [连续目录](demos/continuous/README.md)、[alpha.2 清单](references/v4-continuity-status.json)和[历史交付记录](references/v4-continuity-report.md)。

## 五条 v4 alpha 1 历史成片

这五条影片保留原始媒体、输入与验收范围，绑定历史提交 `29135480806d061f1af65734b17dcecad3a31f4a`。历史校验从该 Git 提交重算生产源码哈希，所需提交缺失即失败；它们不能代表 alpha.3 引擎或本轮 Forge 成片已通过验收。

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

当前为 v4.0.0-alpha.3（2026-10-12）。Remotion 使用独立许可。OneTake 固定研究提交采用非商业许可，本项目未导入其源码或资产；原创实现的 MIT 不授予上游材料复用权。商业团队使用前阅读 [第三方 notices](references/source-notices.md)。详见 [更新日志](CHANGELOG.md)。
