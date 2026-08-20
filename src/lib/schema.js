/**
 * THE field list. Edit this file to change what an instrument records.
 *
 * The admin form and the detail page both render from here, so adding a field
 * is a one-line change and touches no components.
 *
 *   key      property name in machines.json
 *   label    shown to humans, on both the form and the detail page
 *   input    text | date | number | textarea
 *   kind     how to render the value: 'date' | 'number' | 'text'
 *   mono     render the value in monospace
 *   due      treat as a due date — gets a countdown badge on the detail page
 */
export const FIELDS = [
  {
    key: 'code',
    label: 'Unique Code',
    input: 'text',
    kind: 'text',
    mono: true,
    required: true,
    placeholder: '3087',
    hint: 'What the QR encodes and what the URL looks up. Must be unique.',
  },
  {
    key: 'name',
    label: 'Instrument Name',
    input: 'text',
    kind: 'text',
    required: true,
    placeholder: 'Distance Meter',
  },
  {
    key: 'calibrationDueDate',
    label: 'Calibration Due',
    input: 'date',
    kind: 'date',
    mono: true,
    required: true,
    due: true,
    shortLabel: 'Calibration',
  },
  {
    key: 'maintenanceDueDate',
    label: 'Maintenance Due',
    input: 'date',
    kind: 'date',
    mono: true,
    required: true,
    due: true,
    shortLabel: 'Maintenance',
  },
  {
    key: 'faultHistory',
    label: 'Fault History',
    input: 'textarea',
    kind: 'text',
    required: false,
    placeholder: 'Battery Cover Loose',
  },
  {
    key: 'usagePercent',
    label: 'Usage',
    input: 'number',
    kind: 'number',
    mono: true,
    required: false,
    suffix: '%',
    min: 0,
    max: 100,
    // Displayed as a plain number. We don't know whether high usage is good or
    // bad, so nothing here implies either.
  },
]

/** Fields that carry a due date, in display order. */
export const DUE_FIELDS = FIELDS.filter((f) => f.due)

/** Fields shown in the spec grid — everything except what the hero already shows. */
export const SPEC_FIELDS = FIELDS.filter((f) => f.key !== 'code' && f.key !== 'name')

/** An empty record shaped by the schema, for the add form. */
export function blankRecord() {
  return Object.fromEntries(FIELDS.map((f) => [f.key, '']))
}

/**
 * Validate a record against the schema.
 * Returns { field: message } — empty object means valid.
 */
export function validate(record, existingCodes = []) {
  const errors = {}

  for (const f of FIELDS) {
    const raw = record[f.key]
    const value = typeof raw === 'string' ? raw.trim() : raw

    if (f.required && (value === '' || value == null)) {
      errors[f.key] = `${f.label} is required.`
      continue
    }
    if (value === '' || value == null) continue

    if (f.input === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      errors[f.key] = `${f.label} must be a valid date.`
    }
    if (f.input === 'number') {
      const n = Number(value)
      if (Number.isNaN(n)) errors[f.key] = `${f.label} must be a number.`
      else if (f.min != null && n < f.min) errors[f.key] = `${f.label} cannot be below ${f.min}.`
      else if (f.max != null && n > f.max) errors[f.key] = `${f.label} cannot exceed ${f.max}.`
    }
  }

  const code = String(record.code ?? '').trim()
  if (code && existingCodes.map(String).includes(code)) {
    errors.code = `Code ${code} already exists. Codes must be unique.`
  }

  return errors
}

/** Coerce form strings into their stored types. */
export function normalise(record) {
  const out = {}
  for (const f of FIELDS) {
    const raw = record[f.key]
    const value = typeof raw === 'string' ? raw.trim() : raw
    if (value === '' || value == null) continue
    out[f.key] = f.input === 'number' ? Number(value) : value
  }
  return out
}
