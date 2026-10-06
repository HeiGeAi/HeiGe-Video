# HeiGe-Video v3.0.0-rc.1

**让代码拍出一件真正发生的事。**

从视觉承诺、完整物体和结束构图出发，先证明最关键的动作，再制作整片。适合动态排版、产品概念片、水墨叙事、白板推演和数据故事。

[安装与使用](USAGE.md) · [Skill 入口](SKILL.md) · [English](README_EN.md) · [当前验证状态](references/status.md)

## 五支全新样片

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

- **导演方法**：同一物件经历有意义的变化；结尾回收开场，镜头负责揭示关系。先看 2–4 秒动作 proof，再扩展全片
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

当前生产路线是 Canvas/SVG + FFmpeg。浏览器适配器单独实验，尚无本环境验证输出；Blender CPU 小探针成功不代表通用三维电影管线已完成。两者不应被误用为默认能力。

## 许可

原创项目代码和文档沿用 [MIT License](LICENSE)，保留已有版权及 [第三方 notices](references/source-notices.md)。研究包不分发第三方影片、截帧、音乐、字体或源码快照。公开仓库许可不自动覆盖参考画面与素材。所有系统依赖另行遵守自身许可。

当前为 v3.0.0-rc.1 预发布候选版。详见 [更新日志](CHANGELOG.md)。
