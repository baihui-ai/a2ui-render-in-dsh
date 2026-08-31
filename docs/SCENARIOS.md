# Scenario × Component Map

English | [中文](SCENARIOS.zh.md)

Research conclusions on "which chat scenario deserves which UI", across learning / daily life / work / entertainment. Reference catalogs: the A2UI standard catalog (v0.9/v1.0), Microsoft Adaptive Cards, Slack Block Kit, and Messenger/LINE/Telegram message templates. The machine-readable version of these rules ships inside the `a2ui_catalog` tool's scenario cheat sheet.

## Learning

| Scenario | Recipe |
|---|---|
| Quizzes / tests | MultipleChoice form (options may be `$...$` formulas), lock-on-submit grading |
| Intake / surveys | Multi-field forms (TextField / Select / Rate, `required` on must-fills); 5+ questions -> Wizard steps |
| Formulas / derivations | Math; inline math via `$...$` |
| Function graphs | Chart functions (expression sampling) |
| Parameter exploration | Slider + Chart `params` (drag μ, σ, watch the curve morph) |
| Algorithm walkthroughs | Anim: sorting=bars, matrix/DP=grid, graph/tree=graph |
| Concept maps | Mermaid mindmap |
| Study plans / progress | Steps; practice trends via Stat + Chart |
| Vocabulary / recall | Flashcard |
| Long-form study notes | Markdown (headings, lists, fenced code, `$...$`) |
| Reading-comprehension code questions | Text(stem) + CodeBlock(code) + TextField(answer) |
| Code teaching | CodeBlock |

## Daily life

| Scenario | Recipe |
|---|---|
| Scheduling / booking | Calendar (`range: true` for stays), TextField kind:"time" |
| Ordering / shopping | Grid product cards + query buttons |
| Recipes / how-tos | Steps; branching flows via Mermaid |
| Itineraries | Steps per day + Tabs + Table |
| Budgets / calculators | Slider + Calc + Stat (loans/BMI/conversions, live) |
| Health trends | Chart + Stat |
| Ratings | Rate (+When for follow-up reasons) |
| Priority sorting | RankList (drag or tap to reorder) |
| Photos / receipts to show the model | Upload (compressed client-side, arrives as real images) |
| Household votes | MultipleChoice |
| Countdowns | Countdown |
| Sign-offs | Signature (returns as an image) |

## Work

| Scenario | Recipe |
|---|---|
| Meeting-time collection | Form (date/time + slot multi-select) |
| Option comparison | Table + Grid cards |
| Weekly data reports | Grid + Stat row + Chart |
| Regional distribution | Map (China choropleth, short or full province names) |
| Editable grids (budgets, rosters) | EditableTable (cell edits ship in the submission) |
| Period switching | Tabs or Table dictionary binding |
| Project progress | Steps + Progress, advanced in place via `a2ui_update` |
| Retrospectives | Timeline |
| Flows / architecture / schedules | Mermaid (flowchart/sequence/gantt) |
| Approvals | Button submit:true |
| Code review snippets | CodeBlock |

## Entertainment

| Scenario | Recipe |
|---|---|
| Movie / game / restaurant picks | Grid cards + posters + query buttons |
| Ratings / reviews | Rate + short TextField |
| Polls / trivia | MultipleChoice |
| Fixtures / leaderboards | Table |
| Interactive fiction | Sequential single-choice cards |
| Music / podcasts | Audio |
| Clips | Video |
| Before/after comparisons | ImageCompare (drag divider) |
| Follow-up suggestions | Suggestions chips (tap to send) |

## Reactive interactions

Bindings are reactive: inputs write the data model and every `{"path"}` binding updates instantly.

- **Choice → follow-up**: MultipleChoice + `When includes:"other"` revealing a TextField
- **Slider → curve**: Slider + Chart `params` injecting expression constants, live resampling
- **Input → computation**: Calc derived values, displayed live by bound Stat/Chart
- **Switcher → dataset**: Tabs panes, or Table `rows: {source, pick}` dictionary binding

## Trigger principle: UI's four purposes

A card renders when it serves any of these better than prose — none of them requires UI keywords in the prompt:

- **Act** 操作 — the user must answer/choose/fill/adjust/confirm → form card
- **Browse** 浏览 — the user wants to see/scan data or items (statistics, rankings, distributions, trends, multi-item recommendations) → chart/table/map/Grid; uncertain data never cancels the card (best-known data, labeled period, caveats in prose)
- **Understand** 理解 — structure, notation or motion aids comprehension (math, code, flows, time-unfolding processes) → formula/code block/diagram/step animation
- **Feedback** 反馈 — multi-step work renders a Progress/Steps card first and advances it via `a2ui_update`

None of the four (opinions, narration, short answers, translations, chat) → prose. Cards always pair with 1–3 sentences of prose takeaway.

## Session navigator

Every session with form cards gets a right-edge drawer: a Tasks tab (to-submit / submitted groups with fill counts, previews, dismissals) and an All tab (every user message in full, click-to-locate). Drafts persist across reloads; submitted-state survives cache clears via transcript reconstruction.
