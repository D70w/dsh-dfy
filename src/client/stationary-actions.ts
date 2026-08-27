export const STATIONARY_ACTIONS = [
  { id: 'nod', label: '轻轻点头', description: '认真回应你的招呼', file: 'nod.webm' },
  { id: 'wave', label: '挥手问候', description: '抬手向你打招呼', file: 'wave.webm' },
  { id: 'cute', label: '撒娇卖萌', description: '带一点小得意的可爱动作', file: 'cute.webm' },
  { id: 'point', label: '指向观众', description: '把注意力转向你', file: 'point.webm' },
  { id: 'confident', label: '叉腰自信', description: '摆出胸有成竹的姿势', file: 'confident.webm' },
  { id: 'clap', label: '开心拍手', description: '高兴地为你鼓掌', file: 'clap.webm' },
  { id: 'curtsy', label: '女仆屈膝礼', description: '完整的礼仪演出', file: 'curtsy.webm' },
  { id: 'surprise', label: '受惊反应', description: '受惊后拍胸缓一缓', file: 'surprise.webm' },
  { id: 'stretch', label: '困倦伸懒腰', description: '疲惫时舒展一下身体', file: 'stretch.webm' },
  { id: 'clean', label: '打扫房间', description: '拿起扫帚认真工作', file: 'clean.webm' },
] as const

export type StationaryAction = typeof STATIONARY_ACTIONS[number]
export type StationaryActionId = StationaryAction['id']
export type StationaryActionFile = StationaryAction['file']

export interface StationaryActionCommand {
  id: number
  action: StationaryActionId
  file: StationaryActionFile
}

