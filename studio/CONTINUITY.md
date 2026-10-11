# HeiGe-Video 连续世界

`4.0.0-alpha.2` 把持久对象、统一镜头、动作声音和真实多次曝光合进现有 `heige-video/4`。代码是 HeiGe-Video 的原创实现；上游研究与反例见 [架构研究](../references/onetake-architecture.md) 和 [质量研究](../references/onetake-quality.md)。

## 从自己的项目开始

```sh
node studio/make.mjs init ./my-film/project.json --ratio 16:9
node studio/make.mjs validate ./my-film/project.json
node studio/make.mjs build ./my-film/project.json --out ./outputs/my-film-v1
node studio/make.mjs verify ./my-film/project.json --out ./outputs/my-film-v1
```

初始化提供原创流程演示。改标题和对象文字，调整轨迹与 beat，再生成新输出目录。`9:16` 与 `1:1` 会生成各自的几何构图。横版坐标直接换画幅可能让内容离开视口，须重新设计并实际渲染。

| 创作对象 | 本版职责 |
| --- | --- |
| beat | 全片时间段，可长可短，避免每个镜头同样长度 |
| object | 始终存在的 DOM 对象，ID 和 semanticIdentity 保持稳定 |
| camera | 全片唯一镜头，用相同投影控制所有对象 |
| boundary | 指明上一段如何通过同一对象进入下一段 |
| soundEvent | 指定哪个可见对象在何时触发原创音效 |
| blur | 实际三次浏览器曝光，线性光合成后编码 |

完整字段、范围、帧量化和旁白时钟规则见 [CONTRACT.md](CONTRACT.md)。文字变化目前通过不同持久文字层的显隐表达；表面本身可移动、缩放、旋转和改变圆角。没有引入外部 AI 模型，也不把界面示意称为真实应用操作。

## 检查与判断

每次 build 输出完整 MP4、实际静帧、总览、边界动作条带、字体检查、完整音视频解码报告、逐帧实际 DOM 记录与连续性报告。启用三次曝光时还有逐组源图与合成图哈希；音效有事件时刻、声像、样本数、峰值与 RMS。

`structural-pass` 表示这些检查通过。仍需看最终视频，确认承接自然、文字可读和声音舒服。完整浏览器播放与听音是独立状态。反例显示，固定装饰、微小移动点、缺失数据或只看片首片尾都会产生假安心，本版明确拒绝这类边界承接。

源码或输入一旦修改，原有报告不能继续证明当前引擎。五条旧样片固定在 `29135480806d061f1af65734b17dcecad3a31f4a`；本版三画幅演示见 [连续世界样片](../demos/continuous/README.md)，按独立清单和实际测试记录核对。
