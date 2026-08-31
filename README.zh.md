# a2ui-render-in-dsh

[English](https://github.com/baihui-ai/a2ui-render-in-dsh/blob/main/README.md) | 中文

**dsh web 的 A2UI 交互卡片插件**：让 Agent 在对话流里自适应地渲染**可交互、可视化的 UI 卡片**——选择题、表单、分步向导、下拉、日历选日期、商品卡、可排序/筛选的表格、ECharts 图表、中国地图分布、数学函数绘图、Mermaid 流程图/思维导图、KaTeX 公式、Markdown 长文、图片上传、手写签名、算法过程动画——用户的点击/勾选/输入以自然语言消息回传给 Agent（图片也能回传），卡片**边生成边渲染**、还能**原地更新**，所见内容一键复制。

UI 协议基于 [A2UI v0.9](https://github.com/google/A2UI)（Agent-to-UI 声明式界面协议），渲染引擎使用 Ant Design X 官方实现 [`@ant-design/x-card`](https://www.npmjs.com/package/@ant-design/x-card)。

📸 **[功能示例（含动图）→ DEMO.md](https://github.com/baihui-ai/a2ui-render-in-dsh/blob/main/DEMO.zh.md)** · 🗺️ **[场景 × 组件映射](https://github.com/baihui-ai/a2ui-render-in-dsh/blob/main/docs/SCENARIOS.zh.md)**

![做题交互](https://raw.githubusercontent.com/baihui-ai/a2ui-render-in-dsh/main/docs/demo-study.gif)

---

## 设计

### 架构：一包两端

```
a2ui-render-in-dsh (一个 npm 包，dsh bundle)
├─ 宿主端 lib/index.js            cordis 插件，注册三个 Agent 工具
│    ├─ a2ui_render               渲染卡片（描述仅 ~220 token，常驻）
│    ├─ a2ui_update               按 surfaceId 原地更新已渲染的卡片
│    │                            （进度推进、长任务回填、看板刷新）
│    └─ a2ui_catalog              返回完整组件目录与写卡规则（按需加载，每会话一次）
└─ 客户端 lib/client.js           浏览器 bundle，注册各工具的专属 toolview
     ├─ x-card 引擎（A2UI 命令流、数据绑定、action 解析）
     ├─ 组件目录实现（44 个组件，跟随 --dsw-* 主题令牌）
     ├─ 流式渲染器（截断 JSON 修复 → 模型边写卡片边出现）
     └─ ECharts 6 / Mermaid 11 / KaTeX（字体内联）/ 中国省份 geoJSON
        全部打入 bundle，零外部请求
```

### 关键设计决策

**1. 主动式渲染，由模型判断——锚定 UI 的目的。** 工具契约把判断框定为：卡片能否在 UI 的四个目的之一上胜过纯文本？**方便操作**（用户要回答/选择/填写/调节——渲染表单）、**方便浏览**（用户想看/扫数据——统计、排名、分布、趋势出图表/表格/地图，数据不确定也不取消卡片：画已知最好的数据、标注时间口径、正文说明局限）、**增强理解**（结构或记号帮助理解——数学、代码、流程、分步过程）、**状态反馈**（长/多步任务先出进度卡，`a2ui_update` 原地推进）。四者都不沾 → 纯文本。卡片始终**与文案搭配**：结论/看点用 1–3 句正文说，结构化内容进卡片，两边不重复。判断框架有 HCI 理论依据（Norman 双鸿沟、钥匙孔效应、外部认知），并用无关键词的自然语言提示词对各目的 + 纯文本反例实测。

**2. skill 式上下文设计（目录按需加载）。** 完整组件目录不内联在工具描述里，而是放进 `a2ui_catalog` 工具：44 个组件的常驻工具描述约 ~350 token（按需目录约 2.5k，每个用卡会话只付一次）；模型首次画卡前调用一次目录，同会话后续卡片直接复用；不画卡的会话零目录开销。服务端校验未知组件名并报错引导查目录，防止模型跳过目录瞎猜。

**3. 非阻塞回传，复用原生消息通路。** 卡片提交不需要自定义 server 通道：客户端通过 dsh 自身的 `session.prompt` RPC 把提交内容作为普通用户消息发回会话。消息是**自然语言**（按钮文案 + 所选内容，多字段换行列出），对人可读、对模型可解析，不污染对话观感：

```
提交报名
城市：上海
方向：后端开发、数据分析
```

**4. 语义化的提交锁定。** 含输入组件的卡片（表单/做题）提交后整卡锁定并记录（localStorage 持久化，刷新后恢复锁定态、已选值和提交时间）；无输入组件的卡片（商品卡）上的按钮自动识别为**查询按钮**，可反复点击。按钮级 `submit: true|false` 可显式覆盖。

**5. 模型只做擅长的事。** 数学函数绘图：模型只写表达式（`tan(x)`），采样、渐近线断线由内置**安全表达式求值器**完成（白名单 shunting-yard 解析，非 eval，注入即拒绝）——让模型手工枚举几百个数据点必然画错。算法动画：模型模拟算法输出逐帧状态（这是 LLM 强项），播放、过渡、控件由组件完成。

**6. 展示组件全部自包含。** ECharts、Mermaid、KaTeX（含 woff2 字体 data-URI）、中国省份 geoJSON 全部打进 bundle（~5.5MB，本地服务一次加载），无 CDN 依赖、可离线；明暗主题按页面背景亮度自动跟随。

**7. 活的卡片：流式渲染 + 原地更新。** 模型还在输出 JSON 时卡片就开始渲染（容错解析器修复截断的流，完整的组件提前挂载），大卡片逐块出现而不是长时间空白后一次性弹出。渲染完的卡片也不是死的：`a2ui_update` 按 `surfaceId` 原地替换组件或数据——进度条真的会动、任务卡自己填上结果、看板随时刷新；更新持久化，刷新页面后自动重放。

**8. 回答不止于文字。** `Upload`（拍照/截图）和 `Signature`（手写画板）走 dsh 原生消息通路把**真实图片**发回给模型——模型看到的是图，不是占位符。`Suggestions` 渲染可点的追问 chips，点一下即作为下一条用户消息发出。录音回传刻意不做：dsh 的 prompt 通道只支持文本 + 图片。

## 亮点

- 🎯 **自适应**：模型自行判断"文本还是卡片"，双向实测可靠
- 🪶 **上下文友好**：skill 式目录设计，44 个组件常驻开销约 ~350 token
- ✅ **表单校验**：任意输入组件可设 `required: true`——提交被拦截并高亮缺失项
- 🧭 **会话导航**：右缘抽屉——「任务」页签分组待提交/已提交任务（已填计数、内容预览、可标记无需填写），「全部」页签完整列出每条用户消息并点击定位（自动加载更早、实时同步）；草稿刷新不丢，已提交状态清缓存后仍可从会话记录重建
- 🗜️ **上传压缩**：照片在客户端先压到 ≤1568px JPEG 再进消息，手机原图不再撑爆对话
- 💬 **优雅回传**：自然语言提交消息，非 JSON 裸串；照片、签名以真实图片回传
- 🔒 **提交即锁定**：表单防重复提交，记录持久化，"重新填写"可解锁；查询按钮不受影响
- ⚡ **流式渲染**：模型边写 JSON，卡片边逐块出现
- 🔄 **原地更新**：`a2ui_update` 按 surfaceId 更新已渲染的卡片——进度条会动、任务卡自己填结果、看板可刷新；刷新页面后重放
- 📊 **可视化全家桶**：ECharts 图表/仪表盘、函数绘图、中国地图分布、Mermaid 全图型、KaTeX 公式（矩阵强制公式化渲染）、图片对比滑块、视频
- 🎬 **算法动画**：数组/柱状、网格/矩阵、图/树三形态自动识别；每卡只自动播一遍（组件重挂载不重播），↻ 手动重播、单步、进度条、图例
- 🧾 **交互表格**：点表头排序（识别数字）、筛选框、分页、复制 TSV、导出 CSV、可编辑表格输入
- 🧭 **丰富作答组件**：分步向导 Wizard、日历选日期、RankList 排优先级、Suggestions 追问 chips、图片上传、手写签名
- 📋 **一键复制**：指标块点击复制、表格复制/导出、代码块复制、公式复制 LaTeX 源码、图表下载 PNG、Markdown 复制原文
- ⛶ **全屏放大**：思维导图/流程图/图表/图片一键全屏，自动适配视口，滚轮缩放 + 拖拽平移
- 🧱 **一行多列**：Grid 布局做商品对比、图表仪表盘
- 🎛️ **完整输入态**：下拉单选/多选、预选中（dataModel 初值）、组件级/选项级禁用
- 🌓 **明暗主题**：全组件跟随 dsh 主题令牌
- ✅ **可验证**：jsdom 交互测试 + chromium 真实渲染截图/录屏验证全链路

## 技术栈

| 层 | 技术 | 用途 |
|---|---|---|
| UI 协议 | [A2UI v0.9](https://github.com/google/A2UI) | Agent 用声明式 JSON 描述界面的开放协议 |
| 协议运行时 | [`@ant-design/x-card`](https://www.npmjs.com/package/@ant-design/x-card) 2.9（Ant Design X） | A2UI 命令流处理、数据绑定、action 解析 |
| 图表 | [Apache ECharts](https://echarts.apache.org) 6.1 | 数据图表、仪表盘、函数绘图、柱状动画 |
| 图示 | [Mermaid](https://mermaid.js.org) 11.17 | 流程图、思维导图、时序图、甘特图等全图型 |
| 公式 | [KaTeX](https://katex.org) 0.18 | LaTeX 公式渲染（woff2 字体以 data-URI 内联） |
| 视图层 | [React](https://react.dev) 18 | 由 dsh web 模块表提供（外置，不打入 bundle） |
| 插件框架 | [cordis](https://github.com/cordiverse/cordis) + `@deepseek-ai/dsh-tools` | dsh 插件体系；Agent 工具注册（`defineTool`） |
| 构建 | [esbuild](https://esbuild.github.io) | 宿主/客户端双端打包、KaTeX 字体内联、模块加载器封装 |

## 组件目录

| 组件 | 属性 | 说明 |
|---|---|---|
| `Column` / `Row` | `children, gap?` | 纵/横布局 |
| `Grid` | `children, columns?, gap?, minWidth?` | **一行多列**：固定列数（推荐 2–4）或按 `minWidth` 自适应换行 |
| `Card` | `children, title?` | 带边框分组 |
| `List` | `children, direction?` | 列表容器 |
| `Divider` | — | 分隔线 |
| `Text` | `text, variant?: h1\|h2\|h3\|body\|caption\|strong` | 文本 |
| `Markdown` | `text` | **富文本长文**：标题、加粗/斜体、链接、列表、引用、代码块、`$...$` 公式；带复制原文按钮 |
| `Image` | `url, alt?, width?, height?` | 图片（含 GIF），自带全屏放大 |
| `Tag` | `text, color?: blue\|green\|red\|orange\|gray` | 标签 |
| `Math` | `tex, block?` | **KaTeX** 公式（字体内联零外部请求）；矩阵/向量必须走此组件 |
| `Mermaid` | `code, caption?` | **Mermaid 11**：流程图/思维导图/时序图/甘特图等，自带全屏放大 |
| `Chart` | `option, height?, functions?, params?, xMin?, xMax?, samples?, yClip?` | **ECharts 6**：数据模式（option 透传）+ 函数绘图模式（表达式自动采样、渐近线断线）+ `params` 绑定常量（滑杆→曲线联动）；全屏 + 下载 PNG |
| `Map` | `data, title?, unit?, height?` | **中国地图分布**：省级数据热力着色（分区销售/用户分布），geoJSON 内置 |
| `Video` | `url, poster?, loop?, muted?, autoplay?` | HTML5 视频（mp4/webm） |
| `ImageCompare` | `before, after` | 拖动分割线的图片前后对比（before/after、A/B） |
| `Anim` | `frames, interval?, height?, autoplay?, labels?` | **算法动画**：数组/柱状、网格/矩阵、图/树（BFS/DFS，自动圆形布局）三形态自动识别；每卡每页签只自动播一遍，↻ 重播/暂停/单步/重置/进度条/图例 |
| `Button` | `label, variant?, submit?, action: {event: {name, context?}}` | 触发回传；`submit` 显式控制是否锁卡 |
| `MultipleChoice` | `options, bind, maxAllowedSelections?, disabled?` | 平铺多选/单选（`maxAllowedSelections: 1` 单选），选项级禁用 |
| `Select` | `options, bind, label?, placeholder?, multiple?, maxAllowedSelections?, disabled?` | **下拉选择**：单选存值、多选存数组；长列表自动带搜索框 |
| `CheckBox` | `label, bind, disabled?` | 布尔勾选 |
| `Slider` | `bind, label?, min?, max?, step?, unit?` | 数值滑杆；配合 Chart `params` 做参数探索联动 |
| `Rate` | `bind, label?, max?` | 星级评分 |
| `Calc` | `expr, inputs, out, digits?` | 隐形派生值：表达式实时重算写回数据模型（计算器引擎） |
| `When` | `value, equals?/includes?/notEmpty?, children` | 条件容器：选中特定项才显示后续字段 |
| `Tabs` | `tabs, children, bind?` | 页签：数据集切换 / 内容分组 |
| `Table` | `columns, rows, caption?, sortable?, filter?, pageSize?` | **交互表格**：点表头排序（识别数字）、筛选框、分页、复制 TSV / 导出 CSV；字典绑定切换数据集 |
| `Stat` | `label, value, unit?, trend?, hint?` | KPI 指标块，点击复制数值；Grid 组合成速览行 |
| `Steps` | `items` | 步骤条（done/current/pending） |
| `Progress` | `value, max?, label?` | 进度条 |
| `Timeline` | `items` | 时间轴（历程/事件回顾） |
| `CodeBlock` | `code, language?, title?` | 代码块：行号 + 轻量高亮 + 复制按钮 |
| `Icon` | `name, size?, color?` | 内置 32 个常用线条图标 |
| `Audio` | `url, title?` | 音频播放器 |
| `Flashcard` | `front, back` | 点击翻面闪卡（背单词/问答记忆） |
| `Countdown` | `to?/seconds?, label?` | 实时倒计时 |
| `TextField` | `label?, placeholder?, multiline?, bind, disabled?` | 文本输入 |
| `Wizard` | `steps, children, submitLabel?` | **分步表单**：每步一个面板，内置上一步/下一步 + 进度，最后一步提交全部字段 |
| `Calendar` | `bind, label?, min?, max?, range?` | 月视图日期选择；`range: true` 选起止两天 |
| `RankList` | `items, bind, label?` | 拖拽（或点 ↑↓）按优先级排序，提交排好的列表 |
| `EditableTable` | `columns, rows, bind, label?` | 用户直接改单元格，整表提交 |
| `Upload` | `bind?, label?, max?` | 图片选择器——所选照片以**真实图片**回传给模型 |
| `Signature` | `label?` | 手写签名画板，笔迹以图片回传 |
| `Suggestions` | `items` | 回答下方的可点追问 chips，点一下即作为下一条用户消息发出 |

**内联公式**：所有文本位置（Text、选项、表格单元格、步骤、闪卡、动画解说）支持 `$...$` 内嵌 KaTeX——数学选择题的选项可以直接是公式。**响应式联动**：输入组件写数据模型，所有 `{"path"}` 绑定即时更新——滑杆→曲线（Chart `params`）、选择→追问（When）、输入→计算结果（Calc→Stat）、切换→换表（Tabs/Table 字典绑定）。

输入组件通用：**预选中**在 `dataModel` 给 bind 路径设初值；**禁用**用组件级 `disabled: true` 或选项级 `disabled`；**必填**用 `required: true`（未填完提交被拦截并高亮）。`a2ui_update` 改写 dataModel 后，绑定的输入组件会原地同步。数据绑定：`bind` 为不带前导斜杠的写入路径；展示属性用 `{"path": "/x"}`（带斜杠）读实时值。

## 安装

### 前置要求

| 要求 | 说明 |
|---|---|
| dsh | `@deepseek-ai/dsh` ≥ 0.1.1-rc.1，且 web profile 已初始化（装插件前先运行过一次 `dsh web`） |

开发：`npm test` 运行 jsdom 交互测试套件（宿主校验 + 组件/交互全覆盖，约 50 条断言）。
| Node.js | ≥ 20（含 npm） |

### 方式 A · npm 安装（推荐）

```sh
dsh plugin --profile web add a2ui-render-in-dsh
dsh web
```

零运行时依赖，两条命令装完即用。若你的 npm 镜像尚未同步最新版本，显式指定官方源：

```sh
dsh plugin --profile web add a2ui-render-in-dsh --registry https://registry.npmjs.org
```

### 方式 B · 源码安装（开发者 / 需要改代码时）

```sh
# 1. 克隆并构建
git clone https://github.com/baihui-ai/a2ui-render-in-dsh.git
cd a2ui-render-in-dsh
npm install
npm run build
#    构建产出：lib/index.js（宿主端）+ lib/client.js（浏览器 bundle）
#    lib/ 不在 git 里，克隆后必须先构建，否则 dsh 启动时找不到入口

# 2. 以 link 方式装进 dsh 的 web profile
dsh plugin --profile web add link:$(pwd)
#    改码后只需 npm run build + 重启 dsh web，无需重装

# 3. 启动 / 重启 dsh web
dsh web
```

### 三步验证

```sh
# ① 组合树里出现本插件条目
dsh --profile web --dump-config | grep -B1 -A1 a2ui-render-in-dsh
#    期望输出：- id: a2ui
#              name: a2ui-render-in-dsh

# ② 前端 bundle 正常下发（<port> 换成你的端口，默认见 dsh web 启动输出）
curl -s http://127.0.0.1:<port>/ | grep -o "a2ui-render-in-dsh/client.js[^\"]*"
#    期望输出：a2ui-render-in-dsh/client.js?rev=<hash>
```

③ 打开 dsh web 对它说：**「用交互卡片出一道单选题考我」**——出现可点选的选择题卡片即安装成功（模型会先调一次 `a2ui_catalog` 再渲染，属正常流程）。更多试玩提示词见 [DEMO.zh.md](https://github.com/baihui-ai/a2ui-render-in-dsh/blob/main/DEMO.zh.md#一站式体验提示词)。

### 升级与卸载

```sh
# 升级（npm 安装）
dsh plugin --profile web update a2ui-render-in-dsh

# 升级（源码 link 安装）：拉新代码重新构建，重启 dsh web 即生效
git pull && npm run build

# 卸载：从 profile 移除（依赖与 bundles 条目会一并清掉），重启 dsh web
dsh plugin --profile web remove a2ui-render-in-dsh
```

### 故障排查

| 现象 | 原因 | 解决 |
|---|---|---|
| dsh web 启动报找不到入口 / 插件未加载 | 克隆后没有构建，`lib/` 不存在 | `npm run build` 后重启 |
| 改了代码但界面没变化 | bundle 在 dsh 启动时按内容哈希缓存 | 重新构建后**重启 dsh web** |
| 卡片显示为普通工具行而非交互卡片 | 客户端 bundle 未加载 | 用上面第②步确认下发；浏览器控制台看 `/plugins/a2ui-render-in-dsh/` 请求是否 200 |
| 工具报 `unknown component` 错误 | 模型未查目录就猜组件名 | 属自纠错设计：错误信息会引导模型调 `a2ui_catalog` 后重试，无需人工干预 |
| 模型不渲染卡片、只回文本 | 自适应判断认为文本更合适 | 提示词里点明「用交互卡片」即可稳定触发 |

### 其他说明

- 客户端 bundle 约 5MB（ECharts + Mermaid + KaTeX 全部内置、零外部请求），由 dsh 本地服务，浏览器首次加载后缓存
- 提交锁定记录存浏览器 `localStorage`、动画"已播过"闩锁存 `sessionStorage`，均为本地行为；提交消息本身在会话记录里，跨设备不影响模型侧

## 工作方式

1. 模型对话中判断需要卡片 → 首次先调 `a2ui_catalog` 加载组件目录 → 调 `a2ui_render` 传入 A2UI v0.9 组件邻接表
2. 客户端 toolview 用 x-card 引擎把参数渲染成实时交互卡片
3. 用户点击 Button → 插件组装自然语言摘要 → 经 `session.prompt` 作为用户消息发回 → 模型继续对话（判分/下一步）
4. 表单卡提交后锁定并记录；查询按钮可反复点击

## 开发

```sh
npm run watch        # 双端增量构建（改完重启 dsh web 生效）
```

| 文件 | 职责 |
|---|---|
| `src/host/index.js` | 两个工具的定义：`a2ui_render`（含参数 schema 与组件名校验）、`a2ui_catalog`（完整写卡指南） |
| `src/client/index.jsx` | 客户端插件入口（locale + toolview 注册） |
| `src/client/toolview.jsx` | 卡片渲染、提交消息组装、锁定与 localStorage 记录 |
| `src/client/components.jsx` | 交互组件目录（布局/文本/按钮/选择/下拉/输入） |
| `src/client/components-viz.jsx` | Chart / Mermaid / Math / Video / Anim |
| `src/client/zoomable.jsx` | 全屏放大外壳（Fullscreen API + 缩放平移） |
| `src/client/expr.js` | 函数绘图的安全表达式求值器（白名单，非 eval） |
| `scripts/build.mjs` | esbuild 双端构建（KaTeX 字体 data-URI 内联、`window.__ModuleLoader__` 封装） |

客户端 bundle 只外置 `react` / `react/jsx-runtime`（由 dsh 模块表提供），其余全部内联。

## 已知边界

- 卡片流式渲染：参数 JSON 完整解析前显示占位行（不做部分渲染）
- 图/树类算法动画（BFS、树旋转）暂无专用形态（现有数组/矩阵两形态覆盖排序、查找、DP 等）
- 跨调用的多卡并排做不到（dsh 会话流一条工具调用一行）；一次调用内 `Grid` 覆盖一行多列需求

## License

MIT
