import type { ApprovedEmotion } from './renderer/see-through-rig/approved-idle-runtime.js'

/** User-facing emotions; quiet work-result poses stay internal to the renderer. */
export type WhaleEmotionName = Exclude<ApprovedEmotion, 'neutral' | 'workSuccess' | 'workError'>

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

export interface IdlePerformance {
  id: string
  label: string
  description: string
  emotion: WhaleEmotionName
  durationMs: number
  originX: number
  line?: DialogueLine
}

export const EMOTION_PROFILES: Readonly<Record<WhaleEmotionName, EmotionProfile>> = Object.freeze({
  love: { label: '喜欢', durationMs: 2400, className: 'heart', count: 7 },
  shy: { label: '害羞', durationMs: 2800, className: 'shy-heart', count: 4 },
  angry: { label: '生气', durationMs: 2800, className: 'anger', count: 4 },
  surprise: { label: '惊讶', durationMs: 1500, className: 'surprise', count: 1 },
  sad: { label: '难过', durationMs: 3200, className: 'tear', count: 0 },
  happy: { label: '开心', durationMs: 2400, className: 'sparkle', count: 3 },
  confused: { label: '困惑', durationMs: 2800, className: 'question', count: 3 },
  pout: { label: '委屈', durationMs: 3000, className: 'gloom', count: 1 },
  sleepy: { label: '困倦', durationMs: 3400, className: 'sleep', count: 3, symbol: 'Z' },
  proud: { label: '得意', durationMs: 2600, className: 'proud', count: 2 },
  excited: { label: '期待', durationMs: 2400, className: 'excited', count: 2 },
  mischievous: { label: '坏笑', durationMs: 2700, className: 'mischief', count: 1 },
  relieved: { label: '安心', durationMs: 3600, className: 'relief', count: 1 },
  determined: { label: '认真', durationMs: 3200, className: 'focus', count: 1 },
  nervous: { label: '紧张', durationMs: 3000, className: 'sweat', count: 3 },
  hungry: { label: '馋嘴', durationMs: 3000, className: 'rice-dream', count: 0 },
})

const EMOTION_LINES: Readonly<Record<WhaleEmotionName, readonly DialogueLine[]>> = {
  love: [
    { text: '你再靠近一点，我就当没发现。', subtext: '尾巴已经先一步靠了过去' },
    { text: '今天也想和你多待一会儿。', subtext: '这句不是嘴硬，是认真说的' },
    { text: '尾巴只是碰巧摇得很快。', subtext: '她决定把证据全部推给尾巴' },
    { text: '你忙你的，我待在这里就很好。', subtext: '陪伴模式正在安静运行' },
    { text: '如果今天很累，可以分一点给我。', subtext: '她把声音放得很轻' },
    { text: '本鱼的位置，给你留了一半。', subtext: '虽然她已经悄悄占了大半' },
    { text: '再待一会儿吧，白饭都可以晚点吃。', subtext: '这大概是她最高级别的偏爱' },
    { text: '我记得你每次来找我的样子。', subtext: '她假装只是记忆力很好' },
  ],
  shy: [
    { text: '别一直看我……呆毛都要冒烟了。', subtext: '脸颊正在持续升温' },
    { text: '我才没有因为你脸红。', subtext: '这句话本身就很没有说服力' },
    { text: '再夸一句就、就不许停。', subtext: '她小声修改了抗议内容' },
    { text: '突然说这种话，我要怎么接嘛。', subtext: '她的视线已经躲到了旁边' },
    { text: '只准看一小会儿……听见没有。', subtext: '她完全没有规定一小会儿有多长' },
    { text: '你靠太近了，我的表情会露馅。', subtext: '其实早就已经露馅了' },
    { text: '这次夸奖我先收下，下次不许突然袭击。', subtext: '她很认真地把夸奖保存起来' },
    { text: '脸红是屏幕色温的问题，肯定是。', subtext: '她找到了一个毫无说服力的理由' },
  ],
  angry: [
    { text: '哼，这次真的要扣你的白饭！', subtext: '处罚标准由她临时制定' },
    { text: '尾巴拍桌了，后果很严重。', subtext: '虽然这里并没有桌子' },
    { text: '先道歉，再考虑原谅你。', subtext: '她偷偷把“考虑”改成了“马上”' },
    { text: '不许装作没听见，本鱼还在生气。', subtext: '怒气已经认真维持了十秒' },
    { text: '今天的白饭分配权暂时归我。', subtext: '她祭出了最严厉的惩罚' },
  ],
  surprise: [
    { text: '哇！你从哪里冒出来的？', subtext: '呆毛差点被吓直了' },
    { text: '等一下，我的心跳还没加载完。', subtext: '鲸鱼娘正在紧急缓冲' },
    { text: '这也在你的计划里吗？', subtext: '她显然完全没有预料到' },
    { text: '欸？事情怎么突然变成这样了！', subtext: '她迅速回头确认了两遍' },
    { text: '先让我缓一下，刚才那下太突然了。', subtext: '胸口还在轻轻起伏' },
    { text: '等等，这个展开本鱼没看过！', subtext: '计划表上完全没有这一页' },
  ],
  sad: [
    { text: '今天的海水好像有点咸。', subtext: '她把眼泪归咎于海水' },
    { text: '我没哭，只是眼睛装不下心事了。', subtext: '泪珠完全不同意这个解释' },
    { text: '可以陪我安静待一会儿吗？', subtext: '这次她没有假装不需要你' },
    { text: '没关系……让我慢一点就好。', subtext: '她努力把呼吸重新放平' },
    { text: '今天先不逞强了，你别走就行。', subtext: '尾巴轻轻靠了过来' },
  ],
  happy: [
    { text: '嘿嘿，今天的好运分你一半。', subtext: '剩下一半留给白饭' },
    { text: '完成啦！尾巴批准庆祝一下。', subtext: '尾巴已经提前开始庆祝' },
    { text: '你一来，工位都亮了一点。', subtext: '她努力装作只是客观描述' },
    { text: '今天状态很好，连呆毛都很精神！', subtext: '它正在头顶得意地晃来晃去' },
    { text: '好消息要说两遍——好耶，好耶！', subtext: '第二遍明显更开心了一点' },
    { text: '允许你和本鱼一起得意五分钟。', subtext: '庆祝时间由她慷慨批准' },
    { text: '这个瞬间值得配一大碗白饭。', subtext: '她已经想好了庆祝菜单' },
    { text: '看到你，我的尾巴就自己启动了。', subtext: '她决定不追究尾巴的擅自行动' },
  ],
  confused: [
    { text: '等等，这件事好像绕成鲸鱼结了。', subtext: '呆毛也跟着打了个问号' },
    { text: '让我用呆毛再想一遍。', subtext: '它看起来承担了很多工作' },
    { text: '这和白饭有什么隐藏关系吗？', subtext: '她正在建立一条可疑的逻辑链' },
    { text: '嗯？刚才是不是漏掉了关键的一步？', subtext: '她沿着思路慢慢倒退检查' },
    { text: '这题不对劲，肯定偷偷藏了条件。', subtext: '侦查模式已经悄悄开启' },
    { text: '先别催，我正在把问号排成队。', subtext: '头顶的疑问似乎越来越多了' },
  ],
  pout: [
    { text: '我没有委屈，我只是在认真鼓脸。', subtext: '鼓脸进度已经完成百分之百' },
    { text: '除非有白饭，不然哄不好。', subtext: '其实认真道歉也可以' },
    { text: '你要负责把我哄回来。', subtext: '尾巴已经偷偷站到你这边' },
    { text: '本鱼暂时不想理你……暂时。', subtext: '她特意给“暂时”留了很大余地' },
    { text: '一句好听的话可不够，至少两句。', subtext: '和解条件正在悄悄降低' },
  ],
  sleepy: [
    { text: '再坚持五分钟……然后睡五十分钟。', subtext: '她对时间进行了有利解释' },
    { text: '呆毛已经先下班了。', subtext: '本人也只剩一点点电量' },
    { text: '如果我闭眼，那是在后台运行。', subtext: '后台很快传来了呼吸声' },
    { text: '眼睛只是暂时进入省电模式。', subtext: '省电模式似乎不打算结束' },
    { text: '你先看着工位，我眯半分钟。', subtext: '她把半分钟说得很没有底气' },
    { text: '白饭吃饱以后为什么更想睡呢……', subtext: '这个问题被困意自动搁置了' },
  ],
  proud: [
    { text: '看吧，这种事还是得靠我。', subtext: '她已经摆好了等夸的姿势' },
    { text: '可以夸，但请讲具体一点。', subtext: '她对表扬有严格验收标准' },
    { text: '尾巴翘起来只是正常现象。', subtext: '完全不是因为得意' },
    { text: '这点小事，本鱼一次就能做好。', subtext: '她把练习过的部分藏得很好' },
    { text: '怎么样，可靠吧？', subtext: '她已经悄悄凑近等待回答' },
    { text: '今天的最佳工位搭子，应该没有争议。', subtext: '评委和候选人都是她自己' },
    { text: '不用谢，记得把功劳写清楚。', subtext: '署名位置已经替你留好了' },
    { text: '哼哼，这就是大肥鱼的实力。', subtext: '她终于等到了展示机会' },
  ],
  excited: [
    { text: '有新任务？我已经把尾巴启动了！', subtext: '高性能模式正在加载' },
    { text: '快说快说，我准备好了！', subtext: '呆毛和眼睛一起亮了起来' },
    { text: '白饭和冒险，我都可以！', subtext: '她把优先级说得很含蓄' },
    { text: '听起来很有意思，算本鱼一个！', subtext: '她已经抢先迈出了半步' },
    { text: '新的东西？让我先看看！', subtext: '好奇心比尾巴冲得更快' },
    { text: '今天可以做点不一样的事吗？', subtext: '期待已经藏不住地冒了出来' },
  ],
  mischievous: [
    { text: '我有一个绝妙的主意，你先别问后果。', subtext: '那只眯起来的眼睛很可疑' },
    { text: '放心，恶作剧只占计划的一小部分。', subtext: '她没有说明“小”是多少' },
    { text: '嘿，猜猜我把白饭藏哪了？', subtext: '尾巴正在努力装作不知情' },
    { text: '你先答应不生气，我再告诉你。', subtext: '这个开场听起来就很危险' },
    { text: '刚才什么都没发生，你也什么都没看见。', subtext: '她身后的尾巴正在销毁证据' },
  ],
  relieved: [
    { text: '呼……还好你在。', subtext: '肩膀和尾巴一起放松下来' },
    { text: '顺利结束了，允许自己松一口气。', subtext: '这次不是摸鱼，是正式休息' },
    { text: '没事了。慢慢来就好。', subtext: '她把声音也放轻了一点' },
    { text: '总算平稳落地了，辛苦啦。', subtext: '紧绷的呆毛终于软了下来' },
    { text: '先休息一下，剩下的待会儿再说。', subtext: '她替你按下了短暂的暂停键' },
    { text: '嗯，这样就好。不必一直赶路。', subtext: '尾巴恢复了悠闲的节奏' },
  ],
  determined: [
    { text: '好，这次认真解决它。', subtext: '视线已经牢牢锁定目标' },
    { text: '交给我们，别让这个问题跑掉。', subtext: '尾巴进入了作战姿态' },
    { text: '先拆清楚，再一项一项处理。', subtext: '工位搭子切换到可靠模式' },
    { text: '别急，先把最关键的一步找出来。', subtext: '她开始安静地梳理线索' },
    { text: '这次不靠运气，我们认真做完。', subtext: '目光已经变得格外专注' },
    { text: '问题再难，也得给本鱼一个交代。', subtext: '她把袖口轻轻整理好了' },
  ],
  nervous: [
    { text: '等、等一下，我还没准备好！', subtext: '肩膀已经先紧张起来了' },
    { text: '不会出问题吧？应该不会吧？', subtext: '她偷偷确认了两遍' },
    { text: '我很冷静。你看，尾巴一点都没僵。', subtext: '尾巴对此表示强烈否认' },
    { text: '先别看我，我要重新组织一下表情。', subtext: '额角的小汗珠出卖了镇定' },
    { text: '真的要现在开始吗？那、那就开始吧。', subtext: '她深吸了一口气才点头' },
    { text: '手心没有出汗，只是空气有点潮。', subtext: '这个解释和脸色一样勉强' },
  ],
  hungry: [
    { text: '你有没有听见白饭在呼唤我？', subtext: '她的视线已经飘向饭碗方向' },
    { text: '工作之前是不是该补充一点米饭能量？', subtext: '这个提案显然准备已久' },
    { text: '我只吃一小碗。大一点的小碗。', subtext: '她认真修订了计量单位' },
    { text: '今天的白饭会不会比昨天更香？', subtext: '她正在进行没有必要的对比实验' },
    { text: '肚子刚才叫的是开机提示音。', subtext: '她拒绝承认那是饿肚子的声音' },
    { text: '如果现在有一碗热白饭就好了。', subtext: '饭碗的轮廓已经出现在想象里' },
    { text: '先吃饭再工作，效率肯定会更高。', subtext: '她为这个结论准备了充分私心' },
    { text: '白饭不需要配菜，本身就是主角。', subtext: '她对这件事有坚定的审美立场' },
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

/**
 * Curated idle acting beats. Calm entries intentionally omit dialogue so the
 * companion can feel alive without filling the workspace with speech bubbles.
 * Every beat maps to a complete facial/body emotion in the realtime rig.
 */
export const IDLE_PERFORMANCES: readonly IdlePerformance[] = Object.freeze([
  {
    id: 'quiet-smile', label: '开心待机', description: '轻轻微笑，尾巴跟着摇', emotion: 'happy', durationMs: 2500, originX: .46,
  },
  {
    id: 'tail-credit', label: '得意邀功', description: '摆出等待表扬的神情', emotion: 'proud', durationMs: 2800, originX: .72,
    line: { text: '尾巴今天状态不错，我调的。', subtext: '尾巴对此没有发表不同意见', speaker: '鲸鱼娘 · 待机自检' },
  },
  {
    id: 'rice-radar', label: '白饭雷达', description: '闻到不存在的白饭香气', emotion: 'hungry', durationMs: 3200, originX: .67,
    line: { text: '奇怪，我好像听见白饭在叫我。', subtext: '白饭雷达刚刚完成了一次扫描', speaker: '鲸鱼娘 · 米饭频道' },
  },
  {
    id: 'tiny-doze', label: '偷偷犯困', description: '闭眼进入低功耗模式', emotion: 'sleepy', durationMs: 3600, originX: .66,
    line: { text: '我只是闭眼整理一下缓存。', subtext: '缓存里很快传来了轻轻的呼吸声', speaker: '鲸鱼娘 · 后台运行' },
  },
  {
    id: 'puzzled-ahoge', label: '呆毛问号', description: '歪头思考一个小问题', emotion: 'confused', durationMs: 2900, originX: .64,
  },
  {
    id: 'outfit-settle', label: '安心整理', description: '放松下来，整理裙摆', emotion: 'relieved', durationMs: 3400, originX: .5,
  },
  {
    id: 'secret-plan', label: '可疑计划', description: '坏笑着藏起一个主意', emotion: 'mischievous', durationMs: 2800, originX: .58,
    line: { text: '我刚想到一个好主意……先保密。', subtext: '她悄悄把某个饭碗计划藏了起来', speaker: '鲸鱼娘 · 可疑待机' },
  },
  {
    id: 'caught-looking', label: '害羞偷看', description: '视线躲开，耳鳍先露馅', emotion: 'shy', durationMs: 3000, originX: .42,
    line: { text: '我没有偷看你，只是在看这个方向。', subtext: '耳鳍和尾巴同时暴露了她', speaker: '鲸鱼娘 · 视线说明' },
  },
  {
    id: 'ready-spark', label: '准备开工', description: '眼睛发亮，进入待命状态', emotion: 'excited', durationMs: 2500, originX: .56,
  },
  {
    id: 'soft-company', label: '安静陪伴', description: '温柔看向你，安静守在旁边', emotion: 'love', durationMs: 2600, originX: .5,
    line: { text: '你忙吧，我会好好待在旁边。', subtext: '这次没有嘴硬太久', speaker: '鲸鱼娘 · 安静陪伴' },
  },
])

export function pickIdlePerformance(previousId: string | undefined, seed = Math.random()): IdlePerformance {
  const choices = IDLE_PERFORMANCES.filter(item => item.id !== previousId)
  return pickLine(choices, seed)
}

export function idlePerformanceDelay(cycle: number, seed = Math.random()): number {
  return cycle === 0
    ? 9_000 + Math.floor(seed * 5_000)
    : 18_000 + Math.floor(seed * 14_000)
}

export function pickLine<T>(lines: readonly T[], seed = Math.random()): T {
  return lines[Math.min(lines.length - 1, Math.max(0, Math.floor(seed * lines.length)))]
}

export function emotionLine(name: WhaleEmotionName, seed = Math.random()): DialogueLine {
  return { ...pickLine(EMOTION_LINES[name], seed), emotion: name, speaker: `鲸鱼娘 · ${EMOTION_PROFILES[name].label}` }
}

interface TouchReaction extends DialogueLine {
  emotion: WhaleEmotionName
  weight: number
  rapidWeight?: number
  minStreak?: number
}

const TOUCH_REACTIONS: readonly TouchReaction[] = [
  { text: '嗯？找我吗？', subtext: '她轻轻回弹了一下', emotion: 'happy', weight: 4 },
  { text: '今天也可以多陪我一会儿。', subtext: '尾巴已经替她表示欢迎', emotion: 'love', weight: 3 },
  { text: '突然摸过来会吓到鱼的！', subtext: '呆毛被惊得晃了两下', emotion: 'surprise', weight: 2 },
  { text: '这是某种新的打招呼方式吗？', subtext: '她认真思考了半秒', emotion: 'confused', weight: 2 },
  { text: '哼，眼光不错，知道来找我。', subtext: '她已经开始理直气壮地得意', emotion: 'proud', weight: 2 },
  { text: '再摸一下，就要收白饭当门票了。', subtext: '她露出了可疑的小算盘', emotion: 'mischievous', weight: 2 },
  { text: '刚好，我也正想活动一下。', subtext: '她一下子精神起来了', emotion: 'excited', weight: 2 },
  { text: '摸完记得投喂，服务要配套。', subtext: '白饭雷达顺势启动', emotion: 'hungry', weight: 2 },
  { text: '你在就好，我继续陪着。', subtext: '她慢慢放松了肩膀', emotion: 'relieved', weight: 2 },
  { text: '唔……差点把我的瞌睡碰掉了。', subtext: '她勉强把眼睛重新睁开', emotion: 'sleepy', weight: 1 },
  { text: '还摸？……也不是不行。', subtext: '她努力装作毫不在意', emotion: 'shy', weight: 1, rapidWeight: 2, minStreak: 2 },
  { text: '别、别一直摸啦。', subtext: '她的脸颊已经藏不住了', emotion: 'nervous', weight: 1, rapidWeight: 1, minStreak: 3 },
  { text: '再闹我就真的要鼓脸了。', subtext: '这句威胁听起来并不吓人', emotion: 'pout', weight: 1, rapidWeight: 1, minStreak: 3 },
  { text: '停一下，我真的要红透了！', subtext: '她用呆毛发出了暂停信号', emotion: 'angry', weight: 1, rapidWeight: 1, minStreak: 5 },
]

/** Pick a complete click reaction while avoiding the expression just shown. */
export function touchLine(
  streak: number,
  previousEmotion?: WhaleEmotionName,
  seed = Math.random(),
): DialogueLine {
  const eligible = TOUCH_REACTIONS.filter(item => (item.minStreak ?? 1) <= streak)
  const nonRepeating = eligible.filter(item => item.emotion !== previousEmotion)
  const candidates = nonRepeating.length > 0 ? nonRepeating : eligible
  const weighted = candidates.map(item => ({
    item,
    weight: item.weight + Math.max(0, streak - 1) * (item.rapidWeight ?? 0),
  }))
  const total = weighted.reduce((sum, candidate) => sum + candidate.weight, 0)
  let cursor = Math.max(0, Math.min(.999_999, seed)) * total
  const selected = weighted.find(candidate => {
    cursor -= candidate.weight
    return cursor < 0
  })?.item ?? weighted[weighted.length - 1]!.item
  return { text: selected.text, subtext: selected.subtext, emotion: selected.emotion }
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
