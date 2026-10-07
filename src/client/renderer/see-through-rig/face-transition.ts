const unit = (n:number)=>Math.max(0,Math.min(1,n))
const ease = (n:number)=>{const t=unit(n);return t*t*(3-2*t)}
/** A real closed hold is necessary at the modest frame rate of the canvas rig. */
export function sampleLidBlink(elapsed:number) {
  if(!Number.isFinite(elapsed)||elapsed<0||elapsed>=320)return 1
  if(elapsed<80)return 1-ease(elapsed/80)
  if(elapsed<190)return 0
  return ease((elapsed-190)/130)
}
export function sampleEmotionBlink(name:string,elapsed:number,side:'left'|'right') {
  const beats:Record<string,readonly number[]> = {
    shy:[260],sad:[680],proud:[380],confused:[480],nervous:[280,760],
    love:[520],excited:[300],surprise:[50],hungry:[640],pout:[730],mischievous:[430],
  }
  if(name==='mischievous'&&side==='right')return 1
  return Math.min(1,...(beats[name]??[]).map(start=>sampleLidBlink(elapsed-start)))
}
/** Bound displacement when a new emotion interrupts a previous brow pose. */
export function followBrow(current:number,target:number,deltaMs:number) {
  const delta=Math.max(0,Math.min(50,deltaMs))
  const next=current+(target-current)*(1-Math.exp(-delta/75))
  return Math.abs(next-target)<.001?target:next
}
