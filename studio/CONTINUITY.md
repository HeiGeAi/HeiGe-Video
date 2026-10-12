# HeiGe-Video 连续世界

版本 `4.0.0-alpha.3`，日期 2026-10-12。持久对象、全局镜头、快速固定运动曲线、原创本地图像、完整音乐和真实多次曝光在同一 `heige-video/4` 时钟内工作。默认 Forge 是 15 秒、128 BPM 的工业熔炉起点；`ledger`、`nocturne`、普通镜头与作者式 Canvas 路线继续保留。

代码、配乐和示例资产由 HeiGe-Video 原创实现。OneTake 只作为固定提交方法研究，没有导入其受限源码或资产。研究边界见 [架构研究](../references/onetake-architecture.md)、[集成记录](../references/onetake-integration.md)和[来源说明](../references/source-notices.md)。

## 创建自己的项目

```sh
node studio/make.mjs init ./my-film/project.json --ratio 16:9
node studio/make.mjs validate ./my-film/project.json
node studio/make.mjs build ./my-film/project.json --out ./outputs/my-film-v1
node studio/make.mjs verify ./my-film/project.json --out ./outputs/my-film-v1
```

`init` 创建 15 秒、30 fps 的 Forge JSON，并将三张原创 PNG 复制到 `./my-film/project-assets/`。JSON 或该目录已存在就拒绝覆盖，包括软链接。路径相对项目文件，移动项目时保留素材目录。`--ratio 9:16`、`--ratio 1:1` 生成各自的几何构图；直接改横版尺寸可能让对象出屏，需要重新设计并实际渲染。

| 当前项目 | MP4 入口 |
| :--- | :--- |
| [forge-launch.json](../examples/studio/forge-launch.json) | [横版](../demos/forge/horizontal.mp4) |
| [forge-portrait.json](../examples/studio/forge-portrait.json) | [竖版](../demos/forge/portrait.mp4) |
| [forge-square.json](../examples/studio/forge-square.json) | [方版](../demos/forge/square.mp4) |

## 同一个对象与同一条时钟

| 创作对象 | 职责与硬边界 |
| :--- | :--- |
| beat | 全片时间段，只能使用 beat，不能混入普通镜头。全片至多 60 秒、2 至 20 段，每段量化后 0.25 至 20 秒 |
| object | 唯一 `id` 与稳定 `semanticIdentity`，1 至 24 个。类型为 surface／text／dot／line／ui／image，轨迹完整覆盖零至最终量化时长 |
| keyframes | 时间严格递增，几何全部为有限值，不接受同一时刻双状态。`easing` 控制该关键帧之后的区间，取值来自固定曲线 |
| camera | 唯一全局 2D 仿射投影，与对象共用秒时钟；每种画幅重新设计 world 几何，不宣称真实 3D 镜头 |
| boundary | 每个相邻 beat 恰有一条，顺序覆盖 fromShot／toShot，指定存在对象 carrier，并写 cause／outcome |
| claims | 数值文字和 UI 行由本对象的合法逐字引文支持，不能借用别的对象或 beat。教学数据明确 demoData |
| soundEvents | 存在对象的 ID、唯一事件 ID 与合法时码，最多 32 项，类型 tick／whoosh／impact |
| blur | samples 为 1 或 3，shutterAngle 为 180；3 次是真实浏览器时刻曝光，在 linear-light 中合成 |

文字变化目前通过不同持久文字层的显隐表达。UI 是原创受控面板与短文字行，不是网页重建，也不能冒充真实软件运行。对象身份与承接声明需要作者设计，代码不会自动理解因果。

## 本地图像与 Forge 样式

`image.assetId` 必须引用 `project.assets` 中已经登记的 `kind: image`。其他对象禁止使用 `assetId`。支持 PNG／JPEG／WebP，拒绝 URL、路径逃逸、软链接、SVG 与 GIF。当前图像保留 64 world-pixel 的头部空间并进行 cover 裁切，Forge 做单色处理；原图中的文字、产品状态与事实需另行审阅。

| 配置 | 合法取值 |
| :--- | :--- |
| easing | linear／ease-out-cubic／ease-in-out-cubic／ease-out-expo／back-out |
| typography | 只用于 text／ui；size 24 至 160，weight 为 400／500／600／700／800／900，tracking -6 至 8，align 为 left／center／right，lineHeight 为 1.15 至 1.7（缺省 1.55） |
| appearance | fill／stroke 引用受控主题 token；fill 可 transparent，strokeWidth 0 至 8，shadow 为 none／stamp |
| pattern | none／film-perforation／stripe／waveform |
| 主题 token | paper／ink／muted／accent／line／secondary／on-accent／canvas／heat |

`back-out` 仅允许位置和旋转超调，尺寸、透明度、圆角及相机 zoom 的插值进度限制在合法端点之间。所有样式、关键帧与嵌套配置都拒绝未知字段，不能加入未实现的 CSS 或语义动作。当前字体只有一个实际字体面，字重可能使用浏览器合成，不保证多字重字体文件已安装。

## 完整原创音乐

```json
{"musicScore": {"style": "forge-breakbeat", "bpm": 128, "volume": 0.8}}
```

放在 `continuity` 内。当前配乐固定 128 BPM、4/4、8 小节和 15 秒，volume 为 0.05 至 1，接受 24 或 30 fps。它与外部 `project.music` 互斥。其他时长使用登记的本地音乐，真实旁白仍服从最终录音，不能拉伸旁白以匹配固定配乐。

| 结构 | 音乐时钟 | 画面用途 |
| :--- | :--- | :--- |
| strike | 0 至 1.875 秒 | 点火与起拍 |
| drive | 1.875 至 5.625 秒 | 脚本、画面、声音装配 |
| charge | 5.625 至 7.5 秒 | 蓄力 |
| forge | 7.5 至 13.125 秒 | 主要 groove 与三画幅编排 |
| seal | 13.125 至 15 秒 | 压印与自然衰减，最后重拍为 14.0625 秒 |

实际 WAV 含原创鼓组、切分低音、和弦、主 hook 和推进音，没有第三方采样、SoundFont 或模型 API。音乐保持真实 PCM 样本时钟，视频 cue 取最近帧，误差不超过半帧。音量只在生成 WAV 时应用一次；旁白触发配乐 ducking，音效按固定增益混入，最终限幅。配乐与事件音效不能混称。来源与测量机制见 [music-score.md](../references/music-score.md)。

## 检查与实际判断

build 生成最终 MP4、实际静帧、总览、边界动作条带、字体检查、完整音视频解码、逐帧 DOM 与连续性报告。三次曝光记录实际采样和合成图哈希；音效报告事件时刻与 PCM 测量；音乐另有 `music.wav`、`music-score.json` 的 cue、编排事件、峰值、RMS 与哈希。verify 比对输入、当前引擎、环境及产物，不重新观看或听音。

`structural-pass` 表示所列结构检查通过。点阵遮挡有近似边界，像素差没有图像语义，cause／outcome 没有语义保证。仍须看编码影片，判断身份可辨认、动作节奏、文字可读和承接自然；实际播放声音，判断低音、鼓组、hook 和收尾。技术、抽帧、完整播放、人工听音与用户审美认可独立记录。有限值、峰值、RMS 和哈希都不能代替听感或审美。

当前记录入口是 [Forge 清单](../references/v4-forge-status.json)和[交付记录](../references/v4-forge-report.md)。alpha.2 [历史连续三片](../demos/continuous/README.md)已被用户否决节奏与审美，旧 `sampled-pass` 不能证明 Forge 审美。alpha.1 五片固定在 `29135480806d061f1af65734b17dcecad3a31f4a`，不复用历史验收证明当前引擎。源码、输入、资产、字体或环境变化后必须重新构建。

完整字段及精确范围以 [CONTRACT.md](CONTRACT.md)为准。
