const TILE = 16

/** Conservative alpha occupancy: even one faint edge pixel keeps its tile alive. */
export function buildAlphaCoverage(rgba: Uint8ClampedArray, width: number, height: number) {
  const columns = Math.ceil(width / TILE)
  const rows = Math.ceil(height / TILE)
  const stride = columns + 1
  const sums = new Uint32Array(stride * (rows + 1))
  for (let y = 0; y < height; y++) {
    const row = (Math.floor(y / TILE) + 1) * stride
    for (let x = 0; x < width; x++) {
      if (rgba[(y * width + x) * 4 + 3]! > 0) sums[row + Math.floor(x / TILE) + 1] = 1
    }
  }
  for (let y = 1; y <= rows; y++) {
    for (let x = 1; x <= columns; x++) {
      const i = y * stride + x
      sums[i] = sums[i]! + sums[i - 1]! + sums[i - stride]! - sums[i - stride - 1]!
    }
  }
  return (left: number, top: number, right: number, bottom: number): boolean => {
    // Invalid bounds must never hide artwork.
    if (![left, top, right, bottom].every(Number.isFinite)) return true
    const x0 = Math.max(0, Math.min(columns, Math.floor(left / TILE)))
    const y0 = Math.max(0, Math.min(rows, Math.floor(top / TILE)))
    const x1 = Math.max(x0, Math.min(columns, Math.ceil(right / TILE)))
    const y1 = Math.max(y0, Math.min(rows, Math.ceil(bottom / TILE)))
    return sums[y1 * stride + x1]! - sums[y0 * stride + x1]!
      - sums[y1 * stride + x0]! + sums[y0 * stride + x0]! > 0
  }
}

type Coverage = ReturnType<typeof buildAlphaCoverage>
const coverageCache = new WeakMap<HTMLImageElement, Coverage | null>()

/** Read once per decoded texture, never once per frame. Failure simply disables culling. */
export function imageAlphaCoverage(image: HTMLImageElement): Coverage | null {
  const cached = coverageCache.get(image)
  if (cached !== undefined) return cached
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  let coverage: Coverage | null = null
  try {
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (context) {
      context.drawImage(image, 0, 0)
      coverage = buildAlphaCoverage(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height)
    }
  } catch {
    // Cross-origin or restricted canvases still use the original renderer.
  } finally {
    canvas.width = canvas.height = 0
  }
  coverageCache.set(image, coverage)
  return coverage
}
