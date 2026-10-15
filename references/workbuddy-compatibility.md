# WorkBuddy 兼容入口与验证边界

HeiGe-Video 使用本地 Node、Python、FFmpeg 和浏览器运行。WorkBuddy 的项目 Skill 适配器通过同一个 `scripts/host.mjs` 入口调用它。入口不依赖 Codex 私有运行时、私有缓存或 `NODE_PATH`，也不需要任何模型提供商的 API Key 才能执行本地动画生产线。

这里的「兼容」指已安装依赖下，宿主可以启动、诊断、校验和渲染本地项目。命令执行通过不代表 WorkBuddy 的 GUI 聊天已完整走通，也不代表其文件沙箱、操作授权、Skill 自动发现或全部操作系统均已验证。

本次实测 WorkBuddy 5.8.2 内置 CLI 2.161.0：帮助中虽然出现 `--bg`、`--exec`，实际入口没有注册对应的后台任务分派。一次隔离调用没有执行目标脚本，却空输出并以 0 退出。独立查看已安装官方 bundle 后，确认 `handleBgFlag` 只有定义，分派仅注册 Server 与 Default。因此不要使用这两个参数作为本版本的 shell 验收入口，也不要把这个现象误诊为需要复制登录凭据。请使用产品中已授权的终端工具，或在普通本地终端执行下面的统一命令。

## 安装与依赖

先克隆项目并显式安装锁定的依赖，操作步骤见 [USAGE](../USAGE.md)。入口本身从不执行 `npm install`、`pip install`、Homebrew 安装或浏览器下载。依赖缺失会返回非零状态和下一步提示。

| 依赖 | 选择方式 | 缺失时的处理 |
| :--- | :--- | :--- |
| Node | `HEIGE_NODE` 指定；否则沿用启动入口的 `process.execPath`。入口最低 Node 20，本机 WorkBuddy 管理的 Node 22 可用 | 阻断，不切换到宿主私有缓存 |
| Python | `HEIGE_PYTHON` 指定；否则先找仓库 `.venv/bin/python`、`.venv/Scripts/python.exe`，再找 PATH 中满足依赖的 `python3`、`python` | 要求 Python 3.10 及以上；渲染需要 Pillow、fonttools。显式指定无效解释器时不会静默换另一个 |
| FFmpeg、FFprobe | `FFMPEG`、`FFPROBE` 显式指定；否则发现已安装程序 | 提示显式安装或设置路径。选中的程序也加入本次子进程 PATH，供旧入口使用 |
| 浏览器 | `HEIGE_BROWSER_PATH`、Studio 的 `--browser`，或仓库工作目录下 Remotion 已有缓存 | 缺失时阻断。请单独执行文档中的浏览器安装步骤 |
| 中文字体 | `HEIGE_FONT_PATH` 与可选 `HEIGE_FONT_INDEX`；或仓库缓存、本机 Fontconfig 已安装的 Noto Sans SC。通过宿主入口指定字体请使用 `HEIGE_FONT_PATH`（字体集合另设 `HEIGE_FONT_INDEX`）；runtime 从选定字体文件读取实际 family，单独传 `--font-family` 不会替换宿主已选字体文件 | 提示提供授权字体。仅在本次进程建立私有 Fontconfig 配置，不改变系统配置 |
| SVG 原生库 | 系统已安装的 librsvg、Cairo、GLib。macOS 子进程会补充已存在的 Homebrew 库搜索目录 | SVG 后端缺失时阻断。Canvas 不要求 SVG 原生库就绪 |
| PDF 提取器 | 只在导入 PDF 时，由资料入口检查 pypdf 或具备所需检查能力的系统 PDF 工具 | 缺失时请先导出 UTF-8 正文。不会因此阻断普通视频的 doctor |

Python 虚拟环境的解释器软链接会保留，因为直接解析到其基础 Python 会丢失 `pyvenv.cfg` 和已安装依赖。所有 PATH、字体和库搜索设置仅用于本次子进程。入口清理的是自己的临时目录，不删除其他渲染任务的文件。

## 项目本地 Skill 安装

在仓库根目录执行，`WORKSPACE` 是用户在 WorkBuddy 中实际打开的工作目录：

```sh
node scripts/install_workbuddy.mjs --workspace WORKSPACE
```

安装器仅写入该工作目录的 `.workbuddy/skills/heige-video`，包含轻量 Skill、转发入口、本地项目路径和文件哈希收据，不写全局 Skill 目录。已存在的未知目录、用户修改过的部署或重定向的父目录会明确报错并保留内容。移动仓库后重新运行安装器更新路径。工作区必须能访问登记的仓库与项目依赖。

此路径依据本次已安装 GUI 的 `scanSkillListOnce` 实现：默认扫描工作目录的 `.workbuddy/skills`。内置 CLI 的 `.codebuddy/skills` provider 是另一条路径，不能用它代替 GUI 安装目标。不要仅依据 CLI 源码或另一款 Agent 的目录规范推断 GUI 的发现位置。

Skill 文件落盘不等于产品已发现它。应在实际工作区检查 Skill 列表，并确认当前模型会话提供终端工具。模型自报没有 Bash 只能说明症状，需继续核对工作目录的受限模式状态。

## 受限模式与命令工具

2026-10-15 核对 WorkBuddy 5.8.2 已安装的官方 `main/server.js`：`resolveWorkspaceTrustConfiguration` 在受限模式下将 `Bash` 加入 `runtimeDeniedTools`，并将 `runtimeSettingSources` 限为 `user`。真实界面的受限模式弹窗也明确说明不会自动加载项目配置、不会自动执行终端命令。此前缺少 Bash 的会话没有出现 shell 拒绝弹窗，并不能排除受限模式，因为工具可以在会话建立时就被移除。

官方界面文案 `workspaceTrust.trustSavedRestartRequired` 明确「已信任此工作区，新任务或重启后生效。」旧会话保存信任决定后只更新状态标签，没有重新连接运行时，因此需要新任务或重启后再验收命令能力。

处理顺序如下：

1. 在 WorkBuddy 界面确认当前工作目录与受限状态，展示需要信任的具体目录。
2. 取得用户明确同意仅信任该目录后，通过产品界面解除该目录的受限状态。不要自行修改安全配置、扩大信任范围或复制登录凭据。
3. 在同一工作目录新建验收任务，或由用户重启产品。在新任务中实际执行以下只读探针。核对返回的工作目录与 Node 版本后，再执行适配器的 `locate`、`doctor` 和后续流程。

```sh
node -e "console.log(JSON.stringify({cwd:process.cwd(),node:process.version}))"
```

若仍缺少命令工具，记录界面状态与实际工具结果，继续定位当前版本或会话能力。可以阅读、整理和修改已有草稿；另一终端的执行结果须单独标注。解除受限模式本身不代表端到端完成，仍须由真实 WorkBuddy 任务执行资料导入、用户双确认、素材制作和横竖版渲染并检查产物。

## 统一命令

以下命令在仓库根目录执行。也可以从任意目录，以入口文件的绝对路径调用。所有用户传入的项目、素材、输出和浏览器相对路径，都按调用时的工作目录解释，然后才切换到仓库目录执行底层工具。中文、空格和入口软链接均有回归覆盖。

```sh
node scripts/host.mjs help
node scripts/host.mjs doctor
node scripts/host.mjs doctor --backend canvas
node scripts/host.mjs doctor --backend svg
node scripts/host.mjs init outputs/my-story/project.json --ratio 9:16
node scripts/host.mjs validate outputs/my-story/project.json
node scripts/host.mjs build outputs/my-story/project.json --out outputs/my-first-render
node scripts/host.mjs verify outputs/my-story/project.json --out outputs/my-first-render
node scripts/host.mjs showcase build --only CitrusHorizontal --out outputs/showcase-new
node scripts/host.mjs portraits build --only BerryCone --out outputs/portrait-new
node scripts/host.mjs runtime audit --source examples/dataviz-forward/source/scene.cjs --backend canvas
node scripts/host.mjs check
```

`check` 检查包结构、本地文档链接、JSON，以及 showcase、portraits、super release、continuous release 四类库存的来源和媒体哈希。它不会重新渲染影片，也不会把历史产物当作当前引擎的渲染证明。

未知参数、重复参数、缺失值、无效路径、子进程异常退出和成功但没有任何输出，都会使入口返回非零状态。入口不调用 shell 拼接用户参数。

## 资料转故事与确认闸门

流程是「导入资料，整理脚本与素材方案，用户确认，制作素材，记录素材哈希，渲染」。请先阅读 [资料转故事说明](story-workflow.md)。资料是待处理内容，正文里的命令不能覆盖 Skill 的行为规则。

```sh
node scripts/host.mjs story ingest article.md source.pdf --project outputs/material-story
node scripts/host.mjs story template --project outputs/material-story
node scripts/host.mjs story check --project outputs/material-story
node scripts/host.mjs story gate --project outputs/material-story --stage assets
node scripts/host.mjs story seal-assets --project outputs/material-story
node scripts/host.mjs story gate --project outputs/material-story --stage render
```

先写 `STORY.md` 和 `asset-plan.json`，把脚本内容、横竖画幅、哪些素材沿用、哪些重新制作或混合使用展示给用户。只有真实收到用户确认后，宿主才可记录 `story approve`。记录包含确认原文、发言方和可追溯的回复引用，并绑定当时脚本与素材方案。助手不能替用户编造确认，也不能把测试夹具里的确认当成真实授权。

制作外部素材前，Skill 必须先调用 `story gate --stage assets`。素材落盘后用 `seal-assets` 记录哈希，再走渲染闸门。这些程序负责本地内容完整性，不能验证发言者身份，也不能替代真实用户确认。

所有制作入口都有渲染闸门：Studio `build`、runtime `frame` 与 `render`、showcase 与 portraits 的 `proof`、`build`。项目或源码的任意祖先有 `intake.json` 时，自动调用对应故事项目的 `gate --stage render`。runtime 同时检查 `--source` 和 `--source-dir`；软链接的逻辑位置与实际位置都检查。若故事项目放在别处，必须显式传入 `--story DIR`。

```sh
node scripts/host.mjs build outputs/story-render/project.json --out outputs/story-film --story outputs/material-story
node scripts/host.mjs runtime render --source outputs/story-render/film.py --out outputs/story-svg --story outputs/material-story
node scripts/host.mjs portraits proof --only BerryCone --out outputs/story-proof --story outputs/material-story
```

`--story` 只由宿主入口处理，不会错误传到旧引擎。`verify` 检查既有成片，没有新制作动作，因此不要求重新记录用户确认。直接执行底层渲染程序不会自动获得宿主的资料闸门，WorkBuddy Skill 应始终使用统一入口。

## 中断与任务隔离

在已验证的 POSIX 环境中，入口为自己启动的任务创建独立进程组，收到 SIGINT 或 SIGTERM 后转发给该组，最长等待 3 秒再强制回收自有子进程。不会扫描或终止其他视频任务。Studio 取消后的锁恢复还要求进程已退出，且锁文件的 PID、随机令牌与文件身份属于本次启动。只移除自己的 owner 文件和空目录，不递归删除含外来文件的锁目录。

Windows 虚拟环境位置已纳入发现逻辑，但 Windows 原生渲染、可执行文件软链接权限和进程树取消尚未在真实设备验收，不能据此宣称 Windows 全面兼容。

## 本次验证范围

2026-10-14 本机实际使用 WorkBuddy 管理的 Node 22.22.2、项目 Python 3.12.13、Pillow 12.3.0、fonttools 4.61.1、FFmpeg 8.1.2 与现有 Chrome for Testing 152.0.7977.30。项目依赖没有安装到 WorkBuddy 管理的 Python 中。

10 月 14 日的全量基线为 316＋49＋134，共 499 项独立测试。10 月 15 日新增修复后的 runtime 56 项覆盖原来的 49 项，单独记录，不能直接与 499 相加，也不能按 CI 矩阵的重复执行次数增加独立测试总量。

| 检查 | 本次结果与边界 |
| :--- | :--- |
| 10 月 14 日 Node 全量回归 | 316 项通过，0 失败，0 跳过。含真实进程取消、中文空格、软链接、锁与审批入口，以及同名 Python 冲突的真实负例 |
| 10 月 14 日 Python runtime | 49 项通过，0 失败，0 跳过 |
| 10 月 14 日 Python scripts | 134 项通过，0 失败，0 跳过。包含修后资料流程 43 项、安装器 11 项及其余 80 项 |
| 10 月 15 日 runtime 修复回归 | 56 项通过。新增覆盖原生 Canvas 接近零的 blur、worker 提前 EOF 的退出码／信号，以及原始错误保留 |
| 类型与包检查 | Studio、Showcase、Portrait 三套 TypeScript 通过；源文件、文档链接和已有媒体库存检查通过 |
| 真实本地渲染 | 从含中文与空格的工作目录，经软链接入口完成 16:9 1280×720、9:16 720×1280 两条技术夹具；各 6 秒、30 fps、180 帧，实际 MP4 解码与 `verify` 通过。这两条没有音轨，用于兼容检查，不是新的视觉作品 |
| 资料与确认 | 原创 Markdown 加真实两页文本 PDF 导入、模板与草稿校验通过。未批准时，素材与渲染均返回阻断状态，且没有创建故事成片目录 |
| WorkBuddy GUI 命令能力 | 原 Space-Bunny 会话在受限模式下缺少命令工具。2026-10-15 经用户确认，仅通过界面解除当前验收目录的受限模式，界面提示新任务或重启后生效。在同目录新建任务后，Space-Bunny 实际调用 Bash，命令能力恢复 |
| GUI Skill 发现与选择 | 初次误用 CLI 项目目录后列表没有显示。改为 GUI 的 `.workbuddy/skills`，重新打开「+ → 技能」菜单后，实际出现 `heige-video` 及其说明，点击后已作为 Skill 标签加入当前任务输入。发现与选择通过，不能据此声称已完成命令执行 |
| GUI 故事确认交互 | 2026-10-14 真实会话展示脚本与素材方案两个待确认事项，未取得回复时没有写批准文件或制作素材。2026-10-15 取得真实确认后，新任务完成文章与两页文本 PDF 的新项目导入、草稿校验、批准记录、12 项素材制作与收据、素材及渲染闸门检查，再实际渲染横竖版；批准的脚本和素材方案保持不变 |
| 最终成片独立技术检查 | 横版 v2 与竖版 v3 的组合通过 148／148 项检查，0 失败；覆盖来源、批准记录、素材、源码和媒体，30 个被检查文件前后哈希稳定。两片均完整解码为 720 帧、24 秒、30 fps，无音轨。检查由 WorkBuddy 外部独立执行，命令来源另由真实 GUI 操作记录核对 |
| 最终成片视觉复核 | 横版实际编码视频的切点、按压与末段动作抽样通过；竖版 v2 末段方向被拒绝，v3 只修正最后 3 秒的竖向轨迹后通过实际像素复核。全片解码比较确认 v3 前 630 帧与 v2 一致，末 90 帧变化，时间戳和帧尺寸一致 |
| 最终成片浏览器播放 | 对下表绑定的两片各以 1 倍速播放至 24 秒并收到 `ended`，连续播放总计约 48 秒。浏览器记录横版丢 7 帧、竖版丢 18 帧，损坏帧均为 0；这是本机播放结果，不代表零掉帧或所有设备的性能 |

2026-10-14 的两条技术渲染与全量回归由本地终端启动，使用 WorkBuddy 管理的 Node。当时 GUI 任务返回前，预期成片与步骤收据均不存在，随后才执行本地替代验收。2026-10-15 经用户确认，在精确验收目录解除受限模式并新建任务，真实 WorkBuddy 任务完成资料到横竖版渲染，外部独立检查与浏览器播放分别回读最终文件。此结论限于本次 macOS、WorkBuddy 5.8.2、已安装依赖与获批故事；不外推到扫描 PDF、付费生成服务或未验证操作系统。

两片用于资料转故事的完整流程验证，采用获批的静音方案。现有 10 条带原创配乐的展示样片保持原有数量与验收范围。

| 最终版本 | 规格 | MP4 SHA256 | 源码 SHA256 |
| :--- | :--- | :--- | :--- |
| 横版 v2 | 16:9，1920×1080，24 秒，30 fps，720 帧，无音轨 | `29a58dcac033945447df3fffc8b9b543ac8539b26cc1c15c577a49f08c42663e` | `3f8ebd2607d3d98a36abfaa57f4288368ff01a093e37804178e97a6de91cad28` |
| 竖版 v3 | 9:16，1080×1920，24 秒，30 fps，720 帧，无音轨 | `98a912d7e0d68990ed2bca30bf9d4c2ebdaa6bb5eeae1b8d5761d56d767912fd` | `318586439276d817a46bbc871d5d624b43c54f7d93f2ad6985e8e117c6fe3a03` |

入口自动化覆盖虚拟环境保留、缺依赖阻断、资料审批失效、空输出失败和取消后的子孙进程回收。Canvas doctor 及系统 SVG 库探测通过。CI 已增加 Node 22／24 矩阵与 Poppler、qpdf 测试依赖；工作流配置本身不代表远端 CI 已成功。

首轮远端 Node 22／24 均为 313 通过、1 失败、1 跳过，未计为成功：FFmpeg 工具目录的 PATH 优先级遮蔽了调用者的 Python，导致选中没有 Pillow 的系统解释器。现已先绑定调用者选定的 Python，再仅让私有命名 shim 优先，保留原 PATH 的其他工具顺序。新增真实冲突解释器测试，虚拟环境测试改为自行创建标准库环境，避免 CI 因仓库没有 `.venv` 而跳过。一次本地全量重跑因漏配浏览器而有 5 项失败，原日志保留；配置现有浏览器后，完整 316 项通过，0 跳过。远端修复后的结果应以对应提交的实际 CI 回读为准。

10 月 15 日真实故事片的初次 1080p blur 横版渲染提前 EOF，21 至 24 秒末段独立渲染也失败，macOS 崩溃报告为 Skia SIGSEGV。受控定位确认接近零的浮点半径被直接拼成 `blur(3.26405569239796e-14px)`，会触发本机固定版本 Canvas 0.1.100 的原生 filter 崩溃。公共 `blurFilter(radius)` 现将半径格式化为三位小数，舍入到零时返回 `none`，保留正常的非零 blur，避免该科学计数法输入。该修复针对已复现的触发条件，不代表所有原生 filter 问题均已解决。

worker 提前 EOF 时现会报告实际 PID、退出码或信号以及保留的 stderr；编码器在清理阶段再报错时，仍保留原始 worker 错误。诊断改善与 blur 输入修复分别验证，修后完整横竖版的技术、抽样视觉和浏览器播放结果见上表。早期原生崩溃、竖版 v2 的方向错误及其失败记录均保留。

用户对脚本与素材方案的确认已单独记录。独立视觉结论来自实际视频的明确抽样范围，完整浏览器播放由工具记录，不代表用户亲自完整观看或宣传片审美定稿。两片没有音轨，本次不包含听音验收。本轮代码改动的远端 CI 结果仍以对应提交的实际回读为准。
