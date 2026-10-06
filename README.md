# HeiGe-Video

<div align="center">

![Skill](https://img.shields.io/badge/skill-v2--RC-7c3aed.svg)
![Styles](https://img.shields.io/badge/styles-5-0e7490.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**多风格视频创作 Skill | Multi-style, code-driven video creation**

把一个想法，做成有节奏、有动作、有记忆点的视频。

[看样片](#五种风格五支样片) · [快速开始](#快速开始) · [运行样例](#运行样例) · [验证与边界](#验证与边界) · [English](README_EN.md)

</div>

HeiGe-Video 给 coding agent 一套视频创作方法：从内容、主体和镜头开始，选择合适的视觉语言，写出可运行的动画代码，再检查真实画面。适合科普解释、产品概念片、动态排版和数据叙事。

**五套风格规则、五组原创样片源码、一个共享渲染器。** 你可以直接复现样片，也可以让 agent 读入 Skill，围绕自己的题材重新创作。

当前版本为 **v2-RC**。五组样例有完整连续渲染及限定范围的真实抽帧审阅记录；完整实时播放、听音和跨平台适配仍有待验证。

## 五种风格，五支样片

下方可直接播放；若播放器未加载，可打开对应 MP4 原文件。全部样片为 **1280 × 720、24 fps**；数据片 20 秒，其余 30 秒。文件说明与校验值见 [demos](demos/README.md)。

### Swiss-tech / 科技排版

同一组文字与模块精确重排，两则具体笔记逐步形成关系。适合知识解释、概念拆解、动态排版

https://github.com/user-attachments/assets/cd671b63-9576-40da-9edd-6a41d4c7cd38

[下载 MP4 · 查看原文件](demos/swiss-tech.mp4)

### Whiteboard / 白板推演

在同一块板上画出白光、棱镜与分色，沿着一条因果链讲清原理。光路为示意

https://github.com/user-attachments/assets/f69737c3-d811-4351-8a3f-39d561d923c4

[下载 MP4 · 查看原文件](demos/whiteboard.mp4)

### Ink / 水墨叙事

种子随风、落地、出现新芽，用笔触、浓淡、留白和停顿组织动作。生长采用诗性时间压缩

https://github.com/user-attachments/assets/d26c0a77-4d46-4dfb-a062-64638b5432d2

[下载 MP4 · 查看原文件](demos/ink.mp4)

### Dark-keynote / 深色概念片

《一束》从创作题目进入科普画面，再回到同一作品的完成状态。属于概念演示

https://github.com/user-attachments/assets/bf8510a6-bbab-43be-befb-e1028831a036

[下载 MP4 · 查看原文件](demos/dark-keynote.mp4)

### Dataviz / 数据叙事

同五个虚构订单只改变一个极端值，比较平均数与中位数，保持数据对象可追踪

https://github.com/user-attachments/assets/c64d2254-4565-4f74-8f59-2af1b1497122

[下载 MP4 · 查看原文件](demos/dataviz.mp4)


样片声音说明：四支 30 秒视频附原创程序合成声音草图，数据片保持静音。声音只做过数值检查，尚未完成听音验收。共享运行器默认输出静音视频。

## 它能做什么

- **按题材选视觉语言**：科技排版、白板、水墨、深色概念片、数据叙事各有独立的构图、运动和声音规则
- **让主体贯穿镜头**：记录主体 ID、前后状态、镜头理由和动作后果，观众能跟住同一件事物的变化
- **先看真实小样**：先做关键帧和最高风险的 2–4 秒动作，再扩展整片
- **保留可修改的源代码**：Python 场景通过 `render(t)` 输出 SVG，也可接入可选的 Canvas 后端
- **把交付证据一起留下**：MP4、源代码、编码信息、抽帧、镜头清单、事实来源和验证记录均有明确位置

风格规则分别见 [Swiss-tech](references/styles/swiss-tech.md)、[Whiteboard](references/styles/whiteboard.md)、[Ink](references/styles/ink.md)、[Dark-keynote](references/styles/dark-keynote.md)、[Dataviz](references/styles/dataviz.md)。

## 快速开始

### 1. 把 Skill 交给 agent

通用方式：下载完整仓库，让具备文件读写、代码执行和真实看图能力的 agent 读取 `SKILL.md`。

```bash
git clone https://github.com/HeiGeAi/HeiGe-Video.git heige-video
cd heige-video
```

然后对 agent 说：

```text
请读取当前目录的 SKILL.md 和 USAGE.md，先检查运行环境。
用 HeiGe-Video 做一支 30 秒中文白板科普片，16:9，解释白光为什么会被棱镜分色。
先给关键帧和最重要的 3 秒连续小样，审阅后再完成全片。
```

<details>
<summary>安装到 Claude Code 的个人 Skill 目录</summary>

```bash
mkdir -p ~/.claude/skills
git clone https://github.com/HeiGeAi/HeiGe-Video.git ~/.claude/skills/heige-video
```

在 Claude Code 中调用 `/heige-video`，或直接描述视频需求。安装路径和调用方式参见 [Claude Code 官方 Skills 文档](https://code.claude.com/docs/en/skills)。Skill 目录安装完成后，仍需在实际执行环境准备下面的渲染依赖。

</details>

Codex 或其他 coding agent 也可通过完整目录读取方式加载。需要的执行能力见 [模型与执行环境](references/model-harness.md)。只有文本 API 时，还需要文件执行环境及独立视觉评审。

### 2. 准备运行依赖

五组随包样例使用 SVG 后端。渲染已有源码**不需要模型 SDK、API key 或模型调用**；让 agent 创作新内容时，仍使用你所选 agent 的模型与服务。

| 类别 | 依赖 |
|---|---|
| Python | Python 3.10+、Pillow、fontTools |
| 系统图形库 | librsvg（含 `rsvg_handle_render_document`）、Cairo、GLib/GObject、Fontconfig |
| 编码 | FFmpeg / ffprobe，FFmpeg 需包含 `libx264` |
| 中文字体 | Noto Sans CJK SC；水墨样例使用 Noto Serif CJK SC，或自行选择合法且覆盖所需汉字的字体 |
| 可选 Canvas | Node.js、`@napi-rs/canvas` |
| 可选声音草图 | NumPy |

Python 包可安装在独立环境中：

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install Pillow fonttools
python runtime/render_video.py doctor
```

以上为 POSIX shell 命令。系统库、字体和 FFmpeg 需按所在系统单独准备；`doctor` 只检查实际环境，不会自动安装软件。先补齐缺失项，再渲染。

当前验证来自云端 Linux 依赖环境，其他系统需重新验证。已测版本与详细接口见 [运行器说明](references/runtime-adapter.md)。

### 3. 先出一帧，再出整片

从仓库根目录执行：

```bash
# 预览科技排版样例中的一个真实时刻
python runtime/render_video.py frame \
  --style tech --time 21.8 --width 1280 --height 720 \
  --out /tmp/heige-video-tech-frame

# 完整渲染 30 秒科技排版样例
python runtime/render_video.py render \
  --style tech --duration 30 --fps 24 --width 1280 --height 720 \
  --out /tmp/heige-video-tech-film
```

**输出目录必须不存在或为空。** 再跑一次时请换一个目录，避免覆盖已有成果。也可以把 `/tmp/...` 换成你自己的可写目录。

## 运行样例

在已准备好依赖的环境中，从仓库根目录运行：

```bash
# Swiss-tech，30 秒。CLI 预设名是 tech
python runtime/render_video.py render --style tech \
  --duration 30 --fps 24 --width 1280 --height 720 \
  --out /tmp/heige-video-swiss-tech

# 白板，30 秒
python runtime/render_video.py render --style whiteboard \
  --duration 30 --fps 24 --width 1280 --height 720 \
  --out /tmp/heige-video-whiteboard

# 水墨，30 秒。滤镜较重，建议先渲染单帧检查耗时
python runtime/render_video.py render --style ink \
  --font-family 'Noto Serif CJK SC' \
  --duration 30 --fps 24 --width 1280 --height 720 \
  --out /tmp/heige-video-ink

# 深色概念片，30 秒
python runtime/render_video.py render \
  --source examples/dark-keynote/film.py --label dark-keynote \
  --duration 30 --fps 24 --width 1280 --height 720 \
  --cuts 6.125,6.375,8,23,26.5 --out /tmp/heige-video-dark-keynote

# 数据叙事，20 秒
python runtime/render_video.py render \
  --source examples/dataviz/film.py --label dataviz \
  --duration 20 --fps 24 --width 1280 --height 720 \
  --cuts 1,1.8,4,6,9,11.7,12.5,15.5,16.2 --out /tmp/heige-video-dataviz
```

预设输出文件名为 `tech.mp4`、`whiteboard.mp4`、`ink.mp4`；通过 `--source` 加载的自定义场景输出 `video.mp4`。渲染目录还会包含编码信息、画面指标、接触表和审阅帧。

声音需单独生成及合成，见 [声音草图说明](references/sound-sketch.md)。完整用法见 [USAGE.md](USAGE.md)。

## 创作自己的视频

描述题材、观众、时长、画幅和事实材料即可。下面的提示可直接交给 agent：

```text
用 HeiGe-Video 做一支 20 秒数据解释视频，面向第一次学统计的人。
使用我提供的数据，比较平均数与中位数；数据对象在切换视图时保持可追踪。
先检查数据与关键帧，再做转场小样，最后交付 MP4、源代码和验证记录。
```

```text
用 HeiGe-Video 做一支 30 秒水墨短片：一颗种子借风远行，落地后发芽。
画面 16:9，中文少字，保留停顿与留白；生长过程标为诗性时间压缩。
先做落地与发芽的连续小样。
```

工作流程：**明确观众应理解的变化 → 选择风格 → 写镜头清单 → 做真实小样 → 完整渲染 → 技术与画面分别验收**。

自定义 Python 场景需提供 `DURATION`（或 `SECONDS`）和返回完整 SVG 的 `render(t)`；不要依赖墙钟或跨帧可变状态。镜头清单用于约束创作，当前运行器不会自动把清单编译成视频。接口细节见 [运行器说明](references/runtime-adapter.md) 与 [镜头清单](references/shot-manifest.md)。

如果使用自己的模型 API，可先离线导出提示材料：

```bash
# 先将自己的题材与要求保存为 brief.txt
python scripts/export_prompt.py \
  --style dataviz --brief brief.txt --out prompt-export.json
```

导出器只生成本地 `messages` 数据，不发起网络请求。模型返回的源码要先审查，再运行；没有看图能力的模型需要另配视觉评审或人工。

## 验证与边界

### 已有证据

- 五组样例已完成 1280 × 720、24 fps 连续渲染；验收粒度、源码哈希见 [逐例状态](references/example-status.json)
- 本次发布准备中，**11 项运行时测试、15 项脚本测试通过**；当前发布检查见 [release-validation.json](references/release-validation.json)，原始环境记录见 [validation.json](references/validation.json)
- 数据样例有逐帧数值、身份与投影检查，以及重复时刻像素一致性记录，见 [数据片证据](examples/dataviz/provenance.json)
- 真实抽帧审阅与代码测试分别记录，见 [实施状态](references/status.md) 与 [三层验收](references/quality-gates.md)

本地复核命令：

```bash
python -m unittest discover -s runtime/tests -v
python -m unittest discover -s scripts -p 'test_*.py' -v
python scripts/validate_package.py
python scripts/validate_package.py --manifest examples/dataviz/shot-manifest.json
python examples/dataviz/check_example.py
```

运行时完整测试含可选 Canvas 路径，需要 Node.js 与 `@napi-rs/canvas`。测试通过只说明对应技术条件成立，画面仍需要真实审阅。

### 使用前知道这几件事

1. **当前为 v2-RC。** 已做连续编码和限定范围的抽帧审阅，尚未完成整片实时播放及实际听音验收
2. **数据片的窄屏版本还需排版。** 缩到约 390 像素宽时，辅助文字需要放大或重排；建议打开原尺寸样片查看
3. **时长与比例要重新设计。** `--duration` 默认裁剪时间线；改宽高只改变画布，不能代替竖版构图。使用 `--fit-time` 后需复核节奏和阅读时间
4. **渲染速度取决于画面和环境。** 水墨滤镜明显更慢，先测单帧与小样。运行耗时不能用来证明模型费用更低
5. **模型效果尚无对照结论。** 没有完成低价模型基准、通用 agent 认证或与 Opus 的同条件质量比较
6. **只执行可信源码。** SVG 资源限制与 AST 检查不构成 Python / JavaScript 沙箱，外部代码和素材需要先审查

## 项目结构

```text
HeiGe-Video/
├── SKILL.md                    # Agent 入口
├── README.md / README_EN.md     # 中英文说明
├── USAGE.md                    # 运行命令与使用细节
├── demos/                      # 五支样片、预览图与校验信息
├── examples/
│   ├── prototypes/             # 科技排版、白板、水墨源码
│   ├── dark-keynote/           # 深色概念片源码与事实说明
│   └── dataviz/                # 数据片源码、数据、镜头清单与检查
├── runtime/                    # 共享 SVG / 可选 Canvas 渲染器及测试
├── scripts/                    # 验证、提示词导出、声音草图
├── references/
│   ├── styles/                # 五套风格规则
│   ├── quality-gates.md       # 技术、风格与导演验收
│   ├── research-cases.md      # 58 部作品的研究阅读版
│   └── source-notices.md      # 来源与许可说明
└── LICENSE
```

## 研究与致谢

由 [HeiGeAi（Blake Xu）](https://github.com/HeiGeAi) 维护与发布。

方法研究参考了 LemoLab、Kianzzz、Mort1d、JakeB-5 等作者的公开项目；具体链接、观察和许可边界见 [来源说明](references/sources.md) 与 [版权 notices](references/source-notices.md)。原有 `heige-motion-kit contributors` 版权声明予以保留。

[58 部作品研究](references/research-cases.md) 收录方法观察及公开来源，包含 51 部机制参考与 7 部对照。它是研究台账；参考视频、角色、配乐和专有字体不随仓库分发。

## 许可证

代码与文档采用 [MIT License](LICENSE)。使用、修改和分发时请保留相应版权及许可声明。第三方字体、依赖及外部素材按各自许可使用。

## 更多开源工具

本项目属于问问黑哥的开源武器库。全部开源项目的清单、用途和协议，见 [heigeai.com/opensource](https://www.heigeai.com/opensource/)。
