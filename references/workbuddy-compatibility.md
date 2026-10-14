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
| 中文字体 | `HEIGE_FONT_PATH` 与可选 `HEIGE_FONT_INDEX`；或仓库缓存、本机 Fontconfig 已安装的 Noto Sans SC | 提示提供授权字体。仅在本次进程建立私有 Fontconfig 配置，不改变系统配置 |
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

Skill 文件落盘不等于产品已发现它。应在实际工作区检查 Skill 列表，并确认当前模型会话提供终端工具。若当前会话没有终端工具或工作区受限，先记录具体阻断；不要修改产品安全设置，也不要把另一终端的结果宣称为该会话已成功执行。可以明确要求会话读取本地适配器，但仍须以真实工具执行和生成文件验收。

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

| 检查 | 本次结果与边界 |
| :--- | :--- |
| Node 全量回归 | 316 项通过，0 失败，0 跳过。含真实进程取消、中文空格、软链接、锁与审批入口，以及同名 Python 冲突的真实负例 |
| Python runtime | 49 项通过，0 失败，0 跳过 |
| Python scripts | 134 项通过，0 失败，0 跳过。包含修后资料流程 43 项、安装器 11 项及其余 80 项 |
| 类型与包检查 | Studio、Showcase、Portrait 三套 TypeScript 通过；源文件、文档链接和已有媒体库存检查通过 |
| 真实本地渲染 | 从含中文与空格的工作目录，经软链接入口完成 16:9 1280×720、9:16 720×1280 两条技术夹具；各 6 秒、30 fps、180 帧，实际 MP4 解码与 `verify` 通过。这两条没有音轨，用于兼容检查，不是新的视觉作品 |
| 资料与确认 | 原创 Markdown 加真实两页文本 PDF 导入、模板与草稿校验通过。未批准时，素材与渲染均返回阻断状态，且没有创建故事成片目录 |
| WorkBuddy GUI | 已在 5.8.2 的真实新任务中明确读取适配器与主 Skill。当前 Space-Bunny 会话及其子代理均没有本地命令执行工具，脚本未运行，不能标记 GUI 端到端通过 |
| GUI Skill 发现与选择 | 初次误用 CLI 项目目录后列表没有显示。改为 GUI 的 `.workbuddy/skills`，重新打开「+ → 技能」菜单后，实际出现 `heige-video` 及其说明，点击后已作为 Skill 标签加入当前任务输入。发现与选择通过，不能据此声称已完成命令执行 |
| GUI 故事确认交互 | 选中 Skill 后再次发起真实会话，已读取落盘的脚本、素材计划和来源，分别展示「脚本是否通过」与「素材重做／复用／混合」两个待确认事项，并停在等待真实回复。未写 `approval.json`、未制作故事素材。命令工具依然缺失 |

上述渲染与回归由本地终端启动，使用 WorkBuddy 管理的 Node，不能冒称由 GUI 任务执行。GUI 任务返回前，预期的成片与步骤收据均不存在；随后才执行本地替代验收。受限模式与会话工具能力没有被擅自改动。该会话没有收到 shell 拒绝或授权弹窗，具体阻断是工具集中缺少命令执行工具；不能仅凭界面的受限模式标签断言原因。

入口自动化覆盖虚拟环境保留、缺依赖阻断、资料审批失效、空输出失败和取消后的子孙进程回收。Canvas doctor 及系统 SVG 库探测通过。CI 已增加 Node 22／24 矩阵与 Poppler、qpdf 测试依赖；工作流配置本身不代表远端 CI 已成功。

首轮远端 Node 22／24 均为 313 通过、1 失败、1 跳过，未计为成功：FFmpeg 工具目录的 PATH 优先级遮蔽了调用者的 Python，导致选中没有 Pillow 的系统解释器。现已先绑定调用者选定的 Python，再仅让私有命名 shim 优先，保留原 PATH 的其他工具顺序。新增真实冲突解释器测试，虚拟环境测试改为自行创建标准库环境，避免 CI 因仓库没有 `.venv` 而跳过。一次本地全量重跑因漏配浏览器而有 5 项失败，原日志保留；配置现有浏览器后，完整 316 项通过，0 跳过。远端修复后的结果应以对应提交的实际 CI 回读为准。

人工完整观看、实际听音、用户对新故事的脚本确认和素材确认需要分别记录；程序检查通过不能补写这些结果。
