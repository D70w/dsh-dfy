import React, { useEffect, useRef, useState } from 'react'
import type {} from '@deepseek-ai/dsh-session-projection/types'
import { createRoot } from 'react-dom/client'
import { createSeeThroughIdleRig, type ApprovedIdleRigController } from '../src/client/renderer/see-through-rig/approved-idle-runtime.js'
import { WhaleEmotionFx, type WhaleEmotionCommand } from '../src/client/WhaleEmotionFx.tsx'
import { WhaleWorkFx } from '../src/client/WhaleWorkFx.tsx'
import { WHALE_STYLE } from '../src/client/styles.ts'
import { EMOTION_PROFILES, emotionLine, type WhaleEmotionName } from '../src/client/emotions.ts'
import type { WhaleToolKind, WhaleWorkReaction } from '../src/activity/types.ts'

function Demo() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const rig = useRef<ApprovedIdleRigController>()
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const sequence = useRef(0)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [command, setCommand] = useState<WhaleEmotionCommand>()
  const [work, setWork] = useState<{ kind: WhaleToolKind; reaction: WhaleWorkReaction }>({ kind: 'none', reaction: 'none' })
  const [line, setLine] = useState('你好呀，我是大肥鱼。忙的时候，我就在这里陪你。')
  useEffect(() => {
    let disposed = false
    void createSeeThroughIdleRig(canvas.current!, { assetBaseUrl: './assets/idle', outputSize: 640, transparentBackground: true, reducedMotion: reduced }).then(controller => {
      if (disposed) { controller.dispose(); return }
      rig.current = controller
      setReady(true)
    }).catch(() => { if (!disposed) setError(true) })
    return () => { disposed = true; rig.current?.dispose(); rig.current = undefined; clearTimeout(timer.current) }
  }, [])
  useEffect(() => { rig.current?.setReducedMotion(reduced) }, [reduced, ready])
  const resetLater = (duration = 4200) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => { setCommand(undefined); setWork({ kind: 'none', reaction: 'none' }); rig.current?.stopGesture() }, duration)
  }
  const emotion = (name: WhaleEmotionName) => {
    const durationMs = EMOTION_PROFILES[name].durationMs
    rig.current?.stopGesture()
    rig.current?.playEmotion(name, durationMs)
    setWork({ kind: 'none', reaction: 'none' })
    setCommand({ id: ++sequence.current, name, durationMs })
    setLine(emotionLine(name).text)
    resetLater(durationMs)
  }
  const working = (kind: WhaleToolKind, reaction: WhaleWorkReaction = 'none') => {
    setCommand(undefined); setWork({ kind, reaction })
    rig.current?.stopGesture()
    if (reaction !== 'none') rig.current?.playEmotion(reaction === 'completed' ? 'workSuccess' : 'workError', 4200)
    else { rig.current?.playEmotion('determined', 4200); rig.current?.playGesture(kind === 'read' || kind === 'search' ? 'inspect' : kind === 'write' ? 'write' : 'type') }
    setLine(reaction === 'completed' ? '做好啦！白饭可以加一小碗吗？' : reaction === 'error' ? '这次没成功，我们慢慢排查，我陪着你。' : ({ read: '让我仔细翻翻这份文件。', search: '线索在哪里呢……找到了就告诉你！', command: '正在执行，先让它跑一会儿。', write: '把刚刚的发现认真记下来。' } as Record<string, string>)[kind])
    resetLater()
  }
  return <>
    <style>{WHALE_STYLE}</style>
    <header><a className="brand" href="https://github.com/D70w/dsh-dfy">大肥鱼 <span>DSH DFY</span></a><a className="repo" href="https://github.com/D70w/dsh-dfy">查看项目 ↗</a></header>
    <main>
      <section className="intro"><p className="eyebrow">把工作台，变成有人陪的地方。</p><h1>认真陪你工作，<br />偶尔想吃白饭。</h1><p className="description">一只住在 DeepSeek Harness 里的鲸鱼娘。会回应你的互动，也会陪你读文件、找线索、完成任务。</p><p className="demo-note">这是免安装演示 · 不需要 API Key · 所有工作状态均为模拟</p><div className="install"><span>在 DSH Web 中安装</span><code>dsh plugin --profile web add dsh-dfy</code></div><p className="license">角色资源由上善无形创作 · CC BY-NC-SA 4.0</p></section>
      <section className="playground" data-reduced={reduced} aria-label="大肥鱼交互演示"><div className="stage-caption"><span className="dot" />{ready ? '实时角色 · 和她互动看看' : error ? '资源加载失败，请刷新重试' : '大肥鱼正在过来…'}</div>
        <div className="speech" aria-live="polite">{line}</div>
        <button className="pet" aria-label="摸摸大肥鱼" disabled={!ready} onClick={() => { rig.current?.triggerPetReaction(.5); rig.current?.setAffectionBlush(.65, 5500); emotion('love') }}><canvas ref={canvas} width="640" height="640" /><WhaleEmotionFx command={command} /><WhaleWorkFx kind={work.kind} reaction={work.reaction} /></button>
        <label className="motion-setting"><input type="checkbox" checked={reduced} onChange={event => setReduced(event.target.checked)} />减少动态效果</label>
      </section>
      <section className="controls"><div><h2>今天是什么心情？</h2><p>点击角色摸摸她，或挑一种表情。</p><div className="choices">{Object.entries(EMOTION_PROFILES).map(([name, profile]) => <button disabled={!ready} key={name} aria-pressed={command?.name === name} onClick={() => emotion(name as WhaleEmotionName)}>{profile.label}</button>)}</div></div><div><h2>她也懂你的工作节奏。</h2><p>体验任务反馈，不会执行真实命令。</p><div className="choices work">{[['read','读文件'],['search','搜索'],['command','执行'],['write','写入']].map(([kind,label]) => <button disabled={!ready} key={kind} aria-pressed={work.kind === kind} onClick={() => working(kind as WhaleToolKind)}>{label}</button>)}<button disabled={!ready} onClick={() => working('none','completed')}>任务成功</button><button disabled={!ready} onClick={() => working('none','error')}>任务失败</button></div></div></section>
    </main><footer>演示仅展示实时角色与本地台词；模型配置、账户及历史记录需在 DSH 插件中使用。</footer>
  </>
}
createRoot(document.getElementById('app')!).render(<Demo />)
