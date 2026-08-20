import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FIELDS, blankRecord, normalise, validate } from '../lib/schema.js'
import { addInstrument, clearPending, clearSamples, downloadJson } from '../lib/api.js'
import { currentBaseUrl, getQrBaseUrl, isLocalOnly, setQrBaseUrl } from '../lib/qr.js'
import { toDisplay } from '../lib/dates.js'

/**
 * Add form, instrument list, export, and sample-data reset.
 *
 * Open by design — no password. A password on a static site is cosmetic, so we
 * don't pretend otherwise.
 */
export default function Admin({ instruments, writable, pendingCount, refresh }) {
  const [form, setForm] = useState(blankRecord)
  const [errors, setErrors] = useState({})
  const [flash, setFlash] = useState(null)
  const [busy, setBusy] = useState(false)
  const [qrBase, setQrBase] = useState(getQrBaseUrl)

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => {
      if (!prev[key]) return prev
      const { [key]: _drop, ...rest } = prev
      return rest
    })
  }

  async function onSubmit(event) {
    event.preventDefault()
    setFlash(null)

    const codes = instruments.map((r) => String(r.code))
    const found = validate(form, codes)
    if (Object.keys(found).length > 0) {
      setErrors(found)
      setFlash({ kind: 'bad', text: 'Fix the highlighted fields and try again.' })
      return
    }

    setBusy(true)
    const result = await addInstrument(normalise(form))
    setBusy(false)

    if (!result.ok) {
      setErrors(result.error?.includes('already exists') ? { code: result.error } : {})
      setFlash({ kind: 'bad', text: result.error })
      return
    }

    setForm(blankRecord())
    setErrors({})
    await refresh()
    setFlash(
      result.persisted === 'disk'
        ? { kind: 'good', text: `Saved to public/machines.json. Commit and push to publish it.` }
        : {
            kind: 'warn',
            text: 'Saved in this browser only — this host has no server. Use Download machines.json, then commit the file.',
          },
    )
  }

  async function onClearSamples() {
    if (!window.confirm('Remove the three seeded demo instruments?')) return
    setBusy(true)
    const result = await clearSamples()
    setBusy(false)
    await refresh()
    setFlash(
      result.ok
        ? { kind: 'good', text: 'Sample data cleared.' }
        : { kind: 'bad', text: result.error },
    )
  }

  async function onClearPending() {
    if (!window.confirm('Discard everything saved in this browser? This cannot be undone.')) return
    clearPending()
    await refresh()
    setFlash({ kind: 'good', text: 'Browser-held records discarded.' })
  }

  function onSaveQrBase() {
    setQrBaseUrl(qrBase)
    setQrBase(getQrBaseUrl())
    setFlash({ kind: 'good', text: 'QR base URL saved.' })
  }

  const hasSamples = instruments.some((r) => r.sample)

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">Admin</h1>
        <p className="page-sub">Add instruments and generate the QR code to print.</p>
      </div>

      {writable ? (
        <div className="notice notice-good">
          <strong>Dev server detected.</strong> Adds are written straight to{' '}
          <code>public/machines.json</code> on disk. Commit and push to publish.
        </div>
      ) : (
        <div className="notice notice-warn">
          <strong>Read-only host.</strong> There is no server here, so adds are kept in this
          browser only. Add instruments locally with <code>npm run dev</code>, or use{' '}
          <strong>Download machines.json</strong> below and commit the file.
        </div>
      )}

      {flash && <div className={`notice notice-${flash.kind}`}>{flash.text}</div>}

      {/* ── Add form ───────────────────────────────────────────────────── */}
      <section>
        <h2 className="section-label">Add an instrument</h2>
        <form className="card" onSubmit={onSubmit} noValidate>
          <div className="form-grid">
            {FIELDS.map((field) => {
              const invalid = Boolean(errors[field.key])
              const common = {
                id: `f-${field.key}`,
                value: form[field.key] ?? '',
                onChange: (e) => setField(field.key, e.target.value),
                className: `${field.input === 'textarea' ? 'textarea' : 'input'}${
                  invalid ? ' is-invalid' : ''
                }`,
                placeholder: field.placeholder,
                'aria-invalid': invalid,
              }

              return (
                <div
                  className={`field${field.input === 'textarea' ? ' span-2' : ''}`}
                  key={field.key}
                >
                  <label htmlFor={`f-${field.key}`}>
                    {field.label}
                    {field.required && <span className="req">*</span>}
                  </label>

                  {field.input === 'textarea' ? (
                    <textarea {...common} rows={3} />
                  ) : field.suffix ? (
                    <div className="input-suffix">
                      <input
                        {...common}
                        type="number"
                        min={field.min}
                        max={field.max}
                        inputMode="numeric"
                      />
                      <span className="mono-suffix">{field.suffix}</span>
                    </div>
                  ) : (
                    <input {...common} type={field.input} />
                  )}

                  {field.hint && !invalid && <div className="field-hint">{field.hint}</div>}
                  {invalid && <div className="field-error">{errors[field.key]}</div>}
                </div>
              )
            })}
          </div>

          <div className="btn-row" style={{ marginTop: '0.5rem' }}>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Add instrument'}
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => {
                setForm(blankRecord())
                setErrors({})
              }}
              disabled={busy}
            >
              Clear form
            </button>
          </div>
        </form>
      </section>

      {/* ── QR base URL ────────────────────────────────────────────────── */}
      <section>
        <h2 className="section-label">QR base URL</h2>
        <div className="card">
          <div className="field" style={{ marginBottom: '0.5rem' }}>
            <label htmlFor="qr-base">Address the QR codes should point to</label>
            <input
              id="qr-base"
              className="input"
              value={qrBase}
              onChange={(e) => setQrBase(e.target.value)}
              placeholder={currentBaseUrl()}
            />
            <div className="field-hint">
              Currently serving from <code>{currentBaseUrl()}</code>. Set this to your deployed
              address before printing any sticker.
            </div>
          </div>
          {isLocalOnly(qrBase) && (
            <div className="notice notice-warn" style={{ marginBottom: '0.75rem' }}>
              This is a local address — QR codes made now will only work on this machine.
            </div>
          )}
          <div className="btn-row">
            <button className="btn btn-primary" type="button" onClick={onSaveQrBase}>
              Save base URL
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => {
                setQrBaseUrl('')
                setQrBase(getQrBaseUrl())
                setFlash({ kind: 'good', text: 'Reset to the current address.' })
              }}
            >
              Use current address
            </button>
          </div>
        </div>
      </section>

      {/* ── Data ───────────────────────────────────────────────────────── */}
      <section>
        <div className="row-between" style={{ marginBottom: '0.6rem' }}>
          <h2 className="section-label" style={{ margin: 0 }}>
            On record — {instruments.length}
          </h2>
          <div className="btn-row">
            <button className="btn" type="button" onClick={downloadJson}>
              Download machines.json
            </button>
            {hasSamples && (
              <button className="btn btn-danger" type="button" onClick={onClearSamples} disabled={busy}>
                Clear sample data
              </button>
            )}
            {pendingCount > 0 && (
              <button className="btn btn-danger" type="button" onClick={onClearPending}>
                Discard {pendingCount} unsaved
              </button>
            )}
          </div>
        </div>

        {instruments.length === 0 ? (
          <div className="empty">No instruments on record.</div>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Calibration</th>
                  <th>Maintenance</th>
                  <th>Usage</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {instruments.map((r) => (
                  <tr key={r.code}>
                    <td className="mono">
                      <Link to={`/i/${encodeURIComponent(r.code)}`}>{r.code}</Link>{' '}
                      {r.sample && <span className="tag">sample</span>}
                      {r.pending && <span className="tag">unsaved</span>}
                    </td>
                    <td>{r.name}</td>
                    <td className="mono">{toDisplay(r.calibrationDueDate)}</td>
                    <td className="mono">{toDisplay(r.maintenanceDueDate)}</td>
                    <td className="mono">{r.usagePercent ?? '—'}</td>
                    <td>
                      <Link className="btn" to={`/admin/qr/${encodeURIComponent(r.code)}`}>
                        QR
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="footnote">
        No editing or deleting of existing instruments in this version — add only. Admin is open
        with no password: this is a demo, and a password on a static site is cosmetic.
      </p>
    </div>
  )
}
