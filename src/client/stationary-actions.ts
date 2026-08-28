export const STATIONARY_ACTIONS = [
  {
    id: 'nod', label: '轻轻点头', description: '认真回应你的招呼', file: 'nod.webm',
    lines: [
      { text: '嗯，本鱼听见了。', subtext: '她认真地点了点头' },
      { text: '可以，就照你说的办。', subtext: '这次答应得格外干脆' },
      { text: '收到，我会好好记住的。', subtext: '呆毛也跟着确认了一下' },
    ],
  },
  {
    id: 'wave', label: '挥手问候', description: '抬手向你打招呼', file: 'wave.webm',
    lines: [
      { text: '喂——我在这里！', subtext: '她努力把招呼送到你面前' },
      { text: '今天也要好好相处。', subtext: '挥手的幅度比语气诚实得多' },
      { text: '看见本鱼了吗？不许装没看见。', subtext: '她又多挥了两下手' },
    ],
  },
  {
    id: 'cute', label: '撒娇卖萌', description: '带一点小得意的可爱动作', file: 'cute.webm',
    lines: [
      { text: '只表演一次哦……除非你夸我。', subtext: '她显然准备好了加演' },
      { text: '可爱也是鲸鱼娘的专业技能。', subtext: '她对这项技能非常有自信' },
      { text: '看好了，这招可是要收白饭的。', subtext: '收费规则刚刚临时生效' },
    ],
  },
  {
    id: 'point', label: '指向观众', description: '把注意力转向你', file: 'point.webm',
    lines: [
      { text: '对，就是你。本鱼找到你了。', subtext: '她准确锁定了屏幕前的目标' },
      { text: '今天的监督对象，站好。', subtext: '她一本正经地点了点你' },
      { text: '别看别处，我正在和你说话呢。', subtext: '这份注意力不接受转让' },
    ],
  },
  {
    id: 'confident', label: '叉腰自信', description: '摆出胸有成竹的姿势', file: 'confident.webm',
    lines: [
      { text: '交给本鱼，问题不大。', subtext: '她已经摆出了可靠姿势' },
      { text: '看吧，我就知道能行。', subtext: '尾巴也很配合地得意起来' },
      { text: '可以开始夸了，请讲具体一点。', subtext: '她连验收标准都准备好了' },
    ],
  },
  {
    id: 'clap', label: '开心拍手', description: '高兴地为你鼓掌', file: 'clap.webm',
    lines: [
      { text: '做得好！给你一点掌声。', subtext: '她拍得比本人获奖还开心' },
      { text: '好耶，这次值得庆祝！', subtext: '尾巴已经抢先进入庆祝状态' },
      { text: '啪啪啪啪——奖励你一碗空气白饭。', subtext: '真正的白饭被她留给了自己' },
    ],
  },
  {
    id: 'curtsy', label: '女仆屈膝礼', description: '完整的礼仪演出', file: 'curtsy.webm',
    lines: [
      { text: '欢迎回来，今天也辛苦了。', subtext: '她难得认真完成了一整套礼仪' },
      { text: '贵安——这样够正式了吗？', subtext: '礼仪之后是偷偷观察你的反应' },
      { text: '这是特别招待，可不是每天都有。', subtext: '她把裙摆轻轻提稳了一点' },
    ],
  },
  {
    id: 'surprise', label: '受惊反应', description: '受惊后拍胸缓一缓', file: 'surprise.webm',
    lines: [
      { text: '哇！你怎么突然出现了？', subtext: '她赶紧拍了拍胸口' },
      { text: '吓、吓到本鱼了！', subtext: '呆毛差点当场竖直' },
      { text: '等一下，我的心跳还在缓冲。', subtext: '她正在努力装作镇定' },
    ],
  },
  {
    id: 'stretch', label: '困倦伸懒腰', description: '疲惫时舒展一下身体', file: 'stretch.webm',
    lines: [
      { text: '呼啊——本鱼只是例行伸展。', subtext: '困意已经从动作里漏出来了' },
      { text: '再工作五分钟，就休息五十分钟。', subtext: '她提出了非常偏心的时间表' },
      { text: '呆毛都累弯了，让我伸个懒腰。', subtext: '这项休息申请无需审批' },
    ],
  },
  {
    id: 'clean', label: '打扫房间', description: '拿起扫帚认真工作', file: 'clean.webm',
    lines: [
      { text: '让一让，本鱼要开始大扫除了。', subtext: '她拿出了意外专业的架势' },
      { text: '灰尘退散，白饭留下。', subtext: '清扫标准带有明显个人偏好' },
      { text: '桌面整理好了，记得保持。', subtext: '她满意地检查了一遍成果' },
    ],
  },
] as const

export type StationaryAction = typeof STATIONARY_ACTIONS[number]
export type StationaryActionId = StationaryAction['id']
export type StationaryActionFile = StationaryAction['file']

export interface StationaryActionCommand {
  id: number
  action: StationaryActionId
  file: StationaryActionFile
}

export interface StationaryActionLine {
  text: string
  subtext: string
  speaker: string
}

/** Pick a classic action without immediately repeating the previous show. */
export function pickStationaryAction(
  previousId: StationaryActionId | undefined,
  seed = Math.random(),
): StationaryAction {
  const choices = STATIONARY_ACTIONS.filter(action => action.id !== previousId)
  const index = Math.min(choices.length - 1, Math.max(0, Math.floor(seed * choices.length)))
  return choices[index]!
}

/** Pick one in-character line belonging to the selected classic action. */
export function stationaryActionLine(action: StationaryAction, seed = Math.random()): StationaryActionLine {
  const index = Math.min(action.lines.length - 1, Math.max(0, Math.floor(seed * action.lines.length)))
  const line = action.lines[index]!
  return { ...line, speaker: `鲸鱼娘 · ${action.label}` }
}
