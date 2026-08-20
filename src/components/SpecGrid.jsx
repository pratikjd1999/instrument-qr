import { toDisplay } from '../lib/dates.js'

/** Long free text stacks; short values sit on a dotted leader line. */
const BLOCK_THRESHOLD = 28

function renderValue(field, raw) {
  if (raw === '' || raw == null) return '—'
  if (field.kind === 'date') return toDisplay(raw)
  if (field.kind === 'number') return `${raw}${field.suffix ?? ''}`
  return String(raw)
}

/**
 * Spec-sheet data grid, set the way a parts catalogue would: label, dotted
 * leader, value. Renders straight from the schema, so a new field appears here
 * without touching this file.
 */
export default function SpecGrid({ record, fields }) {
  return (
    <dl className="spec-list">
      {fields.map((field) => {
        const display = renderValue(field, record[field.key])
        const isBlock = field.input === 'textarea' || display.length > BLOCK_THRESHOLD

        if (isBlock) {
          return (
            <div className="spec-block" key={field.key}>
              <dt>{field.label}</dt>
              <dd className={field.mono ? 'mono' : undefined}>{display}</dd>
            </div>
          )
        }

        return (
          <div className="spec-row" key={field.key}>
            <dt>{field.label}</dt>
            <span className="spec-leader" aria-hidden="true" />
            <dd className={field.mono ? 'mono' : undefined}>{display}</dd>
          </div>
        )
      })}
    </dl>
  )
}
