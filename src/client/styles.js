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
.dsha2ui-card>.dsha2ui-btn:last-child{margin-top:auto}
.dsha2ui-card>.dsha2ui-row:last-child:has(>.dsha2ui-btn){margin-top:auto}
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

.dsha2ui-tablefig{margin:0;display:flex;flex-direction:column;gap:4px;min-width:0;max-width:100%}
.dsha2ui-tablewrap{max-width:100%;overflow-x:auto;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.2));border-radius:10px}
.dsha2ui-table{border-collapse:collapse;width:100%;font-size:13.5px}
.dsha2ui-table th{text-align:left;font-weight:600;color:var(--dsw-alias-label-secondary,#555);background:rgba(128,128,128,.07);padding:8px 12px;white-space:nowrap}
.dsha2ui-table td{padding:8px 12px;color:var(--dsw-alias-label-primary,inherit);border-top:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.15))}
.dsha2ui-table tbody tr:hover{background:rgba(128,128,128,.05)}
.dsha2ui-stat{display:flex;flex-direction:column;gap:3px;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.2));border-radius:10px;padding:12px 14px;min-width:0}
.dsha2ui-stat-label{font-size:12px;color:var(--dsw-alias-label-tertiary,#8a8a8a)}
.dsha2ui-stat-value{font-size:22px;font-weight:700;line-height:1.2;color:var(--dsw-alias-label-primary,inherit);font-variant-numeric:tabular-nums}
.dsha2ui-stat-unit{font-size:12px;font-weight:500;margin-left:3px;color:var(--dsw-alias-label-secondary,#666)}
.dsha2ui-stat-foot{display:flex;gap:8px;align-items:center;min-height:16px}
.dsha2ui-stat-trend{font-size:12px;font-weight:600}
.dsha2ui-steps{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
.dsha2ui-step{display:flex;gap:10px;position:relative;padding-bottom:14px}
.dsha2ui-step:last-child{padding-bottom:0}
.dsha2ui-step:not(:last-child):before{content:"";position:absolute;left:11px;top:24px;bottom:2px;width:2px;background:var(--dsw-alias-border-l2,rgba(128,128,128,.25))}
.dsha2ui-step[data-status="done"]:not(:last-child):before{background:#3c8618}
.dsha2ui-step-dot{flex:none;width:22px;height:22px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;border:1.5px solid var(--dsw-alias-border-l1,rgba(128,128,128,.4));color:var(--dsw-alias-label-secondary,#666);background:var(--dsw-alias-bg-base,transparent);z-index:1}
.dsha2ui-step[data-status="done"] .dsha2ui-step-dot{background:#3c8618;border-color:#3c8618;color:#fff}
.dsha2ui-step[data-status="current"] .dsha2ui-step-dot{border-color:#1668dc;color:#1668dc;box-shadow:0 0 0 3px rgba(22,104,220,.15)}
.dsha2ui-step-body{display:flex;flex-direction:column;gap:2px;padding-top:1px;min-width:0}
.dsha2ui-step-title{font-size:14px;font-weight:600;color:var(--dsw-alias-label-primary,inherit)}
.dsha2ui-step[data-status="pending"] .dsha2ui-step-title{color:var(--dsw-alias-label-tertiary,#8a8a8a);font-weight:500}
.dsha2ui-step-desc{font-size:13px;color:var(--dsw-alias-label-secondary,#666);line-height:1.5}
.dsha2ui-rate{display:flex;align-items:center;gap:2px}
.dsha2ui-rate-star{appearance:none;border:none;background:transparent;font-size:22px;line-height:1;cursor:pointer;padding:0 2px;color:var(--dsw-alias-border-l1,rgba(128,128,128,.35));transition:color .1s,transform .1s}
.dsha2ui-rate-star[data-on]{color:#f5a623}
.dsha2ui-rate-star:hover:not(:disabled){transform:scale(1.15)}
.dsha2ui-rate-star:disabled{cursor:default}
.dsha2ui-rate[data-disabled]{opacity:.85}
.dsha2ui-rate-num{margin-left:6px;font-size:13px;color:var(--dsw-alias-label-secondary,#666);font-variant-numeric:tabular-nums}

.dsha2ui-slider{display:flex;align-items:center;gap:12px}
.dsha2ui-slider input[type="range"]{flex:1;accent-color:#1668dc;height:22px;cursor:pointer}
.dsha2ui-slider input[type="range"]:disabled{cursor:default;opacity:.6}
.dsha2ui-slider-value{flex:none;min-width:52px;text-align:right;font-size:13.5px;font-weight:600;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary,inherit)}
.dsha2ui-when{display:flex;flex-direction:column;gap:8px}
.dsha2ui-tabs{display:flex;flex-direction:column;gap:10px;min-width:0}
.dsha2ui-tabs-bar{display:flex;gap:4px;border-bottom:1.5px solid var(--dsw-alias-border-l2,rgba(128,128,128,.2));overflow-x:auto}
.dsha2ui-tab{appearance:none;border:none;background:transparent;padding:6px 14px;font-size:13.5px;color:var(--dsw-alias-label-secondary,#666);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1.5px;white-space:nowrap;font-family:inherit}
.dsha2ui-tab[data-active]{color:#1668dc;border-bottom-color:#1668dc;font-weight:600}
.dsha2ui-tab:hover:not([data-active]){color:var(--dsw-alias-label-primary,inherit)}
.dsha2ui-tabs-pane{display:flex;flex-direction:column;gap:8px;min-width:0}
.dsha2ui-code{border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.28));border-radius:10px;overflow:hidden;font-size:13px;min-width:0}
.dsha2ui-code-bar{display:flex;justify-content:space-between;align-items:center;padding:6px 12px;border-bottom:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.18));font-size:11.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--dsw-alias-label-tertiary,#8a8a8a);background:rgba(128,128,128,.06)}
.dsha2ui-code-copy{appearance:none;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.25));background:transparent;border-radius:5px;padding:1px 8px;font-size:11px;cursor:pointer;color:var(--dsw-alias-label-secondary,#666);font-family:inherit;text-transform:none;letter-spacing:0}
.dsha2ui-code-copy:hover{color:#1668dc;border-color:#1668dc}
.dsha2ui-code-body{display:flex;overflow-x:auto}
.dsha2ui-code-lines{margin:0;padding:10px 0 12px 12px;text-align:right;color:var(--dsw-alias-label-caption,rgba(128,128,128,.5));user-select:none;font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:12.5px;line-height:1.6}
.dsha2ui-code-src{margin:0;padding:10px 14px 12px;flex:1;font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:12.5px;line-height:1.6;color:var(--dsw-alias-label-primary,inherit)}
.dsha2ui-tok-kw{color:#9333ea;font-weight:600}
.dsha2ui-tok-str{color:#3c8618}
.dsha2ui-tok-cmt{color:var(--dsw-alias-label-tertiary,#8a8a8a);font-style:italic}
.dsha2ui-tok-num{color:#d46b08}
.dsha2ui-progress{display:flex;flex-direction:column;gap:5px;min-width:0}
.dsha2ui-progress-head{display:flex;justify-content:space-between;align-items:baseline}
.dsha2ui-progress-num{font-size:12.5px;font-weight:600;color:var(--dsw-alias-label-secondary,#666);font-variant-numeric:tabular-nums}
.dsha2ui-progress-track{height:8px;border-radius:5px;background:var(--dsw-alias-border-l2,rgba(128,128,128,.18));overflow:hidden}
.dsha2ui-progress-track span{display:block;height:100%;border-radius:5px;background:#1668dc;transition:width .4s ease}
.dsha2ui-timeline{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
.dsha2ui-timeline-item{display:flex;gap:12px;position:relative;padding-bottom:16px}
.dsha2ui-timeline-item:last-child{padding-bottom:0}
.dsha2ui-timeline-item:not(:last-child):before{content:"";position:absolute;left:5px;top:16px;bottom:0;width:2px;background:var(--dsw-alias-border-l2,rgba(128,128,128,.22))}
.dsha2ui-timeline-dot{flex:none;width:12px;height:12px;border-radius:999px;border:2.5px solid #1668dc;background:var(--dsw-alias-bg-base,#fff);margin-top:4px;z-index:1}
.dsha2ui-timeline-body{display:flex;flex-direction:column;gap:1px;min-width:0}
.dsha2ui-timeline-time{font-size:11.5px;color:var(--dsw-alias-label-tertiary,#8a8a8a);font-variant-numeric:tabular-nums}
.dsha2ui-icon{display:inline-block;vertical-align:-.2em}
.dsha2ui-audio{display:flex;flex-direction:column;gap:6px;min-width:0}
.dsha2ui-flashcard{appearance:none;border:1.5px solid var(--dsw-alias-border-l1,rgba(128,128,128,.3));background:var(--dsw-alias-bg-base,transparent);border-radius:14px;padding:26px 20px;min-height:110px;display:flex;flex-direction:column;gap:8px;align-items:center;justify-content:center;cursor:pointer;font-family:inherit;transition:border-color .15s,transform .15s;width:100%}
.dsha2ui-flashcard:hover{border-color:#1668dc}
.dsha2ui-flashcard:active{transform:scale(.98)}
.dsha2ui-flashcard[data-flipped]{border-color:#3c8618;background:rgba(60,134,24,.05)}
.dsha2ui-flashcard-tag{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary,#8a8a8a)}
.dsha2ui-flashcard-text{font-size:19px;font-weight:650;color:var(--dsw-alias-label-primary,inherit);text-align:center;line-height:1.5}
.dsha2ui-countdown{display:flex;flex-direction:column;gap:2px;align-items:center;padding:10px}
.dsha2ui-countdown-num{font-size:26px;font-weight:700;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-primary,inherit)}
.dsha2ui-countdown[data-done] .dsha2ui-countdown-num{color:#d4380d}
.dsha2ui-anim-graph{width:100%;height:100%;max-height:340px}

.dsha2ui-fig-tools{position:absolute;top:4px;right:4px;z-index:6;display:flex;gap:4px}
.dsha2ui-fig-tools .dsha2ui-fig-expand{position:static}
.dsha2ui-fig[data-fs] .dsha2ui-fig-tools{top:14px;right:14px}
.dsha2ui-upload{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.dsha2ui-upload-item{position:relative;width:64px;height:64px;border-radius:10px;overflow:hidden;border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.3))}
.dsha2ui-upload-item img{width:100%;height:100%;object-fit:cover;display:block}
.dsha2ui-upload-x{position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:999px;border:none;background:rgba(0,0,0,.55);color:#fff;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}
.dsha2ui-upload-add{width:64px;height:64px;border-radius:10px;border:1.5px dashed var(--dsw-alias-border-l1,rgba(128,128,128,.4));background:transparent;color:var(--dsw-alias-label-tertiary,#8a8a8a);cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-size:18px;line-height:1;font-family:inherit}
.dsha2ui-upload-add span{font-size:10px}
.dsha2ui-upload-add:hover{border-color:#1668dc;color:#1668dc}
.dsha2ui-suggest{display:flex;gap:8px;flex-wrap:wrap}
.dsha2ui-suggest-chip{appearance:none;border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.32));background:transparent;border-radius:999px;padding:5px 14px;font-size:13px;color:#1668dc;cursor:pointer;font-family:inherit;transition:background .1s,border-color .1s}
.dsha2ui-suggest-chip:hover:not(:disabled){background:rgba(22,104,220,.08);border-color:#1668dc}
.dsha2ui-suggest-chip:disabled{opacity:.5;cursor:default}
.dsha2ui-refill{appearance:none;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.25));background:transparent;border-radius:6px;padding:1px 10px;font-size:11.5px;cursor:pointer;color:var(--dsw-alias-label-secondary,#666);font-family:inherit;margin-left:auto}
.dsha2ui-refill:hover{color:#1668dc;border-color:#1668dc}
.dsha2ui-md{display:flex;flex-direction:column;gap:8px;min-width:0;font-size:14px;line-height:1.75}
.dsha2ui-md-p{margin:0;color:var(--dsw-alias-label-primary,inherit)}
.dsha2ui-md-h1{font-size:18px;font-weight:700;margin:6px 0 0}
.dsha2ui-md-h2{font-size:16px;font-weight:700;margin:4px 0 0}
.dsha2ui-md-h3,.dsha2ui-md-h4{font-size:14.5px;font-weight:650;margin:2px 0 0}
.dsha2ui-md-list{margin:0;padding-left:22px;display:flex;flex-direction:column;gap:3px}
.dsha2ui-md-quote{margin:0;border-left:3px solid var(--dsw-alias-border-l1,rgba(128,128,128,.35));padding:2px 12px;color:var(--dsw-alias-label-secondary,#666)}
.dsha2ui-md-pre{margin:0;background:rgba(128,128,128,.09);border-radius:8px;padding:10px 12px;overflow-x:auto;font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:12.5px;line-height:1.6}
.dsha2ui-md a{color:#1668dc}
.dsha2ui-table-bar{display:flex;justify-content:space-between;align-items:center;gap:8px;min-height:24px}
.dsha2ui-table-filter{border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.25));border-radius:6px;padding:2px 10px;font-size:12.5px;background:transparent;color:var(--dsw-alias-label-primary,inherit);outline:none;width:150px;font-family:inherit}
.dsha2ui-table-filter:focus{border-color:#1668dc}
.dsha2ui-table-tools{display:flex;gap:6px}
.dsha2ui-table-tools button,.dsha2ui-table-pager button{appearance:none;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.25));background:transparent;border-radius:5px;padding:1px 9px;font-size:11.5px;cursor:pointer;color:var(--dsw-alias-label-secondary,#666);font-family:inherit}
.dsha2ui-table-tools button:hover,.dsha2ui-table-pager button:hover:not(:disabled){color:#1668dc;border-color:#1668dc}
.dsha2ui-table-pager button:disabled{opacity:.4;cursor:default}
.dsha2ui-table th[data-sortable]{cursor:pointer;user-select:none}
.dsha2ui-table th[data-sortable]:hover{color:#1668dc}
.dsha2ui-table-arrow{font-size:9px;margin-left:4px;color:#1668dc}
.dsha2ui-table-foot{display:flex;justify-content:space-between;align-items:center;min-height:18px}
.dsha2ui-table-pager{display:flex;gap:8px;align-items:center;font-size:12px;color:var(--dsw-alias-label-secondary,#666);font-variant-numeric:tabular-nums}
.dsha2ui-wizard{display:flex;flex-direction:column;gap:14px;min-width:0}
.dsha2ui-wizard-nav{display:flex;gap:8px;justify-content:flex-end}
.dsha2ui-calendar{border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.2));border-radius:10px;padding:12px;width:100%;box-sizing:border-box}
.dsha2ui-calendar-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-weight:600;font-size:13.5px}
.dsha2ui-calendar-head button{appearance:none;border:none;background:transparent;cursor:pointer;font-size:14px;color:var(--dsw-alias-label-secondary,#666);padding:2px 8px}
.dsha2ui-calendar-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center}
.dsha2ui-calendar-grid .wd{font-size:11px;color:var(--dsw-alias-label-tertiary,#8a8a8a);padding:2px 0}
.dsha2ui-calendar-day{appearance:none;border:none;background:transparent;border-radius:7px;padding:7px 0;font-size:13px;cursor:pointer;color:var(--dsw-alias-label-primary,inherit);font-variant-numeric:tabular-nums;font-family:inherit}
.dsha2ui-calendar-day:hover:not(:disabled){background:rgba(22,104,220,.1)}
.dsha2ui-calendar-day[data-selected]{background:#1668dc;color:#fff;font-weight:600}
.dsha2ui-calendar-day[data-other]{color:var(--dsw-alias-label-caption,rgba(128,128,128,.4))}
.dsha2ui-calendar-day:disabled{opacity:.35;cursor:default}
.dsha2ui-ranklist{display:flex;flex-direction:column;gap:6px}
.dsha2ui-rank-item{display:flex;align-items:center;gap:10px;border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.28));border-radius:9px;padding:7px 12px}
.dsha2ui-rank-no{flex:none;width:20px;height:20px;border-radius:999px;background:rgba(22,104,220,.12);color:#1668dc;font-size:11.5px;font-weight:700;display:flex;align-items:center;justify-content:center}
.dsha2ui-rank-label{flex:1;font-size:13.5px}
.dsha2ui-rank-btns{display:flex;gap:4px}
.dsha2ui-rank-btns button{appearance:none;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.25));background:transparent;border-radius:5px;width:24px;height:22px;cursor:pointer;color:var(--dsw-alias-label-secondary,#666);font-size:11px;padding:0}
.dsha2ui-rank-btns button:hover:not(:disabled){color:#1668dc;border-color:#1668dc}
.dsha2ui-rank-btns button:disabled{opacity:.35;cursor:default}
.dsha2ui-etable input{border:none;background:transparent;font:inherit;color:inherit;width:100%;outline:none;padding:0}
.dsha2ui-etable td{padding:4px 12px}
.dsha2ui-etable td:focus-within{background:rgba(22,104,220,.07)}
.dsha2ui-imgcmp{position:relative;max-width:100%;overflow:hidden;border-radius:10px;user-select:none}
.dsha2ui-imgcmp img{display:block;max-width:100%;pointer-events:none}
.dsha2ui-imgcmp .after{position:absolute;inset:0;overflow:hidden}
.dsha2ui-imgcmp .after img{height:100%}
.dsha2ui-imgcmp-bar{position:absolute;top:0;bottom:0;width:3px;background:#fff;box-shadow:0 0 6px rgba(0,0,0,.4);cursor:ew-resize}
.dsha2ui-imgcmp-bar:before{content:"⇔";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;color:#333;border-radius:999px;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:13px}
[data-invalid]{outline:1.5px solid #d4380d;outline-offset:2px;border-radius:10px}
.dsha2ui-rank-grip{cursor:grab;color:var(--dsw-alias-label-tertiary,#999);font-size:12px;user-select:none}
.dsha2ui-rank-item[data-dragover]{outline:1.5px dashed var(--dsw-alias-primary,#1668dc);outline-offset:-1.5px}
.dsha2ui-calendar-day[data-inrange]{background:var(--dsw-alias-primary-bg,rgba(22,104,220,.12))}
.dsha2ui-calendar-hint{font-size:11px;color:var(--dsw-alias-label-tertiary,#999);margin-left:6px;font-weight:400}
.dsha2ui-select-search{margin:6px;padding:6px 10px;border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.35));border-radius:8px;background:transparent;color:inherit;font-size:13px;width:calc(100% - 12px);box-sizing:border-box}
.dsha2ui-select-search:focus{outline:none;border-color:var(--dsw-alias-primary,#1668dc)}
.dsha2ui-sign{display:flex;flex-direction:column;gap:6px}
.dsha2ui-sign canvas{border:1.5px dashed var(--dsw-alias-border-l1,rgba(128,128,128,.4));border-radius:10px;background:#fff;cursor:crosshair;touch-action:none;max-width:100%}
.dsha2ui-sign-tools{display:flex;gap:8px}

.dsha2ui-copy-mini{appearance:none;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.25));background:var(--dsw-alias-bg-base,rgba(255,255,255,.85));border-radius:5px;padding:1px 8px;font-size:11px;cursor:pointer;color:var(--dsw-alias-label-secondary,#666);font-family:inherit;opacity:0;transition:opacity .12s}
.dsha2ui-copy-mini:hover{color:#1668dc;border-color:#1668dc}
.dsha2ui-math-wrap{position:relative}
.dsha2ui-math-wrap:hover .dsha2ui-copy-mini{opacity:1}
.dsha2ui-math-wrap .dsha2ui-copy-mini{position:absolute;top:2px;right:2px}
.dsha2ui-md-wrap{position:relative}
.dsha2ui-md-wrap:hover .dsha2ui-md-copy{opacity:1}
.dsha2ui-md-copy{position:absolute;top:0;right:0;z-index:2}
.dsha2ui-stat{cursor:copy}
.dsha2ui-stat-copied{margin-left:8px;font-size:10.5px;color:#3c8618}

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
