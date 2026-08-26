export type JointConfidence = 'visible' | 'occluded' | 'inferred'
export type JointRole = 'core' | 'near' | 'far' | 'tail' | 'hair'

export interface CalibrationJoint {
  id: string
  parent: string | null
  x: number
  y: number
  role: JointRole
  confidence: JointConfidence
  minRotation: number
  maxRotation: number
}

export interface CalibrationPivot {
  id: string
  joint: string
  x: number
  y: number
}

export interface CalibrationDocument {
  schemaVersion: 1
  id: string
  status: string
  coordinateSystem: 'canvas-y-down'
  sourceSize: readonly [number, number]
  bindPose: string
  joints: CalibrationJoint[]
  partPivots: CalibrationPivot[]
}

type Selection = { kind: 'joint' | 'pivot'; id: string }
type PositionEdit = {
  selection: Selection
  snapshot: CalibrationDocument
  dirty: boolean
}

const SVG_NS = 'http://www.w3.org/2000/svg'
const roleColor: Record<JointRole, string> = {
  core: '#ffd166',
  near: '#78e6ff',
  far: '#9c9eff',
  tail: '#65a8ff',
  hair: '#ef8fbd',
}

const jointNames: Record<string, string> = {
  pelvis: '骨盆中心',
  spine: '脊柱中段',
  chest: '胸腔中心',
  neck: '颈部',
  head: '头部中心',
  ahogeRoot: '呆毛根部',
  ahogeTip: '呆毛尖端',
  shoulderNear: '近侧肩膀',
  elbowNear: '近侧手肘',
  wristNear: '近侧手腕',
  shoulderFar: '远侧肩膀',
  elbowFar: '远侧手肘',
  wristFar: '远侧手腕',
  hipNear: '近侧髋关节',
  kneeNear: '近侧膝盖',
  ankleNear: '近侧脚踝',
  toeNear: '近侧脚尖',
  hipFar: '远侧髋关节',
  kneeFar: '远侧膝盖',
  ankleFar: '远侧脚踝',
  toeFar: '远侧脚尖',
  tailRoot: '鲸尾根部',
  tailMid: '鲸尾中段',
  tailTip: '鲸尾末端',
  flukes: '尾鳍中心',
}

const pivotNames: Record<string, string> = {
  headHair: '头部与头发',
  torsoSkirt: '躯干与裙摆',
  upperArmNear: '近侧上臂',
  forearmNear: '近侧前臂',
  upperArmFar: '远侧上臂',
  forearmFar: '远侧前臂',
  thighNear: '近侧大腿',
  calfNear: '近侧小腿',
  footNear: '近侧脚部',
  thighFar: '远侧大腿',
  calfFar: '远侧小腿',
  footFar: '远侧脚部',
  tailRootPart: '鲸尾根部部件',
  tailMidPart: '鲸尾中段部件',
  tailFlukes: '尾鳍部件',
  ahoge: '呆毛部件',
}

const displayName = (kind: Selection['kind'], id: string): string => (
  kind === 'joint' ? jointNames[id] ?? id : pivotNames[id] ?? id
)

const clone = <T>(value: T): T => structuredClone(value)
const round = (value: number): number => Math.round(value * 10) / 10

export function validateCalibrationDocument(document: CalibrationDocument): void {
  if (document.schemaVersion !== 1) throw new Error('calibration: unsupported schema')
  if (document.sourceSize[0] <= 0 || document.sourceSize[1] <= 0) throw new Error('calibration: invalid source size')
  const ids = new Set<string>()
  for (const joint of document.joints) {
    if (ids.has(joint.id)) throw new Error(`calibration: duplicate joint ${joint.id}`)
    ids.add(joint.id)
    if (![joint.x, joint.y, joint.minRotation, joint.maxRotation].every(Number.isFinite)) {
      throw new Error(`calibration: non-finite joint ${joint.id}`)
    }
    if (joint.minRotation > joint.maxRotation) throw new Error(`calibration: invalid constraint ${joint.id}`)
  }
  for (const joint of document.joints) {
    if (joint.parent !== null && !ids.has(joint.parent)) throw new Error(`calibration: missing parent ${joint.parent}`)
  }
  const state = new Map<string, 0 | 1 | 2>()
  const byId = new Map(document.joints.map(joint => [joint.id, joint]))
  const visit = (id: string): void => {
    if (state.get(id) === 2) return
    if (state.get(id) === 1) throw new Error(`calibration: cyclic joint ${id}`)
    state.set(id, 1)
    const parent = byId.get(id)?.parent
    if (parent !== null && parent !== undefined) visit(parent)
    state.set(id, 2)
  }
  for (const id of ids) visit(id)
  for (const pivot of document.partPivots) {
    if (!ids.has(pivot.joint)) throw new Error(`calibration: pivot ${pivot.id} uses missing joint`)
  }
}

function element<T extends Element>(id: string): T {
  const result = document.getElementById(id)
  if (result === null) throw new Error(`calibration: missing #${id}`)
  return result as unknown as T
}

function svgElement<K extends keyof SVGElementTagNameMap>(name: K): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, name)
}

function downloadJson(filename: string, value: unknown): void {
  const blob = new Blob([JSON.stringify(value, null, 2) + '\n'], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.hidden = true
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export async function createRigCalibration(initialUrl: string): Promise<void> {
  const response = await fetch(initialUrl)
  if (!response.ok) throw new Error(`calibration: unable to load ${initialUrl}`)
  const original = await response.json() as CalibrationDocument
  validateCalibrationDocument(original)
  let state = clone(original)
  let selection: Selection = { kind: 'joint', id: 'pelvis' }
  let mode: Selection['kind'] = 'joint'
  let dragging: Selection | undefined
  let dragSnapshot: CalibrationDocument | undefined
  let positionEdit: PositionEdit | undefined
  let zoom = 1
  let previewRunning = false
  let previewFrame: number | undefined
  const undoStack: CalibrationDocument[] = []

  const overlay = element<SVGSVGElement>('rigOverlay')
  const reference = element<HTMLImageElement>('referenceImage')
  const stage = element<HTMLElement>('stage')
  const stageWrap = element<HTMLElement>('stageWrap')
  const jointList = element<HTMLDivElement>('jointList')
  const selectedName = element<HTMLElement>('selectedName')
  const selectedType = element<HTMLElement>('selectedType')
  const parentValue = element<HTMLElement>('parentValue')
  const xInput = element<HTMLInputElement>('positionX')
  const yInput = element<HTMLInputElement>('positionY')
  const minInput = element<HTMLInputElement>('minRotation')
  const maxInput = element<HTMLInputElement>('maxRotation')
  const confidenceInput = element<HTMLSelectElement>('confidence')
  const constraintFields = element<HTMLElement>('constraintFields')
  const lengthValue = element<HTMLElement>('lengthValue')
  const angleValue = element<HTMLElement>('angleValue')
  const jsonPreview = element<HTMLElement>('jsonPreview')
  const dirtyStatus = element<HTMLElement>('dirtyStatus')
  const undoButton = element<HTMLButtonElement>('undo')
  const showLabels = element<HTMLInputElement>('showLabels')
  const showInferred = element<HTMLInputElement>('showInferred')
  const showPivots = element<HTMLInputElement>('showPivots')
  const jointModeButton = element<HTMLButtonElement>('jointMode')
  const pivotModeButton = element<HTMLButtonElement>('pivotMode')
  const zoomRange = element<HTMLInputElement>('zoomRange')
  const zoomValue = element<HTMLOutputElement>('zoomValue')
  const testMotionButton = element<HTMLButtonElement>('testMotion')

  const selectedJoint = (): CalibrationJoint | undefined => state.joints.find(joint => joint.id === selection.id)
  const selectedPivot = (): CalibrationPivot | undefined => state.partPivots.find(pivot => pivot.id === selection.id)
  const sameSelection = (left: Selection, right: Selection): boolean => left.kind === right.kind && left.id === right.id
  const positionIn = (source: CalibrationDocument, target: Selection): CalibrationJoint | CalibrationPivot | undefined => (
    target.kind === 'joint'
      ? source.joints.find(joint => joint.id === target.id)
      : source.partPivots.find(pivot => pivot.id === target.id)
  )
  const pushUndo = (snapshot = state): void => {
    undoStack.push(clone(snapshot))
    if (undoStack.length > 40) undoStack.shift()
  }
  const matchesOriginal = (): boolean => {
    const current = clone(state)
    current.status = original.status
    return JSON.stringify(current) === JSON.stringify(original)
  }
  const markDirty = (): void => {
    const dirty = !matchesOriginal()
    dirtyStatus.textContent = dirty ? '有未导出的校准修改' : '与初始自动标注一致'
    dirtyStatus.dataset.dirty = String(dirty)
    localStorage.setItem('whale-rig-calibration-v1', JSON.stringify(state))
  }
  const documentForExport = (): CalibrationDocument => {
    const exported = clone(state)
    exported.status = 'user-calibrated-draft'
    return exported
  }

  const confidenceText = (confidence: JointConfidence): string => {
    if (confidence === 'visible') return '可见'
    if (confidence === 'occluded') return '被遮挡'
    return '推定'
  }

  const renderList = (): void => {
    jointList.replaceChildren()
    const entries = mode === 'joint' ? state.joints : state.partPivots
    for (const entry of entries) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'joint-row'
      button.dataset.selected = String(selection.kind === mode && selection.id === entry.id)
      const title = document.createElement('strong')
      title.textContent = displayName(mode, entry.id)
      const detail = document.createElement('span')
      if (mode === 'joint') {
        const joint = entry as CalibrationJoint
        detail.textContent = `${confidenceText(joint.confidence)} · ${round(joint.x)}, ${round(joint.y)}`
        button.style.setProperty('--role', roleColor[joint.role])
      } else {
        const pivot = entry as CalibrationPivot
        detail.textContent = `连接到${displayName('joint', pivot.joint)} · ${round(pivot.x)}, ${round(pivot.y)}`
        button.style.setProperty('--role', '#ff8f78')
      }
      button.append(title, detail)
      button.addEventListener('click', () => {
        selection = { kind: mode, id: entry.id }
        render()
        requestAnimationFrame(centerSelection)
      })
      jointList.append(button)
    }
  }

  const renderMode = (): void => {
    const jointActive = mode === 'joint'
    jointModeButton.dataset.active = String(jointActive)
    jointModeButton.setAttribute('aria-pressed', String(jointActive))
    pivotModeButton.dataset.active = String(!jointActive)
    pivotModeButton.setAttribute('aria-pressed', String(!jointActive))
  }

  const appendLabel = (x: number, y: number, text: string, color: string): void => {
    if (!showLabels.checked) return
    const label = svgElement('text')
    label.setAttribute('x', String(x + 3.5 / zoom))
    label.setAttribute('y', String(y - 3.5 / zoom))
    label.setAttribute('fill', color)
    label.setAttribute('class', 'joint-label')
    label.style.fontSize = `${3.2 / zoom}px`
    label.style.strokeWidth = `${1.2 / zoom}px`
    label.textContent = text
    overlay.append(label)
  }

  const renderOverlay = (joints = state.joints): void => {
    overlay.replaceChildren()
    overlay.dataset.previewing = String(previewRunning)
    const byId = new Map(joints.map(joint => [joint.id, joint]))
    for (const joint of joints) {
      if (joint.parent === null) continue
      if (!showInferred.checked && joint.confidence === 'inferred') continue
      const parent = byId.get(joint.parent)
      if (parent === undefined) continue
      const line = svgElement('line')
      line.setAttribute('x1', String(parent.x))
      line.setAttribute('y1', String(parent.y))
      line.setAttribute('x2', String(joint.x))
      line.setAttribute('y2', String(joint.y))
      line.setAttribute('stroke', roleColor[joint.role])
      line.setAttribute('class', `bone-edge confidence-${joint.confidence}`)
      overlay.append(line)
    }
    for (const joint of joints) {
      if (!showInferred.checked && joint.confidence === 'inferred') continue
      const group = svgElement('g')
      group.setAttribute('class', 'joint-handle')
      if (!previewRunning) {
        group.dataset.id = joint.id
        group.dataset.kind = 'joint'
        group.setAttribute('tabindex', '0')
        group.setAttribute('role', 'button')
        group.setAttribute('aria-label', `${displayName('joint', joint.id)}，横向 ${round(joint.x)}，纵向 ${round(joint.y)}`)
      }
      const hit = svgElement('circle')
      hit.setAttribute('cx', String(joint.x))
      hit.setAttribute('cy', String(joint.y))
      const radius = selection.kind === 'joint' && selection.id === joint.id ? 4.2 : 3.2
      hit.setAttribute('r', String(radius / zoom))
      hit.setAttribute('fill', roleColor[joint.role])
      hit.setAttribute('class', `joint-dot confidence-${joint.confidence}`)
      group.append(hit)
      overlay.append(group)
      appendLabel(joint.x, joint.y, displayName('joint', joint.id), roleColor[joint.role])
    }
    if (showPivots.checked) {
      for (const pivot of state.partPivots) {
        const diamond = svgElement('rect')
        diamond.setAttribute('x', String(pivot.x - 2.3 / zoom))
        diamond.setAttribute('y', String(pivot.y - 2.3 / zoom))
        diamond.setAttribute('width', String(4.6 / zoom))
        diamond.setAttribute('height', String(4.6 / zoom))
        diamond.setAttribute('transform', `rotate(45 ${pivot.x} ${pivot.y})`)
        diamond.setAttribute('class', 'pivot-handle')
        diamond.dataset.id = pivot.id
        diamond.dataset.kind = 'pivot'
        overlay.append(diamond)
        if (mode === 'pivot') appendLabel(pivot.x, pivot.y, displayName('pivot', pivot.id), '#ff9d88')
      }
    }
  }

  const renderInspector = (preservePositionInputs = false): void => {
    const joint = selectedJoint()
    const pivot = selectedPivot()
    const current = joint ?? pivot
    if (current === undefined) return
    selectedName.textContent = displayName(selection.kind, current.id)
    selectedType.textContent = joint === undefined ? '部件转轴' : '骨骼关节'
    parentValue.textContent = joint?.parent === null
      ? '这是最上层关节'
      : displayName('joint', joint?.parent ?? pivot?.joint ?? '')
    if (!preservePositionInputs) {
      xInput.value = String(round(current.x))
      yInput.value = String(round(current.y))
    }
    constraintFields.hidden = joint === undefined
    if (joint !== undefined) {
      minInput.value = String(joint.minRotation)
      maxInput.value = String(joint.maxRotation)
      confidenceInput.value = joint.confidence
      const parent = state.joints.find(candidate => candidate.id === joint.parent)
      if (parent === undefined) {
        lengthValue.textContent = '最上层'
        angleValue.textContent = '最上层'
      } else {
        lengthValue.textContent = `${round(Math.hypot(joint.x - parent.x, joint.y - parent.y))} px`
        angleValue.textContent = `${round(Math.atan2(joint.y - parent.y, joint.x - parent.x) * 180 / Math.PI)}°`
      }
    } else if (pivot !== undefined) {
      const boundJoint = state.joints.find(candidate => candidate.id === pivot.joint)
      if (boundJoint === undefined) {
        lengthValue.textContent = '—'
        angleValue.textContent = '—'
      } else {
        lengthValue.textContent = `${round(Math.hypot(pivot.x - boundJoint.x, pivot.y - boundJoint.y))} px`
        angleValue.textContent = `${round(Math.atan2(pivot.y - boundJoint.y, pivot.x - boundJoint.x) * 180 / Math.PI)}°`
      }
    }
    jsonPreview.textContent = JSON.stringify(state, null, 2)
    undoButton.disabled = undoStack.length === 0
  }

  const render = (): void => {
    renderMode()
    renderOverlay()
    renderList()
    renderInspector()
  }

  const applyZoom = (): void => {
    const baseSize = Math.max(260, Math.min(window.innerHeight * 0.66, stageWrap.clientWidth - 36))
    stage.style.width = `${Math.round(baseSize * zoom)}px`
    zoomRange.value = String(Math.round(zoom * 100))
    zoomValue.value = `${Math.round(zoom * 100)}%`
    if (!previewRunning) renderOverlay()
  }

  const centerSelection = (): void => {
    const current = selection.kind === 'joint' ? selectedJoint() : selectedPivot()
    if (current === undefined || zoom <= 1) return
    const scale = stage.getBoundingClientRect().width / state.sourceSize[0]
    const left = stage.offsetLeft + current.x * scale - stageWrap.clientWidth / 2
    const top = stage.offsetTop + current.y * scale - stageWrap.clientHeight / 2
    stageWrap.scrollTo({ left, top, behavior: 'smooth' })
  }

  const previewJoints = (time: number): CalibrationJoint[] => {
    const phase = time * Math.PI * 2 / 1.2
    const swing = Math.sin(phase)
    const offsets: Record<string, number> = {
      spine: Math.sin(phase * 2) * 2,
      chest: -Math.sin(phase * 2) * 1.5,
      head: -Math.sin(phase * 2) * 1.2,
      elbowNear: swing * 24,
      wristNear: -swing * 12,
      elbowFar: -swing * 24,
      wristFar: swing * 12,
      kneeNear: -swing * 28,
      ankleNear: 18 + Math.cos(phase) * 16,
      toeNear: -Math.cos(phase) * 8,
      kneeFar: swing * 28,
      ankleFar: 18 - Math.cos(phase) * 16,
      toeFar: Math.cos(phase) * 8,
      tailMid: Math.sin(phase - 0.5) * 7,
      tailTip: Math.sin(phase - 0.9) * 8,
      flukes: Math.sin(phase - 1.2) * 10,
      ahogeRoot: Math.sin(phase - 0.7) * 5,
      ahogeTip: Math.sin(phase - 1) * 7,
    }
    const sourceById = new Map(state.joints.map(joint => [joint.id, joint]))
    const resultById = new Map<string, CalibrationJoint>()
    const worldRotation = new Map<string, number>()
    const resolve = (source: CalibrationJoint): CalibrationJoint => {
      const existing = resultById.get(source.id)
      if (existing !== undefined) return existing
      if (source.parent === null) {
        const root = { ...source, y: source.y + Math.abs(Math.sin(phase * 2)) * 2.2 }
        resultById.set(source.id, root)
        worldRotation.set(source.id, 0)
        return root
      }
      const sourceParent = sourceById.get(source.parent)
      if (sourceParent === undefined) return { ...source }
      const parent = resolve(sourceParent)
      const rotation = (worldRotation.get(source.parent) ?? 0) + (offsets[source.id] ?? 0) * Math.PI / 180
      const dx = source.x - sourceParent.x
      const dy = source.y - sourceParent.y
      const cosine = Math.cos(rotation)
      const sine = Math.sin(rotation)
      const solved = {
        ...source,
        x: parent.x + dx * cosine - dy * sine,
        y: parent.y + dx * sine + dy * cosine,
      }
      resultById.set(source.id, solved)
      worldRotation.set(source.id, rotation)
      return solved
    }
    return state.joints.map(resolve)
  }

  const stopPreview = (): void => {
    if (!previewRunning) return
    previewRunning = false
    if (previewFrame !== undefined) cancelAnimationFrame(previewFrame)
    previewFrame = undefined
    testMotionButton.textContent = '测试骨骼活动'
    testMotionButton.dataset.running = 'false'
    reference.style.opacity = element<HTMLInputElement>('referenceOpacity').value
    renderOverlay()
  }

  const startPreview = (): void => {
    previewRunning = true
    testMotionButton.textContent = '停止骨骼测试'
    testMotionButton.dataset.running = 'true'
    reference.style.opacity = '0.28'
    const startedAt = performance.now()
    const tick = (now: number): void => {
      if (!previewRunning) return
      renderOverlay(previewJoints((now - startedAt) / 1000))
      previewFrame = requestAnimationFrame(tick)
    }
    previewFrame = requestAnimationFrame(tick)
  }

  const setPosition = (x: number, y: number, preservePositionInputs = false): boolean => {
    const current = selection.kind === 'joint' ? selectedJoint() : selectedPivot()
    if (current === undefined) return false
    const nextX = Math.min(state.sourceSize[0], Math.max(0, round(x)))
    const nextY = Math.min(state.sourceSize[1], Math.max(0, round(y)))
    if (current.x === nextX && current.y === nextY) return false
    current.x = nextX
    current.y = nextY
    markDirty()
    renderOverlay()
    renderList()
    renderInspector(preservePositionInputs)
    return true
  }

  const pointFromEvent = (event: PointerEvent): readonly [number, number] => {
    const rect = overlay.getBoundingClientRect()
    return [
      (event.clientX - rect.left) / rect.width * state.sourceSize[0],
      (event.clientY - rect.top) / rect.height * state.sourceSize[1],
    ]
  }

  overlay.addEventListener('pointerdown', event => {
    const target = (event.target as SVGElement).closest<SVGElement>('[data-kind]')
    const id = target?.dataset.id
    const kind = target?.dataset.kind as Selection['kind'] | undefined
    if (id === undefined || kind === undefined) return
    selection = { kind, id }
    mode = kind
    dragging = selection
    dragSnapshot = clone(state)
    overlay.setPointerCapture(event.pointerId)
    render()
  })
  overlay.addEventListener('pointermove', event => {
    if (dragging === undefined) return
    const [x, y] = pointFromEvent(event)
    setPosition(x, y)
  })
  const finishDrag = (event: PointerEvent): void => {
    if (dragging === undefined) return
    if (dragSnapshot !== undefined) {
      const before = positionIn(dragSnapshot, dragging)
      const after = positionIn(state, dragging)
      if (before !== undefined && after !== undefined && (before.x !== after.x || before.y !== after.y)) {
        pushUndo(dragSnapshot)
      }
    }
    dragging = undefined
    dragSnapshot = undefined
    if (overlay.hasPointerCapture(event.pointerId)) overlay.releasePointerCapture(event.pointerId)
    render()
  }
  overlay.addEventListener('pointerup', finishDrag)
  overlay.addEventListener('pointercancel', finishDrag)

  const bindNumber = (input: HTMLInputElement, axis: 'x' | 'y'): void => {
    const begin = (): void => {
      if (positionEdit !== undefined && sameSelection(positionEdit.selection, selection)) return
      positionEdit = { selection: { ...selection }, snapshot: clone(state), dirty: false }
    }
    const update = (): void => {
      const current = selection.kind === 'joint' ? selectedJoint() : selectedPivot()
      if (current === undefined) return
      const value = Number(input.value)
      if (!Number.isFinite(value)) return
      begin()
      if (setPosition(axis === 'x' ? value : current.x, axis === 'y' ? value : current.y, true)) {
        positionEdit!.dirty = true
      }
    }
    const commit = (): void => {
      if (positionEdit === undefined || !sameSelection(positionEdit.selection, selection)) {
        positionEdit = undefined
        return render()
      }
      if (positionEdit.dirty) pushUndo(positionEdit.snapshot)
      positionEdit = undefined
      render()
    }
    input.addEventListener('focus', begin)
    input.addEventListener('input', update)
    input.addEventListener('change', commit)
    input.addEventListener('blur', commit)
    input.addEventListener('keydown', event => {
      if (event.key === 'Tab') {
        commit()
        return
      }
      if (event.key === 'Enter') {
        commit()
        input.blur()
        return
      }
      if (event.key !== 'Escape' || positionEdit === undefined) return
      state = positionEdit.snapshot
      positionEdit = undefined
      render()
      input.blur()
    })
  }
  bindNumber(xInput, 'x')
  bindNumber(yInput, 'y')

  const updateConstraint = (): void => {
    const joint = selectedJoint()
    if (joint === undefined) return
    const min = Number(minInput.value)
    const max = Number(maxInput.value)
    if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) return render()
    if (joint.minRotation === min && joint.maxRotation === max && joint.confidence === confidenceInput.value) return
    pushUndo()
    joint.minRotation = min
    joint.maxRotation = max
    joint.confidence = confidenceInput.value as JointConfidence
    markDirty()
    render()
  }
  minInput.addEventListener('change', updateConstraint)
  maxInput.addEventListener('change', updateConstraint)
  confidenceInput.addEventListener('change', updateConstraint)

  element<HTMLInputElement>('referenceOpacity').addEventListener('input', event => {
    const value = Number((event.target as HTMLInputElement).value)
    if (!previewRunning) reference.style.opacity = String(value)
    element<HTMLOutputElement>('referenceOpacityValue').value = `${Math.round(value * 100)}%`
  })
  for (const input of [showLabels, showInferred, showPivots]) input.addEventListener('change', render)

  const setZoom = (percent: number): void => {
    zoom = Math.min(4, Math.max(1, percent / 100))
    applyZoom()
    requestAnimationFrame(centerSelection)
  }
  zoomRange.addEventListener('input', () => setZoom(Number(zoomRange.value)))
  element<HTMLButtonElement>('zoomOut').addEventListener('click', () => setZoom(zoom * 100 - 25))
  element<HTMLButtonElement>('zoomIn').addEventListener('click', () => setZoom(zoom * 100 + 25))
  element<HTMLButtonElement>('zoomFit').addEventListener('click', () => {
    zoom = 1
    applyZoom()
    stageWrap.scrollTo({ left: 0, top: 0 })
  })
  testMotionButton.addEventListener('click', () => {
    if (previewRunning) stopPreview()
    else startPreview()
  })
  for (const input of [xInput, yInput, minInput, maxInput, confidenceInput]) {
    input.addEventListener('focus', stopPreview)
  }
  window.addEventListener('resize', applyZoom)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopPreview()
  })

  jointModeButton.addEventListener('click', () => {
    mode = 'joint'
    selection = { kind: 'joint', id: state.joints[0]!.id }
    render()
  })
  pivotModeButton.addEventListener('click', () => {
    mode = 'pivot'
    selection = { kind: 'pivot', id: state.partPivots[0]!.id }
    showPivots.checked = true
    render()
  })
  undoButton.addEventListener('click', () => {
    const previous = undoStack.pop()
    if (previous === undefined) return
    state = previous
    markDirty()
    render()
  })
  element<HTMLButtonElement>('reset').addEventListener('click', () => {
    pushUndo()
    state = clone(original)
    markDirty()
    render()
  })
  element<HTMLButtonElement>('exportRig').addEventListener('click', () => {
    validateCalibrationDocument(state)
    downloadJson('whale-girl-side-neutral.rig.json', documentForExport())
    dirtyStatus.textContent = '已导出骨骼校准文件'
    dirtyStatus.dataset.dirty = 'false'
  })
  element<HTMLButtonElement>('copyRig').addEventListener('click', async () => {
    await navigator.clipboard.writeText(JSON.stringify(documentForExport(), null, 2) + '\n')
    dirtyStatus.textContent = '校准数据已复制'
  })

  const saved = localStorage.getItem('whale-rig-calibration-v1')
  if (saved !== null) {
    try {
      const candidate = JSON.parse(saved) as CalibrationDocument
      validateCalibrationDocument(candidate)
      if (candidate.bindPose === original.bindPose) state = candidate
    } catch {
      localStorage.removeItem('whale-rig-calibration-v1')
    }
  }
  if (!matchesOriginal()) {
    dirtyStatus.textContent = '已恢复上次校准草稿'
    dirtyStatus.dataset.dirty = 'true'
  }
  render()
  applyZoom()
}
