# a2ui-render-in-dsh

English | [中文](https://github.com/baihui-ai/a2ui-render-in-dsh/blob/main/README.zh.md)

**A2UI interactive cards for the dsh web UI**: the agent adaptively renders **interactive, visual UI cards** right inside the conversation — quizzes, forms, dropdowns, product cards, ECharts charts, math function plots, Mermaid flowcharts/mind maps, KaTeX formulas, and step-by-step algorithm animations. User interactions flow back to the agent as plain-language messages, closing the loop.

The UI protocol is [A2UI v0.9](https://github.com/google/A2UI) (a declarative Agent-to-UI protocol); rendering is powered by Ant Design X's official implementation, [`@ant-design/x-card`](https://www.npmjs.com/package/@ant-design/x-card).

📸 **[Feature showcase with GIFs → DEMO.md](https://github.com/baihui-ai/a2ui-render-in-dsh/blob/main/DEMO.md)** · 🗺️ **[Scenario × component map](https://github.com/baihui-ai/a2ui-render-in-dsh/blob/main/docs/SCENARIOS.md)**

![Quiz interaction](https://raw.githubusercontent.com/baihui-ai/a2ui-render-in-dsh/main/docs/demo-quiz.gif)

---

## Design

### Architecture: one package, two halves

```
a2ui-render-in-dsh (one npm package, a dsh bundle)
├─ Host half  lib/index.js         cordis plugin registering two agent tools
│    ├─ a2ui_render                renders a card (slim ~140-token description, always visible)
│    └─ a2ui_catalog               returns the full component catalog & authoring
│                                  rules (~975 tokens, loaded on demand, once)
└─ Client half  lib/client.js      browser bundle registering the a2ui_render toolview
     ├─ x-card engine (A2UI command stream, data binding, action resolution)
     ├─ component catalog implementations (18 components, themed via --dsw-* tokens)
     └─ ECharts 6 / Mermaid 11 / KaTeX (fonts inlined) all bundled — zero external requests
```

### Key design decisions

**1. Proactive rendering, decided by the model.** The tool contract tells the model to reach for cards actively: asking the user anything always renders a form card (each question = one field; suggested options come with an "other" text field), math notation always uses the formula component, and comparable data gets a chart proactively; plain text is reserved for pure narrative explanation. Verified across five scenario classes (survey, choice, math, data, plain explanation) — triggering and restraint both behave.

**2. Skill-style context design (catalog on demand).** The full component catalog is NOT inlined in the tool description; it lives in a second tool, `a2ui_catalog`. Always-visible cost drops from ~1,200 to ~211 tokens (−82%). The model calls the catalog once before its first card in a conversation and reuses it for later cards; conversations that never draw a card pay nothing. The host validates component names and errors with a "call a2ui_catalog" hint, so the model can't silently guess wrong.

**3. Non-blocking answers over the native message path.** Submissions need no custom server channel: the client sends the submission through dsh's own `session.prompt` RPC as an ordinary user message. Messages are **plain language** (button label + chosen values, multi-line for forms) — readable for humans, parseable for the model, no raw JSON in the conversation:

```
Submit signup
City: Shanghai
Tracks: Backend, Data Analysis
```

**4. Semantic submit locking.** Cards with input components (forms/quizzes) lock after their first submission — inputs disable, the chosen values stay highlighted, and the submission is recorded (persisted to localStorage; a page reload restores the locked state, values, and timestamp). Buttons on cards WITHOUT inputs (product cards) are treated as query buttons and stay clickable. A per-button `submit: true|false` overrides the heuristic.

**5. Let the model do only what it's good at.** Function plotting: the model writes an expression (`tan(x)`); sampling and asymptote breaking are done by a built-in **safe expression evaluator** (whitelist shunting-yard parser, no eval, injection is rejected) — hand-enumerating data points would inevitably fail. Algorithm animations: the model simulates the algorithm into per-step frames (an LLM strength); playback, transitions, and controls belong to the component.

**6. Fully self-contained display stack.** ECharts, Mermaid, and KaTeX (woff2 fonts as data URIs) are all bundled (~5MB, served locally, loaded once) — no CDN, works offline; light/dark theme follows the page automatically.

## Highlights

- 🎯 **Adaptive**: the model chooses text vs. card; verified reliable in both directions
- 🪶 **Context-friendly**: skill-style catalog design, ~211 tokens always-visible
- 💬 **Elegant answers**: plain-language submissions, not raw JSON strings
- 🔒 **Submit-once locking**: forms can't double-submit, records persist; query buttons unaffected
- 📊 **Full visualization family**: ECharts charts/dashboards, function plots, all Mermaid diagram types, KaTeX formulas (matrices are forced into formula rendering), video
- 🎬 **Algorithm animations**: array/bars and grid/matrix forms, auto-detected; auto-plays once per card (component remounts never replay), ↻ manual replay, stepping, progress bar, legend
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
| `Image` | `url, alt?, width?, height?` | Images (incl. GIF), built-in fullscreen zoom |
| `Tag` | `text, color?: blue\|green\|red\|orange\|gray` | Tag/badge |
| `Math` | `tex, block?` | **KaTeX** formulas (fonts inlined, zero external requests); matrices/vectors must use this |
| `Mermaid` | `code, caption?` | **Mermaid 11**: flowchart/mindmap/sequence/gantt etc., built-in fullscreen zoom |
| `Chart` | `option, height?, functions?, xMin?, xMax?, samples?, yClip?` | **ECharts 6**: data mode (option verbatim) + function-plot mode (expressions sampled automatically, asymptote breaks), built-in fullscreen |
| `Video` | `url, poster?, loop?, muted?, autoplay?` | HTML5 video (mp4/webm) |
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
| `Table` | `columns, rows, caption?` | Comparison/spec/price tables; dictionary binding switches datasets |
| `Stat` | `label, value, unit?, trend?` | KPI tile; combine in a Grid for metric overviews |
| `Steps` | `items` | Step list (done/current/pending) |
| `Progress` | `value, max?, label?` | Progress bar |
| `Timeline` | `items` | Timeline (history / event review) |
| `CodeBlock` | `code, language?, title?` | Code with line numbers, light highlighting, copy button |
| `Icon` | `name, size?, color?` | 32 built-in stroke icons |
| `Audio` | `url, title?` | Audio player |
| `Flashcard` | `front, back` | Tap-to-flip card (vocabulary / recall) |
| `Countdown` | `to?/seconds?, label?` | Live countdown |
| `TextField` | `label?, placeholder?, multiline?, bind, disabled?` | Text input |

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
