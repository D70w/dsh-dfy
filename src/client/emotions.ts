import type { ApprovedEmotion } from './renderer/see-through-rig/approved-idle-runtime.js'

export type WhaleEmotionName = Exclude<ApprovedEmotion, 'neutral'>

export interface EmotionProfile {
  label: string
  durationMs: number
  className: string
  count: number
  symbol?: string
}

export interface DialogueLine {
  text: string
  subtext: string
  speaker?: string
  emotion?: WhaleEmotionName
}

export const EMOTION_PROFILES: Readonly<Record<WhaleEmotionName, EmotionProfile>> = Object.freeze({
  love: { label: '喜欢', durationMs: 2400, className: 'heart', count: 7 },
  shy: { label: '害羞', durationMs: 2800, className: 'shy-heart', count: 4 },
  angry: { label: '生气', durationMs: 2800, className: 'anger', count: 4 },
  surprise: { label: '惊讶', durationMs: 1500, className: 'surprise', count: 3 },
  sad: { label: '难过', durationMs: 3200, className: 'tear', count: 0 },
  happy: { label: '开心', durationMs: 2400, className: 'sparkle', count: 6 },
  confused: { label: '困惑', durationMs: 2800, className: 'question', count: 3 },
  pout: { label: '委屈', durationMs: 3000, className: 'gloom', count: 2 },
  sleepy: { label: '困倦', durationMs: 3400, className: 'sleep', count: 3, symbol: 'Z' },
  proud: { label: '得意', durationMs: 2600, className: 'proud', count: 5 },
  excited: { label: '期待', durationMs: 2400, className: 'excited', count: 7 },
  mischievous: { label: '坏笑', durationMs: 2700, className: 'mischief', count: 3 },
  relieved: { label: '安心', durationMs: 3600, className: 'relief', count: 2 },
  determined: { label: '认真', durationMs: 3200, className: 'focus', count: 3 },
  nervous: { label: '紧张', durationMs: 3000, className: 'sweat', count: 3 },
  hungry: { label: '馋嘴', durationMs: 3000, className: 'rice-dream', count: 3 },
})

const EMOTION_LINES: Readonly<Record<WhaleEmotionName, readonly DialogueLine[]>> = {
  love: [
    { text: '你再靠近一点，我就当没发现。', subtext: '尾巴已经先一步靠了过去' },
    { text: '今天也想和你多待一会儿。', subtext: '这句不是嘴硬，是认真说的' },
    { text: '尾巴只是碰巧摇得很快。', subtext: '她决定把证据全部推给尾巴' },
  ],
  shy: [
    { text: '别一直看我……呆毛都要冒烟了。', subtext: '脸颊正在持续升温' },
    { text: '我才没有因为你脸红。', subtext: '这句话本身就很没有说服力' },
    { text: '再夸一句就、就不许停。', subtext: '她小声修改了抗议内容' },
  ],
  angry: [
    { text: '哼，这次真的要扣你的白饭！', subtext: '处罚标准由她临时制定' },
    { text: '尾巴拍桌了，后果很严重。', subtext: '虽然这里并没有桌子' },
    { text: '先道歉，再考虑原谅你。', subtext: '她偷偷把“考虑”改成了“马上”' },
  ],
  surprise: [
    { text: '哇！你从哪里冒出来的？', subtext: '呆毛差点被吓直了' },
    { text: '等一下，我的心跳还没加载完。', subtext: '鲸鱼娘正在紧急缓冲' },
    { text: '这也在你的计划里吗？', subtext: '她显然完全没有预料到' },
  ],
  sad: [
    { text: '今天的海水好像有点咸。', subtext: '她把眼泪归咎于海水' },
    { text: '我没哭，只是眼睛装不下心事了。', subtext: '泪珠完全不同意这个解释' },
    { text: '可以陪我安静待一会儿吗？', subtext: '这次她没有假装不需要你' },
  ],
  happy: [
    { text: '嘿嘿，今天的好运分你一半。', subtext: '剩下一半留给白饭' },
    { text: '完成啦！尾巴批准庆祝一下。', subtext: '尾巴已经提前开始庆祝' },
    { text: '你一来，工位都亮了一点。', subtext: '她努力装作只是客观描述' },
  ],
  confused: [
    { text: '等等，这件事好像绕成鲸鱼结了。', subtext: '呆毛也跟着打了个问号' },
    { text: '让我用呆毛再想一遍。', subtext: '它看起来承担了很多工作' },
    { text: '这和白饭有什么隐藏关系吗？', subtext: '她正在建立一条可疑的逻辑链' },
  ],
  pout: [
    { text: '我没有委屈，我只是在认真鼓脸。', subtext: '鼓脸进度已经完成百分之百' },
    { text: '除非有白饭，不然哄不好。', subtext: '其实认真道歉也可以' },
    { text: '你要负责把我哄回来。', subtext: '尾巴已经偷偷站到你这边' },
  ],
  sleepy: [
    { text: '再坚持五分钟……然后睡五十分钟。', subtext: '她对时间进行了有利解释' },
    { text: '呆毛已经先下班了。', subtext: '本人也只剩一点点电量' },
    { text: '如果我闭眼，那是在后台运行。', subtext: '后台很快传来了呼吸声' },
  ],
  proud: [
    { text: '看吧，这种事还是得靠我。', subtext: '她已经摆好了等夸的姿势' },
    { text: '可以夸，但请讲具体一点。', subtext: '她对表扬有严格验收标准' },
    { text: '尾巴翘起来只是正常现象。', subtext: '完全不是因为得意' },
  ],
  excited: [
    { text: '有新任务？我已经把尾巴启动了！', subtext: '高性能模式正在加载' },
    { text: '快说快说，我准备好了！', subtext: '呆毛和眼睛一起亮了起来' },
    { text: '白饭和冒险，我都可以！', subtext: '她把优先级说得很含蓄' },
  ],
  mischievous: [
    { text: '我有一个绝妙的主意，你先别问后果。', subtext: '那只眯起来的眼睛很可疑' },
    { text: '放心，恶作剧只占计划的一小部分。', subtext: '她没有说明“小”是多少' },
    { text: '嘿，猜猜我把白饭藏哪了？', subtext: '尾巴正在努力装作不知情' },
  ],
  relieved: [
    { text: '呼……还好你在。', subtext: '肩膀和尾巴一起放松下来' },
    { text: '顺利结束了，允许自己松一口气。', subtext: '这次不是摸鱼，是正式休息' },
    { text: '没事了。慢慢来就好。', subtext: '她把声音也放轻了一点' },
  ],
  determined: [
    { text: '好，这次认真解决它。', subtext: '视线已经牢牢锁定目标' },
    { text: '交给我们，别让这个问题跑掉。', subtext: '尾巴进入了作战姿态' },
    { text: '先拆清楚，再一项一项处理。', subtext: '工位搭子切换到可靠模式' },
  ],
  nervous: [
    { text: '等、等一下，我还没准备好！', subtext: '肩膀已经先紧张起来了' },
    { text: '不会出问题吧？应该不会吧？', subtext: '她偷偷确认了两遍' },
    { text: '我很冷静。你看，尾巴一点都没僵。', subtext: '尾巴对此表示强烈否认' },
  ],
  hungry: [
    { text: '你有没有听见白饭在呼唤我？', subtext: '她的视线已经飘向饭碗方向' },
    { text: '工作之前是不是该补充一点米饭能量？', subtext: '这个提案显然准备已久' },
    { text: '我只吃一小碗。大一点的小碗。', subtext: '她认真修订了计量单位' },
  ],
}

export const IDLE_LINES: readonly DialogueLine[] = [
  { text: '先忙你的，我在旁边待命。', subtext: '不是偷懒，是低耗能运行', speaker: '鲸鱼娘 · 工位待命' },
  { text: '我才没在等你。', subtext: '尾巴倒是很诚实地摇了一下', speaker: '鲸鱼娘 · 嘴硬现场', emotion: 'shy' },
  { text: '这个窗口我替你守着。', subtext: '放心，不会偷看你的内容', speaker: '鲸鱼娘 · 工位值守', emotion: 'proud' },
  { text: '刚才不是发呆，是在缓存灵感。', subtext: '一本正经地整理了一下裙摆', speaker: '鲸鱼娘 · 摸鱼说明书', emotion: 'proud' },
  { text: '尾巴有自己的想法，我管不了。', subtext: '它又悄悄朝你摆了摆', speaker: '鲸鱼娘 · 尾巴报告', emotion: 'confused' },
  { text: '我只是在检查白饭库存。', subtext: '目前库存令人遗憾', speaker: '鲸鱼娘 · 合理检查', emotion: 'pout' },
  { text: '别盯太久，看看远处。', subtext: '饭可以晚点吃，你的眼睛不行', speaker: '鲸鱼娘 · 嘴硬提醒' },
  { text: '呆毛说今天会顺利。', subtext: '它要是说错了，我就按住它', speaker: '鲸鱼娘 · 呆毛预报', emotion: 'happy' },
  { text: '白饭是不是也该有下午茶时间？', subtext: '这个提案显然蓄谋已久', speaker: '鲸鱼娘 · 米饭提案', emotion: 'hungry' },
]

export function pickLine<T>(lines: readonly T[], seed = Math.random()): T {
  return lines[Math.min(lines.length - 1, Math.max(0, Math.floor(seed * lines.length)))]
}

export function emotionLine(name: WhaleEmotionName): DialogueLine {
  return { ...pickLine(EMOTION_LINES[name]), emotion: name, speaker: `鲸鱼娘 · ${EMOTION_PROFILES[name].label}` }
}

export function touchLine(streak: number): DialogueLine {
  if (streak >= 4) return { text: '停一下，我真的要红透了。', subtext: '她用呆毛发出了暂停信号', emotion: 'shy' }
  if (streak === 3) return { text: '别、别一直摸啦。', subtext: '她的脸颊已经藏不住了', emotion: 'shy' }
  if (streak === 2) return { text: '还摸？……也不是不行。', subtext: '她努力装作毫不在意', emotion: 'shy' }
  return { text: '嗯？找我吗？', subtext: '她轻轻回弹了一下', emotion: 'happy' }
}

export function offlineReply(message: string): DialogueLine {
  if (/饭|饿|吃/.test(message)) return emotionLine('hungry')
  if (/累|困|休息|睡/.test(message)) return emotionLine('sleepy')
  if (/喜欢|可爱|爱你|夸/.test(message)) return emotionLine('shy')
  if (/难过|伤心|不开心/.test(message)) return emotionLine('sad')
  if (/生气|讨厌|坏/.test(message)) return emotionLine('angry')
  if (/怎么办|问题|帮我|认真/.test(message)) return emotionLine('determined')
  return pickLine(IDLE_LINES)
}
