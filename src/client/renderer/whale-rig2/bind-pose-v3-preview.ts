type Point = readonly [number, number]

const SIZE = 1024
const GRID_X = [392, 412, 432, 452, 472, 492, 516, 546]
const GRID_Y = [820, 832, 844, 856, 868, 880, 892, 906, 922, 944, 972, 1020]

const PART_ORDER = [
  'body-base-underlay', 'hair-back-underlay', 'tail-underlay',
  'thigh-far-underlay', 'calf-far-underlay', 'foot-far-underlay',
  'upper-arm-far-underlay', 'forearm-far-underlay',
  'hair-back', 'tail', 'thigh-far', 'calf-far', 'knee-far', 'foot-far',
  'upper-arm-far', 'forearm-far', 'body-base',
  'upper-arm-near', 'forearm-near', 'head', 'ahoge',
]

const NEAR_LEG = new Set(['thigh-near', 'calf-near', 'knee-near', 'foot-near'])
const BODY_PIVOT: Point = [462, 838]
const KNEE_PIVOT: Point = [468, 880]
const ANKLE_PIVOT: Point = [473, 920]

interface Mat {
  a: number; b: number; c: number; d: number; e: number; f: number
}

function identity(): Mat { return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } }

function multiply(left: Mat, right: Mat): Mat {
  return {
    a: left.a * right.a + left.c * right.b,
    b: left.b * right.a + left.d * right.b,
    c: left.a * right.c + left.c * right.d,
    d: left.b * right.c + left.d * right.d,
    e: left.a * right.e + left.c * right.f + left.e,
    f: left.b * right.e + left.d * right.f + left.f,
  }
}

function rotationAround(point: Point, degrees: number): Mat {
  const radians = degrees * Math.PI / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return { a: cos, b: sin, c: -sin, d: cos, e: point[0] - cos * point[0] + sin * point[1], f: point[1] - sin * point[0] - cos * point[1] }
}

function apply(matrix: Mat, point: Point): Point {
  return [matrix.a * point[0] + matrix.c * point[1] + matrix.e, matrix.b * point[0] + matrix.d * point[1] + matrix.f]
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`无法加载角色零件：${url}`))
    image.src = url
  })
}

function affineFromTriangles(source: readonly Point[], destination: readonly Point[]): Mat {
  const [s0, s1, s2] = source
  const [d0, d1, d2] = destination
  const denominator = (s1[0] - s0[0]) * (s2[1] - s0[1]) - (s1[1] - s0[1]) * (s2[0] - s0[0])
  if (Math.abs(denominator) < 1e-6) return identity()
  const a = ((d1[0] - d0[0]) * (s2[1] - s0[1]) - (d2[0] - d0[0]) * (s1[1] - s0[1])) / denominator
  const c = ((d2[0] - d0[0]) * (s1[0] - s0[0]) - (d1[0] - d0[0]) * (s2[0] - s0[0])) / denominator
  const b = ((d1[1] - d0[1]) * (s2[1] - s0[1]) - (d2[1] - d0[1]) * (s1[1] - s0[1])) / denominator
  const d = ((d2[1] - d0[1]) * (s1[0] - s0[0]) - (d1[1] - d0[1]) * (s2[0] - s0[0])) / denominator
  return { a, b, c, d, e: d0[0] - a * s0[0] - c * s0[1], f: d0[1] - b * s0[0] - d * s0[1] }
}

function drawTriangle(ctx: CanvasRenderingContext2D, source: HTMLImageElement, src: readonly Point[], dst: readonly Point[]): void {
  const matrix = affineFromTriangles(src, dst)
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(dst[0]![0], dst[0]![1])
  ctx.lineTo(dst[1]![0], dst[1]![1])
  ctx.lineTo(dst[2]![0], dst[2]![1])
  ctx.closePath()
  ctx.clip()
  ctx.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f)
  ctx.drawImage(source, 0, 0)
  ctx.restore()
}

function makeMeshVertices(thighDegrees: number, calfDegrees: number): Point[] {
  const thigh = rotationAround(BODY_PIVOT, thighDegrees)
  const knee = apply(thigh, KNEE_PIVOT)
  const calf = multiply(rotationAround(knee, calfDegrees), thigh)
  const vertices: Point[] = []
  for (const y of GRID_Y) {
    const lowerWeight = Math.max(0, Math.min(1, (y - 858) / 44))
    for (const x of GRID_X) {
      const source: Point = [x, y]
      const upper = apply(thigh, source)
      const lower = apply(calf, source)
      vertices.push([
        upper[0] * (1 - lowerWeight) + lower[0] * lowerWeight,
        upper[1] * (1 - lowerWeight) + lower[1] * lowerWeight,
      ])
    }
  }
  return vertices
}

function drawMesh(ctx: CanvasRenderingContext2D, source: HTMLImageElement, vertices: readonly Point[]): void {
  const columns = GRID_X.length
  for (let row = 0; row < GRID_Y.length - 1; row += 1) {
    for (let column = 0; column < columns - 1; column += 1) {
      const topLeft = row * columns + column
      const topRight = topLeft + 1
      const bottomLeft = topLeft + columns
      const bottomRight = bottomLeft + 1
      const sourceTopLeft: Point = [GRID_X[column]!, GRID_Y[row]!]
      const sourceTopRight: Point = [GRID_X[column + 1]!, GRID_Y[row]!]
      const sourceBottomLeft: Point = [GRID_X[column]!, GRID_Y[row + 1]!]
      const sourceBottomRight: Point = [GRID_X[column + 1]!, GRID_Y[row + 1]!]
      drawTriangle(ctx, source, [sourceTopLeft, sourceBottomLeft, sourceBottomRight], [vertices[topLeft]!, vertices[bottomLeft]!, vertices[bottomRight]!])
      drawTriangle(ctx, source, [sourceTopLeft, sourceBottomRight, sourceTopRight], [vertices[topLeft]!, vertices[bottomRight]!, vertices[topRight]!])
    }
  }
}

function drawGrid(ctx: CanvasRenderingContext2D, vertices: readonly Point[]): void {
  const columns = GRID_X.length
  ctx.save()
  ctx.strokeStyle = '#63e6ff'
  ctx.lineWidth = 1.5
  ctx.globalAlpha = 0.72
  for (let row = 0; row < GRID_Y.length; row += 1) {
    ctx.beginPath()
    for (let column = 0; column < columns; column += 1) {
      const point = vertices[row * columns + column]!
      if (column === 0) ctx.moveTo(point[0], point[1])
      else ctx.lineTo(point[0], point[1])
    }
    ctx.stroke()
  }
  for (let column = 0; column < columns; column += 1) {
    ctx.beginPath()
    for (let row = 0; row < GRID_Y.length; row += 1) {
      const point = vertices[row * columns + column]!
      if (row === 0) ctx.moveTo(point[0], point[1])
      else ctx.lineTo(point[0], point[1])
    }
    ctx.stroke()
  }
  ctx.restore()
}

function drawBones(ctx: CanvasRenderingContext2D, thighDegrees: number, calfDegrees: number): void {
  const thigh = rotationAround(BODY_PIVOT, thighDegrees)
  const knee = apply(thigh, KNEE_PIVOT)
  const calf = multiply(rotationAround(knee, calfDegrees), thigh)
  const ankle = apply(calf, ANKLE_PIVOT)
  ctx.save()
  ctx.strokeStyle = '#ffd166'
  ctx.fillStyle = '#ff6f91'
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(BODY_PIVOT[0], BODY_PIVOT[1]); ctx.lineTo(knee[0], knee[1]); ctx.lineTo(ankle[0], ankle[1]); ctx.stroke()
  for (const point of [BODY_PIVOT, knee, ankle]) {
    ctx.beginPath(); ctx.arc(point[0], point[1], 7, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}

export async function createBindPoseV3Preview(canvas: HTMLCanvasElement, options: { assetBaseUrl: string }): Promise<{
  setThighAngle(value: number): void
  setCalfAngle(value: number): void
  setShowGrid(value: boolean): void
  setShowBones(value: boolean): void
  render(): void
}> {
  const imageEntries = await Promise.all(PART_ORDER.map(async id => [id, await loadImage(`${options.assetBaseUrl}/textures/${id}.png`)] as const))
  const images = new Map(imageEntries)
  const meshSource = await loadImage(`${options.assetBaseUrl}/textures/leg-near-mesh-source.png`)
  const ctx = canvas.getContext('2d')!
  canvas.width = SIZE
  canvas.height = SIZE
  let thighAngle = 0
  let calfAngle = 0
  let showGrid = false
  let showBones = true

  const render = (): void => {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, SIZE, SIZE)
    ctx.fillStyle = '#121927'
    ctx.fillRect(0, 0, SIZE, SIZE)
    for (const id of PART_ORDER) {
      if (NEAR_LEG.has(id)) continue
      const image = images.get(id)
      if (image !== undefined) ctx.drawImage(image, 0, 0)
      if (id === 'body-base') {
        const vertices = makeMeshVertices(thighAngle, calfAngle)
        drawMesh(ctx, meshSource, vertices)
        if (showGrid) drawGrid(ctx, vertices)
        if (showBones) drawBones(ctx, thighAngle, calfAngle)
      }
    }
  }
  render()
  return {
    setThighAngle(value: number): void { thighAngle = value; render() },
    setCalfAngle(value: number): void { calfAngle = value; render() },
    setShowGrid(value: boolean): void { showGrid = value; render() },
    setShowBones(value: boolean): void { showBones = value; render() },
    render,
  }
}
