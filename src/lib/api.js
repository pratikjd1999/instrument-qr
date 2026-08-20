/**
 * Load / add / export.
 *
 * This is the seam. Swapping to a real backend means rewriting this file and
 * nothing else — no component imports change.
 *
 * Two modes, decided at runtime:
 *
 *   writable    the Vite dev server is present, so adds go to disk in
 *               public/machines.json for real (see vite.config.js)
 *   read-only   static host (GitHub Pages). Adds land in localStorage and the
 *               admin page offers a Download machines.json escape hatch
 */

const DB_URL = `${import.meta.env.BASE_URL}machines.json`
const LS_PENDING = 'iqr.pendingInstruments'
const LS_SAMPLES_CLEARED = 'iqr.samplesCleared'

let writableCache = null

/** Is a disk-write endpoint available? Cached after the first probe. */
export async function isWritable() {
  if (writableCache !== null) return writableCache
  try {
    const res = await fetch('/__api/ping', { method: 'GET' })
    writableCache = res.ok && (await res.json()).writable === true
  } catch {
    writableCache = false
  }
  return writableCache
}

function readPending() {
  try {
    const raw = localStorage.getItem(LS_PENDING)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writePending(list) {
  localStorage.setItem(LS_PENDING, JSON.stringify(list))
}

function samplesClearedLocally() {
  return localStorage.getItem(LS_SAMPLES_CLEARED) === 'true'
}

/**
 * Every instrument: the committed file, plus anything held in the browser.
 * Returns { instruments, pendingCount, writable }.
 */
export async function loadInstruments() {
  const writable = await isWritable()

  let committed = []
  try {
    const res = await fetch(DB_URL, { cache: 'no-store' })
    if (res.ok) {
      const parsed = await res.json()
      if (Array.isArray(parsed)) committed = parsed
    }
  } catch {
    // Missing or malformed file: treat as empty rather than crashing the page.
  }

  if (!writable && samplesClearedLocally()) {
    committed = committed.filter((r) => !r.sample)
  }

  // In writable mode the file is the truth, so any leftover browser records
  // are ignored rather than shown twice.
  const pending = writable ? [] : readPending()
  const committedCodes = new Set(committed.map((r) => String(r.code)))
  const overlay = pending.filter((r) => !committedCodes.has(String(r.code)))

  return {
    instruments: [...committed, ...overlay.map((r) => ({ ...r, pending: true }))],
    pendingCount: overlay.length,
    writable,
  }
}

/** All codes currently in use — for the duplicate guard. */
export async function existingCodes() {
  const { instruments } = await loadInstruments()
  return instruments.map((r) => String(r.code))
}

/**
 * Add one instrument.
 * Returns { ok, persisted: 'disk' | 'browser', error }.
 */
export async function addInstrument(record) {
  if (await isWritable()) {
    try {
      const res = await fetch('/__api/instruments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) return { ok: false, error: body.error ?? `Write failed (${res.status}).` }
      return { ok: true, persisted: 'disk' }
    } catch (err) {
      return { ok: false, error: `Could not reach the dev server: ${err.message}` }
    }
  }

  const pending = readPending()
  if (pending.some((r) => String(r.code) === String(record.code))) {
    return { ok: false, error: `Code ${record.code} already exists.` }
  }
  pending.push(record)
  writePending(pending)
  return { ok: true, persisted: 'browser' }
}

/** Remove the three seeded demo records. */
export async function clearSamples() {
  if (await isWritable()) {
    try {
      const res = await fetch('/__api/clear-samples', { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) return { ok: false, error: body.error ?? 'Could not clear sample data.' }
      return { ok: true, removed: body.removed ?? 0 }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  }
  localStorage.setItem(LS_SAMPLES_CLEARED, 'true')
  return { ok: true, removed: null }
}

/** Discard browser-held records (read-only mode only). */
export function clearPending() {
  localStorage.removeItem(LS_PENDING)
}

/**
 * Download the full dataset as machines.json — the escape hatch for anything
 * added on the deployed site. Commit the file to make it permanent.
 */
export async function downloadJson() {
  const { instruments } = await loadInstruments()
  const clean = instruments.map(({ pending, ...rest }) => rest)
  const blob = new Blob([JSON.stringify(clean, null, 2) + '\n'], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'machines.json'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
