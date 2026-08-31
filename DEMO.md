# a2ui-render-in-dsh Feature Showcase

English | [中文](DEMO.zh.md)

Each demo shows: **what you say to dsh → the card the model renders → what you do on the card → what comes back to the conversation**. All GIFs/screenshots are recorded from real chromium rendering.

To reproduce locally: install the plugin ([README → Installation](README.md#installation)), then send each section's prompt to dsh. Whether to render a card is the model's adaptive call, anchored on UI's four purposes — **act** (fill/choose), **browse** (see/scan data), **understand** (structure/notation/motion), **feedback** (long-task status) — and none of the prompts below mention "card", "chart" or any UI word.

---

## Part 1 · One scenario from every corner of life

### 📚 Learning — a quiz where the options ARE formulas

> 💬 "Give me one calculus question to practice on"

**Purposes: act + understand.** The model renders a choice card whose options are real KaTeX formulas ($\frac{x^2}{2}+C$ …), with a formula hint under the question. Pick → submit → the card locks, and the footer records the submitted answer *rendered as a formula* with a timestamp; a "refill" button reopens it. The answer returns as plain language for the model to grade.

![Learning quiz](docs/demo-study.gif)

### 🏡 Life — booking a weekend stay

> 💬 "I want a hot-spring weekend near Moganshan — help me book a B&B"

**Purpose: act.** A booking form with a month-view `Calendar` (dates before today disabled), single-choice room types with prices, and a pickup checkbox. Submit once → the whole card locks with a record; query-free forms can be reopened with the refill button. The submission arrives as a readable multi-line message, not JSON.

![Life booking](docs/demo-life.gif)

### 💼 Work — a long task that shows its progress

> 💬 "Track our three competitors' price changes this week and summarize"

**Purpose: feedback.** Before starting, the model renders a `Progress` + `Steps` card, then advances it **in place** with `a2ui_update` as each step completes — the progress bar actually moves (10% → 45% → 80% → 100%), steps tick green one by one, and the final summary table lands *inside the same card* (sortable, copy/CSV built in). Updates persist and replay after a page reload.

![Work progress](docs/demo-work.gif)

### 📊 Data — "I just want to SEE it"

> 💬 "我想看一些2026年上半年各省GDP" (show me provincial GDP for H1 2026)

**Purpose: browse.** A data-reading ask IS a chart ask — no "chart" keyword needed. The model composes KPI `Stat` tiles + a China `Map` choropleth + an interactive `Table` in one card: click a header to sort (numeric-aware), type in the filter box to narrow, copy as TSV or export CSV. Approximate or dated data doesn't cancel the card — the model labels the period and adds caveats in prose.

![Data GDP](docs/demo-data.gif)

### 🍿 Entertainment — pick me a movie

> 💬 "Help me pick a thriller for the weekend"

**Purpose: browse.** Recommendations render as one `Card` per movie in a `Grid` with rating `Tag`s. The "View details" buttons are **query buttons** — cards without inputs never lock, so you can click them again and again. Below, `Suggestions` chips offer natural follow-ups; tapping one sends it as your next message instantly.

![Entertainment movies](docs/demo-fun.gif)

---

## Part 2 · Capability close-ups

### Forms: dropdowns, multi-select, preselection, disabling

> 💬 "Build a course signup form: name input, city dropdown (single, default Beijing), track dropdown (multi, max 2), and an agreement checkbox"

`Select` supports single select (stores the value) and multi select (stores an array, cap via `maxAllowedSelections`), option descriptions, per-option disabling, and preselection via `dataModel`. The submission is a multi-line plain-language summary:

```
Submit signup
City: Shanghai
Tracks: Backend, Data Analysis
Agree to terms: yes
```

![Form](docs/demo-form.gif)

### Charts & dashboards

> 💬 "Draw a 2×2 ops dashboard: visits line chart, orders bar chart, channel share donut, conversion area chart"

`Chart` passes a standard ECharts option through verbatim; `Grid columns: 2` makes it a dashboard. Every chart has a PNG-download button.

![Dashboard](docs/demo-dashboard.png)

### Math function plots

> 💬 "Plot y=tan(x), cot(x), sec(x), csc(x)"

The model only writes expressions (`functions: [{"expr": "tan(x)"}]`); a built-in **safe expression evaluator** (whitelisted math functions, no eval) samples ~400 points and breaks lines at asymptotes — the model never hand-enumerates data points. Bind `params` to a `Slider` and the curve re-renders live as you drag.

![Function plots](docs/demo-function-plot.png)

### Diagrams (Mermaid) & formulas (KaTeX)

> 💬 "Draw a user-registration flowchart and a frontend-skills mind map" / "Show the normal distribution density function"

`Mermaid` covers flowchart, mindmap, sequenceDiagram, gantt, pie, stateDiagram with automatic theming. `Math` renders LaTeX with fonts inlined (zero external requests); matrices are forced into formula rendering — never raw arrays in text. Every text position (options, table cells, captions) accepts inline `$...$` math.

Combined rendering in light and dark themes:

| Light | Dark |
|---|---|
| ![Light theme](docs/demo-viz-light.png) | ![Dark theme](docs/demo-viz-dark.png) |

### Algorithm animation · bars form

> 💬 "Animate quicksort on [7,2,9,4,1,8,3]"

The model simulates the algorithm into per-step frames; the plugin plays them as smoothly-morphing bars: orange = comparing/swapping, green = finalized, with captions, a progress bar, and a legend. **Each card auto-plays exactly once per tab** (remounts never replay); ↻ replays on demand, with pause/step/reset.

![Sorting animation](docs/demo-sort.gif)

### Algorithm animation · grid/matrix form

> 💬 "Animate matrix multiplication [[2,1],[0,3]] × [[1,4],[5,2]]"

Multiple matrices side by side, computed cell by cell: orange = cells being read, green = the cell being written, per-frame equations included. A graph/tree form (BFS/DFS, auto circle layout) is also auto-detected.

![Matrix animation](docs/demo-matrix.gif)

### Session navigator: tasks, locating, drafts & cache-proof records

A dsh-style panel toggle docks at the right edge whenever the session has form cards (badge = pending count, gentle ping), opening the **session navigator** drawer. The **Tasks** tab groups *to-submit* forms (per-card fill counts like 已填 2/6, filled-content preview, full date+time, an undoable "not needed" dismiss) and *submitted* forms (✓ with time); the **All** tab lists every user message in full (wrapped, never truncated, dated) — click any row to scroll-and-flash to that point, with automatic "load earlier" retries for old history, forms attached under their message with live status, auto-refreshing every 5s while open. Drafts auto-save as you type and survive reloads; submitted-state survives even a cleared cache, reconstructed from the session transcript.

![Form to-dos](docs/demo-todo.gif)

![Draft restore](docs/demo-draft.gif)

### Fullscreen zoom

Hover reveals ⛶ → fullscreen with fit-to-viewport scaling → wheel zoom (0.2×–10×) + drag panning → exit via Esc/✕. Charts re-render at fullscreen size (vector-crisp).

![Fullscreen zoom](docs/demo-fullscreen.gif)

---

## One-stop prompt list

Send these to dsh in order to reproduce Part 1 — none of them names a UI:

1. Give me one calculus question to practice on
2. I want a hot-spring weekend near Moganshan — help me book a B&B
3. Track our three competitors' price changes this week and summarize
4. 我想看一些2026年上半年各省GDP
5. Help me pick a thriller for the weekend

And for Part 2: a signup form / a 2×2 ops dashboard / plot tan·cot·sec·csc / a registration flowchart + skills mind map / animate quicksort / animate a matrix multiplication.
