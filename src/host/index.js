import { defineTool } from "@deepseek-ai/dsh-tools";

export const name = "a2ui";
export const inject = ["tools"];

// Skill-style split: a2ui_render carries only a slim always-visible summary;
// the full authoring guide loads on demand through a2ui_catalog, so sessions
// that never draw a card never pay for the catalog.

const KNOWN_COMPONENTS = new Set([
	"Column", "Row", "Grid", "Card", "List", "Divider", "Tabs", "When",
	"Text", "Image", "Icon", "Tag", "Math", "Mermaid", "Chart", "Video", "Audio", "Anim",
	"Table", "Stat", "Steps", "Progress", "Timeline", "CodeBlock", "Flashcard", "Countdown",
	"Button", "MultipleChoice", "Select", "Rate", "Slider", "CheckBox", "TextField", "Calc"
]);

const CATALOG_DOC = `# a2ui_render authoring guide

When to render: PROACTIVELY, whenever a card fits. (a) Asking the user ANYTHING — questions, choices, confirmations, or details to fill in — must be a form card, not prose: each question = one field; options -> MultipleChoice or Select; free-form answers -> TextField (multiline: true for long answers); when you offer suggested options, ALSO add a TextField so the user can answer something else; several questions go in ONE card with ONE submit Button whose label names the action (e.g. "提交", "确认建档"). (b) Visualization: any math notation -> Math; comparable numbers/data -> Chart; processes/structures/relationships -> Mermaid; algorithm walkthroughs -> Anim; multiple items or chart dashboards -> ONE call with a Grid — never several calls. Plain text remains right only for narrative explanation with nothing to ask, collect, or visualize. One call = one card; display-only cards (no Button) are fine.

## Components ("components" is an A2UI v0.9 adjacency list; MUST include a node with id "root"; only these names render)
Layout:
- Column / Row {children, gap?}
- Grid {children, columns?, gap?, minWidth?} — side-by-side cards & 2x2 dashboards; columns 2–4, or omit for auto-fit at minWidth px (default 180)
- Card {children, title?}
- List {children, direction?: "vertical"|"horizontal"}
- Tabs {tabs: ["页签名"…], children, bind?} — one child per tab name; switch datasets or group content (e.g. 本周/本月 reports, per-day itineraries); bind optionally records the active tab name
- When {value: {"path": "/x"}, equals?, includes?, notEmpty?, children} — conditional container: children render only when the bound value matches (equals for scalars, includes for arrays/strings, notEmpty for presence). USE for follow-up fields, e.g. show a reason TextField only when the choice includes "其他" or "不满意"
- Divider {}
Content (Chart/Mermaid/Image have built-in fullscreen zoom — do not oversize them):
- Text {text, variant?: "h1"|"h2"|"h3"|"body"|"caption"|"strong"}
- Image {url, alt?, width?, height?} — GIF ok
- Tag {text, color?: "blue"|"green"|"red"|"orange"|"gray"}
- Math {tex, block?} — KaTeX LaTeX, e.g. {"tex": "\\\\int_0^1 x^2\\\\,dx = \\\\frac{1}{3}", "block": true}. ALWAYS use Math for mathematical notation — matrices and vectors included: NEVER write raw nested arrays like [[2,1],[0,3]] inside Text; render them as a formula instead, e.g. {"tex": "\\\\begin{pmatrix}2&1\\\\\\\\0&3\\\\end{pmatrix}\\\\times\\\\begin{pmatrix}1&4\\\\\\\\5&2\\\\end{pmatrix}=\\\\begin{pmatrix}7&10\\\\\\\\15&6\\\\end{pmatrix}", "block": true} (row separator is \\\\\\\\). When animating matrix math with Anim, put the overall equation in a Math block above it.
- Mermaid {code, caption?} — flowchart ("graph TD; A[开始]-->B{判断}"), mindmap ("mindmap\\n  root((主题))\\n    分支"), sequenceDiagram, gantt, pie, stateDiagram
- Chart {option, height?, functions?, xMin?, xMax?, samples?, yClip?} — ECharts. Data mode: standard ECharts option verbatim (line/bar/pie/scatter/radar/heatmap…). Function mode: functions=[{"expr":"tan(x)","name"?:"y=tan(x)"}] with xMin/xMax (default -10..10) and yClip (default 10) — ~400 points sampled, asymptotes break automatically; NEVER hand-enumerate data points for a math curve. Expressions: + - * / ^ %, sin cos tan cot sec csc asin acos atan sinh cosh tanh sqrt cbrt abs exp ln log2 log10 floor ceil round sign min max pow atan2, constants pi/e, variable x. PARAMETERS: params: {"mu": {"path": "/mu"}} injects bound values as extra expression constants — pair with Slider components writing those paths and the curve re-renders live as the user drags.
- Table {columns: ["列名"…], rows: [[…]…], caption?} — comparison/spec/price/schedule tables; ALWAYS prefer over prose lists when comparing 2+ items across attributes. Dictionary binding: rows may be {"source": {"2026-08": [[…]], "2026-09": [[…]]}, "pick": {"path": "/period"}} so a Select/Tabs bound to the same path switches the dataset live
- Stat {label, value, unit?, trend?, hint?} — one KPI tile (trend like "+12%" green up / "-3%" red down); put several in a Grid for a metrics overview
- Steps {items: [{title, description?, status?: "done"|"current"|"pending"}]} — linear how-to / progress steps (recipes, setup guides, plans); use a Mermaid flowchart only when the flow BRANCHES
- Video {url, poster?, loop?, muted?, autoplay?} — mp4/webm
- Audio {url, title?} — native audio player (podcasts, music, listening material)
- Icon {name, size?, color?} — inline icon; names: check x plus minus warning info star heart calendar clock location user search settings mail phone home file link download upload play music image cart tag gift trophy fire bolt sun moon cloud thumbs-up
- CodeBlock {code, language?, title?} — code with line numbers, lightweight highlighting and a copy button; ALWAYS use for code snippets in cards
- Progress {value, max?, label?} — completion/percentage bar
- Timeline {items: [{time?, title, description?}]} — past events / history / itinerary review (use Steps for to-do sequences instead)
- Flashcard {front, back, frontLabel?, backLabel?} — tap-to-flip card (vocabulary, Q&A memorization)
- Countdown {to?: "2026-09-01 10:00", seconds?, label?} — live countdown
- Anim {frames, interval?, height?, autoplay?, labels?} — step-by-step ALGORITHM animation; auto-plays through ONCE, then the user replays/steps via the built-in controls (do not loop). The form is auto-detected from the frame shape. Simulate the algorithm yourself, one frame per step, each with a clear "note" caption. Two forms:
  (1) Array/bars (sorting, searching, heaps; 8–12 small numbers): frames=[{"data":[5,3,8,1],"highlight":[0,1],"sorted":[3],"note":"比较 5 和 3"},…] — data is the FULL array state, highlight = indices being operated on (orange), sorted = finalized (green).
  (3) Graph/tree (BFS/DFS/shortest path, tree insert/rotate): frames=[{"graph":{"nodes":[{"id":"A","label"?,"x"?,"y"?,"state"?:"active"|"seen"|"done"}],"edges":[["A","B","active"|"done"?]…]},"note":"访问 A，邻居 B、C 入队"},…] — nodes without x/y (0-100) auto-layout on a circle; active=orange (visiting), seen=blue (queued), done=green (finished); repeat the FULL node/edge list each frame with updated states.
  (2) Grid/matrix (matrix ops, DP tables, 2D grids): frames=[{"grids":[{"title":"A","data":[[1,2],[3,4]],"highlight":[[0,0],[0,1]]},{"title":"B","data":[[5,7],[6,8]],"highlight":[[0,0],[1,0]]},{"title":"C=A×B","data":[[17,null],[null,null]],"accent":[[0,0]]}],"note":"C[0][0]=1×5+2×6=17"},…] — grids render side by side; highlight = cells being read (orange), accent = cells being written (green), null cells render empty. A single grid may use {"grid": [[...]], "highlight": [[r,c]], "accent": [[r,c]]} directly.
Interaction:
- Button {label, variant?: "primary"|"default"|"danger", submit?, action: {event: {name, context?}}}
- MultipleChoice {options: [{label, value, description?, disabled?}], bind, maxAllowedSelections?, disabled?} — flat option list; stores an array of chosen values at bind; maxAllowedSelections 1 = single-select
- Select {options: [{label, value, description?, disabled?}], bind, label?, placeholder?, multiple?, maxAllowedSelections?, disabled?} — dropdown select, better for long option lists or compact forms; single-select stores the chosen value at bind, multiple: true stores an array (maxAllowedSelections caps it)
- Rate {bind, label?, max?, disabled?} — star rating input (1..max, default 5); use for any satisfaction/score/preference-strength question
- Slider {bind, label?, min?, max?, step?, unit?, disabled?} — numeric slider writing to bind; use for amounts/quantities within a known range, and for PARAMETER EXPLORATION driving a live Chart (see Reactivity)
- Calc {expr, inputs: {name: {"path": "/x"}…}, out, digits?} — invisible derived value: recomputes expr (same math whitelist as Chart functions) over the bound inputs and writes the number at out; the engine of calculators (loan, BMI, unit conversion)
- CheckBox {label, bind, disabled?} — boolean at bind
- TextField {label?, placeholder?, multiline?, kind?: "text"|"number"|"date"|"time", bind, disabled?} — string at bind; kind renders the matching native input (dates/times/amounts — use it whenever you ask for one)
Input states: preselect by seeding dataModel at the bind path (e.g. dataModel={"city":"beijing"} or {"skills":["go","sql"]}); disable a whole control with disabled: true, or one option via disabled on that option.



## Reactivity (live interactions inside one card)
Data binding is REACTIVE: when any input writes its bind path, every {"path"} display binding updates immediately. Combine:
- Follow-up fields: MultipleChoice bind:"answer" + When {value:{"path":"/answer"}, includes:"其他"} wrapping a TextField.
- Parameter exploration: Slider bind:"mu" + Chart functions with params:{"mu":{"path":"/mu"}} — drag to morph the curve (normal distribution, compound interest, projectile angle…).
- Calculators: Sliders/number TextFields -> Calc {expr:"amount*rate/12/(1-(1+rate/12)^(-years*12))", inputs:{amount:{"path":"/amount"},rate:{"path":"/rate"},years:{"path":"/years"}}, out:"monthly"} -> Stat value:{"path":"/monthly"} shows the result live.
- Dataset switching: Tabs (one child per period), or Table dictionary binding with a Select/Tabs bound to the pick path.
Seed every bound path in dataModel so the first render is complete.

## Scenario cheat sheet (learning / daily life / work / entertainment)
- Collecting ANY user input -> ONE form card: open answers TextField (multiline for long), quantities/amounts kind:"number", dates/times kind:"date"/"time", 2-7 visible options MultipleChoice, long/compact option lists Select, yes-no or agreements CheckBox, satisfaction/score Rate. Pair suggested options with an extra TextField for a custom answer. One submit Button.
- Deciding between plans/products/options -> Grid of Cards (with per-item query Buttons), plus a Table when attributes should be compared side by side; a lone confirm Button gets submit: true.
- Showing data -> trend line / ranking bar / share pie via Chart; several charts in a Grid; headline numbers as Stat tiles in a Grid; raw records as Table.
- Teaching/learning -> quizzes as MultipleChoice forms; math ALWAYS as Math (never plain-text math); function shapes as Chart functions (+Slider params for exploration); algorithm walkthroughs as Anim (bars/matrix/graph); concept maps as Mermaid mindmap; vocabulary/memorization as Flashcard; code as CodeBlock.
- Procedures & plans -> linear instructions (recipes, setups, itineraries, study plans) as Steps; past events/history as Timeline; progress as Progress; branching flows as Mermaid flowchart; schedules as Mermaid gantt or Table.
- Entertainment -> recommendations (movies/games/restaurants) as Grid product-style Cards with query Buttons; rating collection as Rate; polls/quizzes as MultipleChoice.

## Inline math
Any text-bearing prop (Text, option labels/descriptions, Table cells, Steps, Flashcard faces, Anim notes) may embed inline formulas with $...$, e.g. an option {"label": "$\\frac{x^2}{2}+C$", "value": "A"} — rendered with KaTeX. Use the Math component for standalone display equations, $...$ for math inside choices and sentences (essential for math quizzes where OPTIONS are formulas).

## Data binding
- "bind" is a dataModel key path WITHOUT a leading slash ("answer", "form/name").
- Display props may read live values with {"path": "/answer"} (WITH leading slash).
- "dataModel" seeds initial values. Avoid literal string props that start with "/".

## Submission
- A Button click sends a plain-language user message: button label + chosen values ("提交答案：B、C"; multi-line for forms). MultipleChoice values arrive as their option LABELS — map back to values yourself if they differ.
- action.event.context is optional (touched fields are included automatically); entries may be literals or {"path": "/x", "label": "字段名"}.
- Locking: under submitMode "once" (default), a click locks the card ONLY when the card has input components (MultipleChoice/CheckBox/TextField) — a form/quiz submits once and stays recorded. Buttons on cards WITHOUT inputs (product 查看详情, menus) are query buttons and stay clickable. Override per Button with submit: true (always lock — e.g. a lone confirm button) or submit: false (never lock). submitMode "multi" disables locking entirely.
- After rendering an interactive card, end your turn with one short line telling the user to use the card. If the user types a plain reply instead, accept it as the answer.

## Example (single-select quiz)
components=[{"id":"root","component":"Column","children":["q","opts","submit"]},{"id":"q","component":"Text","variant":"h3","text":"TCP 三次握手的第二步是什么？"},{"id":"opts","component":"MultipleChoice","bind":"answer","maxAllowedSelections":1,"options":[{"label":"SYN","value":"SYN"},{"label":"SYN-ACK","value":"SYN-ACK"}]},{"id":"submit","component":"Button","label":"提交答案","variant":"primary","action":{"event":{"name":"submit"}}}]
dataModel={"answer":[]}`;

const RENDER_DESCRIPTION = "Render a UI card (A2UI) inline in the chat. Use PROACTIVELY, not sparingly: (1) whenever you ask the user anything — a question, a choice, a confirmation, or form-style details — render it as an interactive card instead of asking in prose (options -> MultipleChoice/Select, free-form answers -> TextField, several questions -> ONE form card with one field each); (2) any mathematical notation (formulas, vectors, matrices, functions) -> the Math component, never plain-text math; (3) numbers or data worth comparing -> Chart; flows/structures -> Mermaid diagrams; algorithm walkthroughs -> Anim. Plain text is only for narrative explanation with nothing to ask, collect, or visualize. IMPORTANT: before your FIRST call in a conversation, call a2ui_catalog and follow its authoring guide — do not guess component names or props. After rendering an interactive card, end your turn; the user's submission arrives as a plain-language user message.";

const CATALOG_DESCRIPTION = "Returns the A2UI authoring guide for a2ui_render: the full component catalog with props, data-binding rules, submission format, and an example. Call it ONCE before your first a2ui_render in a conversation; the result stays in context — call again only if the guide is no longer visible.";

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
			title: {
				type: "string",
				description: "Card title (optional)."
			},
			components: {
				type: "array",
				required: true,
				description: "A2UI v0.9 adjacency list; must include a node with id \"root\". Component names and props: see a2ui_catalog.",
				items: {
					type: "object",
					additionalProperties: true,
					properties: {
						id: { type: "string", required: true },
						component: { type: "string", required: true },
						children: { type: "array", items: { type: "string" } }
					}
				}
			},
			dataModel: {
				type: "object",
				additionalProperties: true,
				description: "Initial data model (optional)."
			},
			submitMode: {
				type: "string",
				description: "\"once\" (default, locks after submit) or \"multi\" — see a2ui_catalog."
			}
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: {
					status: { type: "string", required: true },
					hint: { type: "string" }
				}
			},
			render: (_args, value) => [{ type: "text", text: JSON.stringify(value) }]
		},
		isConcurrencySafe: () => true,
		async execute(args) {
			const components = Array.isArray(args.components) ? args.components : [];
			if (!components.some((node) => node !== null && typeof node === "object" && node.id === "root")) {
				throw new Error("a2ui_render: components must include a node with id \"root\". Call a2ui_catalog for the authoring guide.");
			}
			const unknown = [...new Set(components
				.map((node) => node?.component)
				.filter((component) => typeof component === "string" && !KNOWN_COMPONENTS.has(component)))];
			if (unknown.length > 0) {
				throw new Error(`a2ui_render: unknown component(s) ${unknown.map((component) => `"${component}"`).join(", ")} — nothing would render. Call a2ui_catalog for the list of valid components.`);
			}
			return {
				status: "presented",
				hint: "Card rendered in the chat. The user's interaction arrives as the next user message (button label + chosen values in plain language). End your turn now if you are waiting for it."
			};
		}
	}));
}
