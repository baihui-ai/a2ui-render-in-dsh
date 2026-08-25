# Scenario × Component Map

English | [中文](SCENARIOS.zh.md)

Research conclusions on "which chat scenario deserves which UI", across learning / daily life / work / entertainment. Reference catalogs: the A2UI standard catalog (v0.9/v1.0), Microsoft Adaptive Cards, Slack Block Kit, and Messenger/LINE/Telegram message templates. The machine-readable version of these rules ships inside the `a2ui_catalog` tool's scenario cheat sheet.

## Learning

| Scenario | Recipe |
|---|---|
| Quizzes / tests | MultipleChoice form (options may be `$...$` formulas), lock-on-submit grading |
| Intake / surveys | Multi-field forms (TextField / Select / Rate) |
| Formulas / derivations | Math; inline math via `$...$` |
| Function graphs | Chart functions (expression sampling) |
| Parameter exploration | Slider + Chart `params` (drag μ, σ, watch the curve morph) |
| Algorithm walkthroughs | Anim: sorting=bars, matrix/DP=grid, graph/tree=graph |
| Concept maps | Mermaid mindmap |
| Study plans / progress | Steps; practice trends via Stat + Chart |
| Vocabulary / recall | Flashcard |
| Code teaching | CodeBlock |

## Daily life

| Scenario | Recipe |
|---|---|
| Scheduling | TextField kind:"date"/"time" |
| Ordering / shopping | Grid product cards + query buttons |
| Recipes / how-tos | Steps; branching flows via Mermaid |
| Itineraries | Steps per day + Tabs + Table |
| Budgets / calculators | Slider + Calc + Stat (loans/BMI/conversions, live) |
| Health trends | Chart + Stat |
| Ratings | Rate (+When for follow-up reasons) |
| Household votes | MultipleChoice |
| Countdowns | Countdown |

## Work

| Scenario | Recipe |
|---|---|
| Meeting-time collection | Form (date/time + slot multi-select) |
| Option comparison | Table + Grid cards |
| Weekly data reports | Grid + Stat row + Chart |
| Period switching | Tabs or Table dictionary binding |
| Project progress | Steps + Progress |
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

## Reactive interactions

Bindings are reactive: inputs write the data model and every `{"path"}` binding updates instantly.

- **Choice → follow-up**: MultipleChoice + `When includes:"other"` revealing a TextField
- **Slider → curve**: Slider + Chart `params` injecting expression constants, live resampling
- **Input → computation**: Calc derived values, displayed live by bound Stat/Chart
- **Switcher → dataset**: Tabs panes, or Table `rows: {source, pick}` dictionary binding

## Trigger principle

Asking the user anything → always a form card; math notation → always Math / `$...$`; comparable data → charts/tables/stat tiles; linear procedures → Steps; narrative explanation → plain text.
