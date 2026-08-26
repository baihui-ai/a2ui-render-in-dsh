import { defineTool } from "@deepseek-ai/dsh-tools";

export const name = "a2ui";
export const inject = ["tools"];

// Skill-style split: a2ui_render carries only a slim always-visible summary;
// the full authoring guide loads on demand through a2ui_catalog, so sessions
// that never draw a card never pay for the catalog.

const KNOWN_COMPONENTS = new Set([
	"Column", "Row", "Grid", "Card", "List", "Divider", "Tabs", "When", "Wizard",
	"Text", "Markdown", "Image", "Icon", "Tag", "Math", "Mermaid", "Chart", "Map", "Video", "Audio", "Anim",
	"Table", "Stat", "Steps", "Progress", "Timeline", "CodeBlock", "Flashcard", "Countdown", "ImageCompare",
	"Button", "MultipleChoice", "Select", "Rate", "Slider", "CheckBox", "TextField", "Calc",
	"Upload", "Suggestions", "Calendar", "RankList", "Signature", "EditableTable"
]);

const CATALOG_DOC = `# a2ui_render authoring guide

Forms: each question = one field; options -> MultipleChoice/Select; free answers -> TextField (multiline for long); offering suggestions? ALSO add a TextField for a custom answer; several questions = ONE card, ONE submit Button labeled with the action ("提交", "确认建档"). Multiple items or several charts = ONE call with a Grid. Display-only cards (no Button) are fine. ALWAYS accompany the card with 1-3 sentences of normal prose in your reply (the takeaway, what to look at, or caveats) — a bare card with no text reads as unfinished; but never restate the card's data in text.

## Components (adjacency list; MUST include id "root"; only these names render)
Layout:
- Column / Row {children, gap?}
- Grid {children, columns?, gap?, minWidth?} — side-by-side cards, 2x2 dashboards (columns 2-4, omit for auto-fit)
- Card {children, title?} · List {children, direction?} · Divider {}
- Tabs {tabs: ["名"…], children, bind?} — one child per tab; dataset switching / grouping
- When {value: {"path": "/x"}, equals?, includes?, notEmpty?, children} — children render only when the bound value matches; use for follow-up fields (e.g. reason box when choice includes "其他")
- Wizard {steps: ["步骤名"…], children, submitLabel?} — multi-step form: one child (a Column of fields) per step, built-in 上一步/下一步/progress, the last step's submit sends ALL collected fields at once; use when a form has 5+ questions
Content (Chart/Mermaid/Image auto-get fullscreen zoom; don't oversize):
- Text {text, variant?: "h1"|"h2"|"h3"|"body"|"caption"|"strong"}
- Markdown {text} — rich long-form text (headings, bold/italic, links, lists, quotes, fenced code, $...$ math); USE instead of stacking Text components for any multi-paragraph explanation inside a card
- Image {url, alt?, width?, height?} · Tag {text, color?: "blue"|"green"|"red"|"orange"|"gray"}
- Icon {name, size?, color?} — check x plus minus warning info star heart calendar clock location user search settings mail phone home file link download upload play music image cart tag gift trophy fire bolt sun moon cloud thumbs-up
- Math {tex, block?} — KaTeX. ALL math notation goes here, matrices included: never raw arrays like [[2,1],[0,3]] in Text — write {"tex": "\\\\begin{pmatrix}2&1\\\\\\\\0&3\\\\end{pmatrix}", "block": true} (row sep \\\\\\\\). Equation above its Anim when animating.
- Mermaid {code, caption?} — flowchart ("graph TD; A[开始]-->B{判断}"), mindmap, sequenceDiagram, gantt, pie, stateDiagram
- Chart {option, height?, functions?, params?, xMin?, xMax?, yClip?} — ECharts (viewers get a PNG-download button). Data mode: standard option verbatim. Function mode: functions=[{"expr":"tan(x)","name"?}], xMin/xMax (±10), yClip (10); sampled automatically, asymptotes break — NEVER hand-enumerate curve points. Ops: + - * / ^ %, sin cos tan cot sec csc asin acos atan sinh cosh tanh sqrt cbrt abs exp ln log2 log10 floor ceil round sign min max pow atan2, pi/e, x. params: {"mu":{"path":"/mu"}} injects bound values as constants — pair with Slider for live curves.
- Table {columns, rows, caption?, sortable?, filter?, pageSize?} — any 2+ item attribute comparison beats prose. Interactive by default: click-to-sort headers, auto filter box and pagination on long data, copy/CSV export built in. Dict binding: rows={"source":{"k1":[[…]],…},"pick":{"path":"/k"}} + a Select/Tabs on that path switches datasets live.
- Stat {label, value, unit?, trend?, hint?} — KPI tile ("+12%" green / "-3%" red); several in a Grid
- Steps {items: [{title, description?, status?: "done"|"current"|"pending"}]} — linear procedures; Mermaid flowchart only when it BRANCHES
- Progress {value, max?, label?} · Timeline {items: [{time?, title, description?}]} (past events; Steps = to-dos)
- CodeBlock {code, language?, title?} — always for code snippets
- Video {url, poster?…} · Audio {url, title?} · Flashcard {front, back} · Countdown {to?: "2026-09-01 10:00", seconds?, label?}
- Map {data: [{name: "广东", value: 100}…], title?, unit?, height?} — China province choropleth (regional sales/distribution); province names in Chinese
- ImageCompare {before, after} — drag-divider image comparison (before/after, A/B)
- Anim {frames, interval?, height?, autoplay?} — algorithm animation; plays ONCE, user replays via controls. Form auto-detected from frame shape; simulate the algorithm yourself, one frame per step with a "note" caption, FULL state each frame:
  bars (sorting/searching, 8-12 numbers): {"data":[5,3,8,1],"highlight":[0,1],"sorted":[3],"note":"…"} — highlight=orange, sorted=green
  grid (matrix/DP): {"grids":[{"title":"A","data":[[1,2],[3,4]],"highlight":[[0,0]]},{"title":"C","data":[[17,null]],"accent":[[0,0]]}],"note":"…"} — highlight=read(orange), accent=write(green), null=empty; single grid: {"grid":[[…]],…}
  graph (BFS/DFS/trees): {"graph":{"nodes":[{"id":"A","label"?,"x"?,"y"?,"state"?:"active"|"seen"|"done"}],"edges":[["A","B","active"|"done"?]]},"note":"…"} — no x/y (0-100) = auto circle; active=orange, seen=blue, done=green
Interaction:
- Button {label, variant?: "primary"|"default"|"danger", submit?, action: {event: {name, context?}}}
- MultipleChoice {options: [{label, value, description?, disabled?}], bind, maxAllowedSelections?, disabled?} — array at bind; max 1 = single-select
- Select {options, bind, label?, placeholder?, multiple?, maxAllowedSelections?, disabled?} — dropdown; single stores value, multiple stores array
- Rate {bind, label?, max?, disabled?} — stars 1..max (5)
- Slider {bind, label?, min?, max?, step?, unit?, disabled?} — numbers in a range; parameter exploration with Chart params
- Calc {expr, inputs: {name: {"path": "/x"}…}, out, digits?} — invisible derived number written at out; chainable (one Calc's out feeds another's inputs). digits rounds DISPLAY values only — omit on intermediate results (rates, ratios) to keep full precision
- CheckBox {label, bind, disabled?} · TextField {label?, placeholder?, multiline?, kind?: "text"|"number"|"date"|"time", bind, disabled?}
- Upload {bind?, label?, max?} — image picker; chosen images are SENT TO YOU with the submission (screenshots, photos, receipts — use whenever seeing an image would help)
- Calendar {bind, label?, min?, max?} — month-view date picker (friendlier than kind:"date" for choosing among nearby dates)
- RankList {items: ["选项"…], bind, label?} — user reorders by priority; submits the ordered list
- Signature {label?} — handwritten signature pad; the drawing is sent to you as an image
- EditableTable {columns, rows, bind, label?} — user edits cells, the whole grid submits at bind
- Suggestions {items: ["追问1", "追问2"…]} — tappable follow-up questions below an answer; tapping sends that question as the user's message. ADD 2-4 to display-only cards when natural next questions exist
Preselect by seeding dataModel at bind paths; disable via disabled on a control or an option.

## Reactivity
Bindings are live: inputs write bind paths, every {"path"} display binding updates instantly.
- Follow-ups: MultipleChoice bind:"a" + When includes:"其他" wrapping a TextField
- Exploration: Slider bind:"mu" + Chart params:{"mu":{"path":"/mu"}}
- Calculators: Sliders -> Calc {expr, inputs, out:"monthly"} -> Stat value:{"path":"/monthly"}
- Dataset switch: Tabs panes, or Table dict binding
Seed every bound path in dataModel.

## Scenario map
Input collection -> form (TextField/kind date|time|number, MultipleChoice 2-7 options, Select for long lists, CheckBox, Rate). Decisions -> Grid Cards + Table; lone confirm Button gets submit:true. Data -> Chart (trend/rank/share) + Stat tiles + Table. Learning -> MultipleChoice quizzes (options may be formulas), Math, Chart functions (+Slider), Anim, mindmap, Flashcard, CodeBlock. Procedures -> Steps (Timeline for history, Progress for completion, gantt/Table for schedules). Entertainment -> Grid recommendation cards, Rate, polls via MultipleChoice.

## Inline math
Any text prop (Text, option labels/descriptions, Table cells, Steps, Flashcard, Anim notes) embeds formulas with $...$, e.g. option {"label": "$\\\\frac{x^2}{2}+C$"}. Math component = display equations; $...$ = math inside sentences/choices. In math quizzes, option labels with fractions/roots/integrals/exponents SHOULD be $...$ formulas (e.g. {"label": "$3x^2$"}), not Unicode approximations.

## Data binding
"bind" = write path WITHOUT leading slash ("answer", "form/name"). Display reads use {"path": "/answer"} (WITH slash). Avoid literal string props starting with "/".

## Submission
Button click sends a plain-language user message: button label + chosen values ("提交答案：B、C"; multi-line for forms); MultipleChoice arrives as option LABELS. action.event.context optional (touched fields auto-included); entries may be literals or {"path": "/x", "label": "名"}. Locking (submitMode "once", default): cards WITH inputs lock after submit and stay recorded; input-less cards' buttons are query buttons, always clickable; per-Button submit: true|false overrides; "multi" never locks. After an interactive card, end your turn with one short line; a plain typed reply also counts as the answer. Uploaded images/signatures arrive attached to the submission message. Users can hit 重新填写 on a locked card — the corrected submission is prefixed （修正）.

## Updating a rendered card
a2ui_render returns a surfaceId. Call a2ui_update {surfaceId, components?, dataModel?} to change that card IN PLACE — replace/add components by id, overwrite dataModel keys. Use for long-task progress (render a Progress card first, then update /percent as you work), corrections, and appending results — never render a duplicate card for the same content. Cards render progressively while you stream — no need to keep them small.

## Example (quiz)
components=[{"id":"root","component":"Column","children":["q","opts","btn"]},{"id":"q","component":"Text","variant":"h3","text":"…题目…"},{"id":"opts","component":"MultipleChoice","bind":"answer","maxAllowedSelections":1,"options":[{"label":"A…","value":"A"},{"label":"B…","value":"B"}]},{"id":"btn","component":"Button","label":"提交答案","variant":"primary","action":{"event":{"name":"submit"}}}]
dataModel={"answer":[]}`;

const RENDER_DESCRIPTION = "Render a UI card (A2UI) inline in the chat. Judge EVERY reply semantically from user intent (they never say 卡片/图表/动画): (1) UTILITY — would a card serve any of UI's three purposes better than prose? ACT 操作: the user must answer/choose/fill/adjust/rate/confirm -> form. BROWSE 浏览: the user wants to see/scan data or many items — statistics, rankings, distributions, trends, comparisons (看/查/对比 data IS a chart/table/map ask; dated or approximate data never cancels the card — chart the best you know, label the period, caveat in prose). UNDERSTAND 理解: structure, notation or MOTION aids comprehension — math, code, flows, schedules, stepwise processes, what-if exploration, and anything that unfolds over time (algorithms, simulations, physical processes) -> step animation. FEEDBACK 反馈: long or multi-step work you are doing -> render a Progress/Steps card first, advance it with a2ui_update. None of these (opinions, narration, short answers, translations, chat) -> prose. (2) FORM — fit each part and compose freely in one card: input->form, comparison->table, trend->chart, regional data->map, math->formula, code->code block, procedure->steps, relations->diagram, watchable process->animation, what-if->sliders+live chart. Cards PAIR with prose, never replace it: give your takeaway/analysis in 1-3 sentences of normal text and keep structured content in the card; don't duplicate data in both. Before your FIRST call in a conversation, call a2ui_catalog and follow it — never guess component names. After an interactive card, end your turn; the submission arrives as a plain-language user message.";

const CATALOG_DESCRIPTION = "Returns the full component catalog and authoring rules for a2ui_render. Call ONCE before your first render in a conversation; the result stays in context — call again only if it is no longer visible.";

export function apply(ctx) {
	ctx.tools.register(defineTool({
		name: "a2ui_catalog",
		description: CATALOG_DESCRIPTION,
		parameters: {},
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: { doc: { type: "string", required: true } }
			},
			render: (_args, value) => [{ type: "text", text: value.doc }]
		},
		isConcurrencySafe: () => true,
		async execute() {
			return { doc: CATALOG_DOC };
		}
	}));

	ctx.tools.register(defineTool({
		name: "a2ui_render",
		description: RENDER_DESCRIPTION,
		parameters: {
			title: { type: "string", description: "Card title." },
			components: {
				type: "array",
				required: true,
				description: "A2UI adjacency list incl. a node with id \"root\"; see a2ui_catalog.",
				items: { type: "object", additionalProperties: true }
			},
			dataModel: { type: "object", additionalProperties: true, description: "Initial values." },
			submitMode: { type: "string", description: "\"once\" (default) | \"multi\"." }
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: {
					status: { type: "string", required: true },
					surfaceId: { type: "string" },
					hint: { type: "string" }
				}
			},
			render: (_args, value) => [{ type: "text", text: JSON.stringify(value) }]
		},
		isConcurrencySafe: () => true,
		async execute(args, exec) {
			const components = Array.isArray(args.components) ? args.components : [];
			if (!components.some((node) => node !== null && typeof node === "object" && node.id === "root")) {
				throw new Error("a2ui_render: components must include a node with id \"root\". Call a2ui_catalog for the authoring guide.");
			}
			const byId = new Map(components.filter((n) => n !== null && typeof n === "object" && n.id !== undefined).map((n) => [n.id, n]));
			const reachable = new Set();
			const queue = ["root"];
			while (queue.length > 0) {
				const id = queue.pop();
				if (reachable.has(id)) continue;
				reachable.add(id);
				const node = byId.get(id);
				for (const child of Array.isArray(node?.children) ? node.children : []) queue.push(child);
			}
			const orphans = [...byId.keys()].filter((id) => !reachable.has(id));
			if (orphans.length > 0) {
				throw new Error(`a2ui_render: component(s) ${orphans.map((id) => `"${id}"`).join(", ")} are defined but not reachable from "root" — add them to a parent's children or remove them.`);
			}
			const unknown = [...new Set(components
				.map((node) => node?.component)
				.filter((component) => typeof component === "string" && !KNOWN_COMPONENTS.has(component)))];
			if (unknown.length > 0) {
				throw new Error(`a2ui_render: unknown component(s) ${unknown.map((component) => `"${component}"`).join(", ")} — nothing would render. Call a2ui_catalog for the list of valid components.`);
			}
			return {
				surfaceId: String(exec.callId),
				status: "presented",
				hint: "Card rendered. The user's action arrives as the next user message; end your turn if waiting."
			};
		}
	}));

	ctx.tools.register(defineTool({
		name: "a2ui_update",
		description: "Update a card you previously rendered, IN PLACE: pass the surfaceId returned by a2ui_render, plus replacement/new components (matched by id) and/or dataModel value changes. Use for progress updates during long tasks, corrections, and appending content — instead of rendering a duplicate card.",
		parameters: {
			surfaceId: { type: "string", required: true, description: "The surfaceId returned by the a2ui_render call to update." },
			components: {
				type: "array",
				description: "Components to add or replace (matched by id); same schema as a2ui_render.",
				items: { type: "object", additionalProperties: true }
			},
			dataModel: { type: "object", additionalProperties: true, description: "Data model values to overwrite, keyed by top-level path." }
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: { status: { type: "string", required: true } }
			},
			render: (_args, value) => [{ type: "text", text: JSON.stringify(value) }]
		},
		isConcurrencySafe: () => true,
		async execute(args) {
			if ((!Array.isArray(args.components) || args.components.length === 0) && (args.dataModel === null || typeof args.dataModel !== "object" || Object.keys(args.dataModel ?? {}).length === 0)) {
				throw new Error("a2ui_update: provide components and/or dataModel to change.");
			}
			const unknown = [...new Set((Array.isArray(args.components) ? args.components : [])
				.map((node) => node?.component)
				.filter((component) => typeof component === "string" && !KNOWN_COMPONENTS.has(component)))];
			if (unknown.length > 0) throw new Error(`a2ui_update: unknown component(s) ${unknown.join(", ")} — call a2ui_catalog.`);
			return { status: "updated" };
		}
	}));
}
