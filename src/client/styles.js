// Injected once per page; class names are globally prefixed. Colors ride the
// dsh web design tokens (--dsw-alias-*) with neutral fallbacks so the card
// follows the active theme.
export const CSS_TAG_ID = "dsh-a2ui/styles";

export const CSS = `
.dsha2ui-wrap{border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.28));border-radius:12px;margin:4px 0;background:var(--dsw-alias-bg-base,transparent)}
.dsha2ui-head{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.18));font-size:12px;color:var(--dsw-alias-label-tertiary,#8a8a8a);letter-spacing:.03em}
.dsha2ui-head-title{color:var(--dsw-alias-label-secondary,#666);font-weight:500}
.dsha2ui-body{padding:14px 16px}
.dsha2ui-foot{display:flex;align-items:center;gap:8px;padding:8px 12px;border-top:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.18));font-size:12px;color:var(--dsw-alias-label-tertiary,#8a8a8a)}
.dsha2ui-foot[data-kind="error"]{color:var(--dsw-alias-state-error-primary,#d4380d)}
.dsha2ui-skeleton{display:flex;align-items:center;gap:8px;padding:6px 4px;font-size:14px;color:var(--dsw-alias-label-tertiary,#8a8a8a)}

.dsha2ui-col{display:flex;flex-direction:column;min-width:0}
.dsha2ui-row{display:flex;flex-direction:row;align-items:center;flex-wrap:wrap;min-width:0}
.dsha2ui-grid{display:grid;min-width:0}
.dsha2ui-grid>.dsha2ui-card{height:100%;box-sizing:border-box}
.dsha2ui-card{border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.2));border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:8px;min-width:0}
.dsha2ui-card-title{font-size:14px;font-weight:600;color:var(--dsw-alias-label-primary,inherit)}
.dsha2ui-divider{border:none;border-top:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.2));margin:8px 0;width:100%}
.dsha2ui-img{max-width:100%;border-radius:8px;display:block}

.dsha2ui-text-h1{font-size:20px;font-weight:700;margin:0;color:var(--dsw-alias-label-primary,inherit)}
.dsha2ui-text-h2{font-size:17px;font-weight:650;margin:0;color:var(--dsw-alias-label-primary,inherit)}
.dsha2ui-text-h3{font-size:15px;font-weight:600;margin:0;color:var(--dsw-alias-label-primary,inherit)}
.dsha2ui-text-body{font-size:14px;margin:0;color:var(--dsw-alias-label-secondary,inherit);line-height:1.55}
.dsha2ui-text-strong{font-size:14px;font-weight:600;margin:0;color:var(--dsw-alias-label-primary,inherit)}
.dsha2ui-text-caption{font-size:12px;margin:0;color:var(--dsw-alias-label-tertiary,#8a8a8a)}

.dsha2ui-tag{display:inline-flex;align-items:center;border-radius:999px;padding:1px 10px;font-size:12px;line-height:18px;border:1px solid transparent}
.dsha2ui-tag[data-color="blue"]{color:#1668dc;background:rgba(22,104,220,.12);border-color:rgba(22,104,220,.25)}
.dsha2ui-tag[data-color="green"]{color:#3c8618;background:rgba(60,134,24,.12);border-color:rgba(60,134,24,.25)}
.dsha2ui-tag[data-color="red"]{color:#d4380d;background:rgba(212,56,13,.1);border-color:rgba(212,56,13,.25)}
.dsha2ui-tag[data-color="orange"]{color:#d46b08;background:rgba(212,107,8,.12);border-color:rgba(212,107,8,.25)}
.dsha2ui-tag[data-color="gray"]{color:var(--dsw-alias-label-secondary,#666);background:rgba(128,128,128,.12);border-color:rgba(128,128,128,.25)}

.dsha2ui-btn{appearance:none;border-radius:8px;padding:6px 16px;font-size:14px;line-height:20px;cursor:pointer;border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.3));background:var(--dsw-alias-bg-base,transparent);color:var(--dsw-alias-label-primary,inherit);transition:filter .1s,opacity .1s}
.dsha2ui-btn:hover{filter:brightness(1.08)}
.dsha2ui-btn:disabled{opacity:.5;cursor:not-allowed}
.dsha2ui-btn[data-variant="primary"]{background:#1668dc;border-color:#1668dc;color:#fff}
.dsha2ui-btn[data-variant="danger"]{background:transparent;border-color:#d4380d;color:#d4380d}

.dsha2ui-field{display:flex;flex-direction:column;gap:4px;min-width:0}
.dsha2ui-field-label{font-size:13px;color:var(--dsw-alias-label-secondary,#666)}
.dsha2ui-input{border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.3));border-radius:8px;padding:6px 10px;font-size:14px;background:transparent;color:var(--dsw-alias-label-primary,inherit);outline:none;font-family:inherit;resize:vertical}
.dsha2ui-input:focus{border-color:#1668dc}

.dsha2ui-select{position:relative;min-width:0}
.dsha2ui-select-trigger{appearance:none;display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.3));border-radius:8px;padding:6px 10px;font-size:14px;background:transparent;color:var(--dsw-alias-label-primary,inherit);cursor:pointer;text-align:left;font-family:inherit}
.dsha2ui-select[data-open] .dsha2ui-select-trigger{border-color:#1668dc}
.dsha2ui-select-trigger:disabled{opacity:.72;cursor:default}
.dsha2ui-select-value{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsha2ui-select-placeholder{color:var(--dsw-alias-label-tertiary,#8a8a8a);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dsha2ui-select-arrow{flex:none;font-size:11px;color:var(--dsw-alias-label-tertiary,#8a8a8a)}
.dsha2ui-select-panel{position:absolute;top:calc(100% + 4px);left:0;right:0;z-index:30;max-height:240px;overflow-y:auto;border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.3));border-radius:10px;background:var(--dsw-alias-bg-base,#fff);box-shadow:0 8px 24px rgba(0,0,0,.14);padding:4px}
.dsha2ui-select-option{display:flex;align-items:flex-start;gap:8px;border-radius:7px;padding:7px 9px;cursor:pointer;user-select:none}
.dsha2ui-select-option:hover{background:var(--dsw-alias-interactive-bg-hover-solid,rgba(128,128,128,.08))}
.dsha2ui-select-option[data-selected="true"]{background:rgba(22,104,220,.1)}
.dsha2ui-select-option[data-disabled]{cursor:default;opacity:.5}
.dsha2ui-select-option[data-disabled]:hover{background:transparent}
.dsha2ui-select-mark{flex:none;width:14px;color:#1668dc;font-size:12px;line-height:20px}
.dsha2ui-select-texts{display:flex;flex-direction:column;min-width:0}

.dsha2ui-check{display:flex;align-items:center;gap:8px;font-size:14px;color:var(--dsw-alias-label-primary,inherit);cursor:pointer;user-select:none}
.dsha2ui-check input{accent-color:#1668dc;width:15px;height:15px;margin:0;cursor:pointer}

.dsha2ui-choice{display:flex;flex-direction:column;gap:8px}
.dsha2ui-option{display:flex;align-items:flex-start;gap:10px;border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.28));border-radius:10px;padding:9px 12px;cursor:pointer;user-select:none;transition:border-color .1s,background .1s}
.dsha2ui-option:hover{background:var(--dsw-alias-interactive-bg-hover-solid,rgba(128,128,128,.06))}
.dsha2ui-option[data-disabled]{cursor:default;opacity:.72}
.dsha2ui-option[data-disabled]:hover{background:transparent}
.dsha2ui-check[data-disabled]{cursor:default;opacity:.72}
.dsha2ui-input:disabled{opacity:.72;cursor:default}
.dsha2ui-option[data-selected="true"]{border-color:#1668dc;background:rgba(22,104,220,.08)}
.dsha2ui-option-mark{flex:none;width:16px;height:16px;margin-top:2px;border-radius:4px;border:1.5px solid var(--dsw-alias-border-l1,rgba(128,128,128,.45));display:inline-flex;align-items:center;justify-content:center;font-size:11px;color:#fff}
.dsha2ui-option[data-single="true"] .dsha2ui-option-mark{border-radius:999px}
.dsha2ui-option[data-selected="true"] .dsha2ui-option-mark{background:#1668dc;border-color:#1668dc}
.dsha2ui-option-label{font-size:14px;color:var(--dsw-alias-label-primary,inherit);line-height:20px}
.dsha2ui-option-desc{font-size:12px;color:var(--dsw-alias-label-tertiary,#8a8a8a);line-height:17px;margin-top:1px}

.dsha2ui-viz-error{font-size:12px;color:var(--dsw-alias-state-error-primary,#d4380d);border:1px dashed var(--dsw-alias-border-l1,rgba(128,128,128,.3));border-radius:8px;padding:6px 10px}
.dsha2ui-fig{position:relative;margin:0;display:flex;flex-direction:column;gap:4px;align-items:stretch;min-width:0;max-width:100%;width:100%}
.dsha2ui-fig-body{width:100%;max-width:100%;min-width:0;display:flex;justify-content:center}
.dsha2ui-fig figcaption{text-align:center}
.dsha2ui-fig-expand{position:absolute;top:4px;right:4px;z-index:6;width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;border-radius:6px;border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.35));background:var(--dsw-alias-bg-base,rgba(255,255,255,.9));color:var(--dsw-alias-label-secondary,#666);cursor:pointer;font-size:13px;line-height:1;opacity:0;transition:opacity .12s}
.dsha2ui-fig:hover .dsha2ui-fig-expand,.dsha2ui-fig-expand:focus-visible,.dsha2ui-fig[data-fs] .dsha2ui-fig-expand{opacity:1}
.dsha2ui-fig[data-fs]{background:var(--dsw-alias-bg-base,#fff);justify-content:center;overflow:hidden}
.dsha2ui-fig[data-fs] .dsha2ui-fig-expand{top:14px;right:14px}
.dsha2ui-fig-overlay{position:fixed;inset:0;z-index:9999}
.dsha2ui-fig-fill{width:94vw;height:88vh}
.dsha2ui-fig-fill .dsha2ui-chart{width:100% !important;height:100% !important}
.dsha2ui-video{max-width:100%;border-radius:8px;display:block;background:#000}
.dsha2ui-anim{display:flex;flex-direction:column;gap:8px;width:100%;min-width:0}
.dsha2ui-anim-stage{display:flex;align-items:center;justify-content:center;padding:8px 0}
.dsha2ui-anim-progress{height:3px;border-radius:2px;background:var(--dsw-alias-border-l2,rgba(128,128,128,.18));overflow:hidden}
.dsha2ui-anim-progress span{display:block;height:100%;border-radius:2px;background:#1668dc;transition:width .3s ease}
.dsha2ui-anim-note{display:flex;align-items:center;gap:10px;min-height:20px;justify-content:center}
.dsha2ui-anim-note-text{font-size:14px;font-weight:500;color:var(--dsw-alias-label-primary,inherit)}
.dsha2ui-anim-controls{display:flex;gap:6px;justify-content:center;align-items:center;flex-wrap:wrap}
.dsha2ui-btn-mini{padding:2px 10px;font-size:12px;line-height:18px;border-radius:6px}
.dsha2ui-anim-legend{display:inline-flex;gap:10px;margin-left:10px}
.dsha2ui-anim-legend-item{display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--dsw-alias-label-tertiary,#8a8a8a)}
.dsha2ui-anim-legend-dot{width:8px;height:8px;border-radius:3px;display:inline-block}
.dsha2ui-anim-grids{display:flex;gap:20px;align-items:center;justify-content:center;flex-wrap:wrap}
.dsha2ui-anim-grid{display:flex;flex-direction:column;gap:6px;align-items:center}
.dsha2ui-anim-grid-title{font-size:13px;font-weight:600;color:var(--dsw-alias-label-secondary,#666)}
.dsha2ui-anim-grid-cells{display:grid;gap:5px}
.dsha2ui-anim-cell{display:flex;align-items:center;justify-content:center;aspect-ratio:1;min-width:34px;border:1.5px solid var(--dsw-alias-border-l1,rgba(128,128,128,.3));border-radius:9px;font-size:15px;font-weight:600;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary,inherit);background:transparent;transition:background .25s,border-color .25s,color .25s}
.dsha2ui-anim-cell[data-state="read"]{background:rgba(212,107,8,.14);border-color:#d46b08;color:#d46b08}
.dsha2ui-anim-cell[data-state="write"]{background:rgba(60,134,24,.14);border-color:#3c8618;color:#3c8618}
@media (prefers-reduced-motion:reduce){.dsha2ui-fig-expand{transition:none}}
.dsha2ui-chart{min-width:200px;max-width:100%}
.dsha2ui-mermaid{max-width:100%;overflow-x:auto}
.dsha2ui-mermaid svg{max-width:100%;height:auto}
.dsha2ui-fig[data-fs] .dsha2ui-mermaid{overflow:visible}
.dsha2ui-math{display:inline-block}
.dsha2ui-math-block{overflow-x:auto;padding:4px 0;text-align:center}

@keyframes dsha2ui-pulse{0%,100%{opacity:.45}50%{opacity:1}}
.dsha2ui-pulse{animation:dsha2ui-pulse 1.4s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){.dsha2ui-pulse{animation:none}}
`;

export function injectStyles() {
	if (typeof document === "undefined") return;
	if (document.querySelector(`style[data-plugin-css="${CSS_TAG_ID}"]`) !== null) return;
	const tag = document.createElement("style");
	tag.dataset.plugin = "dsh-a2ui";
	tag.dataset.pluginCss = CSS_TAG_ID;
	tag.textContent = CSS;
	document.head.appendChild(tag);
}
