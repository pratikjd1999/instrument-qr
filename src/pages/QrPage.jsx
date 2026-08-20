import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { getQrBaseUrl, instrumentUrl, isLocalOnly } from '../lib/qr.js'

/** Rendered at print resolution, not screen resolution. */
const PNG_SIZE = 1024

export default function QrPage({ instruments }) {
  const { code } = useParams()
  const record = instruments.find((r) => String(r.code) === String(code))
  const [dataUrl, setDataUrl] = useState('')
  const [error, setError] = useState('')

  const target = instrumentUrl(code, getQrBaseUrl())

  // One render, used for both the on-screen preview and the download. We show
  // it as an <img> rather than a <canvas> because qrcode's toCanvas writes an
  // inline height that fights any responsive sizing.
  useEffect(() => {
    let cancelled = false
    setError('')

    QRCode.toDataURL(target, {
      width: PNG_SIZE,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#17181aff', light: '#ffffffff' },
    })
      .then((url) => !cancelled && setDataUrl(url))
      .catch((err) => !cancelled && setError(err.message))

    return () => {
      cancelled = true
    }
  }, [target])

  function download() {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `instrument-${code}-qr.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  return (
    <div>
      <h1 className="page-title">QR code — {code}</h1>
      <p className="page-sub">{record ? record.name : 'This code is not on record yet.'}</p>

      {isLocalOnly(target) && (
        <div className="notice notice-warn">
          <strong>This QR points at a local address.</strong> It will only work on this machine.
          Set the QR base URL on the admin page to your deployed address before printing and
          sticking it on an instrument.
        </div>
      )}

      {!record && (
        <div className="notice notice-bad">
          No instrument with code <code>{code}</code> exists. The QR will still generate, but it
          will open a “not found” page until the instrument is added.
        </div>
      )}

      {error && <div className="notice notice-bad">Could not generate the QR code: {error}</div>}

      <div className="qr-stack">
        <div className="qr-frame">
          {dataUrl ? (
            <img src={dataUrl} alt={`QR code for instrument ${code}`} width="1024" height="1024" />
          ) : (
            <div className="qr-caption">Generating…</div>
          )}
          <div className="qr-caption">{code}</div>
        </div>

        <div className="stack">
          <div>
            <h2 className="section-label">Scan target</h2>
            <div className="url-preview">{target}</div>
          </div>

          <div className="btn-row">
            <button className="btn btn-primary" onClick={download} disabled={!dataUrl}>
              Download PNG ({PNG_SIZE}px)
            </button>
            <Link className="btn" to="/admin">
              Back to admin
            </Link>
            {record && (
              <Link className="btn" to={`/i/${encodeURIComponent(code)}`}>
                Open detail page
              </Link>
            )}
          </div>

          <p className="footnote" style={{ marginTop: 0 }}>
            Rendered at {PNG_SIZE}px with error correction level M, so it survives being printed
            small and getting scuffed on a shop floor.
          </p>
        </div>
      </div>
    </div>
  )
}
