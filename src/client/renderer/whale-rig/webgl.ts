import type { ParameterValues } from './motion.ts'
import type { ResolvedWhalePack, WhaleRigDefinition } from './schema.ts'

type Matrix = readonly [number, number, number, number, number, number]
type RigPart = WhaleRigDefinition['parts'][number]

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0]

function multiply(left: Matrix, right: Matrix): Matrix {
  return [
    left[0] * right[0] + left[2] * right[1],
    left[1] * right[0] + left[3] * right[1],
    left[0] * right[2] + left[2] * right[3],
    left[1] * right[2] + left[3] * right[3],
    left[0] * right[4] + left[2] * right[5] + left[4],
    left[1] * right[4] + left[3] * right[5] + left[5],
  ]
}

function translation(x: number, y: number): Matrix {
  return [1, 0, 0, 1, x, y]
}

function rotation(degrees: number): Matrix {
  const radians = degrees * Math.PI / 180
  return [Math.cos(radians), Math.sin(radians), -Math.sin(radians), Math.cos(radians), 0, 0]
}

function scaling(x: number, y: number): Matrix {
  return [x, 0, 0, y, 0, 0]
}

function transform(matrix: Matrix, x: number, y: number): readonly [number, number] {
  return [matrix[0] * x + matrix[2] * y + matrix[4], matrix[1] * x + matrix[3] * y + matrix[5]]
}

function meshOffset(part: RigPart, values: ParameterValues, xRatio: number, yRatio: number): readonly [number, number] {
  let x = 0
  let y = 0
  for (const deformer of part.mesh?.deformers ?? []) {
    const normalizedX = (xRatio - deformer.center[0]) / deformer.radius[0]
    const normalizedY = (yRatio - deformer.center[1]) / deformer.radius[1]
    const distanceSquared = normalizedX * normalizedX + normalizedY * normalizedY
    if (distanceSquared >= 1) continue
    const weight = (1 - distanceSquared) ** (deformer.falloff ?? 2)
    const amount = (values[deformer.parameter] ?? 0) * weight
    x += deformer.direction[0] * amount
    y += deformer.direction[1] * amount
  }
  return [x, y]
}

/** Use available source pixels before allowing CSS or preference scaling to enlarge the canvas. */
export function resolveCanvasRenderScale(rig: WhaleRigDefinition, devicePixelRatio: number): number {
  const sourceScale = rig.parts.reduce((maximum, part) => Math.max(
    maximum,
    part.uv[2] / part.size[0],
    part.uv[3] / part.size[1],
  ), 1)
  const screenScale = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1
  return Math.min(2, Math.max(screenScale, Math.min(2, sourceScale)))
}

/** Build one bounded CPU mesh. Exported so pack authors can verify deformation without WebGL. */
export function buildPartVertices(
  part: RigPart,
  matrix: Matrix,
  values: ParameterValues,
  atlasSize: WhaleRigDefinition['atlasSize'],
  uv = part.uv,
): Float32Array {
  const [width, height] = part.size
  const [u, v, uvWidth, uvHeight] = uv
  const left = (u + 0.5) / atlasSize.width
  const right = (u + uvWidth - 0.5) / atlasSize.width
  const top = (v + 0.5) / atlasSize.height
  const bottom = (v + uvHeight - 0.5) / atlasSize.height

  if (part.mesh !== undefined) {
    const vertices: number[] = []
    const point = (column: number, row: number): readonly [number, number, number, number] => {
      const xRatio = column / part.mesh!.columns
      const yRatio = row / part.mesh!.rows
      const offset = meshOffset(part, values, xRatio, yRatio)
      const position = transform(matrix, width * xRatio + offset[0], height * yRatio + offset[1])
      return [position[0], position[1], left + (right - left) * xRatio, top + (bottom - top) * yRatio]
    }
    for (let row = 0; row < part.mesh.rows; row += 1) {
      for (let column = 0; column < part.mesh.columns; column += 1) {
        const topLeft = point(column, row)
        const topRight = point(column + 1, row)
        const bottomLeft = point(column, row + 1)
        const bottomRight = point(column + 1, row + 1)
        vertices.push(...topLeft, ...bottomLeft, ...topRight, ...topRight, ...bottomLeft, ...bottomRight)
      }
    }
    return new Float32Array(vertices)
  }

  const bend = part.bendParameter === undefined ? 0 : values[part.bendParameter] ?? 0
  const segments = part.bendParameter === undefined ? 1 : part.segments ?? 4
  const vertices: number[] = []
  for (let row = 0; row <= segments; row += 1) {
    const ratio = row / segments
    const y = height * ratio
    const xOffset = bend * ratio * ratio
    const leftPoint = transform(matrix, xOffset, y)
    const rightPoint = transform(matrix, width + xOffset, y)
    const textureY = top + (bottom - top) * ratio
    vertices.push(leftPoint[0], leftPoint[1], left, textureY, rightPoint[0], rightPoint[1], right, textureY)
  }
  return new Float32Array(vertices)
}

function compile(gl: WebGL2RenderingContext, kind: number, source: string): WebGLShader {
  const shader = gl.createShader(kind)
  if (shader === null) throw new Error('whale rig: could not create shader')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? 'unknown shader error'
    gl.deleteShader(shader)
    throw new Error(`whale rig: ${message}`)
  }
  return shader
}

function link(gl: WebGL2RenderingContext): WebGLProgram {
  const vertex = compile(gl, gl.VERTEX_SHADER, `#version 300 es
    in vec2 a_position;
    in vec2 a_uv;
    uniform vec2 u_resolution;
    out vec2 v_uv;
    void main() {
      vec2 clip = (a_position / u_resolution) * 2.0 - 1.0;
      gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
      v_uv = a_uv;
    }
  `)
  const fragment = compile(gl, gl.FRAGMENT_SHADER, `#version 300 es
    precision mediump float;
    uniform sampler2D u_atlas;
    uniform float u_opacity;
    in vec2 v_uv;
    out vec4 outColor;
    void main() {
      vec4 color = texture(u_atlas, v_uv);
      outColor = vec4(color.rgb, color.a * u_opacity);
    }
  `)
  const program = gl.createProgram()
  if (program === null) throw new Error('whale rig: could not create program')
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? 'unknown link error'
    gl.deleteProgram(program)
    throw new Error(`whale rig: ${message}`)
  }
  return program
}

/** One transparent WebGL2 canvas with fixed in-code shaders and bounded draw calls. */
export class WhaleRigRenderer {
  private readonly gl: WebGL2RenderingContext
  private readonly program: WebGLProgram
  private readonly buffer: WebGLBuffer
  private readonly texture: WebGLTexture
  private readonly positionLocation: number
  private readonly uvLocation: number
  private readonly resolutionLocation: WebGLUniformLocation
  private readonly opacityLocation: WebGLUniformLocation
  private readonly partsById: ReadonlyMap<string, RigPart>
  private readonly orderedParts: readonly RigPart[]

  constructor(private readonly canvas: HTMLCanvasElement, private readonly pack: ResolvedWhalePack, atlas: HTMLImageElement) {
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: true, depth: false, stencil: false })
    if (gl === null) throw new Error('whale rig: WebGL2 unavailable')
    this.gl = gl
    this.program = link(gl)
    const buffer = gl.createBuffer()
    const texture = gl.createTexture()
    if (buffer === null || texture === null) throw new Error('whale rig: resource allocation failed')
    this.buffer = buffer
    this.texture = texture
    this.positionLocation = gl.getAttribLocation(this.program, 'a_position')
    this.uvLocation = gl.getAttribLocation(this.program, 'a_uv')
    const resolution = gl.getUniformLocation(this.program, 'u_resolution')
    const opacity = gl.getUniformLocation(this.program, 'u_opacity')
    if (this.positionLocation < 0 || this.uvLocation < 0 || resolution === null || opacity === null) {
      throw new Error('whale rig: shader contract mismatch')
    }
    this.resolutionLocation = resolution
    this.opacityLocation = opacity
    this.partsById = new Map(pack.rig.parts.map(part => [part.id, part]))
    this.orderedParts = pack.rig.parts.toSorted((left, right) => left.z - right.z)

    const dpr = resolveCanvasRenderScale(pack.rig, window.devicePixelRatio || 1)
    canvas.width = Math.round(pack.rig.canvas.width * dpr)
    canvas.height = Math.round(pack.rig.canvas.height * dpr)
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.useProgram(this.program)
    gl.uniform2f(this.resolutionLocation, pack.rig.canvas.width, pack.rig.canvas.height)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
    gl.enableVertexAttribArray(this.positionLocation)
    gl.enableVertexAttribArray(this.uvLocation)
    gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 16, 0)
    gl.vertexAttribPointer(this.uvLocation, 2, gl.FLOAT, false, 16, 8)
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
  }

  draw(values: ParameterValues, mirrored = false): void {
    const gl = this.gl
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(this.program)
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    const worlds = new Map<string, Matrix>()
    const stage = mirrored
      ? multiply(translation(this.pack.rig.canvas.width, 0), scaling(-1, 1))
      : IDENTITY
    const worldFor = (part: RigPart): Matrix => {
      const cached = worlds.get(part.id)
      if (cached !== undefined) return cached
      const x = part.position[0] + (part.translateXParameter === undefined ? 0 : values[part.translateXParameter] ?? 0)
      const y = part.position[1] + (part.translateYParameter === undefined ? 0 : values[part.translateYParameter] ?? 0)
      const angle = part.rotationParameter === undefined ? 0 : values[part.rotationParameter] ?? 0
      const scaleX = part.scaleXParameter === undefined ? 1 : values[part.scaleXParameter] ?? 1
      const scaleY = part.scaleYParameter === undefined ? 1 : values[part.scaleYParameter] ?? 1
      const local = multiply(
        multiply(
          multiply(translation(x + part.pivot[0], y + part.pivot[1]), rotation(angle)),
          scaling(scaleX, scaleY),
        ),
        translation(-part.pivot[0], -part.pivot[1]),
      )
      const parent = part.parent === null ? stage : worldFor(this.partsById.get(part.parent)!)
      const world = multiply(parent, local)
      worlds.set(part.id, world)
      return world
    }
    for (const part of this.orderedParts) {
      const opacity = part.opacityParameter === undefined ? 1 : values[part.opacityParameter] ?? 0
      if (opacity <= 0.001) continue
      const matrix = worldFor(part)
      const frameValue = part.frameParameter === undefined ? -1 : values[part.frameParameter] ?? -1
      const frameIndex = part.frames === undefined || frameValue < 0
        ? -1
        : Math.min(part.frames.length - 1, Math.floor(frameValue))
      const uv = frameIndex < 0 ? part.uv : part.frames![frameIndex]!
      const vertices = buildPartVertices(part, matrix, values, this.pack.rig.atlasSize, uv)
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW)
      gl.uniform1f(this.opacityLocation, opacity)
      gl.drawArrays(part.mesh === undefined ? gl.TRIANGLE_STRIP : gl.TRIANGLES, 0, vertices.length / 4)
    }
  }

  dispose(): void {
    this.gl.deleteTexture(this.texture)
    this.gl.deleteBuffer(this.buffer)
    this.gl.deleteProgram(this.program)
  }
}
