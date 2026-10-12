# HeiGe-Video 受控生产路线

本路线把内容、版式与执行分开。Agent 填 `heige-video/4` JSON，8 类原创组件负责排版和真实动作，Remotion 渲染，FFmpeg 检查最终编码的每一帧。复杂独创镜头继续使用原有 Canvas／SVG 导演路线，渲染成媒体后也可进入受控片。

当前版本是 `4.0.0-alpha.3`。默认创建 15 秒 Forge 熔炉短片，包含原创本地图像、快速运动和完整 128 BPM 配乐。没有真实付费模型调用、低成本模型盲测或商业量产验证。本轮作品与检查范围见 [Forge 清单](../references/v4-forge-status.json)和[交付记录](../references/v4-forge-report.md)。受控路线的技术通过状态叫 `validated`；审美、完整播放和实际听音各自保留状态。使用 mock 或 draft 的项目固定为 `preview`。

连续世界提供持久对象、本地图像、全局镜头、受控运动曲线、完整原创配乐、事件音效与真实三次曝光。快速开始：`node studio/make.mjs init ./my-film.json --ratio 16:9`。字段与实际检查范围见 [CONTINUITY.md](CONTINUITY.md)。

## 本地安装

Node.js 22 或 24，Python 3.10 及以上，FFmpeg 与 FFprobe，已授权的中文字体。依赖只安装在当前 checkout，不修改共享技能或系统配置。

```sh
npm ci
python3 -m venv .venv
.venv/bin/python -m pip install -r studio/requirements.txt
npx remotion browser ensure
```

Ubuntu 可安装 `fontconfig` 与 `fonts-noto-cjk`。macOS 等环境可明确选择已有的中文字体。字体通过实际 cmap 检查后拷贝到临时渲染目录，不请求在线字体。字体缺失时会停止并给出原因。

```sh
export HEIGE_FONT_PATH="/absolute/path/to/a/licensed/Chinese-font.otf"
export HEIGE_PYTHON="$PWD/.venv/bin/python"
# 可选：已有的 Headless Shell，避免重复下载。
export HEIGE_BROWSER_PATH="/absolute/path/to/chrome-headless-shell"
node studio/make.mjs doctor
```

`HEIGE_FONT_INDEX` 用于 TTC 的字体面索引。记录实际字体文件、索引和哈希；目前只有一个真实字体面，粗体可能由浏览器合成。`FFMPEG` 和 `FFPROBE` 可覆盖工具路径。doctor 验证已安装的实际版本。缺失浏览器时 build 会停止，下载须由上述明确安装命令完成。

doctor 也检查 Remotion 对应平台的 native compositor、内置 FFmpeg／FFprobe 和原生库指纹。npm 可能静默跳过下载失败的 optional dependency；这种情况会在出片前被拒绝。先重试 `npm ci --include=optional`，仍缺失时按报错中的平台包安装相同版本。例如仅在 macOS Apple Silicon 上：`npm install --no-save --package-lock=false @remotion/compositor-darwin-arm64@4.0.526`。不要把 macOS 平台包写成 Linux 必装依赖。

## 从自己的 Forge 项目开始

```sh
node studio/make.mjs init ./my-film/project.json --ratio 16:9
node studio/make.mjs validate ./my-film/project.json
node studio/make.mjs build ./my-film/project.json --out ./outputs/my-film-v1
node studio/make.mjs verify ./my-film/project.json --out ./outputs/my-film-v1
```

初始化创建 15 秒、30 fps 的原创 Forge 项目，并把三张 PNG 复制到 `./my-film/project-assets/`。JSON 和素材目录均不得已经存在，软链接也会被拒绝。素材路径相对项目文件，迁移时保留整个项目目录。可选择 `--ratio 9:16` 或 `--ratio 1:1`，每种画幅有独立构图；它们是可编辑模板，真实题材需要重新设计。

| Forge 示例 | 项目 | MP4 |
| :--- | :--- | :--- |
| 横版 | [forge-launch.json](../examples/studio/forge-launch.json) | [horizontal.mp4](../demos/forge/horizontal.mp4) |
| 竖版 | [forge-portrait.json](../examples/studio/forge-portrait.json) | [portrait.mp4](../demos/forge/portrait.mp4) |
| 方版 | [forge-square.json](../examples/studio/forge-square.json) | [square.mp4](../demos/forge/square.mp4) |

输出目录必须是新目录或空目录，位于源码之外或忽略的 `outputs` 下。修改项目后使用新的输出目录，旧输出保留证据，不自动覆盖。

输出包括 MP4、输入快照、编译时间轴、实际静帧、开场与结尾帧、浏览器几何报告、最终 MP4 总览、决定性动作条带、完整媒体检查与版本化 manifest。连续项目还输出逐帧 DOM 记录、承接测量和编码像素变化；三次曝光记录采样与合成图哈希，配乐记录真实 WAV、音乐 cue 和 PCM 测量。verify 校验输入、媒体、字幕、简报、引擎、依赖、字体、浏览器与产物。任何执行器失败都会阻断，不把失败降为成功。

## 保留的受控镜头例子

```sh
node studio/make.mjs validate examples/studio/median.json
node studio/make.mjs build examples/studio/median.json --out ./outputs/median-new
node studio/make.mjs verify examples/studio/median.json --out ./outputs/median-new
```

[median](../examples/studio/median.json)、[median-portrait](../examples/studio/median-portrait.json)、[product](../examples/studio/product.json)、[audio-clock](../examples/studio/audio-clock.json)与[media-square](../examples/studio/media-square.json)继续可作为契约例子。历史 alpha.1 MP4 的验收范围见 [历史目录](../demos/super/README.md)与[固定提交清单](../references/v4-example-status.json)，不能用于证明当前重渲通过。audio-clock 使用 mock，media-square 使用 draft，保持 `preview`。合成音不能冒充真人旁白。

alpha.2 [连续三片](../demos/continuous/README.md)保留为历史实现记录，用户已否决节奏与审美。旧 `sampled-pass` 不代表用户认可，也不证明本轮 Forge 的审美。

## 创作契约

完整字段见 [CONTRACT.md](CONTRACT.md)。一个最小项目：

```json
{
  "schemaVersion": "heige-video/4",
  "title": "看到变化",
  "mode": "explainer",
  "ratio": "16:9",
  "theme": "ledger",
  "shots": [
    {"id": "opening", "type": "hook", "duration": 3, "title": "先提出一个问题"},
    {"id": "action", "type": "steps", "duration": 5, "title": "让过程发生", "items": ["准备输入", "执行动作", "观察结果"]},
    {"id": "ending", "type": "end", "duration": 3, "title": "回到最初的问题"}
  ]
}
```

| 镜头 | 表达能力 |
| --- | --- |
| hook | 开场钩子、留白与网格签名 |
| statement | 结论揭示、章节分隔 |
| steps | 连线、游标与有顺序的动作推进 |
| compare | 两种方法逐侧揭示，横竖布局分别设计 |
| bars | 从零基线增长，保留行标签与数值 |
| transform | 同一对象可见排序，保持 ID 与数值，揭示中间位置 |
| media | 真实本地图片或视频，显式标明截图与生成画面 |
| end | 回收开场与品牌结尾 |

三套主题与镜头分离：`forge` 使用铁黑、酸绿和硬边工业语言，`ledger` 与 `nocturne` 分别从 HeiGe-Design 的 `helvetic-ledger` 与 `nocturne-teal` 适配。`16:9`、`9:16`、`1:1` 具有独立布局，单换尺寸不算竖版验收。UI 预览可使用 `npm run studio`，Studio 自带示例不代替最终 MP4 的检查。

## 真人录音、字幕与本地口播画面

录音和字幕先定版。`audio` 引用已登记的本地音频，`kind` 写 `recording`，`subtitles` 指向同目录 SRT。每镜必须提供连续的 `start` 与 `end`，覆盖实际探测的音频时长。引擎只量化帧边界，不拉伸录音。字幕使用原始 cue 时间，只去句读，不删除数字的小数点与正负号，不生成虚假的逐字对齐。

`media` 可使用本地口播／B-roll 视频，画面里的视频静音，最终音轨统一由 `audio` 控制。图片仅支持 PNG、JPEG、WebP，避免 SVG 外部资源和 GIF 实时时间轴。音乐可通过登记的本地资产引用，也可在连续项目使用固定 15 秒的原创 `musicScore`。两者互斥；旁白存在时由 sidechain 压低音乐，事件音效不触发音乐 ducking。没有在线 TTS、ASR、LLM、生图或视频生成调用。

## Forge 的图像、运动与音乐

| 契约 | 支持范围 |
| :--- | :--- |
| image | `assetId` 引用登记的本地 `kind: image`；其他对象不能使用该字段。保留图像身份，当前采用固定头部与 cover 裁切，Forge 做单色处理 |
| easing | `linear`、`ease-out-cubic`、`ease-in-out-cubic`、`ease-out-expo`、`back-out`，作用于关键帧后续区间；位置／旋转可超调，尺寸／透明度／圆角／相机 zoom 保持端点范围 |
| typography | text／ui 的尺寸 24 至 160，字重 400 至 900 的受控档位，tracking 为 -6 至 8，left／center／right 对齐，lineHeight 为 1.15 至 1.7（缺省 1.55） |
| appearance | 受控填充、描边、0 至 8 的描边宽度、none／stamp 硬阴影、none／film-perforation／stripe／waveform 图案 |
| musicScore | `{style: "forge-breakbeat", bpm: 128, volume: 0.8}`，volume 为 0.05 至 1，只接受 15 秒、24 或 30 fps，不与外部 `music` 同时使用 |

原创音乐实际生成完整 8 小节的鼓组、切分低音、和弦、主 hook 与推进音，输出 `music.wav` 和 `music-score.json`。配乐音量在生成时应用一次，混音不会重复乘相同 gain；只有旁白压低音乐，音效按固定 gain 加入后统一限幅。五段编排的音乐时钟与动作 cue 共用秒值，视频取最近帧，误差至多半帧。别把完整编排、峰值和 RMS 当成听感通过。[音乐说明](../references/music-score.md)记录原创来源和实际测量边界。

所有嵌套字段严格校验。图像资产不接受 URL、路径逃逸、软链接、SVG 或 GIF；代码不会理解素材像素中的文字和事实，需另行核对内容与权利。完整契约与连续创作例子见 [CONTRACT.md](CONTRACT.md)和[CONTINUITY.md](CONTINUITY.md)。

## 事实与质量边界

每个数据行需要同镜头的合法 claim。`claim.text` 逐字来自同一条 `quote`，quote 逐字来自引用的 fact；使用 `--brief` 时还必须逐字存在于简报中。数据的标签、数值与单位要共同属于对应证据。演示数据可以使用 `demoData: true`，画面持续标明演示身份。代码校验出处关联，无法替代来源真实性的判断。

数据行还要求独立的局部主张片段，按照「标签＋明确关系＋数值＋单位」组织，例如「甲有2次记录」。一整句同时出现甲、乙和多个数字，不能用于证明其中任意一行。有限语法宁可拒绝模糊输入；它仍不理解否定、假设或条件句的现实真假，真实事实需要审稿。

普通镜头的 DOM 检查覆盖记录的采样帧；连续世界逐帧记录实际 DOM，检查屏幕边界、文本裁切及文字碰撞。成片检查完全解码的帧数、尺寸、帧率、时长、均匀空帧、音轨存在、音频有限值、静音轨、峰值及音画时长。长时间静止列为需要人工判断的阅读窗候选，不强迫画面一直乱动。逐帧检查仍受声明对象、几何和近似遮挡规则限制，不能证明图像内部内容、叙事与审美正确。

普通镜头在起点、25%、55%、85% 和整片首尾进行实际浏览器检查；连续世界另有逐帧实际 DOM 记录。旁白源单独完整解码，背景音乐不能掩盖静音录音。浏览器控制台错误阻断构建。测试本地图片、视频与方形布局可用 `examples/studio/media-square.json`（明确为 draft）。逐行证据用法可用：

```sh
node studio/make.mjs validate examples/studio/facts.json --brief examples/studio/facts-brief.md
```

技术通过后仍要看抽帧、完整播放和实际听音。manifest 不自动签署审美或发布许可，也不以代理自写分数证明模型水平。数字事实、媒体权利与行业要求需要内容负责人确认。

## 测试与研究

```sh
npm run typecheck
HEIGE_PYTHON="$PWD/.venv/bin/python" npm test
python3 scripts/validate_package.py
python3 scripts/validate_super_release.py
```

真实研究分为 [BrewReel 工程机制](../references/brewreel-architecture.md) 和 [蒸馏、质量与反例](../references/brewreel-distillation.md)。分析固定 upstream commit，记录源码推断与本地实际复现的区别。没有移植 BrewReel 角色、模板源码、影片或音乐。原创实现保留 MIT；Remotion、字体及系统依赖分别遵守自身许可，见 [来源说明](../references/source-notices.md)。
