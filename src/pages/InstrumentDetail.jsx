import { Link, useParams } from 'react-router-dom'
import Nameplate from '../components/Nameplate.jsx'
import { DueCard, HeadlineBadge } from '../components/DueBadge.jsx'
import SpecGrid from '../components/SpecGrid.jsx'
import { DUE_FIELDS, SPEC_FIELDS } from '../lib/schema.js'
import { nearestDue } from '../lib/dates.js'

/**
 * What the QR opens. Mobile-first — this is read one-handed, standing in front
 * of the instrument.
 */
export default function InstrumentDetail({ instruments, loading }) {
  const { code } = useParams()
  const record = instruments.find((r) => String(r.code) === String(code))

  if (loading) {
    return <p className="page-sub">Loading…</p>
  }

  if (!record) {
    return (
      <div className="empty">
        <div className="empty-code">{code}</div>
        <p>
          No instrument with this code.
          <br />
          It may not have been added yet.
        </p>
        <div className="btn-row" style={{ justifyContent: 'center', marginTop: '1rem' }}>
          <Link className="btn" to="/">
            All instruments
          </Link>
          <Link className="btn btn-primary" to="/admin">
            Add it
          </Link>
        </div>
      </div>
    )
  }

  const headline = nearestDue(record, DUE_FIELDS)
  const headlineText =
    headline.field == null
      ? 'No dates set'
      : `${headline.field.shortLabel ?? headline.field.label} — ${headline.status.text}`

  return (
    <div className="stack">
      <Nameplate code={record.code} name={record.name} />

      <div>
        <HeadlineBadge level={headline.status.level}>{headlineText}</HeadlineBadge>
        {record.pending && (
          <span className="tag" style={{ marginLeft: '0.5rem' }}>
            Unsaved — browser only
          </span>
        )}
      </div>

      <section>
        <h2 className="section-label">Status</h2>
        <div className="due-grid" style={{ marginTop: 0 }}>
          {DUE_FIELDS.map((field) => (
            <DueCard key={field.key} field={field} value={record[field.key]} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="section-label">Specification</h2>
        <div className="card">
          <SpecGrid record={record} fields={SPEC_FIELDS} />
        </div>
      </section>

      <div className="btn-row">
        <Link className="btn" to="/">
          All instruments
        </Link>
        <Link className="btn" to={`/admin/qr/${encodeURIComponent(record.code)}`}>
          QR code
        </Link>
      </div>
    </div>
  )
}
