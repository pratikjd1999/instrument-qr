import { dueStatus, toDisplay } from '../lib/dates.js'

/**
 * One due-date countdown. Colour is meaningful here and nowhere else — an
 * overdue instrument has to be unmistakable at arm's length.
 */
export function DueCard({ field, value }) {
  const status = dueStatus(value)
  return (
    <div className={`due-card lv-${status.level}`}>
      <div className="due-label">{field.shortLabel ?? field.label}</div>
      <div className="due-when">{status.text}</div>
      <div className="due-date mono">{toDisplay(value)}</div>
    </div>
  )
}

/** Compact pill for the headline — driven by whichever date is nearer. */
export function HeadlineBadge({ level, children }) {
  return <span className={`headline-badge badge-${level}`}>{children}</span>
}
