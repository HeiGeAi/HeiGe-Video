# OneTake 连续性验证与 HeiGe-Video 原创验收

结论：OneTake 值得吸收的是「跨镜承接对象、速度曲线、快动作曝光积分、先低成本草稿再精修」的制作纪律。它的 carry score 主要由页面轨迹与几何框产生，不能直接充当最终成片连续性的证明。实测中，1 平方像素的移动点、画外的自报对象、完全缺测的对象，都能产生误导性的通过结果。HeiGe-Video 应采用完整帧覆盖、浏览器实际测量、最终 MP4 像素辅助和独立视审共同构成的验收。

研究基准为 [feitangyuan/onetake](https://github.com/feitangyuan/onetake/tree/2f5fbd363a0aec22055fbf62489380065737c91d)，固定提交 `2f5fbd363a0aec22055fbf62489380065737c91d`。研究日期为 2026 年 10 月 12 日。下文链接均固定到该提交。

上游采用 [PolyForm Noncommercial 1.0.0](https://github.com/feitangyuan/onetake/blob/2f5fbd363a0aec22055fbf62489380065737c91d/LICENSE)。本次没有将上游代码、字体、素材或模板复制到 HeiGe-Video。新增 oracle 由本项目独立设计和实现。上游源码函数的研究执行保留在仓库之外，供复核研究结论。

## 证据范围

本次完成三类工作。

1. 静态检查 `probe.py`、`verify_promo.py`、`analyze_ref.py`、`render.py`、`frame_diff.py` 和 `vo_tools.py`。
2. 在隔离目录中选择并执行已审查的上游纯评分函数，输入为独立构造的轨迹；执行上游 `_work` 的控制流时，浏览器接口被本研究的本地截图桩替代。这个实验只证明控制流漏洞，不宣称运行了完整浏览器渲染。
3. 以 FFmpeg 生成原创 MP4，再实际运行上游 `verify_promo.py`。保留退出码、完整输出、原始输入和文件 SHA256。

未执行上游安装脚本、网络请求、付费 TTS、参考素材下载或上游 HTML 成片渲染。当前已有 Python 环境提供 NumPy 与 Pillow，没有 Playwright Python 和 OpenCV。本次没有补装依赖。首次在上游目录运行默认 `python3` 时实际出现 `ModuleNotFoundError: No module named numpy`，随后使用本机已有 Python 3.14 完成无浏览器的验证。这次失败属于执行记录的一部分，没有隐藏为通过。

## carry score 的实际信任边界

[采样入口](https://github.com/feitangyuan/onetake/blob/2f5fbd363a0aec22055fbf62489380065737c91d/scripts/probe.py#L136)优先检查页面是否提供 `window.__track`。存在时，直接将页面返回的 x、y、w、h、opacity 转成观测，面积采用 w×h。它没有在这个路径上用真实 DOM 或最终 MP4 像素纠正自报位置、可见性或遮挡。

没有注解时，[自动跟踪器](https://github.com/feitangyuan/onetake/blob/2f5fbd363a0aec22055fbf62489380065737c91d/scripts/probe.py#L90)读取 DOM 几何、祖先 opacity 和部分 Canvas 绘制调用。它比纯声明可靠，但几何框依然不等于可见像素。被另一层完全遮挡、clip 隐藏、滤镜与混合效果等，不能由这个框可靠证明。文字 key 只保留前 40 个字符；大面积背景会被排除。[Canvas 包装](https://github.com/feitangyuan/onetake/blob/2f5fbd363a0aec22055fbf62489380065737c91d/scripts/probe.py#L48)也不是完整的绘制状态机，`Path2D` 分支和裁切路径等有盲区。

[continuity](https://github.com/feitangyuan/onetake/blob/2f5fbd363a0aec22055fbf62489380065737c91d/scripts/probe.py#L203)以身份和面积加权 Jaccard 找内容替换，再给幸存对象分类。位置移动超过画幅对角线的 2％，或尺度变化超过阈值，就算 strong carrier。这一分支不要求 key 相同，也没有最低可见面积。静止的大对象只会算半分 anchor。

这造成两个不同的漏洞：节点身份相同可以掩盖内容身份变化；极小的移动点可以掩盖大面积场景替换。几何移动是「这个框动了」的证据，不能自动升级成「这个叙事对象承接了前后关系」的证据。

评分还有三个自动豁免：[连续硬切 burst、末尾 1.2 秒、页面声明的 cuts](https://github.com/feitangyuan/onetake/blob/2f5fbd363a0aec22055fbf62489380065737c91d/scripts/probe.py#L259)。当没有 considered boundary 时，score 返回 1。这里的 1 可能表示「没有检测到可评估对象」，也可能表示「所有边界都被豁免」，不一定表示连续性优秀。

## 实际执行的轨迹反例

统一构造参数为 1920×1080、10 fps、6 秒。主要反例在第 22 个采样点替换大场景对象。以下是执行上游原函数的结果，不是 README 推断。

- 裸场景替换：score 0，considered 1，kind 为 bare。这是实验的正常基线。
- 加入 1 平方像素的同 ID 点，并使其移动 200 像素：score 1，considered 1，kind 为 carried。
- 同一个点的 key 从 old 改为 new：仍为 score 1、carried。内容身份变了，位置变化仍能获得满分。
- 同一个点始终位于 x=-3000 到 x=-2800：仍为 score 1、carried。自报面积没有被实际画幅裁正。
- 全部采样没有内容：score 1，considered 0。
- 在空内容结果上附加一次 `__seek` 失败：score 1，considered 0。失败记录不会改变这个评分函数的结果。
- 为裸场景替换声明 cuts=[2]：score 1，considered 0，原来的 bare 被 declared 豁免。
- 构造每隔 0.6 秒硬切的五次链：burst 豁免窗口延长至 0.45 到 3.35 秒；最终 score 1，considered 0。这个窗口超过注释描述的 1.5 秒，并且替换窗口的合并会进一步压低可评估事件数量。
- 声明某必需对象整段 `inFrame`，实际从未观测到它：[framing](https://github.com/feitangyuan/onetake/blob/2f5fbd363a0aec22055fbf62489380065737c91d/scripts/probe.py#L407)返回 samples=0、bad=[]。上层仅看 bad 时可以产生 PASS。
- 稳定对象单帧跳跃 1000 像素：[moves_of](https://github.com/feitangyuan/onetake/blob/2f5fbd363a0aec22055fbf62489380065737c91d/scripts/probe.py#L274)将孤立跳跃步长归零，curves 返回 peak=0、count=0。将 teleport 排除出「旅行曲线」可以理解，但另一个专门的 discontinuity gate 必须保留它。

[verify_promo](https://github.com/feitangyuan/onetake/blob/2f5fbd363a0aec22055fbf62489380065737c91d/scripts/verify_promo.py#L79)以 score 小于 0.5 判 FAIL，小于 0.7 判 WARN，其他判 PASS。`__seek` 失败仅打印，没有加入失败判定。这个后半结论来自静态检查；本次没有执行带 `comp` 的浏览器验证 CLI。

## 最终视频与声音的实际反例

原创素材一为 6 秒 30 fps MP4，前 3 秒黑色，后 3 秒白色，附完整静音音轨。上游验证 CLI 实际输出：rest PASS，still_ratio=0.986，longest_quiet=3.0；not-flat PASS；audio PASS，peak=-180.0 dBFS，clipped=0，quiet_ratio=1.0；最终 `VERDICT: PASS`，退出码 0。

其 SHA256 为 `3f010e6b372352cd67a3e5f26e87f1c5aea1105375c0542121e98feaa06d848b`。这证明该命令的 PASS 不能自动解释为「不是幻灯片」或「声音存在并可用」。它测的是所选统计规则。

原创素材二为 6 秒全黑视频，只有第 62 帧全屏白色。真实解码该帧，灰度值为 255。[energy](https://github.com/feitangyuan/onetake/blob/2f5fbd363a0aec22055fbf62489380065737c91d/scripts/analyze_ref.py#L34)以 12 fps 重采样，实际漏掉这一帧，输出整段 still_ratio=1.0、longest_quiet=6.0，最终仍为 PASS，退出码 0。

其 SHA256 为 `ec6ed9d49bb991fc96637ec7dfbbe991331d6d36714bc3ecce14ad5445f2d9d1`。作为对照，把闪白放在第 61 帧时，energy 确实观测到变化，但整体仍 PASS。区别是「漏测」与「测到了但规则允许」，不能混为一谈。

[audio_stats](https://github.com/feitangyuan/onetake/blob/2f5fbd363a0aec22055fbf62489380065737c91d/scripts/verify_promo.py#L35)检查峰值、削波和静音占比，没有下限 RMS、必需旁白源存在性或原始旁白独立质量。FFmpeg 解码失败时返回 None，上层会显示无音轨 skip。持续音乐可能因为没有足够 quiet frames 被拒绝；全静音反而满足 quiet 规则。因此声音规则必须按「旁白、BGM、音效」的用途分别定义。

另一个独立 FFmpeg 实验使用同一条 6 秒视频和 2 秒音频，采用上游相同的 shortest 选项，实际得到 video duration=2.0、nb_frames=60。上游[渲染器](https://github.com/feitangyuan/onetake/blob/2f5fbd363a0aec22055fbf62489380065737c91d/scripts/render.py#L209)用 planned N 写 metadata，而 mux 可能缩短成片。不能用声明的 frames 代替实际解码帧数。

`vo_tools.py` 的[字幕策略](https://github.com/feitangyuan/onetake/blob/2f5fbd363a0aec22055fbf62489380065737c91d/scripts/vo_tools.py#L147)结合转录词时码、句子切块和 CJK 估算。日文 morae 估计再吸附附近停顿，不等于通用中文逐字强制对齐。本次只审代码，没有执行 TTS 或语音识别。

## 运动模糊与确定性

线性光曝光平均是有价值的制作思路。[render.py](https://github.com/feitangyuan/onetake/blob/2f5fbd363a0aec22055fbf62489380065737c91d/scripts/render.py#L40)先将 sRGB 转为线性光，积分后转回；[cut_side](https://github.com/feitangyuan/onetake/blob/2f5fbd363a0aec22055fbf62489380065737c91d/scripts/render.py#L55)尝试避免曝光跨越硬切。这可以减少截图式动画的频闪。但局部变化、加速运动、遮挡和场景切换，不能仅用一种低分辨率差分启发式彻底区分。

更具体的漏洞是[首末曝光截图相等时跳过全部中间采样](https://github.com/feitangyuan/onetake/blob/2f5fbd363a0aec22055fbf62489380065737c91d/scripts/render.py#L143)。首末相同不能推出中间没有运动。研究实际执行上游 `_work` 的原控制流，使用原创截图桩构造 8 次曝光中首末黑色、中间两次白色。结果 captures=2、still=1、输出像素=0；若将 8 次样本交给原来的积分函数，得到像素=137，且没有被当作硬切。这个结果证明优化分支确实漏积分，不宣称跑过完整浏览器页面。

自适应样本数量来自页面自报的 `__motion`，并有最大样本数限制，不能证明所有局部高速对象得到足够采样。[verify 的模糊判断](https://github.com/feitangyuan/onetake/blob/2f5fbd363a0aec22055fbf62489380065737c91d/scripts/verify_promo.py#L87)又优先相信邻接 render.json 的 shutter>0，该文件没有绑定 MP4 SHA。静态结论是伪造或过期 sidecar 能改变 sharp/blurred 分类；本次没有运行完整浏览器曲线验证来冒认一个端到端伪造 PASS。

有 OpenCV 时，[flow](https://github.com/feitangyuan/onetake/blob/2f5fbd363a0aec22055fbf62489380065737c91d/scripts/analyze_ref.py#L62)增加真实像素 optical flow 和方向梯度 smear 测量。它是对主导运动的启发式，不是逐对象模糊证明，且输入宽度仅 320。本次环境没有 OpenCV，这部分仅是源码分析。

确定性方面，[frame_diff.py](https://github.com/feitangyuan/onetake/blob/2f5fbd363a0aec22055fbf62489380065737c91d/scripts/frame_diff.py#L18)对指定时间点做实际截图比较，严格像素差异是一项有用回归。但它没有自动检查全部帧、随机访问次序、并发 worker 或重启后的状态一致性。页面 errors 被打印，未进入 diff verdict。

[resume](https://github.com/feitangyuan/onetake/blob/2f5fbd363a0aec22055fbf62489380065737c91d/scripts/render.py#L125)仅检查帧文件存在；[输出目录](https://github.com/feitangyuan/onetake/blob/2f5fbd363a0aec22055fbf62489380065737c91d/scripts/render.py#L184)使用同一父目录下的 `_frames`。无来源和引擎指纹的恢复可能混入旧帧，同父目录的并发任务也有冲突风险。这些属于静态发现，本次没有破坏性运行并发上游渲染。

## 已落实的原创 oracle

HeiGe-Video 新增 `studio/lib/continuity-oracle.mjs` 与 `studio/test/continuity-oracle.test.mjs`。API 为 `evaluateContinuity(plan, samples, {videoSha256, pixelReport})`，返回 coverage、boundaries、rhythm、soundEvents、errors、scope 和 structural-pass 状态，不提供能掩盖缺测的总分。

计划层保存对象 ID、semanticIdentity、世界中的完整轨迹、唯一 camera 和每个相邻镜头的 carrier、cause、outcome。探测层由固定 renderer 收集 actual DOM：整数 frame、fps、PTS、width、height、computed camera matrix；每个对象包含真实 rect、祖先 opacity、画幅可见比例、点阵命中测试的可见比例和测试点数。它也保留真实文字 visualIdentity 和浏览器溢出错误。作者轨迹用于制作和声明意图，不能代替实际探测。

当前原创建议的门槛已经落入独立实现。

- 每个实际编码帧必须有对应探测。缺帧、错时码、来源标识错误、相互矛盾的重复帧、非有限几何、奇异 camera matrix、文字溢出都失败。完全一致的渲染重试可以记录后去重。
- 每个相邻镜头必须恰好有一个 carrier 声明。边界前后约 0.4 秒内，它必须每帧实际存在，opacity、画幅可见和 paint 可见达到最低比例，且可见面积足够。1 平方像素点不能证明承接。
- 静止装饰不能证明因果承接。使用实际中心旅行或尺度变化证明运动；同时逐帧检查中心、尺寸和角点近似变化。孤立跳跃不被清零，边界之外的跳跃也会报告。
- soundEvents 在事件附近必须测到可见的目标对象。这只证明对象与时间声明有观测支撑，不冒认听感、音质或声音的物理因果。
- final pixelReport 必须包含最终 MP4 SHA256、实际帧数以及全部帧的灰度差分。首帧值为 0，数组长度必须等于实际预期帧数。没有这个报告不能得到正式通过。
- 相邻像素的重大孤立跳变会产生 `PIXEL_DISCONTINUITY_REVIEW`，即使 DOM 几何平滑也需要独立视审。UI 文字变化另外作为候选记录；合理的 UI 更新不被武断地判为错误。

本轮独立测试实际运行 `node --test studio/test/continuity-oracle.test.mjs`，21 项通过，0 失败，0 skip。覆盖缺测、伪造来源、错 PTS、隐藏、画外、遮挡、虚假 point ratio、微小移动点、身份变化、静止装饰、位置跳跃、单帧尺寸暴涨、缺边界、pixel hash 变化、真实像素闪变、声音对象不可见及 DOM text overflow。这里是模块级实测，不能冒充最终 renderer 集成或真实成片人工验收。

## 必须保留的边界与下一步

source 字符串不是密码学证明。手写 JSON 可以冒充探测结构，因此 runner 必须自己收集受控 renderer 的 logs，并将最终视频、源输入、引擎、字体、浏览器、探测文件和验收文件用 hash 绑定。oracle 本身不应该相信外部上传的任意轨迹 JSON。边界的 cause/outcome 文字也不是机器证明的语义因果。

5×5 hit-testing 只是遮挡近似，小于网格间隔的孔洞、局部裁切、透明度与形状交互可能漏测。轴对齐 bbox 和点阵面积也不等于真正绘制像素面积。低分辨率灰度全帧检测能补上一帧漏测，却不能保证检测相同亮度的换色、小文字错误或所有语义替换。

后续提高像素 oracle 应采用多尺度测量：全帧低分辨率通道用于定位异常；异常和边界附近再读取 carrier ROI 的彩色、边缘与局部差分，补偿已测 camera 运动后比较。无法可靠定位可见 ROI 时应记 unknown，而不是给高分。对同 ID 内容替换，保留 renderer 实测 visualIdentity、真实资源身份和 ROI 证据，再由视审确认是否合理。

运动模糊应由 renderer 固定曝光采样并记录实际采样时间，避免仅凭首末相等省略中间。3 样本只是有限近似，不能写成物理正确或全速率无频闪保证。场景边界不跨曝光积分，曝光日志和实际成片都要绑定 hash。

确定性可先对边界、快动作和尾帧做两次不同 seek 次序的 pixel 比较，再对正式任务做全帧覆盖；每个恢复任务隔离目录，恢复必须验证输入、引擎、字体、浏览器指纹和单帧 hash。任何页面错误都进入失败结果。

声音则应维持独立源校验与实际 mux 校验：旁白下限 RMS、有限 PCM、非空样本、峰值与削波；BGM 不得掩盖损坏的旁白；实际视频和音轨时长以解码测量为准。音质、叙事承接、节奏是否合适以及观众是否读得懂，仍需完整播放与听音验收。
