import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DUE_FIELDS } from '../lib/schema.js'
import { byUrgency, nearestDue, toDisplay } from '../lib/dates.js'

/** Index of every instrument, most urgent first. */
export default function Home({ instruments, loading }) {
  const [query, setQuery] = useState('')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? instruments.filter((r) =>
          [r.code, r.name, r.faultHistory].some((v) => String(v ?? '').toLowerCase().includes(q)),
        )
      : instruments
    return [...filtered].sort(byUrgency(DUE_FIELDS))
  }, [instruments, query])

  return (
    <div>
      <h1 className="page-title">Instruments</h1>
      <p className="page-sub">
        {loading
          ? 'Loading…'
          : `${instruments.length} on record. Sorted by whichever due date is nearest.`}
      </p>

      <div className="search-row">
        <input
          className="input"
          type="search"
          placeholder="Search code, name, or fault"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search instruments"
        />
      </div>

      {!loading && rows.length === 0 && (
        <div className="empty">
          {instruments.length === 0 ? (
            <>
              <p>No instruments on record yet.</p>
              <Link className="btn btn-primary" to="/admin">
                Add the first one
              </Link>
            </>
          ) : (
            <p>Nothing matches “{query}”.</p>
          )}
        </div>
      )}

      <div className="list">
        {rows.map((record) => {
          const near = nearestDue(record, DUE_FIELDS)
          const label = near.field?.shortLabel ?? near.field?.label ?? 'No dates'
          return (
            <Link
              key={record.code}
              to={`/i/${encodeURIComponent(record.code)}`}
              className={`list-item lv-${near.status.level}`}
            >
              <span className="list-code">{record.code}</span>
              <span className="list-body">
                <span className="list-name">{record.name || 'Unnamed instrument'}</span>
                <span className="list-meta">
                  {label}: {toDisplay(record[near.field?.key])}
                  {record.pending && ' · unsaved'}
                </span>
              </span>
              <span className={`list-status lv-${near.status.level}`}>{near.status.text}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
