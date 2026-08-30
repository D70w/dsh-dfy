export const WHALE_STYLE = `
[data-whale-pet-entry]{position:fixed;inset:0;z-index:2147483000;pointer-events:none;color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family)}
[data-whale-pet-stage]{position:fixed;pointer-events:none;transform-origin:bottom right;transform:translate3d(var(--whale-motion-x,0px),var(--whale-motion-y,0px),0) scale(var(--whale-scale,1))}
[data-whale-pet-hotspot],[data-whale-pet-menu],[data-whale-pet-summon]{pointer-events:auto}
[data-whale-debug-panel]{position:fixed;top:14px;left:14px;z-index:2;box-sizing:border-box;width:min(360px,calc(100vw - 28px));padding:12px;border:1px solid var(--dsw-alias-border-l2);border-radius:14px;background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);pointer-events:auto;box-shadow:0 10px 28px var(--dsw-alias-bg-mask-drop)}
[data-whale-debug-heading]{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:9px}
[data-whale-debug-heading] strong{font-size:14px}
[data-whale-debug-heading] span,[data-whale-debug-panel] small{color:var(--dsw-alias-label-secondary);font-size:10px}
[data-whale-debug-actions]{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
[data-whale-debug-section]{margin-top:10px;padding-top:10px;border-top:1px solid var(--dsw-alias-border-l2)}
[data-whale-debug-section-heading]{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px}
[data-whale-debug-section-heading] strong{font-size:12px}
[data-whale-debug-section-heading] span{color:var(--dsw-alias-label-secondary);font-size:10px}
[data-whale-debug-panel] button{min-height:31px;padding:5px 9px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:transparent;color:inherit;font:inherit;font-size:11px;cursor:pointer}
[data-whale-debug-panel] button:hover,[data-whale-debug-panel] button:focus-visible,[data-whale-debug-panel] button[data-active=true]{background:var(--dsw-alias-interactive-bg-hover);outline:2px solid var(--dsw-alias-border-l3);outline-offset:1px}
[data-whale-debug-panel] button[data-stop]{margin-left:auto}
[data-whale-pet-hotspot]{position:relative;width:350px;height:350px;border:0;padding:0;background:transparent;cursor:grab;touch-action:none;filter:drop-shadow(0 18px 16px var(--dsw-alias-bg-mask-drop));transform-origin:50% 92%;transition:transform .3s ease-out}
[data-whale-pet-hotspot]:active{cursor:grabbing}
[data-whale-pet-entry][data-whale-position-locked=true] [data-whale-pet-hotspot]{cursor:pointer}
[data-whale-pet-entry][data-whale-position-locked=true] [data-whale-pet-hotspot]:active{cursor:pointer}
[data-whale-pet-hotspot]:focus-visible{outline:2px solid var(--dsw-alias-border-l3);outline-offset:2px;border-radius:14px}
[data-whale-pet-stage][data-whale-autonomy-active=true]{will-change:transform}
[data-whale-pet-stage][data-whale-autonomy-active=true] [data-whale-pet-hotspot]{pointer-events:none;cursor:default}
[data-whale-pet-entry][data-whale-autonomy=cursor_visit][data-whale-autonomy-phase=result] [data-whale-pet-hotspot]{pointer-events:auto;cursor:pointer}
[data-whale-pet-entry][data-whale-autonomy=rice_caught][data-whale-autonomy-phase=attempt] [data-whale-pet-hotspot],[data-whale-pet-entry][data-whale-autonomy=rice_caught][data-whale-autonomy-phase=result] [data-whale-pet-hotspot]{pointer-events:auto;cursor:pointer}
[data-whale-pet-entry][data-whale-autonomy=nap][data-whale-autonomy-phase=attempt] [data-whale-pet-hotspot]{transform:rotate(-3deg) scaleY(.975)}
[data-whale-pet-entry][data-whale-autonomy=nap][data-whale-autonomy-phase=result] [data-whale-pet-hotspot]{pointer-events:auto;cursor:pointer;transform:rotate(-7deg) scaleY(.94)}
[data-whale-autonomy-prop=butterfly]{position:absolute;left:175px;top:175px;z-index:2;width:75px;height:63px;pointer-events:none;opacity:1;transform-origin:center;will-change:transform,opacity}
[data-whale-autonomy-prop=butterfly] svg{display:block;width:75px;height:63px;overflow:visible}
[data-whale-autonomy-prop=butterfly] svg{animation:whale-butterfly-flit .16s ease-in-out infinite alternate}
[data-whale-autonomy-prop=pillow]{position:absolute;left:63px;bottom:-3px;z-index:0;width:225px;height:200px;pointer-events:none;opacity:0;transform:translateY(8px) scale(.92);transform-origin:center bottom;transition:opacity .22s linear,transform .35s ease-out}
[data-whale-autonomy-prop=pillow] svg{display:block;width:225px;height:200px;overflow:visible}
[data-whale-autonomy-prop=pillow][data-phase=intend]{opacity:.55;transform:translateY(4px) scale(.96)}
[data-whale-autonomy-prop=pillow][data-phase=attempt],[data-whale-autonomy-prop=pillow][data-phase=result]{opacity:1;transform:translateY(0) scale(1)}
[data-whale-autonomy-prop=pillow][data-phase=recover]{opacity:.45;transform:translateY(3px) scale(.97)}
[data-whale-autonomy-prop=pillow][data-phase=return-home]{opacity:0;transform:translateY(7px) scale(.94)}
[data-whale-autonomy-prop=sleep]{position:absolute;left:-4px;bottom:76px;z-index:3;width:38px;height:34px;pointer-events:none;opacity:0;transform:translateY(6px) scale(.9);transition:opacity .2s linear,transform .3s ease-out}
[data-whale-autonomy-prop=sleep] svg{display:block;width:38px;height:34px;overflow:visible}
[data-whale-autonomy-prop=sleep][data-phase=attempt]{opacity:.45;transform:translateY(3px) scale(.95)}
[data-whale-autonomy-prop=sleep][data-phase=result]{opacity:1;transform:translateY(0) scale(1);animation:whale-nap-drift 1.4s ease-in-out infinite alternate}
[data-whale-autonomy-prop=sleep][data-phase=recover],[data-whale-autonomy-prop=sleep][data-phase=return-home]{opacity:0;animation:none}
[data-whale-autonomy-prop=rice-bowl]{position:absolute;left:175px;top:175px;z-index:3;width:163px;height:131px;pointer-events:none;transform-origin:50% 82%;will-change:transform,opacity}
[data-whale-autonomy-prop=rice-bowl] svg{display:block;width:163px;height:131px;overflow:visible;filter:drop-shadow(0 3px 2px var(--dsw-alias-bg-mask-drop))}
[data-whale-autonomy-prop=rice-bowl][data-phase=result] [data-rice-grains]{animation:whale-rice-nibble .34s ease-in-out infinite alternate;transform-origin:26px 12px}
[data-whale-autonomy-prop=rice-bowl][data-phase=recover] [data-rice-grains]{opacity:.45;transition:opacity .25s linear}
[data-whale-autonomy-prop=rice-bowl] [data-rice-spill]{opacity:0}
[data-whale-autonomy-prop=rice-bowl][data-story=bowl_accident][data-phase=result] [data-rice-spill],[data-whale-autonomy-prop=rice-bowl][data-story=bowl_accident][data-phase=recover] [data-rice-spill]{opacity:1;animation:whale-rice-spill .42s cubic-bezier(.2,.8,.3,1) both;transform-origin:24px 25px}
[data-whale-autonomy-prop=rice-bowl][data-story=bowl_accident][data-phase=result] [data-rice-grains],[data-whale-autonomy-prop=rice-bowl][data-story=bowl_accident][data-phase=recover] [data-rice-grains]{opacity:.22;transform:translateY(7px) rotate(-10deg);transition:opacity .2s linear,transform .35s ease-out}
[data-whale-autonomy-prop=rice-bowl] [data-clean-cloth]{opacity:.72}
[data-whale-autonomy-prop=rice-bowl][data-story=recovery_meal][data-phase=result] [data-clean-cloth],[data-whale-autonomy-prop=rice-bowl][data-story=recovery_meal][data-phase=recover] [data-clean-cloth]{opacity:0;transition:opacity .25s linear}
[data-whale-renderer]{position:relative;display:block;width:350px;height:350px}
[data-whale-rig-layer]{position:absolute;inset:0;display:block;width:350px;height:350px;opacity:1}
[data-whale-rig-canvas],[data-whale-action-video]{position:absolute;inset:0;display:block;width:350px;height:350px;object-fit:contain;object-position:center bottom;opacity:0;transform-origin:center bottom;transition:opacity 120ms ease}
[data-whale-action-video]{z-index:2}
[data-whale-rig-canvas]{z-index:1}
[data-whale-renderer=ready] [data-whale-rig-canvas]{opacity:1}
[data-whale-renderer=ready] [data-whale-pet-avatar]{opacity:0;animation:none}
[data-whale-pet-avatar]{display:block;width:350px;height:350px;overflow:visible;transform-origin:175px 319px;animation:whale-pet-breathe 3.8s ease-in-out infinite}
[data-whale-pet-avatar-image]{display:block;width:350px;height:350px;object-fit:contain;user-select:none;-webkit-user-drag:none}
[data-whale-pet-avatar][data-state=working]{animation:whale-pet-work 1.8s ease-in-out infinite}
[data-whale-pet-avatar][data-state=smug]{animation:whale-pet-hop .58s ease-in-out 2}
[data-whale-pet-avatar][data-state=denying]{animation:whale-pet-shake .2s ease-in-out 4 alternate}
[data-whale-pet-entry][data-reduced=true] [data-whale-pet-avatar]{animation:none}
[data-whale-pet-bubble]{position:absolute;z-index:12;bottom:300px;box-sizing:border-box;display:grid;place-items:center;width:min(390px,calc(100vw - 24px));min-height:132px;padding:25px 38px;border:4px solid var(--dsw-alias-brand-primary);border-radius:52% 48% 51% 49%/49% 53% 47% 51%;background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-brand-primary);font-family:"STKaiti","KaiTi","Microsoft YaHei UI",sans-serif;font-size:25px;font-weight:900;line-height:1.28;letter-spacing:.02em;text-align:center;text-wrap:balance;white-space:normal;overflow-wrap:anywhere;box-shadow:0 16px 38px var(--dsw-alias-bg-mask-drop),inset 0 0 28px color-mix(in srgb,var(--dsw-alias-brand-primary) 7%,transparent);filter:drop-shadow(0 4px 0 color-mix(in srgb,var(--dsw-alias-brand-primary) 16%,transparent))}
[data-whale-pet-bubble][data-compatibility-only=true]{display:none!important}
[data-whale-pet-bubble]::before,[data-whale-pet-bubble]::after{position:absolute;border:4px solid var(--dsw-alias-brand-primary);border-radius:50%;background:var(--dsw-alias-bg-overlay);content:""}
[data-whale-pet-bubble]::before{bottom:-37px;width:27px;height:27px}
[data-whale-pet-bubble]::after{bottom:-62px;width:15px;height:15px}
[data-whale-pet-stage][data-whale-bubble-side=left] [data-whale-pet-bubble]{right:275px;left:auto}
[data-whale-pet-stage][data-whale-bubble-side=left] [data-whale-pet-bubble]::before{right:44px}
[data-whale-pet-stage][data-whale-bubble-side=left] [data-whale-pet-bubble]::after{right:24px}
[data-whale-pet-stage][data-whale-bubble-side=right] [data-whale-pet-bubble]{right:auto;left:275px}
[data-whale-pet-stage][data-whale-bubble-side=right] [data-whale-pet-bubble]::before{left:44px}
[data-whale-pet-stage][data-whale-bubble-side=right] [data-whale-pet-bubble]::after{left:24px}
[data-whale-pet-menu]{position:absolute;bottom:8px;box-sizing:border-box;width:170px;max-height:min(420px,calc(100vh - 40px));padding:7px;border:1px solid var(--dsw-alias-border-l2);border-radius:14px;background:var(--dsw-alias-bg-overlay);display:grid;gap:4px;overflow-y:auto;overscroll-behavior:contain}
[data-whale-pet-stage][data-whale-bubble-side=left] [data-whale-pet-menu]{right:350px;left:auto}
[data-whale-pet-stage][data-whale-bubble-side=right] [data-whale-pet-menu]{right:auto;left:350px}
[data-whale-ledger]{position:fixed;z-index:1;box-sizing:border-box;width:min(336px,calc(100vw - 24px));max-height:calc(100vh - 24px);padding:14px;border:1px solid var(--dsw-alias-border-l2);border-radius:16px;background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);pointer-events:auto;overflow:auto;overscroll-behavior:contain;box-shadow:0 12px 32px var(--dsw-alias-bg-mask-drop)}
[data-whale-ledger-header]{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px}
[data-whale-ledger-header] h2{margin:0 0 3px;font-size:17px;line-height:1.35}
[data-whale-ledger-header] span{color:var(--dsw-alias-label-secondary);font-size:11px}
[data-whale-ledger-header] button{width:32px;height:32px;flex:0 0 auto;border:0;border-radius:9px;background:transparent;color:inherit;font-size:22px;line-height:1;cursor:pointer}
[data-whale-ledger-header] button:hover,[data-whale-ledger-header] button:focus-visible{background:var(--dsw-alias-interactive-bg-hover);outline:2px solid var(--dsw-alias-border-l3);outline-offset:1px}
[data-whale-ledger-stats]{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:0 0 13px}
[data-whale-ledger-stats]>div{padding:8px;border-radius:10px;background:var(--dsw-alias-bg-layer-2)}
[data-whale-ledger-stats] dt{margin-bottom:5px;color:var(--dsw-alias-label-secondary);font-size:11px}
[data-whale-ledger-stats] dd{display:flex;align-items:center;gap:7px;margin:0;font-size:12px;font-variant-numeric:tabular-nums}
[data-whale-ledger-stats] meter{width:100%;height:8px;accent-color:var(--dsw-alias-brand-primary)}
[data-whale-relationship-card]{display:grid;grid-template-columns:auto 1fr;align-items:baseline;gap:3px 9px;margin:-2px 0 13px;padding:9px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:11px;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 8%,var(--dsw-alias-bg-layer-2))}
[data-whale-relationship-card]>span{color:var(--dsw-alias-label-secondary);font-size:11px}
[data-whale-relationship-card]>strong{font-size:13px}
[data-whale-relationship-card]>small{grid-column:1/-1;color:var(--dsw-alias-label-secondary);font-size:10px;line-height:1.4}
[data-whale-ledger-section]{padding-top:11px;border-top:1px solid var(--dsw-alias-border-l2)}
[data-whale-ledger-section]+[data-whale-ledger-section]{margin-top:11px}
[data-whale-ledger-section] h3{margin:0 0 7px;font-size:12px}
[data-whale-billing-balance]{display:grid;grid-template-columns:1fr auto;align-items:baseline;gap:2px 10px;padding:10px 11px;border-radius:11px;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 8%,var(--dsw-alias-bg-layer-2))}
[data-whale-billing-balance]>span{color:var(--dsw-alias-label-secondary);font-size:11px}
[data-whale-billing-balance]>strong{grid-row:1/3;grid-column:2;font-size:22px;font-variant-numeric:tabular-nums}
[data-whale-billing-balance]>small{font-size:10px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
[data-whale-billing-balance]>button{justify-self:start;min-height:25px;padding:3px 7px;border:1px solid var(--dsw-alias-border-l2);border-radius:7px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:9px;cursor:pointer}
[data-whale-billing-balance]>button:hover,[data-whale-billing-balance]>button:focus-visible{background:var(--dsw-alias-interactive-bg-hover);outline:2px solid var(--dsw-alias-border-l3);outline-offset:1px}
[data-whale-billing-balance]>button:disabled{cursor:wait;opacity:.5}
[data-whale-billing-today]{display:flex;justify-content:space-between;gap:10px;margin:6px 2px 0;color:var(--dsw-alias-label-secondary);font-size:10px}
[data-whale-billing-today]>strong{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}
[data-whale-billing-tokens]{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:7px 0 9px}
[data-whale-billing-tokens]>div{min-width:0;padding:7px 8px;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;background:var(--dsw-alias-bg-layer-2)}
[data-whale-billing-tokens] dt{color:var(--dsw-alias-label-secondary);font-size:9px;white-space:nowrap}
[data-whale-billing-tokens] dd{margin:2px 0 0;font-size:12px;font-weight:650;font-variant-numeric:tabular-nums}
[data-whale-billing] h4{margin:0 0 5px;color:var(--dsw-alias-label-secondary);font-size:10px;font-weight:500}
[data-whale-billing-hours]{display:grid;gap:4px;margin:0;padding:0;list-style:none}
[data-whale-billing-hours] li{display:grid;grid-template-columns:auto 1fr auto;gap:7px;align-items:baseline;font-size:10px;font-variant-numeric:tabular-nums}
[data-whale-billing-hours] time{color:var(--dsw-alias-label-primary)}
[data-whale-billing-hours] span{min-width:0;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
[data-whale-billing-hours] strong{font-size:10px}
[data-whale-billing-note]{display:block;margin-top:7px;color:var(--dsw-alias-label-dimmed);font-size:9px;line-height:1.4}
[data-whale-diary-lines],[data-whale-ledger-days],[data-whale-achievements]{margin:0;padding:0;list-style:none}
[data-whale-diary-lines]{display:grid;gap:5px;color:var(--dsw-alias-label-primary);font-size:12px;line-height:1.55}
[data-whale-diary-lines] li{padding-left:11px;position:relative}
[data-whale-diary-lines] li:before{content:'·';position:absolute;left:1px;color:var(--dsw-alias-brand-primary)}
[data-whale-ledger-days]{display:grid;gap:5px}
[data-whale-ledger-days] li{display:flex;justify-content:space-between;gap:10px;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:1.4}
[data-whale-ledger-days] time{color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}
[data-whale-achievements]{display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px}
[data-whale-achievements] li{display:flex;align-items:center;gap:5px;color:var(--dsw-alias-label-dimmed)}
[data-whale-achievements] li[data-unlocked=true]{color:var(--dsw-alias-label-primary)}
[data-whale-ledger-empty]{margin:0;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.5}
[data-whale-ledger-privacy] p{margin:0;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:1.5;overflow-wrap:anywhere}
[data-whale-ledger-clear-summary]{display:grid;justify-items:start;gap:8px}
[data-whale-ledger-clear-confirmation]{display:grid;gap:6px}
[data-whale-ledger-clear-confirmation]>strong{font-size:12px;line-height:1.4}
[data-whale-ledger-clear-confirmation]>[role=alert]{color:var(--dsw-alias-label-primary);font-weight:600}
[data-whale-ledger-clear-actions]{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:7px;margin-top:3px;width:100%}
[data-whale-ledger-privacy] button{box-sizing:border-box;min-height:32px;padding:6px 9px;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:11px;line-height:1.35;cursor:pointer}
[data-whale-ledger-privacy] button[data-danger=true]{border-color:currentColor;font-weight:600}
[data-whale-ledger-privacy] button:hover,[data-whale-ledger-privacy] button:focus-visible{background:var(--dsw-alias-interactive-bg-hover);outline:2px solid var(--dsw-alias-border-l3);outline-offset:1px}
[data-whale-ledger-privacy] button:disabled{cursor:not-allowed;opacity:.5}
[data-whale-ledger-clear-result]{font-weight:600}
[data-whale-pet-menu] button,[data-whale-pet-summon]{border:0;border-radius:9px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;text-align:left;padding:7px 9px;cursor:pointer}
[data-whale-pet-menu] button:hover,[data-whale-pet-menu] button:focus-visible,[data-whale-pet-summon]:hover{background:var(--dsw-alias-interactive-bg-hover);outline:2px solid var(--dsw-alias-border-l3);outline-offset:1px}
[data-whale-pet-menu] button:disabled,[data-whale-pet-summon]:disabled{cursor:not-allowed;color:var(--dsw-alias-label-dimmed)}
[data-whale-pet-summon]{position:fixed;right:14px;bottom:14px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-overlay);font-size:var(--dsw-font-xxs-12-font-size);line-height:var(--dsw-font-xxs-12-line-height)}
[data-whale-settings]{max-width:680px;color:var(--dsw-alias-label-primary)}
[data-whale-settings] h2{margin:0 0 6px;font-size:22px}
[data-whale-settings] p{margin:0 0 20px;color:var(--dsw-alias-label-secondary);line-height:1.6}
[data-whale-settings-grid]{display:grid;gap:10px}
[data-whale-setting]{display:flex;align-items:center;justify-content:space-between;gap:20px;min-height:46px;padding:10px 14px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-2)}
[data-whale-setting]>label{display:flex;align-items:center;justify-content:space-between;gap:20px;width:100%;font-size:14px;cursor:pointer}
[data-whale-setting] input[type=checkbox]{width:18px;height:18px;accent-color:var(--dsw-alias-brand-primary)}
[data-whale-setting] input[type=range]{width:170px;accent-color:var(--dsw-alias-brand-primary)}
[data-whale-setting] input[type=number]{box-sizing:border-box;width:140px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:inherit;padding:7px 9px;font:inherit;font-variant-numeric:tabular-nums}
[data-whale-setting] select{min-width:140px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:inherit;padding:7px 9px}
[data-whale-setting] :disabled{cursor:not-allowed;opacity:.55}

/* Approved desktop test runtime: dialogue, composer, menu and emotion FX. */
[data-whale-dialogue],[data-whale-chat-composer],[data-whale-menu-toggle],[data-whale-menu-panel]{pointer-events:auto;font-family:"Microsoft YaHei UI","PingFang SC",sans-serif}
[data-whale-dialogue]{--tail-x:64%;--speech-width:267px;--speech-height:150px;--metric-width:250px;--metric-height:135px;--feedback-width:275px;--feedback-height:160px;position:absolute;z-index:20;box-sizing:border-box;width:var(--speech-width);min-height:var(--speech-height);padding:27px 31px 24px;border:0;border-radius:0;background:transparent;color:#5269a3;overflow:visible;transform-origin:var(--tail-x) 100%;transition:opacity .2s ease,transform .26s cubic-bezier(.16,1,.3,1)}
[data-whale-dialogue][data-visible=false]{visibility:hidden;opacity:0;transform:translateY(10px) scale(.74);pointer-events:none}
[data-whale-dialogue][data-visible=true]{animation:whale-dialogue-pop .4s cubic-bezier(.16,1,.3,1)}
[data-whale-dialogue]::before,[data-whale-dialogue]::after{position:absolute;z-index:-1;box-sizing:border-box;border:4px solid #28458e;border-radius:50%;background:#fff;content:""}
[data-whale-dialogue][data-placement=above]::before{left:calc(var(--tail-x) - 15px);bottom:-27px;width:20px;height:20px}
[data-whale-dialogue][data-placement=above]::after{left:calc(var(--tail-x) + 11px);bottom:-47px;width:11px;height:11px}
[data-whale-dialogue][data-placement=side-right]::before{left:-25px;top:58%;width:19px;height:19px}
[data-whale-dialogue][data-placement=side-right]::after{left:-44px;top:71%;width:10px;height:10px}
[data-whale-dialogue][data-placement=side-left]::before{right:-25px;top:58%;width:19px;height:19px}
[data-whale-dialogue][data-placement=side-left]::after{right:-44px;top:71%;width:10px;height:10px}
[data-whale-dialogue-cloud]{position:absolute;z-index:-2;inset:-8px;display:none;width:calc(100% + 16px);height:calc(100% + 16px);overflow:visible;pointer-events:none}
[data-whale-dialogue][data-variant=speech] [data-whale-dialogue-cloud],[data-whale-dialogue][data-variant=feedback] [data-whale-dialogue-cloud]{display:block}
[data-whale-dialogue-cloud] path,[data-whale-dialogue-cloud] line{vector-effect:non-scaling-stroke}
[data-whale-dialogue-toggle]{display:flex;width:100%;min-height:calc(var(--speech-height) - 51px);flex-direction:column;align-items:stretch;justify-content:center;padding:0;border:0;background:transparent;color:inherit;text-align:center;cursor:pointer}
[data-whale-dialogue-speaker]{margin-bottom:7px;color:#6579aa;font-family:"Microsoft YaHei UI","PingFang SC",sans-serif;font-size:11px;font-weight:600;line-height:1.2;letter-spacing:0}
[data-whale-dialogue][data-variant=speech] [data-whale-dialogue-speaker],[data-whale-dialogue][data-variant=feedback] [data-whale-dialogue-speaker]{display:none}
[data-whale-dialogue-message]{display:block;color:#5269a3;font-family:"Microsoft YaHei UI","PingFang SC",sans-serif;font-size:clamp(20px,1.8vw,22px);font-weight:800;line-height:1.16;letter-spacing:-.025em;text-align:center;text-wrap:balance;overflow-wrap:anywhere}
[data-whale-dialogue-subtext]{display:block;margin-top:8px;color:#7186b9;font-family:"Microsoft YaHei UI","PingFang SC",sans-serif;font-size:13px;font-weight:600;line-height:1.35;letter-spacing:0;text-align:center;text-wrap:balance}
[data-whale-dialogue][data-variant=feedback]{width:var(--feedback-width);min-height:var(--feedback-height);padding:24px 27px 21px}
[data-whale-dialogue][data-variant=feedback] [data-whale-dialogue-toggle]{min-height:calc(var(--feedback-height) - 45px)}
[data-whale-dialogue][data-variant=feedback] [data-whale-dialogue-message]{font-size:22px;line-height:1.12}
[data-whale-dialogue][data-variant=metric]{width:var(--metric-width);min-height:var(--metric-height);padding:17px 21px 15px;border:4px solid #283f86;border-radius:50%;background:#fff}
[data-whale-dialogue][data-variant=metric] [data-whale-dialogue-toggle]{min-height:calc(var(--metric-height) - 32px);align-items:center;gap:5px}
[data-whale-dialogue][data-variant=metric] [data-whale-dialogue-speaker]{margin:0;font-size:11px}
[data-whale-dialogue][data-variant=metric] [data-whale-dialogue-message]{color:#4d66a3;font-family:"Microsoft YaHei UI","PingFang SC",sans-serif;font-size:32px;font-weight:700;line-height:1;letter-spacing:-.025em}
[data-whale-dialogue][data-variant=metric] [data-whale-dialogue-subtext]{max-width:100%;margin:0;color:#8998ba;font-size:9px;font-weight:500;line-height:1.35;white-space:normal}
[data-whale-dialogue-hide]{position:absolute;z-index:2;right:27px;top:24px;display:grid;width:24px;height:24px;padding:0;place-items:center;border:0;border-radius:50%;background:transparent;color:#8d9abc;font-size:18px;line-height:1;opacity:0;cursor:pointer}
[data-whale-dialogue]:hover [data-whale-dialogue-hide],[data-whale-dialogue-hide]:focus-visible{opacity:.55}
[data-whale-dialogue-hide]:hover,[data-whale-dialogue-hide]:focus-visible{background:#edf4ff;opacity:1;outline:2px solid rgba(69,111,210,.28)}
[data-whale-dialogue-fin]{display:none}
[data-whale-dialogue][data-placement=side-right]{right:auto!important;left:273px!important;bottom:225px;transform-origin:0 62%}
[data-whale-dialogue][data-placement=side-left]{right:273px!important;left:auto!important;bottom:225px;transform-origin:100% 62%}
[data-whale-dialogue][data-placement=above]{right:auto!important;left:4px!important;bottom:345px;transform-origin:var(--tail-x) 100%}

[data-whale-chat-composer]{position:absolute;z-index:24;left:50%;bottom:-74px;box-sizing:border-box;width:min(430px,calc(100vw - 24px));padding:0;border:1px solid rgba(91,119,181,.72);border-radius:16px;background:rgba(250,252,255,.985);color:#4d639a;box-shadow:0 14px 36px rgba(0,16,48,.22);transform:translate(calc(-50% + var(--composer-x,0px)),calc(12px + var(--composer-y,0px)));opacity:0;visibility:hidden;pointer-events:none;transition:opacity .16s ease,transform .2s ease,visibility 0s linear .2s;touch-action:none}
[data-whale-chat-composer][data-open=true]{transform:translate(calc(-50% + var(--composer-x,0px)),var(--composer-y,0px));opacity:1;visibility:visible;pointer-events:auto;transition-delay:0s}
[data-whale-chat-head]{display:flex;align-items:center;height:36px;padding:0 7px 0 4px;border-bottom:1px solid #e1e6f1;cursor:grab;user-select:none}
[data-whale-chat-head]:active{cursor:grabbing}
[data-whale-chat-grip]{display:grid;width:34px;height:34px;place-items:center;color:#7386b4;font-size:20px;line-height:1;transform:rotate(90deg)}
[data-whale-chat-head] strong{font-size:12px;letter-spacing:.02em}
[data-whale-chat-head] button{display:grid;width:34px;height:34px;margin-left:auto;padding:0;place-items:center;border:0;background:transparent;color:#7386b4;font-size:20px;cursor:pointer}
[data-whale-chat-entry]{display:flex;gap:8px;padding:9px}
[data-whale-chat-entry] input{box-sizing:border-box;min-width:0;height:40px;flex:1;padding:0 14px;border:1px solid #c8d2e7;border-radius:12px;outline:0;background:#fff;color:#314a85;font:13px "Microsoft YaHei UI","PingFang SC",sans-serif}
[data-whale-chat-entry] input:focus{border-color:#5873b5;box-shadow:0 0 0 3px rgba(83,109,168,.12)}
[data-whale-chat-entry] button{min-width:62px;height:40px;padding:0 16px;border:0;border-radius:12px;background:#536da8;color:#fff;font-size:13px;font-weight:800;cursor:pointer}
[data-whale-chat-entry] button:hover{background:#3f5c9d}
[data-whale-chat-entry] button:disabled{cursor:wait;opacity:.58}

[data-whale-menu-toggle]{position:absolute;z-index:26;right:3px;top:50%;display:grid;width:42px;height:50px;padding:0;place-content:center;gap:5px;transform:translateY(-50%);border:2px solid #7890cb;border-radius:14px 5px 5px 14px;background:#263f86;box-shadow:0 8px 22px rgba(0,11,43,.32);cursor:pointer;transition:background .16s ease,opacity .16s ease}
[data-whale-menu-toggle] i{display:block;width:18px;height:2px;border-radius:2px;background:#fff}
[data-whale-menu-toggle]:hover{background:#3456aa}
[data-whale-menu-toggle][aria-expanded=true]{opacity:0;pointer-events:none}
[data-whale-menu-panel]{position:absolute;z-index:25;top:50%;box-sizing:border-box;width:306px;max-height:min(590px,calc(100vh - 24px));overflow:auto;border:2px solid #283f86;border-radius:20px;background:rgba(255,255,255,.985);color:#314f93;box-shadow:0 20px 52px rgba(0,13,49,.32);opacity:0;pointer-events:none;transition:transform .27s cubic-bezier(.2,.78,.22,1),opacity .2s ease;scrollbar-width:thin;scrollbar-color:#a8b7d9 transparent}
[data-whale-pet-stage][data-whale-bubble-side=left] [data-whale-menu-panel]{right:4px;transform:translate(112%,-50%)}
[data-whale-pet-stage][data-whale-bubble-side=right] [data-whale-menu-panel]{left:4px;transform:translate(-112%,-50%)}
[data-whale-pet-stage] [data-whale-menu-panel][data-open=true]{transform:translate(0,-50%);opacity:1;pointer-events:auto}
[data-whale-menu-head]{display:flex;align-items:center;gap:10px;padding:14px 14px 11px;border-bottom:1px solid #dce3f1}
[data-whale-menu-avatar]{display:grid;width:34px;height:34px;flex:0 0 auto;place-items:center;border-radius:50%;background:#2b4b9e;color:#fff;font:700 16px "STKaiti","KaiTi",serif}
[data-whale-menu-head]>span:nth-child(2){min-width:0;flex:1}
[data-whale-menu-head] strong,[data-whale-menu-head] small{display:block}
[data-whale-menu-head] strong{color:#253f82;font-size:14px}
[data-whale-menu-head] small{margin-top:2px;color:#9aa8c4;font-size:9px}
[data-whale-menu-head]>button{display:grid;width:28px;height:28px;padding:0;place-items:center;border:0;border-radius:50%;background:#eef2f9;color:#6f80a8;font-size:18px;cursor:pointer}
[data-whale-menu-tabs]{display:grid;grid-template-columns:repeat(5,1fr);gap:4px;padding:9px 10px;border-bottom:1px solid #e1e6f0}
[data-whale-menu-tabs] button{min-height:34px;padding:0 3px;border:1px solid transparent;border-radius:9px;background:transparent;color:#7887a8;font-size:9px;cursor:pointer}
[data-whale-menu-tabs] button[data-active=true]{border-color:#9aabd1;background:#edf2fb;color:#29488f;font-weight:800}
[data-whale-menu-view]{display:none;padding:13px}
[data-whale-menu-view][data-active=true]{display:block;animation:whale-menu-view-in .18s ease-out}
[data-whale-menu-view] h3{margin:0 0 5px;color:#263f82;font-size:14px}
[data-whale-menu-view]>p{margin:0 0 11px;color:#8491ac;font-size:10px;line-height:1.55}
[data-whale-menu-primary]{width:100%;min-height:38px;border:1px solid #39599d;border-radius:10px;background:#2b4b98;color:#fff;font-size:11px;font-weight:800;cursor:pointer}
[data-whale-quick-lines]{display:grid;gap:5px;margin-top:8px}
[data-whale-quick-lines] button,[data-whale-menu-actions] button,[data-whale-account-actions] button,[data-whale-emotion-grid] button{box-sizing:border-box;min-height:34px;padding:6px 8px;border:1px solid #d4dced;border-radius:9px;background:#f7f9fd;color:#4b6095;font-size:10px;line-height:1.35;cursor:pointer}
[data-whale-quick-lines] button{text-align:left}
[data-whale-menu-actions],[data-whale-account-actions]{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}
[data-whale-menu-actions] button:hover,[data-whale-account-actions] button:hover,[data-whale-emotion-grid] button:hover,[data-whale-quick-lines] button:hover{border-color:#8da5d7;background:#edf3ff;color:#23458f}
[data-whale-menu-actions] button:disabled{cursor:not-allowed;opacity:.45}
[data-whale-emotion-grid]{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
[data-whale-emotion-grid] button{min-width:0;padding:6px 2px}
[data-whale-setting-row]{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:36px;border-bottom:1px solid #e7ebf4;color:#50658f;font-size:10px}
[data-whale-setting-row] input{accent-color:#2b4b98}
[data-whale-setting-field]{display:grid;gap:4px;margin-top:8px;color:#697a9e;font-size:9px}
[data-whale-setting-field] input{box-sizing:border-box;width:100%;height:34px;padding:0 9px;border:1px solid #cbd5e8;border-radius:8px;background:#fff;color:#314a85;font-size:10px;outline:0}
[data-whale-setting-field] input:focus{border-color:#5873b5;box-shadow:0 0 0 3px rgba(83,109,168,.1)}
[data-whale-menu-note]{display:block;margin-top:8px;color:#9aa8c4;font-size:9px;line-height:1.45}
[data-whale-account-card]{display:grid;grid-template-columns:1fr auto;gap:3px 8px;padding:11px;border:1px solid #d4ddec;border-radius:12px;background:#f4f7fc}
[data-whale-account-card]>span{color:#7887a8;font-size:9px}
[data-whale-account-card]>strong{grid-row:1/3;grid-column:2;color:#29488f;font:700 22px Georgia,serif}
[data-whale-account-card]>small,[data-whale-account-card]>em{color:#8997b4;font-size:9px;font-style:normal}
[data-whale-account-card]>button{grid-column:1/-1;min-height:30px;margin-top:5px;border:1px solid #aebddd;border-radius:8px;background:#fff;color:#496198;font-size:9px;cursor:pointer}
[data-whale-account-card]>button:disabled{cursor:wait;opacity:.7}
[data-whale-account-card]>button[data-state=refreshing]{border-color:#8da7d5;background:#eaf1ff;color:#294f93}
[data-whale-account-card]>button[data-state=done]{border-color:#91b9aa;background:#edf8f3;color:#36745f}

[data-whale-emotion-fx]{position:absolute;z-index:22;inset:0;pointer-events:none;overflow:visible}
.emotion-scene-prop{position:absolute;left:var(--fx-x,70%);top:var(--fx-y,18%);display:block;width:var(--prop-width,88px);height:var(--prop-height,76px);opacity:0;filter:drop-shadow(0 7px 7px rgba(35,56,105,.2));transform-origin:50% 70%;will-change:transform,opacity;animation:whale-emotion-scene-lifecycle var(--fx-duration,2600ms) cubic-bezier(.16,1,.3,1) forwards}
.emotion-scene-icon{display:block;width:100%;height:100%;overflow:visible}
.sad-cloud-shadow{fill:rgba(38,55,91,.2)}
.sad-cloud-body{transform-box:fill-box;transform-origin:center;animation:whale-sad-cloud-breathe 1.9s ease-in-out infinite alternate}
.sad-cloud-highlight{fill:none;stroke:rgba(233,243,255,.62);stroke-width:4;stroke-linecap:round}
.sad-rain-drops{fill:#77bfe6;stroke:#dff6ff;stroke-width:1.4}
.sad-rain-drops path{transform-box:fill-box;transform-origin:center;animation:whale-sad-raindrop .92s ease-in infinite}
.sad-rain-drops path:nth-child(2){animation-delay:-.31s}.sad-rain-drops path:nth-child(3){animation-delay:-.61s}
.happy-sun-rays{transform-box:fill-box;transform-origin:center;animation:whale-happy-sun-rays 5.5s linear infinite}
.happy-sun-core{transform-box:fill-box;transform-origin:center;animation:whale-happy-sun-pulse 1.5s ease-in-out infinite alternate}
.happy-sun-glint{fill:none;stroke:#fffbe1;stroke-width:4;stroke-linecap:round}
.proud-crown-body{stroke:#9d692c;stroke-width:3;stroke-linejoin:round}
.proud-crown-band{fill:#f5b849;stroke:#9d692c;stroke-width:2.6;stroke-linejoin:round}
.proud-crown-shadow{fill:none;stroke:rgba(67,52,84,.2);stroke-width:7;stroke-linecap:round}
.proud-crown-jewels{fill:#72cfe5;stroke:#fff4ce;stroke-width:1.5}
.proud-crown-glint{fill:#fff9cf;transform-box:fill-box;transform-origin:center;animation:whale-crown-glint 1.35s ease-in-out infinite}
.determined-target-rings circle{fill:rgba(255,247,217,.9);stroke:#d5a03e;stroke-width:4}.determined-target-rings circle:nth-child(2){fill:#ffe082;stroke:#b97b2d}.determined-target-rings circle:nth-child(3){fill:#e55b6a;stroke:#8f3547}
.determined-target-arrow{fill:none;stroke:#405d9b;stroke-width:5;stroke-linecap:round;stroke-linejoin:round;transform-box:fill-box;transform-origin:center;animation:whale-target-arrow 1.8s ease-in-out infinite}
.determined-target-glint{fill:#fff3a3;animation:whale-target-glint 1.2s ease-in-out infinite alternate}
.relieved-tea-steam{stroke:#9bded8;stroke-width:4}
.relieved-tea-steam path{transform-box:fill-box;transform-origin:center bottom;animation:whale-tea-steam 1.55s ease-in-out infinite}
.relieved-tea-steam path:nth-child(2){animation-delay:-.62s}
.relieved-tea-saucer{fill:#8bcac4;stroke:#477e84;stroke-width:2.5}
.relieved-tea-cup{stroke:#477e84;stroke-width:3;stroke-linejoin:round}
.relieved-tea-rim,.relieved-tea-handle,.relieved-tea-wave{fill:none;stroke:#477e84;stroke-width:3;stroke-linecap:round}.relieved-tea-wave{stroke:#f7ffff;stroke-width:2.5}
.pout-tissue-shadow,.mischief-box-shadow,.excited-gift-shadow{fill:rgba(46,56,94,.18)}
.pout-tissue-sheet{fill:#fbfdff;stroke:#7f94bf;stroke-width:2.6;stroke-linejoin:round;transform-box:fill-box;transform-origin:center bottom;animation:whale-tissue-flutter 1.8s ease-in-out infinite alternate}
.pout-tissue-fold{fill:none;stroke:#c1d1ed;stroke-width:2;stroke-linecap:round}
.pout-tissue-box{stroke:#5e75ad;stroke-width:3;stroke-linejoin:round}.pout-tissue-slot{fill:none;stroke:#5e75ad;stroke-width:3.5;stroke-linecap:round}.pout-tissue-wave{fill:none;stroke:#eef5ff;stroke-width:2.5;stroke-linecap:round}
.surprise-bell-body{transform-box:fill-box;transform-origin:50% 8%;animation:whale-bell-ring .48s ease-in-out infinite alternate}
.surprise-bell-handle,.surprise-bell-rim{fill:none;stroke:#a7692c;stroke-width:4;stroke-linecap:round}.surprise-bell-shell{stroke:#a7692c;stroke-width:3.2;stroke-linejoin:round}.surprise-bell-clapper{fill:#e38e33;stroke:#874f29;stroke-width:2.5}
.surprise-bell-rings{stroke:#f4bc55;stroke-width:3.5;animation:whale-bell-rings .72s ease-out infinite}
.mischief-spring{fill:none;stroke:#514173;stroke-width:4;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:5 4;animation:whale-mischief-coil 1.35s ease-in-out infinite alternate}
.mischief-pop-star{fill:#ffd86d;stroke:#6d4b94;stroke-width:3;stroke-linejoin:round;transform-box:fill-box;transform-origin:center;animation:whale-mischief-star 1.35s ease-in-out infinite alternate}
.mischief-box-lid{fill:#bda5ed;stroke:#5e438a;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;transform-box:fill-box;transform-origin:20% 80%;animation:whale-mischief-lid 1.35s ease-in-out infinite alternate}.mischief-box-body{stroke:#503979;stroke-width:3;stroke-linejoin:round}.mischief-box-ribbon{fill:#ffd079;stroke:#9b6b36;stroke-width:2}
.excited-gift-body{stroke:#a75c52;stroke-width:3;stroke-linejoin:round}.excited-gift-lid{fill:#ffbd73;stroke:#a75c52;stroke-width:3;stroke-linejoin:round}.excited-gift-ribbon{fill:#7ec8d4;stroke:#3e8596;stroke-width:2.5}
.excited-gift-bow{fill:#8dd3df;stroke:#3e8596;stroke-width:2.8;stroke-linejoin:round;transform-box:fill-box;transform-origin:center bottom;animation:whale-gift-bow 1.6s ease-in-out infinite alternate}.excited-gift-glow{fill:#fff5a6;transform-box:fill-box;transform-origin:center;animation:whale-gift-glow 1.1s ease-in-out infinite alternate}
.love-envelope-shadow,.shy-fan-shadow,.confused-card-shadow,.sleepy-moon-shadow,.nervous-checklist-shadow,.hungry-tray-shadow{fill:rgba(46,56,94,.18)}
.love-envelope-back{stroke:#b85b83;stroke-width:3;stroke-linejoin:round}.love-envelope-flap,.love-envelope-fold{fill:none;stroke:#b85b83;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.love-envelope-seal{fill:#f06c9b;stroke:#a84472;stroke-width:2.4;stroke-linejoin:round;transform-box:fill-box;transform-origin:center;animation:whale-love-seal 1.25s ease-in-out infinite alternate}.love-envelope-glint{fill:#fff4c9;transform-box:fill-box;transform-origin:center;animation:whale-love-glint 1.5s ease-in-out infinite}
.shy-fan-ribs{stroke:#ae699d;stroke-width:3;stroke-linejoin:round}.shy-fan-rib{fill:none;stroke:#c88bb5;stroke-width:2.2;stroke-linecap:round}.shy-fan-handle{fill:none;stroke:#7a5b9b;stroke-width:4.5;stroke-linecap:round}.shy-fan-heart{fill:#ff9fbe;stroke:#a84472;stroke-width:2;stroke-linejoin:round;transform-box:fill-box;transform-origin:center;animation:whale-shy-fan-heart 1.2s ease-in-out infinite alternate}
.angry-burst-shards{transform-box:fill-box;transform-origin:center;animation:whale-angry-burst 1s ease-in-out infinite alternate}.angry-burst-steam{fill:none;stroke:#ed5260;stroke-width:4;stroke-linecap:round;animation:whale-angry-steam-rise 1.1s ease-in-out infinite alternate}
.confused-card-paper{transform-box:fill-box;transform-origin:center;animation:whale-confused-card 1.7s ease-in-out infinite alternate}.confused-card-paper path{fill:none;stroke:#90a9d5;stroke-width:2.2;stroke-linecap:round}.confused-card-question{fill:none;stroke:#4265a4;stroke-width:6;stroke-linecap:round;stroke-linejoin:round}.confused-card-glint{fill:#fff1ac;transform-box:fill-box;transform-origin:center;animation:whale-confused-glint 1.35s ease-in-out infinite}
.sleepy-moon-body{stroke:#c88f3e;stroke-width:2.8;stroke-linejoin:round;transform-box:fill-box;transform-origin:center;animation:whale-sleepy-moon 2.2s ease-in-out infinite alternate}.sleepy-moon-star{fill:#fff3ab;stroke:#c88f3e;stroke-width:2;transform-box:fill-box;transform-origin:center;animation:whale-sleepy-star 1.4s ease-in-out infinite alternate}.sleepy-moon-zzz{fill:none;stroke:#6685c4;stroke-width:4;stroke-linecap:round;stroke-linejoin:round;animation:whale-sleepy-zzz 1.8s ease-in-out infinite alternate}
.nervous-checklist-board{transform-box:fill-box;transform-origin:50% 90%;animation:whale-nervous-board 1.05s ease-in-out infinite alternate}.nervous-checklist-board rect:first-child{stroke:#7189b9;stroke-width:3}.nervous-checklist-board rect:nth-child(2){stroke:#7189b9;stroke-width:2}.nervous-checklist-board path{fill:none;stroke:#6180bc;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.nervous-checklist-sweat{fill:#73cbe8;stroke:#3c8cb3;stroke-width:2;animation:whale-nervous-sweat 1.6s ease-in-out infinite}.nervous-checklist-alert{fill:none;stroke:#ef8c67;stroke-width:4;stroke-linecap:round}
.hungry-tray-chopsticks{fill:none;stroke:#b67b4e;stroke-width:4;stroke-linecap:round}.hungry-tray-glint{fill:#fff3aa;transform-box:fill-box;transform-origin:center;animation:whale-hungry-glint 1.15s ease-in-out infinite alternate}
.emotion-scene-prop-love{animation-name:whale-love-envelope-in}.emotion-scene-prop-shy{animation-name:whale-shy-fan-in}.emotion-scene-prop-angry{animation-name:whale-angry-burst-in}.emotion-scene-prop-confused{animation-name:whale-confused-card-in}.emotion-scene-prop-sleepy{animation-name:whale-sleepy-moon-in}.emotion-scene-prop-nervous{animation-name:whale-nervous-checklist-in}.emotion-scene-prop-hungry{animation-name:whale-hungry-tray-in}
[data-whale-work-fx]{position:absolute;z-index:23;inset:0;pointer-events:none;overflow:visible}
.whale-work-object{position:absolute;display:grid;width:60px;height:60px;place-items:center;opacity:0;filter:drop-shadow(0 5px 7px rgba(35,63,124,.2));will-change:transform,opacity;animation:whale-work-object-in .42s cubic-bezier(.16,1,.3,1) forwards}
.whale-work-object::before{position:absolute;inset:4px;border:1px solid rgba(137,174,226,.34);border-radius:50%;background:radial-gradient(circle,rgba(194,226,255,.28),rgba(194,226,255,0) 68%);content:"";opacity:.65;animation:whale-work-aura 2.4s ease-in-out .42s infinite}
.whale-work-object::after{position:absolute;left:14px;right:14px;bottom:-5px;height:7px;border-radius:50%;background:rgba(45,75,137,.18);content:"";filter:blur(2px);transform:scaleX(.8);animation:whale-work-shadow 2.4s ease-in-out .42s infinite}
.whale-work-icon{display:block;width:100%;height:100%;overflow:visible}
.work-icon-shell{fill:#f7fbff;stroke:#456bb0;stroke-width:2.8;stroke-linejoin:round}
.work-icon-lens{fill:rgba(174,224,255,.52);stroke:#8ec8ec;stroke-width:1.8}
.work-icon-page-back{fill:#dce9ff;stroke:#7c9bd3;stroke-width:2.2;stroke-linejoin:round;opacity:.82}
.work-icon-fold{stroke:#7693ca;stroke-width:2.4;stroke-linejoin:round}
.work-icon-line{stroke:#6c8bc5;stroke-width:2.8;stroke-linecap:round}
.work-icon-spine{stroke:#b1c8ed;stroke-width:2;stroke-linecap:round;opacity:.9}
.work-icon-bookmark{fill:#ffb2c9;stroke:#b85b83;stroke-width:1.7;stroke-linejoin:round}
.work-icon-page-glint{stroke:#fff;stroke-width:2.4;stroke-linecap:round;opacity:.92}
.work-icon-page-turn{fill:none;stroke:#9badd3;stroke-width:1.8;stroke-linecap:round;opacity:.78;stroke-dasharray:4 3;animation:whale-work-page-turn 2.9s ease-in-out .55s infinite}
.work-icon-accent{stroke:#3f66b1;stroke-width:3.5;stroke-linecap:round;stroke-linejoin:round}
.work-icon-glint{stroke:#9edaf4;stroke-width:2.8;stroke-linecap:round}
.work-icon-scan{stroke:#4c9bc7;stroke-width:2.2;stroke-linecap:round;opacity:.85}
.work-icon-scan-dot{fill:#fff;stroke:#4c9bc7;stroke-width:1.5}
.work-icon-ray{stroke:#78c8e7;stroke-width:2;stroke-linecap:round;opacity:.78;animation:whale-work-ray-pulse 1.65s ease-in-out .6s infinite}
.work-icon-scan-line{stroke:#4c9bc7;stroke-width:1.6;stroke-linecap:round;stroke-dasharray:3 3;opacity:.72;animation:whale-work-scan-line 1.8s linear .5s infinite}
.work-icon-bar{stroke:#d1def6;stroke-width:2}
.work-icon-status{fill:#8de0bd;stroke:#3d8f75;stroke-width:1.5}
.work-icon-status-alt{fill:#ffd37c;stroke:#ba7c35}
.work-icon-output{stroke:#83a1d3;stroke-width:2;stroke-linecap:round;opacity:.95}
.work-icon-cursor{stroke:#9de7ca;stroke-width:2.8;stroke-linecap:round;animation:whale-work-cursor-blink 1s steps(1,end) infinite}
.work-icon-network{fill:#9de7ca;stroke:#3d8f75;stroke-width:1;animation:whale-work-network-pulse 1.8s ease-in-out .4s infinite}
.work-icon-paper{fill:#fffdf8;stroke:#6d8ac2;stroke-width:2.2;stroke-linejoin:round}
.work-icon-paper-fold{fill:#e5efff;stroke:#7894c7;stroke-width:1.8;stroke-linejoin:round}
.work-icon-pencil{fill:#ffd36d;stroke:#466bb0;stroke-width:2.6;stroke-linejoin:round}
.work-icon-pencil-edge{stroke:#e39c58;stroke-width:2.2;stroke-linecap:round}
.work-icon-tip{fill:#fff4d7;stroke:#466bb0;stroke-width:2.2;stroke-linejoin:round}
.work-icon-ink{stroke:#78a3de;stroke-width:2.4;stroke-linecap:round;stroke-dasharray:4 4;animation:whale-work-ink-dash 1.2s linear infinite}
.work-icon-stroke{stroke:#7d9ccc;stroke-width:1.6;stroke-linecap:round;opacity:.62;stroke-dasharray:5 4;animation:whale-work-stroke-dash 1.7s linear .35s infinite}
[data-tool-kind=search] .whale-work-icon{animation:whale-work-search-loop 2.5s ease-in-out .42s infinite}
[data-tool-kind=read] .whale-work-icon{animation:whale-work-read-loop 2.9s ease-in-out .42s infinite}
[data-tool-kind=command] .whale-work-icon{animation:whale-work-command-loop 1.8s ease-in-out .42s infinite}
[data-tool-kind=write] .whale-work-icon{animation:whale-work-write-loop 2.2s ease-in-out .42s infinite}
[data-tool-kind=search] .whale-work-object::before{border-color:rgba(85,190,229,.46);background:radial-gradient(circle,rgba(132,218,245,.32),rgba(132,218,245,0) 68%)}
[data-tool-kind=read] .whale-work-object::before{border-color:rgba(151,135,220,.4);background:radial-gradient(circle,rgba(211,201,255,.3),rgba(211,201,255,0) 68%)}
[data-tool-kind=command] .whale-work-object::before{border-color:rgba(88,195,159,.42);background:radial-gradient(circle,rgba(167,242,214,.27),rgba(167,242,214,0) 68%)}
[data-tool-kind=write] .whale-work-object::before{border-color:rgba(225,171,87,.42);background:radial-gradient(circle,rgba(255,225,151,.28),rgba(255,225,151,0) 68%)}
[data-tool-kind=search] .whale-work-object{left:70%;top:17%;animation-name:whale-work-search}
[data-tool-kind=read] .whale-work-object{left:66%;top:13%;animation-name:whale-work-read}
[data-tool-kind=command] .whale-work-object{left:68%;top:24%;animation-name:whale-work-command}
[data-tool-kind=write] .whale-work-object{left:72%;top:25%;animation-name:whale-work-write}
[data-whale-work-fx][data-work-reaction=completed] .whale-result-object,[data-whale-work-fx][data-work-reaction=error] .whale-result-object{position:absolute;display:grid;width:78px;height:78px;place-items:center;opacity:0;filter:drop-shadow(0 6px 7px rgba(35,63,124,.2));will-change:transform,opacity}
[data-whale-work-fx][data-work-reaction=completed] .whale-result-object{left:73%;top:13%;animation:whale-result-success-in 2.8s cubic-bezier(.16,1,.3,1) forwards}
[data-whale-work-fx][data-work-reaction=error] .whale-result-object{left:73%;top:16%;animation:whale-result-error-in 2.8s cubic-bezier(.16,1,.3,1) forwards}
.whale-result-icon{width:100%;height:100%;overflow:visible}.result-success-seal{fill:#d8f5e7;stroke:#4a9e7a;stroke-width:3}.result-success-ribbon{fill:#74c6a4;stroke:#3b8669;stroke-width:3;stroke-linejoin:round}.result-success-check{fill:none;stroke:#2f8c67;stroke-width:6;stroke-linecap:round;stroke-linejoin:round;transform-box:fill-box;transform-origin:center;animation:whale-result-check 1.1s ease-out .26s both}.result-success-glint{fill:#fff3ad;transform-box:fill-box;transform-origin:center;animation:whale-result-glint 1.2s ease-in-out .2s infinite alternate}
.result-error-toolbox{fill:#e2efff;stroke:#5f86c4;stroke-width:3}.result-error-handle{fill:none;stroke:#5f86c4;stroke-width:5;stroke-linecap:round}.result-error-latch{fill:none;stroke:#9bb6e2;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.result-error-wrench{fill:#f2a56f;stroke:#aa7441;stroke-width:2.5;stroke-linejoin:round}.result-error-spark{fill:#ffd984;stroke:#aa7441;stroke-width:2;transform-box:fill-box;transform-origin:center;animation:whale-result-glint 1.2s ease-in-out .2s infinite alternate}.result-error-glint{fill:none;stroke:#fff;stroke-width:3;stroke-linecap:round;opacity:.9}
/* Keep the cue on the open side of the character so the bubble and object
   read as one compact composition instead of colliding with each other. */
[data-whale-pet-stage][data-whale-bubble-side=right] [data-tool-kind=search] .whale-work-object{left:18%}
[data-whale-pet-stage][data-whale-bubble-side=right] [data-tool-kind=read] .whale-work-object{left:22%}
[data-whale-pet-stage][data-whale-bubble-side=right] [data-tool-kind=command] .whale-work-object{left:20%}
[data-whale-pet-stage][data-whale-bubble-side=right] [data-tool-kind=write] .whale-work-object{left:16%}
[data-whale-pet-stage][data-whale-bubble-side=right] [data-whale-work-fx][data-work-reaction=completed] .whale-result-object,[data-whale-pet-stage][data-whale-bubble-side=right] [data-whale-work-fx][data-work-reaction=error] .whale-result-object{left:19%}
@media (prefers-reduced-motion:reduce){.whale-work-object,.whale-work-icon,.whale-result-object{animation:none;opacity:.96}}
.emotion-particle{position:absolute;left:var(--fx-x,50%);top:var(--fx-y,45%);display:grid;width:var(--fx-size,24px);height:var(--fx-size,24px);place-items:center;opacity:0;color:#ffe27a;font-style:normal;line-height:1;will-change:transform,opacity}
.emotion-particle.heart,.emotion-particle.shy-heart{font-size:0;color:#ff6f9d;filter:drop-shadow(0 0 7px rgba(255,87,145,.72));animation:whale-heart-rise var(--fx-duration,1450ms) cubic-bezier(.18,.72,.2,1) forwards}
.emotion-particle.heart::before,.emotion-particle.shy-heart::before{position:absolute;left:1px;top:1px;width:14px;height:14px;border-radius:50%;background:currentColor;box-shadow:9px 0 0 currentColor;content:""}
.emotion-particle.heart::after,.emotion-particle.shy-heart::after{position:absolute;left:5px;top:6px;width:16px;height:16px;border-radius:2px;background:currentColor;content:"";transform:rotate(45deg)}
.emotion-particle.shy-heart{width:18px;height:17px;color:#ff9fbb;animation-name:whale-shy-pulse}
.emotion-particle.anger-mark{width:44px;height:44px;color:#ef3145;font-size:0;filter:drop-shadow(0 3px 4px rgba(73,5,19,.32));animation:whale-anger-pop var(--fx-duration,1150ms) cubic-bezier(.2,.9,.18,1) forwards}
.emotion-particle.anger-mark::before,.emotion-particle.anger-mark::after{display:none}
.anger-mark-icon{display:block;width:100%;height:100%;overflow:visible;filter:drop-shadow(0 2px 1px rgba(255,255,255,.18))}
.anger-mark-icon g{transform-origin:50% 50%;animation:whale-anger-mark-pulse 1.1s ease-in-out infinite alternate}
.emotion-particle.anger-steam{font-size:0;border-radius:50% 50% 45% 55%;background:#ffabb8;box-shadow:-10px 6px 0 -5px #ffabb8,10px 5px 0 -4px #ffabb8;filter:drop-shadow(0 2px 2px rgba(110,36,54,.35));animation:whale-anger-steam var(--fx-duration,1700ms) ease-out forwards}
.emotion-particle.surprise{font-size:0;filter:drop-shadow(0 0 8px rgba(255,220,90,.82));animation:whale-surprise-pop var(--fx-duration,1050ms) cubic-bezier(.16,1,.3,1) forwards}
.emotion-particle.surprise::before{width:6px;height:16px;border-radius:4px;background:currentColor;box-shadow:0 21px 0 -1px currentColor;content:""}
.emotion-particle.tear{font-size:0;color:#6ee8ff;filter:drop-shadow(0 0 8px rgba(80,210,255,.75));animation:whale-tear-fall var(--fx-duration,1500ms) ease-in forwards}
.emotion-particle.tear::before{width:12px;height:18px;border-radius:65% 35% 65% 35%;background:currentColor;content:"";transform:rotate(45deg)}
.emotion-particle.sweat-bead,.emotion-particle.sweat-trail{font-size:0;color:#6cbddd;filter:drop-shadow(0 2px 3px rgba(49,126,168,.24));animation:whale-sweat-slide var(--fx-duration,1800ms) cubic-bezier(.24,.7,.34,1) forwards}
.emotion-particle.sweat-bead{width:17px;height:20px}
.emotion-particle.sweat-bead::before,.emotion-particle.sweat-trail::before{width:100%;height:100%;border-radius:65% 35% 62% 38%;background:linear-gradient(135deg,rgba(219,250,255,.96) 0 18%,rgba(104,199,228,.9) 42%,rgba(61,155,193,.74) 100%);border:1px solid rgba(236,254,255,.8);box-shadow:inset 2px 2px 0 rgba(255,255,255,.46);content:"";transform:rotate(42deg) scale(.72)}
.emotion-particle.sweat-trail{width:11px;height:14px;opacity:.82}
.emotion-particle.sweat-trail::before{transform:rotate(42deg) scale(.62)}
.emotion-particle.sparkle,.emotion-particle.proud,.emotion-particle.excited,.emotion-particle.mischief,.emotion-particle.focus{font-size:0;color:#fff0a8;filter:drop-shadow(0 0 9px rgba(255,220,91,.9));animation:whale-sparkle-float var(--fx-duration,1450ms) ease-out forwards}
.emotion-particle.sparkle::before,.emotion-particle.proud::before,.emotion-particle.excited::before,.emotion-particle.mischief::before,.emotion-particle.focus::before{width:21px;height:21px;background:currentColor;clip-path:polygon(50% 0,61% 37%,100% 50%,61% 63%,50% 100%,39% 63%,0 50%,39% 37%);content:""}
.emotion-particle.sparkle::after{width:5px;height:5px;border-radius:50%;background:#fff;box-shadow:15px 7px 0 -1px rgba(255,255,255,.82);content:""}
.emotion-particle.proud{color:#ffd56f}.emotion-particle.proud::after{width:12px;height:12px;border:2px solid currentColor;border-radius:3px;content:"";transform:rotate(45deg)}
.emotion-particle.excited{color:#fff07b}.emotion-particle.excited::after{width:30px;height:2px;border-top:2px solid currentColor;border-bottom:2px solid rgba(255,240,123,.7);content:"";transform:translateX(-4px) rotate(-18deg)}
.emotion-particle.mischief{color:#b997ff}.emotion-particle.mischief::after{width:18px;height:9px;border:2px solid currentColor;border-color:currentColor transparent transparent;border-radius:50%;content:"";transform:translate(2px,7px) rotate(-18deg)}
.emotion-particle.focus{color:#ffdc75}.emotion-particle.focus::after{width:12px;height:12px;border:2px solid currentColor;border-radius:50%;box-shadow:inset 0 0 0 3px rgba(255,255,255,.45);content:""}
.emotion-particle.question{font-family:Georgia,serif;font-size:var(--fx-size,28px);font-weight:900;color:#79bcff;text-shadow:0 2px 0 #254286,0 0 8px rgba(91,177,255,.78);animation:whale-question-bob var(--fx-duration,1900ms) ease-in-out forwards}
.emotion-particle.question::before{content:"?"}
.emotion-particle.thought-dot{width:var(--fx-size,11px);height:var(--fx-size,11px);border:2px solid #7895d2;border-radius:50%;background:#fff;box-shadow:0 2px 5px rgba(54,91,160,.2);animation:whale-thought-dot var(--fx-duration,1350ms) ease-out forwards}
.emotion-particle.gloom{font-size:0;color:#91a9c8;animation:whale-gloom-drift var(--fx-duration,1700ms) ease-in-out forwards}.emotion-particle.gloom::before{width:6px;height:6px;border-radius:50%;background:currentColor;box-shadow:9px 0 0 currentColor,18px 0 0 currentColor;content:""}
.emotion-particle.sleep{width:auto;height:auto;color:#c5e2ff;font-family:Georgia,"Times New Roman",serif;font-size:var(--fx-size,24px);font-weight:900;text-shadow:0 2px 0 #24488f,0 0 11px rgba(92,169,255,.86);animation:whale-sleep-drift var(--fx-duration,1900ms) ease-out forwards}
.emotion-particle.relief,.emotion-particle.relief-spark{font-size:0;color:#a7f1e0;animation:whale-relief-breathe var(--fx-duration,1600ms) ease-out forwards}.emotion-particle.relief::before{width:22px;height:11px;border:3px solid currentColor;border-color:currentColor transparent transparent;border-radius:50%;content:""}
.emotion-particle.relief-spark{width:16px;height:16px;color:#7ed8c6;animation-name:whale-relief-spark}.emotion-particle.relief-spark::before{width:10px;height:10px;border:2px solid currentColor;border-top-color:transparent;border-left-color:transparent;border-radius:50%;content:"";transform:rotate(45deg)}
.emotion-particle.rice-dream-cluster{width:116px;height:106px;font-size:0;transform-origin:72% 54%;animation:whale-rice-dream-cluster var(--fx-duration,2300ms) cubic-bezier(.16,1,.3,1) forwards}
.rice-dream-cluster .rice-thought{position:absolute;border:2px solid #7895d2;border-radius:50%;background:#fff;box-shadow:inset 2px 2px 0 rgba(255,255,255,.9),0 3px 8px rgba(54,91,160,.24)}
.rice-dream-cluster .rice-thought::after{position:absolute;inset:32%;border-radius:50%;background:#dce9ff;content:""}
.rice-dream-cluster .rice-thought-small{left:1px;top:70px;width:11px;height:11px}
.rice-dream-cluster .rice-thought-medium{left:18px;top:45px;width:17px;height:17px}
.rice-dream-cluster .rice-dream{position:absolute;right:0;top:0;width:76px;height:70px;filter:drop-shadow(0 7px 7px rgba(27,54,111,.25));transform-origin:50% 76%}
.rice-dream-cluster .rice-dream svg{display:block;width:100%;height:100%;overflow:visible}
.rice-bowl-shadow{fill:rgba(31,55,108,.18)}
.rice-steam{stroke:#a9d9f0;stroke-width:3.2;filter:drop-shadow(0 1px 1px rgba(255,255,255,.8))}
.rice-steam path{transform-box:fill-box;transform-origin:center bottom;animation:whale-rice-steam 1.15s ease-in-out infinite alternate}
.rice-steam path:nth-child(2){animation-delay:-.38s}.rice-steam path:nth-child(3){animation-delay:-.72s}
.rice-bowl-rim-back{fill:#dceaff;stroke:#365caa;stroke-width:2.7}
.rice-mound{fill:#fffdf6;stroke:#647db3;stroke-width:2.3;stroke-linejoin:round}
.rice-grains{fill:#e2d9c7;opacity:.9}
.rice-bowl-body{stroke:#31559f;stroke-width:2.8;stroke-linejoin:round}
.rice-bowl-rim-front{fill:#86a7e3;stroke:#31559f;stroke-width:2.3;stroke-linejoin:round}
.rice-bowl-highlight{fill:none;stroke:rgba(235,245,255,.9);stroke-width:3.2;stroke-linecap:round}
.rice-bowl-wave{fill:none;stroke:#e7f1ff;stroke-width:2.4;stroke-linecap:round}
.rice-bowl-foot{fill:#4c70bb;stroke:#31559f;stroke-width:2;stroke-linejoin:round}
@keyframes whale-dialogue-pop{0%{opacity:0;transform:translateY(12px) scale(.72)}68%{transform:translateY(-2px) scale(1.035)}100%{opacity:1;transform:translateY(0) scale(1)}}
@keyframes whale-work-object-in{0%{opacity:0;transform:translateY(8px) scale(.72)}100%{opacity:1;transform:translateY(0) scale(1)}}
@keyframes whale-work-aura{0%,100%{opacity:.42;transform:scale(.9)}50%{opacity:.82;transform:scale(1.08)}}
@keyframes whale-work-shadow{0%,100%{opacity:.45;transform:scaleX(.76)}50%{opacity:.7;transform:scaleX(1)}}
@keyframes whale-work-search{0%{opacity:0;transform:translate(5px,8px) rotate(-18deg) scale(.72)}24%{opacity:1;transform:translate(0,0) rotate(7deg) scale(1.04)}54%{transform:translate(-4px,-3px) rotate(-9deg) scale(1)}78%{transform:translate(3px,1px) rotate(6deg) scale(1.02)}100%{opacity:.96;transform:translate(0,0) rotate(0) scale(1)}}
@keyframes whale-work-read{0%{opacity:0;transform:translateY(8px) rotate(-6deg) scale(.72)}24%{opacity:1;transform:translateY(0) rotate(2deg) scale(1.04)}52%{transform:translateY(-2px) rotate(-2deg) scale(1)}78%{transform:translateY(1px) rotate(1deg) scale(1.02)}100%{opacity:.96;transform:translateY(0) rotate(0) scale(1)}}
@keyframes whale-work-command{0%{opacity:0;transform:translateY(10px) scale(.72)}20%{opacity:1;transform:translateY(0) scale(1.04)}42%{transform:translateY(-2px) scale(1)}70%{transform:translateY(1px) scale(1.015)}100%{opacity:.96;transform:translateY(0) scale(1)}}
@keyframes whale-work-write{0%{opacity:0;transform:translate(5px,9px) rotate(12deg) scale(.72)}22%{opacity:1;transform:translate(0,0) rotate(-8deg) scale(1.04)}48%{transform:translate(-3px,-2px) rotate(4deg) scale(1)}75%{transform:translate(2px,1px) rotate(-3deg) scale(1.02)}100%{opacity:.96;transform:translate(0,0) rotate(0) scale(1)}}
@keyframes whale-work-search-loop{0%,100%{transform:translate(0,0) rotate(-5deg)}50%{transform:translate(-3px,-2px) rotate(7deg)}}
@keyframes whale-work-read-loop{0%,100%{transform:rotate(0) scaleY(1)}48%{transform:rotate(-2deg) scaleY(1.02)}72%{transform:rotate(2deg) scaleY(.98)}}
@keyframes whale-work-command-loop{0%,100%{transform:translateY(0)}45%{transform:translateY(-2px)}60%{transform:translateY(0)}}
@keyframes whale-work-write-loop{0%,100%{transform:translate(0,0) rotate(-2deg)}38%{transform:translate(-2px,-2px) rotate(4deg)}60%{transform:translate(1px,1px) rotate(-3deg)}}
@keyframes whale-work-cursor-blink{0%,45%{opacity:1}46%,100%{opacity:.18}}
@keyframes whale-work-ink-dash{from{stroke-dashoffset:0}to{stroke-dashoffset:-8}}
@keyframes whale-work-ray-pulse{0%,100%{opacity:.35;transform:translateX(0)}50%{opacity:.95;transform:translateX(1px)}}
@keyframes whale-work-scan-line{from{stroke-dashoffset:0}to{stroke-dashoffset:-12}}
@keyframes whale-work-page-turn{0%,100%{opacity:.35;transform:translateY(0)}48%{opacity:.9;transform:translateY(-1px)}72%{opacity:.55;transform:translateY(1px)}}
@keyframes whale-work-network-pulse{0%,100%{opacity:.34;transform:scale(.8)}46%{opacity:1;transform:scale(1.15)}}
@keyframes whale-work-stroke-dash{from{stroke-dashoffset:0}to{stroke-dashoffset:-18}}
@keyframes whale-result-success-in{0%{opacity:0;transform:translate(-50%,10px) scale(.62) rotate(-8deg)}18%{opacity:1;transform:translate(-50%,-2px) scale(1.08) rotate(4deg)}36%{transform:translate(-50%,0) scale(1) rotate(-1deg)}78%{opacity:1;transform:translate(-50%,-3px) scale(1.02) rotate(1deg)}100%{opacity:0;transform:translate(-50%,-15px) scale(.88) rotate(5deg)}}
@keyframes whale-result-error-in{0%{opacity:0;transform:translate(-50%,9px) scale(.62) rotate(10deg)}18%{opacity:1;transform:translate(-50%,-1px) scale(1.06) rotate(-5deg)}40%{transform:translate(-50%,0) scale(1) rotate(2deg)}76%{opacity:1;transform:translate(-50%,-2px) scale(1.02) rotate(-1deg)}100%{opacity:0;transform:translate(-50%,-13px) scale(.9) rotate(-4deg)}}
@keyframes whale-result-check{from{stroke-dasharray:48;stroke-dashoffset:48;opacity:.4}to{stroke-dashoffset:0;opacity:1}}
@keyframes whale-result-glint{from{opacity:.3;transform:scale(.72) rotate(-8deg)}to{opacity:1;transform:scale(1.08) rotate(8deg)}}
@keyframes whale-menu-view-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
@keyframes whale-heart-rise{0%{opacity:0;transform:translate(-50%,10px) scale(.25)}18%{opacity:1;transform:translate(-50%,0) scale(1.08)}100%{opacity:0;transform:translate(calc(-50% + var(--fx-drift,0px)),-92px) scale(.72) rotate(14deg)}}
@keyframes whale-shy-pulse{0%{opacity:0;transform:translate(-50%,3px) scale(.35)}22%{opacity:1;transform:translate(-50%,0) scale(1.12)}70%{opacity:1;transform:translate(-50%,-5px) scale(.92)}100%{opacity:0;transform:translate(-50%,-20px) scale(.7)}}
@keyframes whale-anger-pop{0%{opacity:0;transform:translate(-50%,8px) scale(.25) rotate(-12deg)}16%{opacity:1;transform:translate(-50%,0) scale(1.16) rotate(5deg)}70%{opacity:1;transform:translate(-50%,-2px) scale(1)}100%{opacity:0;transform:translate(-50%,-12px) scale(.9)}}
@keyframes whale-anger-mark-pulse{from{transform:rotate(-3deg) scale(.96)}to{transform:rotate(3deg) scale(1.03)}}
@keyframes whale-anger-steam{0%{opacity:0;transform:translate(-50%,14px) scale(.35)}20%{opacity:1;transform:translate(-50%,0) scale(1.04)}72%{opacity:.96;transform:translate(calc(-50% + var(--fx-drift,0px)),-30px) scale(1.12)}100%{opacity:0;transform:translate(calc(-50% + var(--fx-drift,0px)),-54px) scale(.88)}}
@keyframes whale-surprise-pop{0%{opacity:0;transform:translate(-50%,12px) scale(.15)}24%{opacity:1;transform:translate(-50%,-4px) scale(1.25)}100%{opacity:0;transform:translate(-50%,-24px) scale(.82)}}
@keyframes whale-tear-fall{0%{opacity:0;transform:translate(-50%,-8px) scale(.45)}18%{opacity:1;transform:translate(-50%,0) scale(1)}100%{opacity:0;transform:translate(calc(-50% + var(--fx-drift,0px)),54px) scale(.72)}}
@keyframes whale-sweat-slide{0%{opacity:0;transform:translate(-50%,-8px) scale(.45) rotate(-8deg)}20%{opacity:1;transform:translate(-50%,0) scale(1) rotate(0)}62%{opacity:.92;transform:translate(calc(-50% + 2px),12px) scale(.9) rotate(8deg)}86%{opacity:.48;transform:translate(calc(-50% + 4px),23px) scale(.72) rotate(14deg)}100%{opacity:0;transform:translate(calc(-50% + 5px),30px) scale(.55) rotate(18deg)}}
@keyframes whale-sparkle-float{0%{opacity:0;transform:translate(-50%,8px) scale(.2)}22%{opacity:1;transform:translate(-50%,-4px) scale(1.12) rotate(18deg)}100%{opacity:0;transform:translate(calc(-50% + var(--fx-drift,0px)),-78px) scale(.45) rotate(82deg)}}
@keyframes whale-question-bob{0%{opacity:0;transform:translate(-50%,10px) scale(.3)}18%{opacity:1;transform:translate(-50%,-4px) scale(1.12)}74%{opacity:1;transform:translate(calc(-50% + 4px),-15px) scale(1.04)}100%{opacity:0;transform:translate(calc(-50% + var(--fx-drift,0px)),-34px) scale(.72)}}
@keyframes whale-thought-dot{0%{opacity:0;transform:translate(-50%,8px) scale(.25)}28%{opacity:.9;transform:translate(-50%,0) scale(1)}78%{opacity:.82;transform:translate(calc(-50% + var(--fx-drift,0px)),-12px) scale(.88)}100%{opacity:0;transform:translate(calc(-50% + var(--fx-drift,0px)),-24px) scale(.62)}}
@keyframes whale-gloom-drift{0%{opacity:0;transform:translate(-50%,-6px) scale(.7)}25%{opacity:.95;transform:translate(-50%,0) scale(1)}100%{opacity:0;transform:translate(calc(-50% + var(--fx-drift,0px)),20px) scale(.85)}}
@keyframes whale-sleep-drift{0%{opacity:0;transform:translate(-50%,12px) scale(.45)}18%{opacity:1;transform:translate(-50%,0) scale(.94)}100%{opacity:0;transform:translate(calc(-50% + 28px),-76px) scale(1.3) rotate(12deg)}}
@keyframes whale-relief-breathe{0%{opacity:0;transform:translate(-50%,10px) scale(.55)}24%{opacity:1;transform:translate(-50%,-2px) scale(1.08)}100%{opacity:0;transform:translate(calc(-50% + var(--fx-drift,0px)),-66px) scale(.6)}}
@keyframes whale-relief-spark{0%{opacity:0;transform:translate(-50%,6px) rotate(-18deg) scale(.35)}28%{opacity:.82;transform:translate(-50%,-2px) rotate(10deg) scale(1)}100%{opacity:0;transform:translate(calc(-50% + var(--fx-drift,0px)),-44px) rotate(68deg) scale(.6)}}
@keyframes whale-rice-dream-cluster{0%{opacity:0;filter:blur(2px);transform:translate(-50%,12px) scale(.55) rotate(-4deg)}18%{opacity:1;filter:blur(0);transform:translate(-50%,-2px) scale(1.04) rotate(1deg)}38%{transform:translate(-50%,0) scale(1) rotate(0)}76%{opacity:1;transform:translate(-50%,-4px) scale(1.018) rotate(-.7deg)}100%{opacity:0;filter:blur(.35px);transform:translate(-50%,-14px) scale(.88) rotate(2deg)}}
@keyframes whale-rice-steam{from{opacity:.42;transform:translateY(2px) scaleY(.88) rotate(-3deg)}to{opacity:.95;transform:translateY(-3px) scaleY(1.08) rotate(3deg)}}
@keyframes whale-emotion-scene-lifecycle{0%{opacity:0;transform:translate(-50%,10px) scale(.68)}14%{opacity:1;transform:translate(-50%,-2px) scale(1.04)}24%,78%{opacity:1;transform:translate(-50%,0) scale(1)}100%{opacity:0;transform:translate(-50%,-12px) scale(.88)}}
@keyframes whale-sad-cloud-breathe{from{transform:translateY(0) scaleX(.98)}to{transform:translateY(-2px) scaleX(1.02)}}
@keyframes whale-sad-raindrop{0%{opacity:0;transform:translateY(-3px) scale(.72)}18%{opacity:1}100%{opacity:0;transform:translateY(17px) scale(.9)}}
@keyframes whale-happy-sun-rays{to{transform:rotate(360deg)}}
@keyframes whale-happy-sun-pulse{from{filter:brightness(.98);transform:scale(.96)}to{filter:brightness(1.08);transform:scale(1.03)}}
@keyframes whale-crown-glint{0%,32%,100%{opacity:.35;transform:scale(.72) rotate(-12deg)}56%{opacity:1;transform:scale(1.08) rotate(5deg)}}
@keyframes whale-target-arrow{0%,100%{transform:translate(2px,-2px)}50%{transform:translate(-2px,2px)}}
@keyframes whale-target-glint{from{opacity:.3;transform:scale(.72)}to{opacity:1;transform:scale(1.08)}}
@keyframes whale-tea-steam{0%{opacity:0;transform:translateY(5px) scaleY(.72)}34%{opacity:.9}100%{opacity:0;transform:translateY(-12px) scaleY(1.16)}}
@keyframes whale-tissue-flutter{from{transform:rotate(-2deg) scaleX(.98)}to{transform:rotate(3deg) scaleX(1.02)}}
@keyframes whale-bell-ring{from{transform:rotate(-5deg)}to{transform:rotate(5deg)}}
@keyframes whale-bell-rings{0%{opacity:0;transform:scale(.86)}35%{opacity:.9}100%{opacity:0;transform:scale(1.08)}}
@keyframes whale-mischief-coil{from{transform:translateY(3px) scaleY(.88)}to{transform:translateY(-3px) scaleY(1.08)}}
@keyframes whale-mischief-star{from{transform:translateY(2px) rotate(-5deg) scale(.92)}to{transform:translateY(-3px) rotate(5deg) scale(1.04)}}
@keyframes whale-mischief-lid{from{transform:rotate(-2deg)}to{transform:rotate(-8deg) translateY(-2px)}}
@keyframes whale-gift-bow{from{transform:scale(.94) rotate(-2deg)}to{transform:scale(1.04) rotate(2deg)}}
@keyframes whale-gift-glow{from{opacity:.35;transform:scale(.7) rotate(-8deg)}to{opacity:1;transform:scale(1.05) rotate(6deg)}}
@keyframes whale-love-seal{from{transform:scale(.92) rotate(-4deg)}to{transform:scale(1.08) rotate(4deg)}}
@keyframes whale-love-glint{0%,100%{opacity:.35;transform:scale(.72) rotate(-8deg)}50%{opacity:1;transform:scale(1.08) rotate(6deg)}}
@keyframes whale-shy-fan-heart{from{transform:scale(.86) rotate(-6deg)}to{transform:scale(1.08) rotate(7deg)}}
@keyframes whale-angry-burst{from{transform:rotate(-3deg) scale(.97)}to{transform:rotate(3deg) scale(1.04)}}
@keyframes whale-angry-steam-rise{from{opacity:.28;transform:translateY(2px) scale(.9)}to{opacity:1;transform:translateY(-4px) scale(1.06)}}
@keyframes whale-confused-card{from{transform:rotate(-7deg) translateY(1px)}to{transform:rotate(4deg) translateY(-3px)}}
@keyframes whale-confused-glint{from{opacity:.25;transform:scale(.72) rotate(-8deg)}to{opacity:1;transform:scale(1.1) rotate(8deg)}}
@keyframes whale-sleepy-moon{from{transform:translateY(2px) rotate(-2deg)}to{transform:translateY(-3px) rotate(3deg)}}
@keyframes whale-sleepy-star{from{opacity:.35;transform:scale(.8) rotate(-8deg)}to{opacity:1;transform:scale(1.08) rotate(10deg)}}
@keyframes whale-sleepy-zzz{from{opacity:.35;transform:translateY(3px)}to{opacity:1;transform:translateY(-4px)}}
@keyframes whale-nervous-board{from{transform:rotate(-1.2deg) translateX(-1px)}to{transform:rotate(1.2deg) translateX(1px)}}
@keyframes whale-nervous-sweat{0%,100%{opacity:.45;transform:translateY(-1px) rotate(-8deg)}50%{opacity:1;transform:translateY(4px) rotate(8deg)}}
@keyframes whale-hungry-glint{from{opacity:.3;transform:scale(.72) rotate(-8deg)}to{opacity:1;transform:scale(1.08) rotate(8deg)}}
@keyframes whale-love-envelope-in{0%{opacity:0;transform:translate(-50%,9px) rotate(-9deg) scale(.7)}18%{opacity:1;transform:translate(-50%,-3px) rotate(4deg) scale(1.04)}38%{transform:translate(-50%,0) rotate(-2deg) scale(1)}78%{opacity:1;transform:translate(-50%,-3px) rotate(2deg) scale(1.01)}100%{opacity:0;transform:translate(-50%,-15px) rotate(7deg) scale(.88)}}
@keyframes whale-shy-fan-in{0%{opacity:0;transform:translate(-50%,11px) rotate(12deg) scale(.72)}22%{opacity:1;transform:translate(-50%,-2px) rotate(-5deg) scale(1.04)}46%{transform:translate(-50%,0) rotate(3deg) scale(1)}78%{opacity:1;transform:translate(-50%,-3px) rotate(-2deg) scale(1.02)}100%{opacity:0;transform:translate(-50%,-12px) rotate(-10deg) scale(.9)}}
@keyframes whale-angry-burst-in{0%{opacity:0;transform:translate(-50%,7px) scale(.55) rotate(-12deg)}16%{opacity:1;transform:translate(-50%,-1px) scale(1.12) rotate(5deg)}38%{transform:translate(-50%,0) scale(1) rotate(-2deg)}76%{opacity:1;transform:translate(-50%,-2px) scale(1.03) rotate(2deg)}100%{opacity:0;transform:translate(-50%,-12px) scale(.88) rotate(-5deg)}}
@keyframes whale-confused-card-in{0%{opacity:0;transform:translate(-50%,10px) rotate(-14deg) scale(.68)}20%{opacity:1;transform:translate(-50%,-2px) rotate(6deg) scale(1.05)}50%{transform:translate(-50%,0) rotate(-5deg) scale(1)}80%{opacity:1;transform:translate(-50%,-3px) rotate(3deg) scale(1.02)}100%{opacity:0;transform:translate(-50%,-15px) rotate(9deg) scale(.88)}}
@keyframes whale-sleepy-moon-in{0%{opacity:0;transform:translate(-50%,8px) rotate(-7deg) scale(.7)}24%{opacity:1;transform:translate(-50%,-2px) rotate(3deg) scale(1.04)}52%{transform:translate(-50%,1px) rotate(-2deg) scale(1)}82%{opacity:1;transform:translate(-50%,-5px) rotate(2deg) scale(1.02)}100%{opacity:0;transform:translate(-50%,-22px) rotate(7deg) scale(.9)}}
@keyframes whale-nervous-checklist-in{0%{opacity:0;transform:translate(-50%,8px) rotate(8deg) scale(.72)}20%{opacity:1;transform:translate(-50%,-1px) rotate(-4deg) scale(1.04)}44%{transform:translate(-50%,0) rotate(3deg) scale(1)}72%{opacity:1;transform:translate(-50%,-2px) rotate(-2deg) scale(1.01)}100%{opacity:0;transform:translate(-50%,-11px) rotate(4deg) scale(.9)}}
@keyframes whale-hungry-tray-in{0%{opacity:0;transform:translate(-50%,12px) rotate(-5deg) scale(.64)}18%{opacity:1;transform:translate(-50%,-2px) rotate(2deg) scale(1.05)}42%{transform:translate(-50%,0) rotate(-1deg) scale(1)}80%{opacity:1;transform:translate(-50%,-4px) rotate(1deg) scale(1.02)}100%{opacity:0;transform:translate(-50%,-14px) rotate(4deg) scale(.88)}}
@media (prefers-reduced-motion:reduce){.emotion-scene-prop,.emotion-scene-icon *{animation:none!important}.emotion-scene-prop{opacity:.96;transform:translate(-50%,0)}}
@media (max-width:700px){[data-whale-dialogue]{max-width:calc(100vw - 20px)}[data-whale-menu-panel]{width:min(306px,calc(100vw - 16px))}[data-whale-chat-composer]{bottom:-66px}}
@media (forced-colors:active){
  [data-whale-pet-hotspot]:focus-visible,[data-whale-pet-menu] button:focus-visible,[data-whale-pet-summon]:focus-visible{outline:2px solid Highlight;outline-offset:2px}
  [data-whale-pet-menu],[data-whale-pet-bubble],[data-whale-pet-summon],[data-whale-setting],[data-whale-ledger],[data-whale-debug-panel]{border-color:CanvasText;background:Canvas;color:CanvasText}
  [data-whale-ledger-header] button:focus-visible,[data-whale-ledger-privacy] button:focus-visible{outline:2px solid Highlight;outline-offset:2px}
}
@media (max-width:600px){[data-whale-ledger]{max-height:calc(100vh - 24px)}}

/* Dialogue craft pass: the bubble grows with real copy, while the detached
   composer borrows the compact model switcher rhythm of a workbench. */
[data-whale-dialogue]{width:min(var(--speech-width),calc(100vw - 24px));min-height:var(--speech-height)}
[data-whale-dialogue][data-variant=feedback]{width:min(var(--speech-width),calc(100vw - 24px))}
[data-whale-dialogue][data-text-length=long] [data-whale-dialogue-message]{font-size:clamp(17px,1.55vw,20px);line-height:1.28}
[data-whale-dialogue][data-text-length=medium] [data-whale-dialogue-message]{font-size:clamp(18px,1.65vw,21px);line-height:1.23}
[data-whale-dialogue-hide]{right:14px;top:13px;width:22px;height:22px;border:1px solid #d3dced;border-radius:50%;background:rgba(255,255,255,.86);color:#7890bb;box-shadow:0 2px 6px rgba(40,69,142,.08);opacity:.82}
[data-whale-dialogue-hide]:hover,[data-whale-dialogue-hide]:focus-visible{background:#edf4ff;color:#3e5f9f;opacity:1;outline:2px solid rgba(69,111,210,.2);outline-offset:1px}
[data-whale-chat-head]{height:48px;padding:0 9px 0 5px;background:#fbfcff}
[data-whale-chat-head]>strong{white-space:nowrap;color:#39558f;font-size:12px}
[data-whale-chat-options]{display:flex;align-items:center;gap:2px;margin-left:auto;margin-right:5px;padding:2px;border:1px solid #d8e1ef;border-radius:9px;background:#f2f5fa}
[data-whale-chat-options] button{height:25px;padding:0 7px;border:0;border-radius:7px;background:transparent;color:#8a98b3;font-size:9px;cursor:pointer}
[data-whale-chat-options] button[aria-pressed=true]{background:#fff;color:#36589b;font-weight:800;box-shadow:0 1px 4px rgba(44,74,136,.12)}
[data-whale-chat-options] select{max-width:105px;height:25px;padding:0 18px 0 6px;border:1px solid #cdd8e9;border-radius:7px;background:#fff;color:#4f6595;font-size:9px;outline:0}
[data-whale-chat-options] select:disabled{color:#a3aec2;background:#f5f7fb}
[data-whale-chat-head] button{width:28px;height:28px;border-radius:50%;color:#8294b7}
[data-whale-chat-head] button:hover,[data-whale-chat-head] button:focus-visible{background:#edf3ff;color:#4466a2;outline:2px solid rgba(83,109,168,.16);outline-offset:1px}
[data-whale-chat-entry]{padding:10px}
[data-whale-chat-entry] input{height:42px;border-radius:13px;font-size:12px}
[data-whale-chat-entry] button{height:42px;border-radius:13px;background:#4f6eae}
[data-whale-chat-entry] button:hover{background:#3c5b9d}
[data-whale-llm-mode]{display:grid;grid-template-columns:1fr 1fr;gap:3px;margin:0 0 10px;padding:3px;border:1px solid #d8e1ef;border-radius:10px;background:#f2f5fa}
[data-whale-llm-mode] button{min-height:30px;border:0;border-radius:7px;background:transparent;color:#8391ad;font-size:10px;cursor:pointer}
[data-whale-llm-mode] button[data-active=true]{background:#fff;color:#36589b;font-weight:800;box-shadow:0 1px 5px rgba(44,74,136,.12)}
[data-whale-setting-field] select{box-sizing:border-box;width:100%;height:34px;padding:0 9px;border:1px solid #cbd5e8;border-radius:8px;background:#fff;color:#314a85;font-size:10px;outline:0}
[data-whale-llm-remember]{margin-top:8px;border-bottom:0}
[data-whale-llm-actions]{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:9px}
[data-whale-llm-actions] button{min-height:32px;padding:0 7px;border:1px solid #c4d1e7;border-radius:8px;background:#f7f9fd;color:#49649c;font-size:9px;cursor:pointer}
[data-whale-llm-actions] button:hover,[data-whale-llm-actions] button:focus-visible{border-color:#83a0d4;background:#edf3ff;color:#294d92;outline:2px solid rgba(83,109,168,.14);outline-offset:1px}
[data-whale-llm-actions] button:disabled{cursor:not-allowed;opacity:.46}
[data-whale-llm-status]{display:block;margin-top:8px;color:#94a1b9;font-size:9px;line-height:1.45}
[data-whale-llm-status][data-state=ok]{color:#4f8b79}
[data-whale-llm-status][data-state=error]{color:#b46672}

/* Keep the panel's escape hatch in the viewport even when the model form is
   long enough to scroll. */
[data-whale-menu-panel]{overflow-x:hidden;overflow-y:auto}
[data-whale-menu-close-float]{position:sticky;z-index:20;top:9px;display:grid;width:28px;height:28px;align-items:center;justify-content:center;float:right;margin:0 10px -28px auto;padding:0;border:1px solid #c9d5e8;border-radius:50%;background:rgba(255,255,255,.96);color:#6079ad;box-shadow:0 3px 9px rgba(37,65,124,.13);cursor:pointer}
[data-whale-menu-close-float] svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-linecap:round;stroke-width:1.8}
[data-whale-menu-close-float]:hover,[data-whale-menu-close-float]:focus-visible{background:#edf3ff;color:#2f559b;outline:2px solid rgba(83,109,168,.2);outline-offset:1px}
[data-whale-menu-avatar]{overflow:hidden;padding:0!important;background:#eaf1ff}
[data-whale-menu-avatar] img{display:block;width:100%;height:100%;object-fit:cover;object-position:50% 20%;transform:scale(2.35);transform-origin:50% 20%;pointer-events:none}
[data-whale-llm-mode]{gap:4px;border:2px solid #b7c9e7;background:#e9f0ff}
[data-whale-llm-mode] button{min-height:34px;color:#6078a7;font-size:10px;font-weight:700}
[data-whale-llm-mode] button[data-active=true]{background:#3f63a8;color:#fff;box-shadow:0 2px 7px rgba(49,83,151,.25)}
[data-whale-model-row]{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:7px}
[data-whale-model-row] [data-whale-setting-field]{min-width:0}
[data-whale-fetch-models]{height:34px;padding:0 9px;border:1px solid #aebfdf;border-radius:8px;background:#f4f7fd;color:#43629a;font-size:9px;white-space:nowrap;cursor:pointer}
[data-whale-fetch-models]:hover,[data-whale-fetch-models]:focus-visible{border-color:#6c8fc8;background:#eaf1ff;color:#294f97;outline:2px solid rgba(83,109,168,.15);outline-offset:1px}
[data-whale-fetch-models]:disabled{cursor:not-allowed;opacity:.45}
[data-whale-llm-actions]{grid-template-columns:1fr}

/* The companion controls live in the viewport layer, not inside the scaled
   character stage. This keeps the menu readable, movable and edge-safe. */
[data-whale-menu-toggle]{position:fixed;z-index:2147483003;top:calc(var(--menu-anchor-top) + var(--menu-anchor-height) * .48);right:auto;left:calc(var(--menu-anchor-left) + var(--menu-anchor-width) - 5px);display:grid;width:46px;height:46px;padding:0;place-items:center;transform:translateY(-50%);border:1px solid #b9c8e4;border-radius:14px;background:#fff;box-shadow:0 10px 26px rgba(30,58,116,.18);cursor:pointer;transition:box-shadow .18s ease,transform .18s ease,background .18s ease;opacity:1;pointer-events:auto}
[data-whale-menu-toggle][data-side=left]{left:calc(var(--menu-anchor-left) - 41px)}
[data-whale-menu-toggle]:hover,[data-whale-menu-toggle]:focus-visible{background:#f4f7ff;box-shadow:0 12px 30px rgba(30,58,116,.25);transform:translateY(-50%) scale(1.04);outline:2px solid rgba(83,109,168,.22);outline-offset:2px}
[data-whale-menu-toggle] svg{width:23px;height:23px;fill:none;stroke:#304f91;stroke-linecap:round;stroke-width:1.9}
[data-whale-menu-toggle][aria-expanded=true]{opacity:0;pointer-events:none}
[data-whale-menu-panel]{position:fixed;z-index:2147483002;top:calc(var(--menu-anchor-top) + var(--menu-anchor-height) * .5 + var(--menu-y));left:calc(var(--menu-anchor-left) - 330px + var(--menu-x));right:auto;width:min(318px,calc(100vw - 24px));max-height:min(560px,calc(100vh - 24px));padding:0;overflow:auto;border:1px solid #c7d3e8;border-radius:18px;background:rgba(255,255,255,.985);color:#304f91;box-shadow:0 18px 48px rgba(28,54,108,.2);opacity:0;pointer-events:none;transform:translateY(-50%) translateX(12px) scale(.98);transform-origin:right center;transition:transform .22s cubic-bezier(.2,.78,.22,1),opacity .18s ease;scrollbar-width:thin;scrollbar-color:#b7c5df transparent}
[data-whale-menu-panel][data-side=left]{left:calc(var(--menu-anchor-left) - 330px + var(--menu-x))}
[data-whale-menu-panel][data-side=right]{left:calc(var(--menu-anchor-left) + var(--menu-anchor-width) + 12px + var(--menu-x));transform-origin:left center}
[data-whale-menu-panel][data-open=true]{opacity:1;pointer-events:auto;transform:translateY(-50%) translateX(0) scale(1)}
[data-whale-menu-panel][data-dragging=true]{user-select:none;transition:none;cursor:grabbing}
[data-whale-menu-head]{display:flex;align-items:center;gap:9px;min-height:58px;padding:8px 12px 8px 8px;border-bottom:1px solid #e5eaf3;background:#fbfcff;cursor:grab;user-select:none}
[data-whale-menu-head]:focus-visible{outline:2px solid #7895cf;outline-offset:-2px}
[data-whale-menu-head]:active{cursor:grabbing}
[data-whale-menu-grip]{display:grid;width:20px;height:30px;flex:0 0 auto;place-items:center;color:#9aabcd}
[data-whale-menu-grip] svg{width:16px;height:26px;fill:currentColor}
[data-whale-menu-avatar]{display:grid;width:32px;height:32px;flex:0 0 auto;place-items:center;border:1px solid #b9c9e5;border-radius:50%;background:#eaf1ff;color:#31539b;font:700 16px "STKaiti","KaiTi",serif}
[data-whale-menu-head]>span:nth-of-type(3){min-width:0;flex:1}
[data-whale-menu-head] strong,[data-whale-menu-head] small{display:block}
[data-whale-menu-head] strong{color:#263f82;font-size:13px;line-height:1.15}
[data-whale-menu-head] small{margin-top:3px;color:#8b9abb;font-size:10px;line-height:1.15}
[data-whale-menu-head]>button{display:grid;width:30px;height:30px;flex:0 0 auto;padding:0;place-items:center;border:0;border-radius:9px;background:transparent;color:#7185ad;cursor:pointer}
[data-whale-menu-head]>button:hover,[data-whale-menu-head]>button:focus-visible{background:#edf3ff;color:#36599e;outline:2px solid rgba(83,109,168,.18);outline-offset:1px}
[data-whale-menu-head]>button svg,[data-whale-dialogue-hide] svg,[data-whale-chat-head] button svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-linecap:round;stroke-width:1.8}
[data-whale-menu-tabs]{display:grid;grid-template-columns:repeat(5,1fr);gap:3px;padding:8px 10px;border-bottom:1px solid #e6ebf4;background:#fff}
[data-whale-menu-tabs] button{min-height:32px;padding:0 2px;border:1px solid transparent;border-radius:8px;background:transparent;color:#8290ae;font-size:10px;cursor:pointer}
[data-whale-menu-tabs] button:hover,[data-whale-menu-tabs] button:focus-visible{background:#f4f7fd;color:#405f9e;outline:2px solid rgba(83,109,168,.18);outline-offset:1px}
[data-whale-menu-tabs] button[data-active=true]{border-color:#b4c5e5;background:#edf3ff;color:#29498d;font-weight:800}
[data-whale-menu-view]{display:none;padding:16px}
[data-whale-menu-view][data-active=true]{display:block;animation:whale-menu-view-in .18s ease-out}
[data-whale-menu-view] h3{margin:0 0 5px;color:#263f82;font-size:14px;line-height:1.3}
[data-whale-menu-view]>p{margin:0 0 12px;color:#7e8eae;font-size:10px;line-height:1.55}
[data-whale-menu-primary]{width:100%;min-height:38px;border:1px solid #4464a5;border-radius:10px;background:#3c5e9f;color:#fff;font-size:11px;font-weight:800;cursor:pointer}
[data-whale-menu-primary]:hover,[data-whale-menu-primary]:focus-visible{background:#31518f;outline:2px solid rgba(83,109,168,.22);outline-offset:2px}
[data-whale-quick-lines]{display:grid;gap:6px;margin-top:9px}
[data-whale-quick-lines] button,[data-whale-menu-actions] button,[data-whale-account-actions] button,[data-whale-emotion-grid] button{box-sizing:border-box;min-height:35px;padding:7px 9px;border:1px solid #d5deed;border-radius:9px;background:#f8faff;color:#4b6095;font-size:10px;line-height:1.35;cursor:pointer}
[data-whale-quick-lines] button{text-align:left}
[data-whale-menu-actions],[data-whale-account-actions]{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:9px}
[data-whale-menu-actions][data-compact=true]{margin-top:0}
[data-whale-menu-actions] button:hover,[data-whale-menu-actions] button:focus-visible,[data-whale-account-actions] button:hover,[data-whale-account-actions] button:focus-visible,[data-whale-emotion-grid] button:hover,[data-whale-emotion-grid] button:focus-visible,[data-whale-quick-lines] button:hover,[data-whale-quick-lines] button:focus-visible{border-color:#93aada;background:#eef4ff;color:#23458f;outline:2px solid rgba(83,109,168,.16);outline-offset:1px}
[data-whale-emotion-grid]{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}
[data-whale-emotion-grid] button{min-width:0;padding:7px 2px}
[data-whale-llm-settings]{margin-top:12px;border-top:1px solid #e4eaf3;color:#50658f}
[data-whale-llm-settings] summary{padding:11px 2px 3px;color:#536c9e;font-size:10px;cursor:pointer}
[data-whale-llm-fields]{padding-top:4px}
[data-whale-menu-panel] [data-whale-setting-row]{min-height:36px}
[data-whale-dialogue-hide]{right:18px;top:18px;display:grid;width:28px;height:28px;place-items:center;border:1px solid #d2ddef;border-radius:9px;background:#fff;color:#6078aa;box-shadow:0 3px 10px rgba(36,66,125,.12);opacity:.9}
[data-whale-dialogue-hide] svg{width:15px;height:15px}
[data-whale-chat-head] button svg{width:15px;height:15px}
@media (max-width:700px){[data-whale-menu-panel]{width:min(318px,calc(100vw - 24px));max-height:calc(100vh - 24px)}[data-whale-menu-toggle]{width:42px;height:42px}}

/* Menu information architecture: compact top-level navigation with a
   dedicated performance browser instead of one undifferentiated button wall. */
[data-whale-menu-panel]{left:calc(var(--menu-anchor-left) - 348px + var(--menu-x));width:min(336px,calc(100vw - 24px));max-height:min(640px,calc(100vh - 24px))}
[data-whale-menu-panel][data-side=left]{left:calc(var(--menu-anchor-left) - 348px + var(--menu-x))}
[data-whale-menu-head]>span[data-whale-menu-avatar]:nth-child(2){width:34px;min-width:34px;height:34px;flex:0 0 34px;padding:0;border-radius:50%}
[data-whale-menu-head]>span:nth-of-type(3){min-width:0;flex:1}
[data-whale-menu-head] strong{font-size:14px;font-weight:800}
[data-whale-menu-head] small{font-size:10px}
[data-whale-menu-tabs]{gap:1px;padding:7px 9px}
[data-whale-menu-tabs] button{min-height:35px;font-size:10px}
[data-whale-menu-tabs] button[data-active=true]{border-color:transparent;background:#eaf1ff;box-shadow:inset 0 0 0 1px #b9c9e7}
[data-whale-menu-view]{padding:16px 16px 18px}
[data-whale-menu-view] h3{font-size:15px;letter-spacing:-.01em}
[data-whale-menu-view]>p{margin-bottom:14px;font-size:10.5px;line-height:1.55}
[data-whale-menu-actions][data-compact=true] button{min-height:42px;font-size:11px;font-weight:700}
[data-whale-acting-switch]{display:grid;grid-template-columns:repeat(3,1fr);gap:3px;margin-bottom:10px;padding:3px;border:1px solid #d9e2f0;border-radius:11px;background:#f3f6fb}
[data-whale-acting-switch] button{min-height:34px;padding:0 8px;border:0;border-radius:8px;background:transparent;color:#7181a3;font-size:10px;cursor:pointer}
[data-whale-acting-switch] button[data-active=true]{background:#fff;color:#29498d;font-weight:800;box-shadow:0 2px 8px rgba(34,66,126,.12)}
[data-whale-acting-switch] button:hover,[data-whale-acting-switch] button:focus-visible{color:#29498d;outline:2px solid rgba(83,109,168,.18);outline-offset:1px}
[data-whale-acting-view]{display:none}
[data-whale-acting-view][data-active=true]{display:block;animation:whale-menu-view-in .16s ease-out}
[data-whale-performance-list]{display:grid;border-top:1px solid #e3e9f3}
[data-whale-performance-list]>button{display:flex;width:100%;min-height:52px;align-items:center;gap:10px;padding:7px 2px;border:0;border-bottom:1px solid #e3e9f3;background:transparent;color:#40598f;text-align:left;cursor:pointer}
[data-whale-performance-list]>button>span{min-width:0;flex:1}
[data-whale-performance-list] strong,[data-whale-performance-list] small{display:block}
[data-whale-performance-list] strong{color:#304d8b;font-size:11px;line-height:1.25}
[data-whale-performance-list] small{margin-top:3px;color:#7e8dae;font-size:9px;line-height:1.3}
[data-whale-performance-list] em{flex:0 0 auto;padding:3px 7px;border-radius:999px;background:#edf3ff;color:#5670a7;font-size:9px;font-style:normal;line-height:1.2}
[data-whale-performance-list]>button:hover,[data-whale-performance-list]>button:focus-visible{padding-left:7px;padding-right:7px;background:#f3f7ff;outline:2px solid rgba(83,109,168,.17);outline-offset:-2px}
[data-whale-emotion-grid]{grid-template-columns:repeat(4,1fr);gap:7px}
[data-whale-emotion-grid] button{min-height:38px;font-size:10px}
[data-whale-section-label]{margin:14px 0 7px;color:#61759f;font-size:10px;font-weight:800}
[data-whale-menu-view][data-active=true] [data-whale-quick-lines]{margin-top:0}
[data-whale-quick-lines] button{padding:7px 9px;font-size:9.5px}
@media (max-width:700px){[data-whale-menu-panel]{width:min(318px,calc(100vw - 24px));max-height:calc(100vh - 24px)}[data-whale-menu-panel][data-side=left]{left:calc(var(--menu-anchor-left) - 370px + var(--menu-x))}}
@media (pointer:coarse){[data-whale-menu-tabs] button,[data-whale-acting-switch] button,[data-whale-emotion-grid] button{min-height:44px}[data-whale-performance-list]>button{min-height:58px}}
@keyframes whale-pet-breathe{0%,100%{transform:translateY(0) scaleY(1)}50%{transform:translateY(-2px) scaleY(1.012)}}
@keyframes whale-pet-work{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-1px) rotate(-1deg)}}
@keyframes whale-pet-hop{0%,100%{transform:translateY(0) rotate(0deg)}45%{transform:translateY(-5px) rotate(-2deg)}}
@keyframes whale-pet-shake{from{transform:translateX(-2px) rotate(-2deg)}to{transform:translateX(2px) rotate(2deg)}}
@keyframes whale-butterfly-flit{from{transform:translateY(-2px) rotate(-7deg) scaleX(.86)}to{transform:translateY(2px) rotate(7deg) scaleX(1)}}
@keyframes whale-nap-drift{from{transform:translateY(0) scale(1)}to{transform:translateY(-3px) scale(1.04)}}
@keyframes whale-rice-nibble{from{transform:translateY(0) scaleY(1)}to{transform:translateY(1px) scaleY(.94)}}
@keyframes whale-rice-spill{from{transform:translate(-6px,-9px) scale(.55)}to{transform:translate(0,0) scale(1)}}

/* Final menu direction: a calm workbench panel with stronger type, a clear
   navigation rail and enough breathing room to feel like a real tool. */
[data-whale-menu-panel]{width:min(382px,calc(100vw - 28px));max-height:min(720px,calc(100vh - 24px));border:1px solid #c2cee3;border-radius:18px;background:#f9fbff;color:#263e78;box-shadow:0 22px 58px rgba(25,48,98,.24);font-size:13px}
[data-whale-menu-head]{min-height:72px;padding:13px 18px 12px 14px;gap:12px;border-bottom:1px solid #d5dfef;background:#eef4ff}
[data-whale-menu-avatar]{width:44px!important;min-width:44px!important;height:44px!important;flex-basis:44px!important;border:1px solid #b9cae7;border-radius:14px!important;background:#dce8ff!important;box-shadow:0 4px 12px rgba(52,87,153,.16)}
[data-whale-menu-avatar] img{transform:scale(2.65);transform-origin:50% 19%}
[data-whale-menu-head]>span:nth-of-type(3) strong{color:#203d80;font-size:16px;line-height:1.2;letter-spacing:-.02em}
[data-whale-menu-head]>span:nth-of-type(3) small{margin-top:4px;color:#6780ae;font-size:11px;line-height:1.2}
[data-whale-menu-tabs]{grid-template-columns:repeat(5,1fr);gap:4px;padding:9px 12px;border-bottom:1px solid #d8e2f0;background:#fff}
[data-whale-menu-tabs] button{min-height:40px;padding:0 5px;border:1px solid transparent;border-radius:10px;color:#7183a8;font-size:12px;font-weight:650;transition:background .16s ease,color .16s ease,box-shadow .16s ease}
[data-whale-menu-tabs] button:hover,[data-whale-menu-tabs] button:focus-visible{background:#f0f5ff;color:#365b9e;outline:2px solid rgba(83,109,168,.16);outline-offset:1px}
[data-whale-menu-tabs] button[data-active=true]{border-color:#b9cbe8;background:#e6efff;color:#244c96;font-weight:800;box-shadow:inset 0 -2px 0 #4168aa}
[data-whale-menu-view]{padding:20px 20px 22px}
[data-whale-menu-view] h3{margin:0 0 6px;color:#223f80;font-size:18px;line-height:1.28;letter-spacing:-.02em}
[data-whale-menu-view]>p{margin:0 0 17px;color:#7183a8;font-size:12px;line-height:1.6}
[data-whale-menu-actions],[data-whale-account-actions]{gap:9px;margin-top:12px}
[data-whale-menu-actions] button,[data-whale-account-actions] button,[data-whale-emotion-grid] button,[data-whale-quick-lines] button{min-height:42px;padding:8px 12px;border:1px solid #cbd8ea;border-radius:11px;background:#fff;color:#405b93;font-size:12px;line-height:1.4}
[data-whale-menu-actions] button:hover,[data-whale-menu-actions] button:focus-visible,[data-whale-account-actions] button:hover,[data-whale-account-actions] button:focus-visible,[data-whale-emotion-grid] button:hover,[data-whale-emotion-grid] button:focus-visible,[data-whale-quick-lines] button:hover,[data-whale-quick-lines] button:focus-visible{border-color:#83a2d5;background:#edf4ff;color:#234a93;outline:2px solid rgba(83,109,168,.14);outline-offset:1px}
[data-whale-menu-primary]{min-height:44px;border:1px solid #385c9f;border-radius:11px;background:#3c63a9;font-size:13px}
[data-whale-menu-primary]:hover,[data-whale-menu-primary]:focus-visible{background:#2f5599;outline:2px solid rgba(83,109,168,.2);outline-offset:2px}
[data-whale-section-label]{margin:20px 0 9px;color:#536e9f;font-size:11px;letter-spacing:.04em}
[data-whale-quick-lines]{gap:8px}
[data-whale-quick-lines] button{text-align:left;font-size:11px}
[data-whale-acting-switch]{gap:4px;margin-bottom:14px;padding:4px;border:1px solid #cfdaeb;border-radius:12px;background:#edf2f9}
[data-whale-acting-switch] button{min-height:38px;border-radius:9px;font-size:11px}
[data-whale-performance-list]>button{min-height:62px;padding:9px 3px;gap:12px}
[data-whale-performance-list] strong{font-size:12px}
[data-whale-performance-list] small{font-size:10px}
[data-whale-performance-list] em{padding:4px 8px;font-size:10px}
[data-whale-emotion-grid]{gap:8px}
[data-whale-emotion-grid] button{min-height:42px;font-size:11px}
[data-whale-setting-row]{min-height:44px;color:#4c6596;font-size:12px}
[data-whale-scale-control]{display:grid;gap:8px;margin:2px 0 12px;padding:12px;border:1px solid #ccd9eb;border-radius:12px;background:#f6f9ff}
[data-whale-scale-heading]{display:flex;align-items:center;justify-content:space-between;gap:12px;color:#3c5c96;font-size:12px;font-weight:800}
[data-whale-scale-heading] output{min-width:46px;color:#294f93;font-size:13px;text-align:right}
[data-whale-scale-control] input[type=range]{width:100%;height:22px;margin:0;accent-color:#315b9f;cursor:pointer}
[data-whale-scale-control] input[type=range]:focus-visible{outline:2px solid rgba(49,91,159,.24);outline-offset:3px}
[data-whale-scale-range]{display:flex;justify-content:space-between;color:#8293b0;font-size:9px;font-weight:650}
[data-whale-setting-field]{gap:5px;margin-top:12px;color:#647ba5;font-size:11px}
[data-whale-setting-field] input,[data-whale-setting-field] select{height:40px;padding:0 11px;border-radius:10px;font-size:12px}
[data-whale-llm-settings]{margin-top:18px;border-top:1px solid #d7e1ef}
[data-whale-llm-settings] summary{padding:14px 2px 5px;color:#3d5d98;font-size:12px;font-weight:800}
[data-whale-llm-mode]{gap:5px;margin-bottom:14px;padding:4px;border:2px solid #b6c9e8;border-radius:12px;background:#e8f0ff}
[data-whale-llm-mode] button{min-height:40px;border-radius:8px;font-size:12px;font-weight:750}
[data-whale-llm-mode] button[data-active=true]{background:#3d66ad;color:#fff;box-shadow:0 3px 8px rgba(49,83,151,.22)}
[data-whale-model-row]{gap:9px}
[data-whale-fetch-models]{height:40px;padding:0 11px;border-radius:10px;font-size:11px;font-weight:700}
[data-whale-llm-actions] button{min-height:40px;font-size:11px}
[data-whale-llm-status]{margin-top:10px;font-size:10px}
[data-whale-menu-close-float]{top:12px;right:12px;width:30px;height:30px;margin:0 12px -30px auto;border-color:#b9c9e3;color:#5a74a9;box-shadow:0 4px 12px rgba(37,65,124,.15)}
[data-whale-menu-close-float] svg{width:15px;height:15px}
[data-whale-menu-close-float]:hover,[data-whale-menu-close-float]:focus-visible{background:#dfeaff;color:#274f96}
@media (max-width:700px){[data-whale-menu-panel]{width:min(360px,calc(100vw - 20px));max-height:calc(100vh - 16px)}[data-whale-menu-view]{padding:18px 16px 20px}[data-whale-menu-tabs] button{font-size:11px}}

/* Configuration actions are deliberate: the selected mode and the two
   provider actions should read as primary controls at a glance. */
[data-whale-llm-mode]{border-color:#a7bee5;background:#e5edfb}
[data-whale-llm-mode] button{color:#496493;font-size:12px}
[data-whale-llm-mode] button[data-active=true],[data-whale-llm-mode] button[aria-selected=true]{background:#254f94!important;color:#fff!important;box-shadow:0 3px 9px rgba(36,76,148,.3)!important}
[data-whale-llm-mode] button[data-active=false],[data-whale-llm-mode] button[aria-selected=false]{background:transparent!important;color:#496493!important;box-shadow:none!important}
[data-whale-llm-actions]{grid-template-columns:1fr 1fr;gap:8px}
[data-whale-llm-actions] button[data-whale-llm-save],[data-whale-llm-actions] button[data-whale-llm-test]{border-color:#2f579e;background:#2f579e;color:#fff;font-size:11px;font-weight:800}
[data-whale-llm-actions] button[data-whale-llm-save]:hover,[data-whale-llm-actions] button[data-whale-llm-save]:focus-visible,[data-whale-llm-actions] button[data-whale-llm-test]:hover,[data-whale-llm-actions] button[data-whale-llm-test]:focus-visible{border-color:#224787;background:#224787;color:#fff;outline:2px solid rgba(83,109,168,.2);outline-offset:1px}
[data-whale-llm-actions] button:disabled{opacity:.48}
[data-whale-fetch-models]{min-width:92px}
[data-whale-menu-panel] [data-whale-section-label],[data-whale-menu-panel] [data-whale-quick-lines]{display:none}

/* Quiet utility controls: visible enough to find, visually absent until the
   user intends to interact. The composer is the primary home for settings. */
[data-whale-dialogue-hide]{right:17px;top:17px;width:27px;height:27px;border:1px solid transparent;border-radius:50%;background:transparent;color:#526ba2;box-shadow:none;opacity:.5;transition:opacity .16s ease,background .16s ease,color .16s ease}
[data-whale-dialogue-hide]:hover,[data-whale-dialogue-hide]:focus-visible{border-color:transparent;background:rgba(225,235,252,.82);color:#254b92;box-shadow:none;opacity:1;outline:2px solid rgba(67,99,163,.18);outline-offset:1px}
[data-whale-menu-toggle]{width:42px;height:42px;border-color:transparent;border-radius:50%;background:transparent;box-shadow:none;opacity:.68;transition:opacity .16s ease,background .16s ease,transform .18s ease}
[data-whale-menu-toggle] svg{width:22px;height:22px;stroke:#345896;filter:drop-shadow(0 1px 2px rgba(255,255,255,.9))}
[data-whale-menu-toggle]:hover,[data-whale-menu-toggle]:focus-visible{background:rgba(237,244,255,.9);box-shadow:none;opacity:1;transform:translateY(-50%) scale(1.04);outline:2px solid rgba(73,105,168,.18);outline-offset:1px}
[data-whale-menu-close-float]{border-color:transparent;background:transparent;box-shadow:none;opacity:.62;transition:opacity .16s ease,background .16s ease,color .16s ease}
[data-whale-menu-close-float]:hover,[data-whale-menu-close-float]:focus-visible{background:#dfeaff;color:#274f96;box-shadow:none;opacity:1}
[data-whale-chat-head]{gap:7px;padding-right:8px}
[data-whale-chat-options]{margin-left:auto;margin-right:0}
[data-whale-chat-tools]{display:flex;flex:0 0 auto;align-items:center;gap:2px;margin-left:1px}
[data-whale-chat-head] [data-whale-chat-tools] button{display:grid;width:30px;height:30px;margin:0;padding:0;place-items:center;border:1px solid transparent;border-radius:9px;background:transparent;color:#6b80ac;cursor:pointer}
[data-whale-chat-head] [data-whale-chat-tools] button:hover,[data-whale-chat-head] [data-whale-chat-tools] button:focus-visible{border-color:transparent;background:#e8f0ff;color:#2c5298;outline:2px solid rgba(83,109,168,.16);outline-offset:1px}
[data-whale-chat-head] [data-whale-chat-menu]{color:#3f64a8}
[data-whale-chat-head] [data-whale-chat-menu] svg{width:17px;height:17px;fill:#fbfcff;stroke:currentColor;stroke-width:1.55}
[data-whale-chat-head] [data-whale-chat-close] svg{width:15px;height:15px}
@media (max-width:520px){[data-whale-chat-head]>strong{display:none}[data-whale-chat-options]{margin-left:0;flex:1}[data-whale-chat-options] select{max-width:none;min-width:0;flex:1}}

/* The menu belongs to the companion, so its entry sits on the character's
   upper-right shoulder instead of occupying a separate strip of workspace. */
[data-whale-menu-toggle],[data-whale-menu-toggle][data-side=left]{top:calc(var(--menu-anchor-top) + 10px);left:calc(var(--menu-anchor-left) + var(--menu-anchor-width) - 118px);width:36px;height:36px;transform:none;border:1px solid rgba(128,153,202,.7);border-radius:12px;background:rgba(248,251,255,.94);box-shadow:0 6px 16px rgba(35,65,124,.16);opacity:.94}
[data-whale-menu-toggle] svg{width:19px;height:19px;stroke:#315696;stroke-width:2}
[data-whale-menu-toggle]:hover,[data-whale-menu-toggle]:focus-visible{background:#eaf2ff;box-shadow:0 8px 20px rgba(35,65,124,.22);opacity:1;transform:translateY(-1px);outline:2px solid rgba(68,101,166,.2);outline-offset:2px}
[data-whale-menu-toggle][aria-expanded=true]{opacity:0;pointer-events:none}

/* Companion chat dock: identity first, configuration second, conversation
   always dominant. Online-only model controls collapse completely offline. */
[data-whale-chat-composer]{width:min(462px,calc(100vw - 20px));overflow:hidden;border:1px solid #b8c8e4;border-radius:16px;background:#f8faff;color:#29477f;box-shadow:0 18px 44px rgba(25,51,103,.22)}
[data-whale-chat-head]{box-sizing:border-box;height:58px;gap:9px;padding:7px 9px 7px 7px;border-bottom:1px solid #e1e8f3;background:#f8faff}
[data-whale-chat-grip]{width:18px;height:34px;flex:0 0 18px;color:#9badca;transform:none}
[data-whale-chat-grip] svg{width:18px;height:24px;fill:currentColor;stroke:none}
[data-whale-chat-avatar]{display:block;width:38px;height:38px;flex:0 0 38px;overflow:hidden;border:1px solid #b4c6e5;border-radius:12px;background:#dce8fb}
[data-whale-chat-avatar] img{display:block;width:100%;height:100%;object-fit:cover;object-position:50% 19%;transform:scale(2.65);transform-origin:50% 19%;pointer-events:none}
[data-whale-chat-identity]{display:grid;min-width:78px;gap:2px;line-height:1.15}
[data-whale-chat-identity] strong{color:#243f77;font-size:14px;font-weight:800;letter-spacing:-.01em}
[data-whale-chat-identity] small{color:#7588ad;font-size:10px;font-weight:600}
[data-whale-chat-options]{display:grid;grid-template-columns:1fr 1fr;gap:3px;margin-left:auto;margin-right:0;padding:3px;border:1px solid #c7d5e9;border-radius:10px;background:#e9eff9}
[data-whale-chat-options] button{display:block;width:auto!important;min-width:45px;height:28px!important;margin:0!important;padding:0 8px!important;border:0!important;border-radius:7px!important;background:transparent!important;color:#657aa3!important;font-size:11px!important;font-weight:700;line-height:28px;cursor:pointer}
[data-whale-chat-options] button[aria-pressed=true]{background:#315b9f!important;color:#fff!important;box-shadow:0 2px 6px rgba(38,76,145,.22)}
[data-whale-chat-options] button:hover,[data-whale-chat-options] button:focus-visible{background:#dce7f8!important;color:#294e8d!important;outline:2px solid rgba(73,105,168,.18)!important;outline-offset:1px}
[data-whale-chat-options] button[aria-pressed=true]:hover,[data-whale-chat-options] button[aria-pressed=true]:focus-visible{background:#284d8c!important;color:#fff!important}
[data-whale-chat-tools]{margin-left:0}
[data-whale-chat-head] [data-whale-chat-tools] button{width:32px;height:32px;border-radius:10px;color:#6c80a8}
[data-whale-chat-head] [data-whale-chat-tools] button:hover,[data-whale-chat-head] [data-whale-chat-tools] button:focus-visible{background:#e6edf9;color:#294f91}
[data-whale-chat-head] [data-whale-chat-history-toggle] svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-linecap:round;stroke-width:1.7}
[data-whale-chat-head] [data-whale-chat-history-toggle][aria-expanded=true]{background:#e4edfc;color:#2b5598}
[data-whale-chat-history-panel]{margin:0 10px 8px;padding:9px;border:1px solid #d5e0ef;border-radius:12px;background:#f7faff;box-shadow:inset 0 1px 2px rgba(35,62,110,.03)}
[data-whale-chat-history-tabs]{display:flex;align-items:center;gap:4px;margin-bottom:7px;border-bottom:1px solid #dce5f1}
[data-whale-chat-history-tabs] button{min-height:28px;padding:0 8px;border:0;border-bottom:2px solid transparent;border-radius:6px 6px 0 0;background:transparent;color:#7c8eae;font-size:10px;font-weight:700;cursor:pointer}
[data-whale-chat-history-tabs] button[data-active=true]{border-bottom-color:#4168aa;color:#315a9d;background:#edf3ff}
[data-whale-chat-history-tabs] button small{margin-left:3px;color:#95a4bc;font-size:9px;font-weight:700}
[data-whale-chat-history-tabs] [data-whale-chat-history-clear]{margin-left:auto;color:#9b7890;font-size:9px}
[data-whale-chat-history-tabs] [data-whale-chat-history-clear]:hover{color:#995b76;background:#fff0f5}
[data-whale-chat-history-empty],[data-whale-chat-memory-note]{margin:0;padding:12px 6px;color:#8999b2;font-size:10px;line-height:1.5;text-align:center}
[data-whale-chat-history-list]{display:grid;gap:7px;max-height:172px;overflow:auto;padding:1px 2px 2px}
[data-whale-chat-history-item]{display:grid;grid-template-columns:38px minmax(0,1fr) auto;align-items:start;gap:6px;padding:7px 8px;border-radius:9px;background:#fff;color:#4d6594}
[data-whale-chat-history-item]>span{display:inline-flex;min-height:19px;align-items:center;justify-content:center;border-radius:999px;background:#edf3ff;color:#4e70a7;font-size:9px;font-weight:800}
[data-whale-chat-history-item][data-role=user]>span{background:#f1eefb;color:#7865a2}
[data-whale-chat-history-item] p{min-width:0;margin:1px 0 0;overflow:hidden;font-size:10px;line-height:1.45;text-overflow:ellipsis;white-space:nowrap}
[data-whale-chat-history-item] time,[data-whale-chat-memory-item] time{color:#9aa8bd;font-size:9px;white-space:nowrap}
[data-whale-chat-memory-list]{display:grid;gap:7px;max-height:172px;overflow:auto;padding:1px 2px 2px}
[data-whale-chat-memory-note]{padding:3px 4px 8px;text-align:left;color:#8294b0}
[data-whale-chat-memory-item]{display:grid;grid-template-columns:12px minmax(0,1fr) auto;align-items:center;gap:7px;padding:7px 8px;border-radius:9px;background:#fff}
[data-whale-chat-memory-item]>span{width:8px;height:8px;border-radius:50%;background:#6f91cb;box-shadow:0 0 0 3px #e5efff}
[data-whale-chat-memory-item]>span[data-kind=personality]{background:#d39a62;box-shadow:0 0 0 3px #fff1df}
[data-whale-chat-memory-item] strong,[data-whale-chat-memory-item] small{display:block}
[data-whale-chat-memory-item] strong{color:#466497;font-size:10px;line-height:1.25}
[data-whale-chat-memory-item] small{margin-top:2px;overflow:hidden;color:#8495b0;font-size:9px;line-height:1.35;text-overflow:ellipsis;white-space:nowrap}
[data-whale-chat-model]{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:10px;padding:7px 12px 0;color:#7185aa;font-size:10px;font-weight:700}
[data-whale-chat-model] select{box-sizing:border-box;width:100%;height:32px;padding:0 30px 0 10px;border:1px solid #c7d4e8;border-radius:10px;outline:0;background:#fff;color:#355487;font:11px "Microsoft YaHei UI","PingFang SC",sans-serif}
[data-whale-chat-model] select:focus-visible{border-color:#5878b3;box-shadow:0 0 0 3px rgba(73,105,168,.13)}
[data-whale-chat-model] select:disabled{cursor:wait;opacity:.58}
[data-whale-chat-entry]{display:grid;grid-template-columns:minmax(0,1fr) 40px;align-items:center;gap:6px;margin:10px;padding:5px 5px 5px 14px;border:1px solid #bdcce3;border-radius:14px;background:#fff;box-shadow:inset 0 1px 2px rgba(32,58,107,.05);transition:border-color .16s ease,box-shadow .16s ease}
[data-whale-chat-entry]:focus-within{border-color:#5576b2;box-shadow:0 0 0 3px rgba(73,105,168,.12)}
[data-whale-chat-entry] input{height:38px;padding:0;border:0;border-radius:0;background:transparent;color:#29477f;font-size:13px;line-height:38px;box-shadow:none}
[data-whale-chat-entry] input::placeholder{color:#7e8fae;opacity:1}
[data-whale-chat-entry] input:focus{border:0;box-shadow:none}
[data-whale-chat-entry] [data-whale-chat-send]{display:grid;width:40px;min-width:40px;height:40px;padding:0;place-items:center;border:0;border-radius:12px;background:#315b9f;color:#fff;box-shadow:0 4px 10px rgba(39,78,145,.2);cursor:pointer;transition:background .16s ease,transform .16s ease,box-shadow .16s ease}
[data-whale-chat-entry] [data-whale-chat-send] svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:2}
[data-whale-chat-entry] [data-whale-chat-send]:hover,[data-whale-chat-entry] [data-whale-chat-send]:focus-visible{background:#274c8c;box-shadow:0 6px 14px rgba(39,78,145,.27);transform:translateY(-1px);outline:2px solid rgba(49,91,159,.22);outline-offset:2px}
[data-whale-chat-entry] [data-whale-chat-send]:disabled{cursor:wait;opacity:.56;transform:none;box-shadow:none}
[data-whale-chat-thinking]{display:block;font-size:14px;font-weight:800;letter-spacing:.12em;transform:translateY(-2px)}
@media (max-width:430px){[data-whale-menu-toggle],[data-whale-menu-toggle][data-side=left]{left:calc(var(--menu-anchor-left) + var(--menu-anchor-width) - 114px)}[data-whale-chat-head]{gap:6px;padding-left:6px}[data-whale-chat-grip]{display:none}[data-whale-chat-avatar]{width:34px;height:34px;flex-basis:34px}[data-whale-chat-identity]{min-width:62px}[data-whale-chat-identity] small{display:none}[data-whale-chat-options] button{min-width:40px;padding:0 6px!important}[data-whale-chat-model]{grid-template-columns:1fr;gap:4px}[data-whale-chat-model]>span{display:none}}

/* Interaction history reads like a small activity feed rather than a pair of
   unrelated buttons. The timeline keeps the last few events scannable while
   the two action rows remain immediately executable. */
[data-whale-interaction-history]{position:relative;display:grid;margin:0 -4px 14px;border-top:1px solid #dfe7f2}
[data-whale-interaction-history]::before{position:absolute;top:16px;bottom:16px;left:17px;width:1px;background:#d9e4f2;content:""}
[data-whale-interaction-empty]{padding:14px 8px;color:#7a8eaf;font-size:11px;line-height:1.5;text-align:center}
[data-whale-interaction-record]{position:relative;z-index:1;display:grid;grid-template-columns:34px minmax(0,1fr) auto;align-items:center;gap:9px;min-height:56px;padding:7px 7px;border-bottom:1px solid #e5ebf4;background:#f9fbff}
[data-whale-interaction-record]>span:nth-child(2){min-width:0}
[data-whale-interaction-record] strong,[data-whale-interaction-record] small{display:block}
[data-whale-interaction-record] strong{color:#35558f;font-size:12px;line-height:1.25}
[data-whale-interaction-record] small{margin-top:3px;overflow:hidden;color:#8293b0;font-size:10px;line-height:1.3;text-overflow:ellipsis;white-space:nowrap}
[data-whale-interaction-record] time{color:#8a9ab6;font-size:10px;white-space:nowrap}
[data-whale-interaction-icon]{display:grid;width:30px;height:30px;place-items:center;border:1px solid #c9d8ed;border-radius:50%;background:#fff;color:#4d70aa}
[data-whale-interaction-icon][data-kind=feed]{color:#7690bf;background:#f5f8fe}
[data-whale-interaction-icon][data-kind=talk]{color:#7f6cae;background:#f7f3ff}
[data-whale-interaction-icon][data-kind=show]{color:#c09057;background:#fff8ec}
[data-whale-interaction-icon] svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:1.7}
[data-whale-interaction-history-title]{margin:18px 0 7px;color:#536e9f;font-size:11px;font-weight:800;letter-spacing:.03em}
[data-whale-interaction-actions]{display:grid;gap:7px}
[data-whale-interaction-action]{display:grid;grid-template-columns:34px minmax(0,1fr) auto;align-items:center;gap:9px;width:100%;min-height:56px;padding:8px 10px;border:1px solid #cbd8e9;border-radius:12px;background:#fff;color:#3f5d95;text-align:left;cursor:pointer;transition:border-color .16s ease,background .16s ease,transform .16s ease,box-shadow .16s ease}
[data-whale-interaction-action] span:nth-child(2){min-width:0}
[data-whale-interaction-action] strong,[data-whale-interaction-action] small{display:block}
[data-whale-interaction-action] strong{color:#34558f;font-size:12px;line-height:1.25}
[data-whale-interaction-action] small{margin-top:3px;color:#8293b0;font-size:10px;line-height:1.3}
[data-whale-interaction-action] em{padding:3px 7px;border-radius:999px;background:#edf3ff;color:#5d78a8;font-size:9px;font-style:normal;white-space:nowrap}
[data-whale-interaction-action]:hover,[data-whale-interaction-action]:focus-visible{border-color:#89a6d4;background:#f4f8ff;box-shadow:0 4px 12px rgba(45,82,145,.1);transform:translateY(-1px);outline:2px solid rgba(83,109,168,.14);outline-offset:1px}
[data-whale-interaction-action]:active{transform:translateY(0);box-shadow:none}
`
