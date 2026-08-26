# a2ui-render-in-dsh

English | [中文](https://github.com/baihui-ai/a2ui-render-in-dsh/blob/main/README.zh.md)

**A2UI interactive cards for the dsh web UI**: the agent adaptively renders **interactive, visual UI cards** right inside the conversation — quizzes, forms, multi-step wizards, dropdowns, date pickers, product cards, sortable/filterable tables, ECharts charts, China map choropleths, math function plots, Mermaid flowcharts/mind maps, KaTeX formulas, Markdown long-form, image uploads, signature pads, and step-by-step algorithm animations. User interactions flow back to the agent as plain-language messages (images included), cards **stream in progressively** and can be **updated in place**, and everything visible is one click away from the clipboard.

The UI protocol is [A2UI v0.9](https://github.com/google/A2UI) (a declarative Agent-to-UI protocol); rendering is powered by Ant Design X's official implementation, [`@ant-design/x-card`](https://www.npmjs.com/package/@ant-design/x-card).

📸 **[Feature showcase with GIFs → DEMO.md](https://github.com/baihui-ai/a2ui-render-in-dsh/blob/main/DEMO.md)** · 🗺️ **[Scenario × component map](https://github.com/baihui-ai/a2ui-render-in-dsh/blob/main/docs/SCENARIOS.md)**

![Quiz interaction](https://raw.githubusercontent.com/baihui-ai/a2ui-render-in-dsh/main/docs/demo-quiz.gif)

---

## Design

### Architecture: one package, two halves

```
a2ui-render-in-dsh (one npm package, a dsh bundle)
├─ Host half  lib/index.js         cordis plugin registering three agent tools
│    ├─ a2ui_render                renders a card (slim ~220-token description, always visible)
│    ├─ a2ui_update                updates an already-rendered card in place (progress,
│    │                             long tasks, live dashboards) via its surfaceId
│    └─ a2ui_catalog               returns the full component catalog & authoring
│                                  rules (loaded on demand, once per conversation)
└─ Client half  lib/client.js      browser bundle registering the toolviews
     ├─ x-card engine (A2UI command stream, data binding, action resolution)
     ├─ component catalog implementations (44 components, themed via --dsw-* tokens)
     ├─ streaming renderer (truncated-JSON repair → cards appear while the model types)
     └─ ECharts 6 / Mermaid 11 / KaTeX (fonts inlined) / China geoJSON all bundled
        — zero external requests
```

### Key design decisions

**1. Proactive rendering, decided by the model — anchored on UI's purposes.** The tool contract frames the judgment as: would a card serve any of UI's four purposes better than prose? **Act** (the user must answer/choose/fill/adjust — render a form), **browse** (the user wants to see or scan data — statistics, rankings, distributions, trends get a chart/table/map, and uncertain data never cancels the card: chart the best known, label the period, caveat in prose), **understand** (structure or notation aids comprehension — math, code, flows, stepwise processes), or **feedback** (long multi-step work gets a progress card advanced via `a2ui_update`). None of the four → prose. Cards always **pair with prose**: the takeaway lives in 1–3 sentences of normal text, the structured content in the card, with no duplication. Grounded in HCI research (Norman's gulfs, the keyhole effect, external cognition) and verified with keyword-free prompts across all purposes plus prose negatives.

**2. Skill-style context design (catalog on demand).** The full component catalog is NOT inlined in the tool description; it lives in a second tool, `a2ui_catalog`. Always-visible cost stays at ~220 tokens even as the catalog grew to 44 components. The model calls the catalog once before its first card in a conversation and reuses it for later cards; conversations that never draw a card pay nothing. The host validates component names and errors with a "call a2ui_catalog" hint, so the model can't silently guess wrong.

**3. Non-blocking answers over the native message path.** Submissions need no custom server channel: the client sends the submission through dsh's own `session.prompt` RPC as an ordinary user message. Messages are **plain language** (button label + chosen values, multi-line for forms) — readable for humans, parseable for the model, no raw JSON in the conversation:

```
Submit signup
City: Shanghai
Tracks: Backend, Data Analysis
```

**4. Semantic submit locking.** Cards with input components (forms/quizzes) lock after their first submission — inputs disable, the chosen values stay highlighted, and the submission is recorded (persisted to localStorage; a page reload restores the locked state, values, and timestamp). Buttons on cards WITHOUT inputs (product cards) are treated as query buttons and stay clickable. A per-button `submit: true|false` overrides the heuristic.

**5. Let the model do only what it's good at.** Function plotting: the model writes an expression (`tan(x)`); sampling and asymptote breaking are done by a built-in **safe expression evaluator** (whitelist shunting-yard parser, no eval, injection is rejected) — hand-enumerating data points would inevitably fail. Algorithm animations: the model simulates the algorithm into per-step frames (an LLM strength); playback, transitions, and controls belong to the component.

**6. Fully self-contained display stack.** ECharts, Mermaid, KaTeX (woff2 fonts as data URIs), and the China province geoJSON are all bundled (~5.5MB, served locally, loaded once) — no CDN, works offline; light/dark theme follows the page automatically.

**7. Live cards: streaming in, updating in place.** Cards render progressively while the model is still emitting JSON (a tolerant parser repairs the truncated stream and mounts complete components early), so a big dashboard appears piece by piece instead of after a long pause. And a rendered card is not frozen: `a2ui_update` addresses it by `surfaceId` to patch components or data in place — progress bars that actually move, task cards that fill in results, dashboards that refresh. Updates persist and replay after a page reload.

**8. Answers beyond text.** `Upload` (photos) and `Signature` (hand-drawn canvas) send images back through dsh's native prompt channel as real image parts — the model sees the picture, not a placeholder. `Suggestions` renders tappable follow-up chips that send themselves as the next user message. Voice recording is deliberately excluded: dsh's prompt channel carries text + images only.

## Highlights

- 🎯 **Adaptive**: the model chooses text vs. card; verified reliable in both directions
- 🪶 **Context-friendly**: skill-style catalog design, ~220 tokens always-visible for 44 components
- 💬 **Elegant answers**: plain-language submissions, not raw JSON strings; photos & signatures return as real images
- 🔒 **Submit-once locking**: forms can't double-submit, records persist, a "refill" button reopens them; query buttons unaffected
- ⚡ **Streaming render**: cards appear progressively while the model is still writing the JSON
- 🔄 **In-place updates**: `a2ui_update` patches a live card by surfaceId — moving progress bars, task cards that finish themselves, refreshing dashboards; survives page reloads
- 📊 **Full visualization family**: ECharts charts/dashboards, function plots, China map choropleth, all Mermaid diagram types, KaTeX formulas (matrices are forced into formula rendering), image compare slider, video
- 🎬 **Algorithm animations**: array/bars, grid/matrix, and graph/tree forms, auto-detected; auto-plays once per card (component remounts never replay), ↻ manual replay, stepping, progress bar, legend
- 🧾 **Interactive tables**: click-to-sort (numeric-aware), filter box, pagination, copy as TSV, CSV export, editable-table input
- 🧭 **Rich answer kit**: multi-step Wizard, Calendar date picking, drag-free RankList ordering, Suggestions follow-up chips, Upload, Signature
- 📋 **Quick copy everywhere**: Stat tiles click-copy, tables copy/export, CodeBlock copy, formulas copy their LaTeX, charts download as PNG, Markdown copies its source
- ⛶ **Fullscreen zoom**: mind maps/flowcharts/charts/images go fullscreen with fit-to-viewport, wheel zoom + drag pan
- 🧱 **Multi-column layout**: Grid for product comparisons and chart dashboards
- 🎛️ **Complete input states**: dropdown single/multi select, preselection (dataModel seeds), component- and option-level disabling
- 🌓 **Light/dark themes** across every component
- ✅ **Verified**: jsdom interaction tests plus real-chromium screenshot/recording verification of the full pipeline

## Built with

| Layer | Technology | Role |
|---|---|---|
| UI protocol | [A2UI v0.9](https://github.com/google/A2UI) | Open protocol for agents to describe UIs as declarative JSON |
| Protocol runtime | [`@ant-design/x-card`](https://www.npmjs.com/package/@ant-design/x-card) 2.9 (Ant Design X) | A2UI command-stream processing, data binding, action resolution |
| Charts | [Apache ECharts](https://echarts.apache.org) 6.1 | Data charts, dashboards, function plots, bar animations |
| Diagrams | [Mermaid](https://mermaid.js.org) 11.17 | Flowcharts, mind maps, sequence diagrams, gantt, and more |
| Formulas | [KaTeX](https://katex.org) 0.18 | LaTeX rendering (woff2 fonts inlined as data URIs) |
| View layer | [React](https://react.dev) 18 | Provided by dsh web's module table (externalized, not bundled) |
| Plugin framework | [cordis](https://github.com/cordiverse/cordis) + `@deepseek-ai/dsh-tools` | dsh's plugin system; agent tool registration (`defineTool`) |
| Build | [esbuild](https://esbuild.github.io) | Dual-half bundling, KaTeX font inlining, module-loader wrapper |

## Component catalog

| Component | Props | Notes |
|---|---|---|
| `Column` / `Row` | `children, gap?` | Vertical / horizontal layout |
| `Grid` | `children, columns?, gap?, minWidth?` | **Multi-column**: fixed column count (2–4 recommended) or auto-fit by `minWidth` |
| `Card` | `children, title?` | Bordered group |
| `List` | `children, direction?` | List container |
| `Divider` | — | Separator |
| `Text` | `text, variant?: h1\|h2\|h3\|body\|caption\|strong` | Text |
| `Markdown` | `text` | **Rich long-form**: headings, bold/italic, links, lists, quotes, fenced code, `$...$` math; copy-source button |
| `Image` | `url, alt?, width?, height?` | Images (incl. GIF), built-in fullscreen zoom |
| `Tag` | `text, color?: blue\|green\|red\|orange\|gray` | Tag/badge |
| `Math` | `tex, block?` | **KaTeX** formulas (fonts inlined, zero external requests); matrices/vectors must use this |
| `Mermaid` | `code, caption?` | **Mermaid 11**: flowchart/mindmap/sequence/gantt etc., built-in fullscreen zoom |
| `Chart` | `option, height?, functions?, params?, xMin?, xMax?, samples?, yClip?` | **ECharts 6**: data mode (option verbatim) + function-plot mode (expressions sampled automatically, asymptote breaks) + `params` live-bound constants (Slider→curve); fullscreen + PNG download |
| `Map` | `data, title?, unit?, height?` | **China choropleth**: province-level distribution (sales/users by region), geoJSON bundled |
| `Video` | `url, poster?, loop?, muted?, autoplay?` | HTML5 video (mp4/webm) |
| `ImageCompare` | `before, after` | Drag-divider before/after image comparison |
| `Anim` | `frames, interval?, height?, autoplay?, labels?` | **Algorithm animation**: bars, grid/matrix, and graph/tree (BFS/DFS, auto circle layout) forms auto-detected; auto-plays once per card per tab, ↻ replay / pause / step / reset / progress / legend |
| `Button` | `label, variant?, submit?, action: {event: {name, context?}}` | Sends the submission; `submit` explicitly controls card locking |
| `MultipleChoice` | `options, bind, maxAllowedSelections?, disabled?` | Flat multi/single select (`maxAllowedSelections: 1` = single), per-option disable |
| `Select` | `options, bind, label?, placeholder?, multiple?, maxAllowedSelections?, disabled?` | **Dropdown**: single stores a value, multi stores an array; option descriptions/disabling |
| `CheckBox` | `label, bind, disabled?` | Boolean toggle |
| `Slider` | `bind, label?, min?, max?, step?, unit?` | Numeric slider; pairs with Chart `params` for live parameter exploration |
| `Rate` | `bind, label?, max?` | Star rating |
| `Calc` | `expr, inputs, out, digits?` | Invisible derived value: live-recomputed expression written back to the data model (calculator engine) |
| `When` | `value, equals?/includes?/notEmpty?, children` | Conditional container: reveal follow-up fields on selection |
| `Tabs` | `tabs, children, bind?` | Tab switcher: dataset switching / content grouping |
| `Table` | `columns, rows, caption?, sortable?, filter?, pageSize?` | **Interactive tables**: click-to-sort (numeric-aware), filter box, pagination, copy TSV / CSV export; dictionary binding switches datasets |
| `Stat` | `label, value, unit?, trend?, hint?` | KPI tile, click to copy the value; combine in a Grid for metric overviews |
| `Steps` | `items` | Step list (done/current/pending) |
| `Progress` | `value, max?, label?` | Progress bar |
| `Timeline` | `items` | Timeline (history / event review) |
| `CodeBlock` | `code, language?, title?` | Code with line numbers, light highlighting, copy button |
| `Icon` | `name, size?, color?` | 32 built-in stroke icons |
| `Audio` | `url, title?` | Audio player |
| `Flashcard` | `front, back` | Tap-to-flip card (vocabulary / recall) |
| `Countdown` | `to?/seconds?, label?` | Live countdown |
| `TextField` | `label?, placeholder?, multiline?, bind, disabled?` | Text input |
| `Wizard` | `steps, children, submitLabel?` | **Multi-step form**: one pane per step, prev/next + progress built in, final submit sends all collected fields |
| `Calendar` | `bind, label?, min?, max?` | Month-view date picker with range limits |
| `RankList` | `items, bind, label?` | Reorder options by priority; submits the ordered list |
| `EditableTable` | `columns, rows, bind, label?` | User edits cells inline; the whole grid submits |
| `Upload` | `bind?, label?, max?` | Image picker — chosen photos are sent back to the model as **real images** |
| `Signature` | `label?` | Handwritten signature pad; the drawing returns as an image |
| `Suggestions` | `items` | Tappable follow-up chips below an answer; tapping sends that question as the next user message |

**Inline math**: every text position (Text, option labels, table cells, steps, flashcards, animation captions) may embed KaTeX with `$...$` — math-quiz OPTIONS can be formulas. **Reactive bindings**: inputs write the data model and every `{"path"}` binding updates live — slider→curve (Chart `params`), choice→follow-up (When), input→computed result (Calc→Stat), switcher→dataset (Tabs / Table dictionary binding).

Common to inputs: **preselect** by seeding `dataModel` at the bind path; **disable** via component-level `disabled: true` or per-option `disabled`. Data binding: `bind` is a write path WITHOUT a leading slash; display props read live values with `{"path": "/x"}` (WITH a slash).

## Installation

### Prerequisites

| Requirement | Notes |
|---|---|
| dsh | `@deepseek-ai/dsh` ≥ 0.1.1-rc.1 with an initialized web profile (run `dsh web` once before installing) |
| Node.js | ≥ 20 (with npm) |

### Option A · From npm (recommended)

```sh
dsh plugin --profile web add a2ui-render-in-dsh
dsh web
```

Zero runtime dependencies — two commands and you're done. If your npm mirror hasn't synced the latest version yet, point at the official registry explicitly:

```sh
dsh plugin --profile web add a2ui-render-in-dsh --registry https://registry.npmjs.org
```

### Option B · From source (for developers / hacking on the plugin)

```sh
# 1. Clone and build
git clone https://github.com/baihui-ai/a2ui-render-in-dsh.git
cd a2ui-render-in-dsh
npm install
npm run build
#    Build emits lib/index.js (host plugin) + lib/client.js (browser bundle).
#    lib/ is not committed — you MUST build after cloning or dsh won't find the entry.

# 2. Install into dsh's web profile in link mode
dsh plugin --profile web add link:$(pwd)
#    After code changes: just npm run build + restart dsh web, no reinstall.

# 3. Start / restart dsh web
dsh web
```

### Verify in three steps

```sh
# 1) the composed tree contains the plugin entry
dsh --profile web --dump-config | grep -B1 -A1 a2ui-render-in-dsh
#    expected:  - id: a2ui
#                 name: a2ui-render-in-dsh

# 2) the frontend bundle is served (substitute your port from the dsh web banner)
curl -s http://127.0.0.1:<port>/ | grep -o "a2ui-render-in-dsh/client.js[^\"]*"
#    expected:  a2ui-render-in-dsh/client.js?rev=<hash>
```

3) Open dsh web and say: **"Quiz me with an interactive card"** — a clickable multiple-choice card means it works (the model calls `a2ui_catalog` once before rendering; that's by design). More prompts: [DEMO.md](https://github.com/baihui-ai/a2ui-render-in-dsh/blob/main/DEMO.md#one-stop-prompt-list).

### Upgrade & uninstall

```sh
# upgrade (npm install)
dsh plugin --profile web update a2ui-render-in-dsh

# upgrade (source link install): rebuild after pulling, then restart dsh web
git pull && npm run build

# uninstall: removes the dependency and the bundles entry, then restart dsh web
dsh plugin --profile web remove a2ui-render-in-dsh
```

### Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| dsh web fails to boot / plugin missing | not built after cloning, `lib/` absent | `npm run build`, restart |
| Code changed but UI unchanged | bundles are content-hashed at dsh boot | rebuild, then **restart dsh web** |
| Cards render as generic tool rows | client bundle not loaded | run verify step 2; check `/plugins/a2ui-render-in-dsh/` requests in the browser console |
| Tool errors with `unknown component` | the model guessed without reading the catalog | self-correcting by design: the error tells the model to call `a2ui_catalog` and retry |
| Model answers in text, no card | the adaptive contract judged prose better | say "with an interactive card" in the prompt to trigger reliably |

### Notes

- The client bundle is ~5MB (ECharts + Mermaid + KaTeX built in, zero external requests), served locally and cached by the browser after first load
- Submission records live in browser `localStorage`, the animation played-once latch in `sessionStorage` — both local-only; the submission message itself is in the conversation, so the model side is unaffected across devices

## How it works

1. The model decides a card helps → calls `a2ui_catalog` once (first card in the conversation) → calls `a2ui_render` with an A2UI v0.9 component adjacency list
2. The client toolview renders the arguments into a live interactive card via the x-card engine
3. The user clicks a Button → the plugin composes a plain-language summary → sends it through `session.prompt` as a user message → the model continues (grading / next step)
4. Form cards lock and record after submission; query buttons stay clickable

## Development

```sh
npm run watch        # incremental dual-half builds (restart dsh web to apply)
```

| File | Responsibility |
|---|---|
| `src/host/index.js` | Both tool definitions: `a2ui_render` (schema + component-name validation), `a2ui_catalog` (the full authoring guide) |
| `src/client/index.jsx` | Client plugin entry (locale + toolview registration) |
| `src/client/toolview.jsx` | Card rendering, submission composing, locking & localStorage records |
| `src/client/components.jsx` | Interactive catalog (layout/text/button/choice/dropdown/input) |
| `src/client/components-viz.jsx` | Chart / Mermaid / Math / Video / Anim |
| `src/client/zoomable.jsx` | Fullscreen zoom shell (Fullscreen API + zoom/pan) |
| `src/client/expr.js` | Safe expression evaluator for function plots (whitelist, no eval) |
| `scripts/build.mjs` | esbuild dual-half build (KaTeX font data-URI inlining, `window.__ModuleLoader__` wrapper) |

The client bundle externalizes only `react` / `react/jsx-runtime` (provided by dsh's module table); everything else is inlined.

## Known limits

- Streaming card render: a placeholder row shows until the args JSON parses completely (no partial rendering)
- No dedicated animation form for graph/tree algorithms yet (BFS, tree rotations); the array and matrix forms cover sorting, searching, DP, etc.
- Side-by-side cards across separate tool calls are not possible (one call per row in the dsh conversation); `Grid` covers multi-column within one call

## License

MIT
