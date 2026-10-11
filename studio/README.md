# HeiGe-Video 受控生产路线

本路线把内容、版式与执行分开。Agent 填 `heige-video/4` JSON，8 类原创组件负责排版和真实动作，Remotion 渲染，FFmpeg 检查最终编码的每一帧。复杂独创镜头继续使用原有 Canvas／SVG 导演路线，渲染成媒体后也可进入受控片。

当前版本是 `4.0.0-alpha.1`。可生成视频，尚未做真实付费模型调用、低成本模型盲测或商业量产验证。当前验收范围见 [五条实际样片](../demos/super/README.md) 与 [最终清单](../references/v4-example-status.json)。受控路线的技术通过状态叫 `validated`；审美、完整播放和实际听音各自保留状态。使用 mock 或 draft 的项目固定为 `preview`。

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

## 从样片开始

```sh
node studio/make.mjs validate examples/studio/median.json
node studio/make.mjs build examples/studio/median.json --out ../heige-video-output/median
node studio/make.mjs verify examples/studio/median.json --out ../heige-video-output/median

node studio/make.mjs build examples/studio/median-portrait.json --out ../heige-video-output/median-portrait
node studio/make.mjs build examples/studio/product.json --out ../heige-video-output/product
node studio/make.mjs build examples/studio/audio-clock.json --out ../heige-video-output/audio-clock
```

第一支包含原创合成配乐与明确标记的演示订单。竖版按独立布局重新排布。产品片没有音轨。audio-clock 是 8 秒合成音的时码测试，固定标为 mock，保持 `preview`，用于验证导入时码与禁止占位音成为正式技术交付的边界。合成音不能冒充真人旁白。

输出目录必须是新目录或空目录，位于源码之外或忽略的 `outputs` 下。修改分镜后使用新的输出目录，旧输出保留证据，不自动覆盖。`studio/demo_assets.py` 可确定性重建演示配乐、mock 音和字幕。

输出包括：MP4、输入快照、编译时间轴、每镜真实静帧、开场与结尾帧、浏览器几何报告、最终 MP4 抽帧总览、决定性动作条带、媒体检查、版本化 manifest。verify 校验输入、所有媒体与字幕、简报、引擎源码、依赖、字体、浏览器与产物。每项检查执行器失败都停止；损坏状态不回退为成功。

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

两套主题从 HeiGe-Design 的 `helvetic-ledger` 与 `nocturne-teal` 适配。主题与镜头分离。`16:9`、`9:16`、`1:1` 具有独立布局，单换尺寸不算竖版验收。UI 预览可使用 `npm run studio`，Studio 自带示例不代替最终 MP4 的检查。

## 真人录音、字幕与本地口播画面

录音和字幕先定版。`audio` 引用已登记的本地音频，`kind` 写 `recording`，`subtitles` 指向同目录 SRT。每镜必须提供连续的 `start` 与 `end`，覆盖实际探测的音频时长。引擎只量化帧边界，不拉伸录音。字幕使用原始 cue 时间，只去句读，不删除数字的小数点与正负号，不生成虚假的逐字对齐。

`media` 可使用本地口播／B-roll 视频，画面里的视频静音，最终音轨统一由 `audio` 控制。图片仅支持 PNG、JPEG、WebP，避免 SVG 外部资源和 GIF 实时时间轴。音乐通过本地资产引用，旁白存在时由 sidechain 压低音乐。没有在线 TTS、ASR、LLM、生图或视频生成调用。

## 事实与质量边界

每个数据行需要同镜头的合法 claim。`claim.text` 逐字来自同一条 `quote`，quote 逐字来自引用的 fact；使用 `--brief` 时还必须逐字存在于简报中。数据的标签、数值与单位要共同属于对应证据。演示数据可以使用 `demoData: true`，画面持续标明演示身份。代码校验出处关联，无法替代来源真实性的判断。

数据行还要求独立的局部主张片段，按照「标签＋明确关系＋数值＋单位」组织，例如「甲有2次记录」。一整句同时出现甲、乙和多个数字，不能用于证明其中任意一行。有限语法宁可拒绝模糊输入；它仍不理解否定、假设或条件句的现实真假，真实事实需要审稿。

DOM 检查当前采样帧的屏幕边界、文本裁切及文字碰撞。成片检查完全解码的帧数、尺寸、帧率、时长、均匀空帧、音轨存在、音频有限值、静音轨、峰值及音画时长。长时间静止列为需要人工判断的阅读窗候选，不强迫画面一直乱动。布局检查只覆盖明确记录的时刻，不能证明每一帧都没有碰撞。

每镜在起点、25%、55%、85% 和整片首尾进行实际浏览器检查；旁白源单独完整解码，背景音乐不能掩盖静音录音。浏览器控制台错误阻断构建。测试本地图片、视频与方形布局可用 `examples/studio/media-square.json`（明确为 draft）。逐行证据用法可用：

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
