// Monta build-nas/homecloud-nas.tar.gz: deploy/ (Dockerfile, compose, site) + server/ (sem node_modules e testes)
import { execSync } from 'node:child_process'
import { cpSync, rmSync, mkdirSync } from 'node:fs'
const out = 'build-nas/homecloud'
rmSync('build-nas', { recursive: true, force: true })
mkdirSync(out, { recursive: true })
cpSync('deploy', out, { recursive: true })
mkdirSync(`${out}/server`, { recursive: true })
for (const f of ['server.mjs', 'package.json', 'package-lock.json']) cpSync(`server/${f}`, `${out}/server/${f}`)
cpSync('server/lib', `${out}/server/lib`, { recursive: true })
execSync('tar -czf homecloud-nas.tar.gz homecloud', { cwd: 'build-nas', stdio: 'inherit' })
console.log('Pacote: build-nas/homecloud-nas.tar.gz')
