/**
 * Due-date maths and formatting.
 *
 * Dates are stored ISO (YYYY-MM-DD) so string sorting works, and displayed
 * DD-MM-YYYY to match the existing spreadsheet.
 */

/** Amber window: inside this many days, a due date is "due soon". */
export const SOON_DAYS = 30

/** Parse 'YYYY-MM-DD' as a local calendar date, not UTC. */
export function parseISO(iso) {
  if (typeof iso !== 'string') return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim())
  if (!m) return null
  const [, y, mo, d] = m
  const date = new Date(Number(y), Number(mo) - 1, Number(d))
  // Reject rollovers like 2026-02-31.
  if (date.getMonth() !== Number(mo) - 1 || date.getDate() !== Number(d)) return null
  return date
}

/** ISO → DD-MM-YYYY. Returns an em dash for anything unparseable. */
export function toDisplay(iso) {
  const d = parseISO(iso)
  if (!d) return '—'
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`
}

function todayMidnight() {
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), n.getDate())
}

/** Whole days from today to the given date. Negative means past. */
export function daysUntil(iso) {
  const d = parseISO(iso)
  if (!d) return null
  return Math.round((d - todayMidnight()) / 86_400_000)
}

/**
 * Status of a single due date.
 * level: 'overdue' | 'soon' | 'ok' | 'unknown'
 */
export function dueStatus(iso) {
  const days = daysUntil(iso)
  if (days == null) return { level: 'unknown', days: null, text: 'No date set' }
  if (days < 0) {
    const n = Math.abs(days)
    return { level: 'overdue', days, text: `${n} day${n === 1 ? '' : 's'} overdue` }
  }
  if (days === 0) return { level: 'overdue', days, text: 'Due today' }
  if (days <= SOON_DAYS) return { level: 'soon', days, text: `In ${days} day${days === 1 ? '' : 's'}` }
  return { level: 'ok', days, text: `In ${days} days` }
}

const SEVERITY = { overdue: 0, soon: 1, ok: 2, unknown: 3 }

/**
 * The most urgent due date on a record — drives the headline badge and the
 * index sort order.
 */
export function nearestDue(record, dueFields) {
  const candidates = dueFields
    .map((f) => ({ field: f, status: dueStatus(record[f.key]) }))
    .filter((c) => c.status.days != null)

  if (candidates.length === 0) {
    return { field: null, status: { level: 'unknown', days: null, text: 'No dates set' } }
  }
  return candidates.reduce((a, b) => (b.status.days < a.status.days ? b : a))
}

/** Sort comparator: most urgent first, then by code for a stable order. */
export function byUrgency(dueFields) {
  return (a, b) => {
    const na = nearestDue(a, dueFields)
    const nb = nearestDue(b, dueFields)
    const sa = SEVERITY[na.status.level]
    const sb = SEVERITY[nb.status.level]
    if (sa !== sb) return sa - sb
    if (na.status.days != null && nb.status.days != null && na.status.days !== nb.status.days) {
      return na.status.days - nb.status.days
    }
    return String(a.code).localeCompare(String(b.code), undefined, { numeric: true })
  }
}
