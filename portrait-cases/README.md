# 四条原创竖版案例

延续明亮、动作明确的创作方向，四条均为 1080×1920、9:16、30 fps、16 秒。逻辑画布为 720×1280，文字和原创 SVG 在最终尺寸直接渲染，每个题材有自己的对象、动作和原创配乐。

| 案例 | 主物体与变化 | 视觉设定 | 配乐 |
| :--- | :--- | :--- | :--- |
| 莓好一口 | 草莓、冰淇淋球、蛋筒与淋酱 | boing-candy | 摇摆马林巴 |
| 咖啡醒醒 | 手柄锁入、萃取落杯、奶纹与蒸汽 | coffee-house | 爵士电钢与轻刷鼓 |
| 快乐开拍 | 镜头伸出、快门、实体照片连续吐出 | sticker-club | 切分 funk 与快门音 |
| 小宇宙发射 | 玩具火箭装配、点火、发射与环绕 | jelly-pop | 太空琶音与推进节奏 |

所有画面是原创概念演示，不代表真实品牌或产品的功能。组件分别位于 [冰淇淋](scenes/BerryCone.tsx)、[咖啡](scenes/CoffeeWake.tsx)、[相机](scenes/HappyCamera.tsx)、[火箭](scenes/PocketRocket.tsx)。

## 编辑与出片

使用仓库锁定依赖与明确安装的 Remotion 浏览器，FFmpeg 和 Python 的 Pillow、fonttools 按主项目说明安装。所有需要的字体子集已在本目录中，不隐式联网。

```sh
npx tsc --noEmit -p portrait-cases/tsconfig.json
mkdir -p outputs
node portrait-cases/render.mjs proof --out outputs/portrait-proof
node portrait-cases/render.mjs build --out outputs/portrait-films
```

可以只做一个案例：

```sh
node portrait-cases/render.mjs build --only HappyCamera --out outputs/camera-film
```

可选 ID：`BerryCone`、`CoffeeWake`、`HappyCamera`、`PocketRocket`。输出目录必须不存在，且位于本源码目录之外。Python 默认是项目 `.venv/bin/python`，其他环境设置 `HEIGE_PYTHON`；浏览器可设置 `HEIGE_BROWSER_PATH`。修改中文文案后，用缓存的原始 OFL 字体运行 `prepare_fonts.py` 重新制作子集，保留字体来源和许可。

`proof` 输出实际静帧及一段 4 秒连续动作。`build` 输出完整带音视频、15 张编码视频抽帧、GIF、实际封面、所有帧的文本几何和完整媒体检查。音乐在 [music.mjs](music.mjs) 内用确定性 PCM 合成，四个主题的速度、旋律与乐器不同。声音事件按实际动作时刻排列。

每次构建绑定本目录全部执行源文件、字体、根依赖及媒体检查器的哈希。不同浏览器和 FFmpeg 版本可能产生不同编码字节，原始记录保留实际环境。技术检查不替代遮挡检查、完整观看、听审或用户审美评价。

[实际成片画廊](../demos/portrait-cases/README.md)与[当前清单](../references/portrait-cases-status.json)分别记录媒体和已完成的验证范围。已有 `showcase/` 与六条明亮样片的源码和媒体保持原版本。
