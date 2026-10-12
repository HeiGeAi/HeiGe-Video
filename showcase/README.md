# 明亮样片工作区

三种原创题材，各有横版和竖版，使用同一套已锁定的 Remotion 依赖。源码、字体与原创配乐在本仓库内，无需付费生成服务或外部素材即可重新渲染。

| 题材 | 视觉设定 | 主物体与结果 | 配乐 |
| --- | --- | --- | --- |
| 柠檬汽水 | boing-candy | 柠檬接汁、开罐喷泡、弹性落地 | 明快 mallet pop |
| 让点子飞 | sticker-club | 白纸折叠、曲线飞行、创意落章 | 拨弦与轻鼓 |
| 花开有声 | dunhuang-mineral 的明亮纸面 | 发芽、莲瓣盛开、矿彩纹样 | 五声音阶与柔和敲击 |

每条 16 秒、30 fps。横版 1280×720，竖版 720×1280。所有曲线和图形均在 `scenes/` 中原创绘制，帧驱动、可寻址，不依赖 CSS 实时动画或随机状态。横竖版分别安排构图、轨迹和文字。

## 编辑与渲染

按仓库安装说明执行 `npm ci`，安装 FFmpeg 和 Python 的 Pillow、fonttools，以及明确安装 Remotion 浏览器。已提交的本地字体直接用于渲染，不会隐式下载。

```sh
npx tsc --noEmit -p showcase/tsconfig.json
mkdir -p outputs
node showcase/render.mjs proof --out outputs/bright-proof
node showcase/render.mjs build --out outputs/bright-films
```

也可仅渲染一条：

```sh
node showcase/render.mjs build --only CitrusPortrait --out outputs/citrus-portrait
```

可选 ID 为 `CitrusHorizontal`、`CitrusPortrait`、`PaperFlightHorizontal`、`PaperFlightPortrait`、`MineralBloomHorizontal`、`MineralBloomPortrait`。输出目录须不存在，并位于 `showcase/` 源码目录之外。Python 默认使用仓库 `.venv/bin/python`，其他环境设置 `HEIGE_PYTHON`；自备浏览器可设置 `HEIGE_BROWSER_PATH`。

组件位于 [Citrus.tsx](scenes/Citrus.tsx)、[PaperFlight.tsx](scenes/PaperFlight.tsx)、[MineralBloom.tsx](scenes/MineralBloom.tsx)。题材和动作说明分别见 [汽水](scenes/citrus-notes.md)、[纸飞机](scenes/paper-notes.md)、[矿彩](scenes/mineral-notes.md)。配乐和同步声音事件在 [music.mjs](music.mjs)，每条为 120 BPM、8 小节、16 秒。字体在 [public/fonts](public/fonts)，来自 OFL 字体的重命名子集，出处和字符覆盖见 [font-provenance.json](font-provenance.json)。

修改中文文案时，需要用缓存的原始字体重新生成子集。下载位置由 `prepare_fonts.py` 的 `FONTS` 定义，下载后运行 `python showcase/prepare_fonts.py`。脚本不会联网，缺少字体或字形就拒绝。保留随字体提供的 OFL 文件。

## 验证与展示

构建会记录当前源码、字体、工具环境和所有产物哈希。每个输出帧采集真实 DOM 文本边界，全部视频帧和全部音轨声道重新解码。GIF 与封面从最终 MP4 解码生成，构建期间源码变化即拒绝；抽帧审阅、自动正常速度播放和听音分别记录。

这是一条允许各题材自由绘制的 Remotion 创作路线，使用独立入口。原有 `studio/make.mjs` 的严格项目契约和 Forge 默认模板仍可使用；这里没有把新样片冒充成已经纳入旧 JSON 主题枚举的功能。

柠檬汽水是明确标注的原创概念广告。矿彩图形是原创植物与纹样，不是敦煌壁画复原。音乐为原创编排与程序化音色，无采样包或参考旋律。
