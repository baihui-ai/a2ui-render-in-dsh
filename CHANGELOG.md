# Changelog

## 0.2.0 (2026-08-31)

**Adaptive triggering, purpose-anchored.** The render contract now judges every reply against UI's four purposes — act 操作 / browse 浏览 / understand 理解 / feedback 反馈 — verified with keyword-free prompts (grounded in HCI research: Norman's gulfs, the keyhole effect, external cognition). Data-viewing asks always chart; multi-item recommendations render item cards; multi-step work opens a Progress card advanced via `a2ui_update`. Cards always pair with a prose takeaway. Resident tool description trimmed ~24% while adding all of the above.

**Session navigator (会话导航).** A right-edge drawer for every session with form cards: a Tasks tab grouping to-submit forms (per-field fill counts like 已填 2/6, filled-content previews, full timestamps, an undoable 无需填写 dismiss) and submitted forms; an All tab listing every user message in full (wrapped, dated) with click-to-locate (auto "load earlier" retries) and forms attached under their triggering message; live 5s refresh while open.

**State that outlives the browser.** Drafts auto-save while typing and survive reloads; submitted-state survives even a cleared cache, reconstructed from the session transcript (errored tool calls correctly excluded — including ones blocked by skill hooks).

**Forms.** `required: true` on any input blocks submission and highlights what's missing; Calendar gains `range: true` (start + end); Select grows a search box on long lists; RankList supports drag & drop; `a2ui_update` dataModel changes re-sync bound inputs in place; Upload compresses photos client-side (≤1568px JPEG) before they enter the prompt.

**Rendering.** Code in quiz stems renders as formatted blocks (catalog teaches Text+CodeBlock composition; Text auto-upgrades fenced content; inline backticks render as code chips everywhere); Map normalizes short province names (广东 → 广东省 — mismatches used to render every tooltip as "—"); Chart updates incrementally instead of re-initializing per prop change; submission footers render `$...$` as formulas; EditableTable submissions carry cell contents; Signature strokes align on narrow screens (2x backing store); Markdown's escaped-`\n` tolerance no longer touches fenced code.

**Housekeeping.** localStorage records GC'd (30-day TTL, 300-entry cap); update replays dedupe; host errors on `children` referencing undefined ids; the jsdom interaction suite (~70 assertions) now lives in the repo (`npm test`); scenario-first bilingual demo docs with freshly recorded GIFs.

## 0.1.2 (2026-08-26)

- Trigger contract rewritten as a two-level semantic judgment (utility, then form), verified across keyword-free scenario classes; catalog compressed.
- 33 → 44 components: reactive core (Slider/When/Tabs/Calc, Chart `params`, Table dictionary binding), display set (Table/Stat/Steps/Progress/Timeline/CodeBlock/Icon/Audio/Flashcard/Countdown), Anim graph form, inline `$...$` math everywhere; then Markdown, Upload, Suggestions, Wizard, Calendar, RankList, Signature, EditableTable, Map, ImageCompare.
- `a2ui_update` tool: in-place card updates by surfaceId, persisted and replayed.
- Streaming render: tolerant JSON repair mounts complete components while the model is still writing.
- Quick copy everywhere: Stat click-copy, Table copy/CSV, CodeBlock copy, Math LaTeX copy, Chart PNG download, Markdown source copy.
- Fixes: Calc precision chains, chart legend/grid collisions, object-shaped table tolerance, Grid card button alignment, animation played-once latch.

## 0.1.1 (2026-08-24)

- **Critical install fix**: 0.1.0 crashed every tool call when installed from the registry (`Cannot read properties of undefined (reading 'prepare')`) — the `@deepseek-ai/dsh-tools` dependency chain polluted the profile's top-level `node_modules` and broke module identity. The helper is now bundled; `dependencies` is empty.

## 0.1.0 (2026-08-24)

Initial release: `a2ui_render` + `a2ui_catalog` (skill-style on-demand catalog), 18-component catalog on `@ant-design/x-card`, adaptive text-vs-card contract, plain-language submissions over dsh's native message path, submit locking with persistence, ECharts/Mermaid/KaTeX bundled self-contained.
