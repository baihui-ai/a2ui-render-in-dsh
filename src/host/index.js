import { defineTool } from "@deepseek-ai/dsh-tools";

export const name = "a2ui";
export const inject = ["tools"];

// Skill-style split: a2ui_render carries only a slim always-visible summary;
// the full authoring guide loads on demand through a2ui_catalog, so sessions
// that never draw a card never pay for the catalog.

const KNOWN_COMPONENTS = new Set([
	"Column", "Row", "Grid", "Card", "List", "Divider",
	"Text", "Image", "Tag", "Math", "Mermaid", "Chart", "Video", "Anim",
	"Button", "MultipleChoice", "Select", "CheckBox", "TextField"
]);

const CATALOG_DOC = `# a2ui_render authoring guide

When to render: PROACTIVELY, whenever a card fits. (a) Asking the user ANYTHING — questions, choices, confirmations, or details to fill in — must be a form card, not prose: each question = one field; options -> MultipleChoice or Select; free-form answers -> TextField (multiline: true for long answers); when you offer suggested options, ALSO add a TextField so the user can answer something else; several questions go in ONE card with ONE submit Button whose label names the action (e.g. "提交", "确认建档"). (b) Visualization: any math notation -> Math; comparable numbers/data -> Chart; processes/structures/relationships -> Mermaid; algorithm walkthroughs -> Anim; multiple items or chart dashboards -> ONE call with a Grid — never several calls. Plain text remains right only for narrative explanation with nothing to ask, collect, or visualize. One call = one card; display-only cards (no Button) are fine.

## Components ("components" is an A2UI v0.9 adjacency list; MUST include a node with id "root"; only these names render)
Layout:
- Column / Row {children, gap?}
- Grid {children, columns?, gap?, minWidth?} — side-by-side cards & 2x2 dashboards; columns 2–4, or omit for auto-fit at minWidth px (default 180)
- Card {children, title?}
- List {children, direction?: "vertical"|"horizontal"}
- Divider {}
Content (Chart/Mermaid/Image have built-in fullscreen zoom — do not oversize them):
- Text {text, variant?: "h1"|"h2"|"h3"|"body"|"caption"|"strong"}
- Image {url, alt?, width?, height?} — GIF ok
- Tag {text, color?: "blue"|"green"|"red"|"orange"|"gray"}
- Math {tex, block?} — KaTeX LaTeX, e.g. {"tex": "\\\\int_0^1 x^2\\\\,dx = \\\\frac{1}{3}", "block": true}. ALWAYS use Math for mathematical notation — matrices and vectors included: NEVER write raw nested arrays like [[2,1],[0,3]] inside Text; render them as a formula instead, e.g. {"tex": "\\\\begin{pmatrix}2&1\\\\\\\\0&3\\\\end{pmatrix}\\\\times\\\\begin{pmatrix}1&4\\\\\\\\5&2\\\\end{pmatrix}=\\\\begin{pmatrix}7&10\\\\\\\\15&6\\\\end{pmatrix}", "block": true} (row separator is \\\\\\\\). When animating matrix math with Anim, put the overall equation in a Math block above it.
- Mermaid {code, caption?} — flowchart ("graph TD; A[开始]-->B{判断}"), mindmap ("mindmap\\n  root((主题))\\n    分支"), sequenceDiagram, gantt, pie, stateDiagram
- Chart {option, height?, functions?, xMin?, xMax?, samples?, yClip?} — ECharts. Data mode: standard ECharts option verbatim (line/bar/pie/scatter/radar/heatmap…). Function mode: functions=[{"expr":"tan(x)","name"?:"y=tan(x)"}] with xMin/xMax (default -10..10) and yClip (default 10) — ~400 points sampled, asymptotes break automatically; NEVER hand-enumerate data points for a math curve. Expressions: + - * / ^ %, sin cos tan cot sec csc asin acos atan sinh cosh tanh sqrt cbrt abs exp ln log2 log10 floor ceil round sign min max pow atan2, constants pi/e, variable x.
- Video {url, poster?, loop?, muted?, autoplay?} — mp4/webm
- Anim {frames, interval?, height?, autoplay?, labels?} — step-by-step ALGORITHM animation; auto-plays through ONCE, then the user replays/steps via the built-in controls (do not loop). The form is auto-detected from the frame shape. Simulate the algorithm yourself, one frame per step, each with a clear "note" caption. Two forms:
  (1) Array/bars (sorting, searching, heaps; 8–12 small numbers): frames=[{"data":[5,3,8,1],"highlight":[0,1],"sorted":[3],"note":"比较 5 和 3"},…] — data is the FULL array state, highlight = indices being operated on (orange), sorted = finalized (green).
  (2) Grid/matrix (matrix ops, DP tables, 2D grids): frames=[{"grids":[{"title":"A","data":[[1,2],[3,4]],"highlight":[[0,0],[0,1]]},{"title":"B","data":[[5,7],[6,8]],"highlight":[[0,0],[1,0]]},{"title":"C=A×B","data":[[17,null],[null,null]],"accent":[[0,0]]}],"note":"C[0][0]=1×5+2×6=17"},…] — grids render side by side; highlight = cells being read (orange), accent = cells being written (green), null cells render empty. A single grid may use {"grid": [[...]], "highlight": [[r,c]], "accent": [[r,c]]} directly.
Interaction:
- Button {label, variant?: "primary"|"default"|"danger", submit?, action: {event: {name, context?}}}
- MultipleChoice {options: [{label, value, description?, disabled?}], bind, maxAllowedSelections?, disabled?} — flat option list; stores an array of chosen values at bind; maxAllowedSelections 1 = single-select
- Select {options: [{label, value, description?, disabled?}], bind, label?, placeholder?, multiple?, maxAllowedSelections?, disabled?} — dropdown select, better for long option lists or compact forms; single-select stores the chosen value at bind, multiple: true stores an array (maxAllowedSelections caps it)
- CheckBox {label, bind, disabled?} — boolean at bind
- TextField {label?, placeholder?, multiline?, bind, disabled?} — string at bind
Input states: preselect by seeding dataModel at the bind path (e.g. dataModel={"city":"beijing"} or {"skills":["go","sql"]}); disable a whole control with disabled: true, or one option via disabled on that option.

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
