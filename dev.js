import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const root = dirname(fileURLToPath(import.meta.url))
const commands = [
  spawn(process.execPath, [join(root, 'server.js')], { stdio: 'inherit' }),
  spawn(process.execPath, [join(root, 'node_modules/vite/bin/vite.js')], { stdio: 'inherit' }),
]
for (const child of commands) child.on('exit', code => {
  for (const other of commands) if (other !== child && !other.killed) other.kill('SIGTERM')
  process.exit(code ?? 0)
})
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => commands.forEach(child => child.kill(signal)))
