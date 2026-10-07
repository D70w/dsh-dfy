import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { resolve, sep, extname } from 'node:path'
const root = resolve('artifacts/public-demo')
const mime = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.json':'application/json; charset=utf-8' }
createServer(async (req,res) => {
  try {
    const path = decodeURIComponent(new URL(req.url,'http://localhost').pathname)
    const file = resolve(root, `.${path === '/' ? '/index.html' : path}`)
    if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return }
    const info = await stat(file)
    if (!info.isFile()) { res.writeHead(404).end(); return }
    res.writeHead(200, {'Content-Type':mime[extname(file)] ?? 'application/octet-stream','Content-Length':info.size,'Cache-Control':'no-store'})
    createReadStream(file).pipe(res)
  } catch { res.writeHead(404).end('Not found') }
}).listen(Number(process.argv[2] ?? 3152),'127.0.0.1',()=>console.log('Local demo: http://127.0.0.1:3152/'))
