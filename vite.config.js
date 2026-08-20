import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

// ─────────────────────────────────────────────────────────────────────────────
// Set this to your GitHub repo name. It becomes the Pages base path, so the
// site lives at https://<user>.github.io/<REPO_NAME>/
// If you deploy to a custom domain or to the root of a user page, set to '/'.
// ─────────────────────────────────────────────────────────────────────────────
const REPO_NAME = 'instrument-qr'

const DB_PATH = resolve(import.meta.dirname, 'public/machines.json')

function readBody(req) {
  return new Promise((res, rej) => {
    let raw = ''
    req.on('data', (c) => {
      raw += c
      if (raw.length > 1_000_000) req.destroy()
    })
    req.on('end', () => res(raw))
    req.on('error', rej)
  })
}

function send(res, code, payload) {
  res.statusCode = code
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

/**
 * Dev-only disk write hook.
 *
 * The Vite dev server runs on Node, so it can persist the admin form's
 * submissions to public/machines.json for real. GitHub Pages is static and has
 * no equivalent — there, the client probes /__api/ping, gets nothing, and falls
 * back to localStorage plus a Download button.
 *
 * This is why real data entry happens locally and then gets committed.
 */
function diskWriteApi() {
  return {
    name: 'instrument-disk-write-api',
    apply: 'serve',
    configureServer(server) {
      // Presence of this endpoint is how the client knows disk writes work.
      server.middlewares.use('/__api/ping', (req, res) => {
        send(res, 200, { writable: true })
      })

      server.middlewares.use('/__api/instruments', async (req, res, next) => {
        if (req.method !== 'POST') return next()
        try {
          const incoming = JSON.parse(await readBody(req))
          const db = JSON.parse(await readFile(DB_PATH, 'utf8'))

          const code = String(incoming.code ?? '').trim()
          if (!code) return send(res, 400, { error: 'Unique Code is required.' })

          // Duplicate guard, server side. The client checks too, but the file
          // on disk is the only authority that matters.
          if (db.some((r) => String(r.code).trim() === code)) {
            return send(res, 409, { error: `Code ${code} already exists.` })
          }

          db.push({ ...incoming, code })
          await writeFile(DB_PATH, JSON.stringify(db, null, 2) + '\n', 'utf8')
          send(res, 201, { ok: true, wrote: DB_PATH, count: db.length })
        } catch (err) {
          send(res, 500, { error: err.message })
        }
      })

      server.middlewares.use('/__api/clear-samples', async (req, res, next) => {
        if (req.method !== 'POST') return next()
        try {
          const db = JSON.parse(await readFile(DB_PATH, 'utf8'))
          const kept = db.filter((r) => !r.sample)
          await writeFile(DB_PATH, JSON.stringify(kept, null, 2) + '\n', 'utf8')
          send(res, 200, { ok: true, removed: db.length - kept.length })
        } catch (err) {
          send(res, 500, { error: err.message })
        }
      })
    },
  }
}

export default defineConfig({
  base: REPO_NAME === '/' ? '/' : `/${REPO_NAME}/`,
  plugins: [react(), diskWriteApi()],
})
