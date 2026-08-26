export const WHALE_STYLE = `
[data-whale-pet-entry]{position:fixed;inset:0;z-index:2147483000;pointer-events:none;color:var(--dsw-alias-label-primary);font-family:var(--dsw-font-family)}
[data-whale-pet-stage]{position:fixed;pointer-events:none;transform-origin:bottom right;transform:translate3d(var(--whale-motion-x,0px),var(--whale-motion-y,0px),0) scale(var(--whale-scale,1))}
[data-whale-pet-hotspot],[data-whale-pet-menu],[data-whale-pet-summon]{pointer-events:auto}
[data-whale-debug-panel]{position:fixed;top:14px;left:14px;z-index:2;box-sizing:border-box;width:min(360px,calc(100vw - 28px));padding:12px;border:1px solid var(--dsw-alias-border-l2);border-radius:14px;background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);pointer-events:auto;box-shadow:0 10px 28px var(--dsw-alias-bg-mask-drop)}
[data-whale-debug-heading]{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:9px}
[data-whale-debug-heading] strong{font-size:14px}
[data-whale-debug-heading] span,[data-whale-debug-panel] small{color:var(--dsw-alias-label-secondary);font-size:10px}
[data-whale-debug-actions]{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
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
[data-whale-dialogue]{--tail-x:64%;--speech-width:267px;--speech-height:150px;--metric-width:250px;--metric-height:135px;--feedback-width:275px;--feedback-height:160px;position:absolute;z-index:20;box-sizing:border-box;width:var(--speech-width);min-height:var(--speech-height);padding:27px 31px 24px;border:0;border-radius:0;background:transparent;color:#5269a3;overflow:visible;transform-origin:var(--tail-x) 100%;transition:opacity .2s ease,transform .26s cubic-bezier(.16,1.18,.32,1)}
[data-whale-dialogue][data-visible=false]{visibility:hidden;opacity:0;transform:translateY(10px) scale(.74);pointer-events:none}
[data-whale-dialogue][data-visible=true]{animation:whale-dialogue-pop .4s cubic-bezier(.16,1.2,.3,1)}
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

[data-whale-emotion-fx]{position:absolute;z-index:22;inset:0;pointer-events:none;overflow:visible}
.emotion-particle{position:absolute;left:var(--fx-x,50%);top:var(--fx-y,45%);display:grid;width:var(--fx-size,24px);height:var(--fx-size,24px);place-items:center;opacity:0;color:#ffe27a;font-style:normal;line-height:1;will-change:transform,opacity}
.emotion-particle.heart,.emotion-particle.shy-heart{font-size:0;color:#ff6f9d;filter:drop-shadow(0 0 7px rgba(255,87,145,.72));animation:whale-heart-rise var(--fx-duration,1450ms) cubic-bezier(.18,.72,.2,1) forwards}
.emotion-particle.heart::before,.emotion-particle.shy-heart::before{position:absolute;left:1px;top:1px;width:14px;height:14px;border-radius:50%;background:currentColor;box-shadow:9px 0 0 currentColor;content:""}
.emotion-particle.heart::after,.emotion-particle.shy-heart::after{position:absolute;left:5px;top:6px;width:16px;height:16px;border-radius:2px;background:currentColor;content:"";transform:rotate(45deg)}
.emotion-particle.shy-heart{width:18px;height:17px;color:#ff9fbb;animation-name:whale-shy-pulse}
.emotion-particle.anger{width:48px;height:48px;color:#ef3145;font-family:"Segoe UI Emoji","Apple Color Emoji",sans-serif;font-size:42px!important;filter:drop-shadow(0 3px 4px rgba(73,5,19,.4));animation:whale-anger-pop var(--fx-duration,1150ms) cubic-bezier(.2,.9,.18,1) forwards}
.emotion-particle.anger::before{content:"💢"}
.emotion-particle.anger-steam{font-size:0;border-radius:50% 50% 45% 55%;background:#ffabb8;box-shadow:-10px 6px 0 -5px #ffabb8,10px 5px 0 -4px #ffabb8;filter:drop-shadow(0 2px 2px rgba(110,36,54,.35));animation:whale-anger-steam var(--fx-duration,1700ms) ease-out forwards}
.emotion-particle.surprise{font-size:0;filter:drop-shadow(0 0 8px rgba(255,220,90,.82));animation:whale-surprise-pop var(--fx-duration,1050ms) cubic-bezier(.16,1.15,.28,1) forwards}
.emotion-particle.surprise::before{width:6px;height:16px;border-radius:4px;background:currentColor;box-shadow:0 21px 0 -1px currentColor;content:""}
.emotion-particle.tear,.emotion-particle.sweat{font-size:0;color:#6ee8ff;filter:drop-shadow(0 0 8px rgba(80,210,255,.75));animation:whale-tear-fall var(--fx-duration,1500ms) ease-in forwards}
.emotion-particle.tear::before,.emotion-particle.sweat::before{width:12px;height:18px;border-radius:65% 35% 65% 35%;background:currentColor;content:"";transform:rotate(45deg)}
.emotion-particle.sweat{animation-name:whale-sweat-slide}
.emotion-particle.sparkle,.emotion-particle.proud,.emotion-particle.excited,.emotion-particle.mischief,.emotion-particle.focus{font-size:0;color:#fff0a8;filter:drop-shadow(0 0 9px rgba(255,220,91,.9));animation:whale-sparkle-float var(--fx-duration,1450ms) ease-out forwards}
.emotion-particle.sparkle::before,.emotion-particle.proud::before,.emotion-particle.excited::before,.emotion-particle.mischief::before,.emotion-particle.focus::before{width:21px;height:21px;background:currentColor;clip-path:polygon(50% 0,61% 37%,100% 50%,61% 63%,50% 100%,39% 63%,0 50%,39% 37%);content:""}
.emotion-particle.mischief{color:#b997ff}.emotion-particle.focus{color:#ffdc75}.emotion-particle.proud{color:#ffd56f}.emotion-particle.excited{color:#fff07b}
.emotion-particle.question{font-family:Georgia,serif;font-size:var(--fx-size,28px);font-weight:900;color:#79bcff;text-shadow:0 2px 0 #254286,0 0 8px rgba(91,177,255,.78);animation:whale-question-bob var(--fx-duration,1900ms) ease-in-out forwards}
.emotion-particle.question::before{content:"?"}
.emotion-particle.gloom{font-size:0;color:#91a9c8;animation:whale-gloom-drift var(--fx-duration,1700ms) ease-in-out forwards}.emotion-particle.gloom::before{width:6px;height:6px;border-radius:50%;background:currentColor;box-shadow:9px 0 0 currentColor,18px 0 0 currentColor;content:""}
.emotion-particle.sleep{width:auto;height:auto;color:#c5e2ff;font-family:Georgia,"Times New Roman",serif;font-size:var(--fx-size,24px);font-weight:900;text-shadow:0 2px 0 #24488f,0 0 11px rgba(92,169,255,.86);animation:whale-sleep-drift var(--fx-duration,1900ms) ease-out forwards}
.emotion-particle.relief{font-size:0;color:#a7f1e0;animation:whale-relief-breathe var(--fx-duration,1600ms) ease-out forwards}.emotion-particle.relief::before{width:22px;height:11px;border:3px solid currentColor;border-color:currentColor transparent transparent;border-radius:50%;content:""}
.emotion-particle.rice-thought{font-size:0;border:2px solid #536fae;border-radius:50%;background:#fff;box-shadow:0 0 8px rgba(129,188,255,.52);animation:whale-rice-thought var(--fx-duration,1850ms) ease-out forwards}
.emotion-particle.rice-dream{width:var(--fx-size,58px);height:calc(var(--fx-size,58px) * .84);font-size:0;border:3px solid #536fae;border-radius:48%;background:radial-gradient(ellipse at 50% 69%,#fffdf7 0 25%,#5f83cf 27% 43%,transparent 45%),#fff;box-shadow:0 3px 7px rgba(24,57,112,.3);animation:whale-rice-dream var(--fx-duration,2100ms) ease-in-out forwards}
@keyframes whale-dialogue-pop{0%{opacity:0;transform:translateY(12px) scale(.72)}68%{transform:translateY(-2px) scale(1.035)}100%{opacity:1;transform:translateY(0) scale(1)}}
@keyframes whale-menu-view-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
@keyframes whale-heart-rise{0%{opacity:0;transform:translate(-50%,10px) scale(.25)}18%{opacity:1;transform:translate(-50%,0) scale(1.08)}100%{opacity:0;transform:translate(calc(-50% + var(--fx-drift,0px)),-92px) scale(.72) rotate(14deg)}}
@keyframes whale-shy-pulse{0%{opacity:0;transform:translate(-50%,3px) scale(.35)}22%{opacity:1;transform:translate(-50%,0) scale(1.12)}70%{opacity:1;transform:translate(-50%,-5px) scale(.92)}100%{opacity:0;transform:translate(-50%,-20px) scale(.7)}}
@keyframes whale-anger-pop{0%{opacity:0;transform:translate(-50%,8px) scale(.25) rotate(-12deg)}16%{opacity:1;transform:translate(-50%,0) scale(1.16) rotate(5deg)}70%{opacity:1;transform:translate(-50%,-2px) scale(1)}100%{opacity:0;transform:translate(-50%,-12px) scale(.9)}}
@keyframes whale-anger-steam{0%{opacity:0;transform:translate(-50%,14px) scale(.35)}20%{opacity:1;transform:translate(-50%,0) scale(1.04)}72%{opacity:.96;transform:translate(calc(-50% + var(--fx-drift,0px)),-30px) scale(1.12)}100%{opacity:0;transform:translate(calc(-50% + var(--fx-drift,0px)),-54px) scale(.88)}}
@keyframes whale-surprise-pop{0%{opacity:0;transform:translate(-50%,12px) scale(.15)}24%{opacity:1;transform:translate(-50%,-4px) scale(1.25)}100%{opacity:0;transform:translate(-50%,-24px) scale(.82)}}
@keyframes whale-tear-fall{0%{opacity:0;transform:translate(-50%,-8px) scale(.45)}18%{opacity:1;transform:translate(-50%,0) scale(1)}100%{opacity:0;transform:translate(calc(-50% + var(--fx-drift,0px)),54px) scale(.72)}}
@keyframes whale-sweat-slide{0%{opacity:0;transform:translate(-50%,-12px) scale(.4)}18%{opacity:1;transform:translate(-50%,-2px) scale(1.08)}80%{opacity:.95;transform:translate(-50%,17px) scale(.92)}100%{opacity:0;transform:translate(-50%,29px) scale(.72)}}
@keyframes whale-sparkle-float{0%{opacity:0;transform:translate(-50%,8px) scale(.2)}22%{opacity:1;transform:translate(-50%,-4px) scale(1.12) rotate(18deg)}100%{opacity:0;transform:translate(calc(-50% + var(--fx-drift,0px)),-78px) scale(.45) rotate(82deg)}}
@keyframes whale-question-bob{0%{opacity:0;transform:translate(-50%,10px) scale(.3)}18%{opacity:1;transform:translate(-50%,-4px) scale(1.12)}74%{opacity:1;transform:translate(calc(-50% + 4px),-15px) scale(1.04)}100%{opacity:0;transform:translate(calc(-50% + var(--fx-drift,0px)),-34px) scale(.72)}}
@keyframes whale-gloom-drift{0%{opacity:0;transform:translate(-50%,-6px) scale(.7)}25%{opacity:.95;transform:translate(-50%,0) scale(1)}100%{opacity:0;transform:translate(calc(-50% + var(--fx-drift,0px)),20px) scale(.85)}}
@keyframes whale-sleep-drift{0%{opacity:0;transform:translate(-50%,12px) scale(.45)}18%{opacity:1;transform:translate(-50%,0) scale(.94)}100%{opacity:0;transform:translate(calc(-50% + 28px),-76px) scale(1.3) rotate(12deg)}}
@keyframes whale-relief-breathe{0%{opacity:0;transform:translate(-50%,10px) scale(.55)}24%{opacity:1;transform:translate(-50%,-2px) scale(1.08)}100%{opacity:0;transform:translate(calc(-50% + var(--fx-drift,0px)),-66px) scale(.6)}}
@keyframes whale-rice-thought{0%{opacity:0;transform:translate(-50%,8px) scale(.2)}22%{opacity:1;transform:translate(-50%,0) scale(1.12)}100%{opacity:0;transform:translate(-50%,-18px) scale(.72)}}
@keyframes whale-rice-dream{0%{opacity:0;transform:translate(-50%,12px) scale(.28) rotate(-8deg)}20%{opacity:1;transform:translate(-50%,0) scale(1.08) rotate(2deg)}78%{opacity:1;transform:translate(-50%,-7px) scale(1.03)}100%{opacity:0;transform:translate(-50%,-20px) scale(.78) rotate(4deg)}}
@media (max-width:700px){[data-whale-dialogue]{max-width:calc(100vw - 20px)}[data-whale-menu-panel]{width:min(306px,calc(100vw - 16px))}[data-whale-chat-composer]{bottom:-66px}}
@media (forced-colors:active){
  [data-whale-pet-hotspot]:focus-visible,[data-whale-pet-menu] button:focus-visible,[data-whale-pet-summon]:focus-visible{outline:2px solid Highlight;outline-offset:2px}
  [data-whale-pet-menu],[data-whale-pet-bubble],[data-whale-pet-summon],[data-whale-setting],[data-whale-ledger],[data-whale-debug-panel]{border-color:CanvasText;background:Canvas;color:CanvasText}
  [data-whale-ledger-header] button:focus-visible,[data-whale-ledger-privacy] button:focus-visible{outline:2px solid Highlight;outline-offset:2px}
}
@media (max-width:600px){[data-whale-ledger]{max-height:calc(100vh - 24px)}}
@keyframes whale-pet-breathe{0%,100%{transform:translateY(0) scaleY(1)}50%{transform:translateY(-2px) scaleY(1.012)}}
@keyframes whale-pet-work{0%,100%{transform:translateY(0) rotate(0deg)}50%{transform:translateY(-1px) rotate(-1deg)}}
@keyframes whale-pet-hop{0%,100%{transform:translateY(0) rotate(0deg)}45%{transform:translateY(-5px) rotate(-2deg)}}
@keyframes whale-pet-shake{from{transform:translateX(-2px) rotate(-2deg)}to{transform:translateX(2px) rotate(2deg)}}
@keyframes whale-butterfly-flit{from{transform:translateY(-2px) rotate(-7deg) scaleX(.86)}to{transform:translateY(2px) rotate(7deg) scaleX(1)}}
@keyframes whale-nap-drift{from{transform:translateY(0) scale(1)}to{transform:translateY(-3px) scale(1.04)}}
@keyframes whale-rice-nibble{from{transform:translateY(0) scaleY(1)}to{transform:translateY(1px) scaleY(.94)}}
@keyframes whale-rice-spill{from{transform:translate(-6px,-9px) scale(.55)}to{transform:translate(0,0) scale(1)}}
`
