import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, resolve, sep } from 'node:path'

const root = resolve(process.cwd())
const port = Number(process.argv[2] ?? 3105)
const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.webm', 'video/webm'],
])

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname)
    const target = resolve(root, `.${pathname}`)
    if (target !== root && !target.startsWith(`${root}${sep}`)) {
      response.writeHead(403).end('Forbidden')
      return
    }
    const info = await stat(target)
    if (!info.isFile()) throw new Error('Not a file')
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Length': info.size,
      'Content-Type': contentTypes.get(extname(target)) ?? 'application/octet-stream',
    })
    createReadStream(target).pipe(response)
  } catch {
    response.writeHead(404).end('Not found')
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Preview server: http://127.0.0.1:${port}/`)
})
