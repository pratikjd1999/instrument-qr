/**
 * QR target URL construction.
 *
 * The base URL is configurable because the printed sticker outlives the
 * hosting decision — a QR encoding localhost is a dead sticker on a real
 * instrument. Set this to the deployed address before printing anything.
 */
const LS_BASE = 'iqr.qrBaseUrl'

/** Where this app is currently being served from. */
export function currentBaseUrl() {
  return `${window.location.origin}${import.meta.env.BASE_URL}`
}

export function getQrBaseUrl() {
  return localStorage.getItem(LS_BASE) || currentBaseUrl()
}

export function setQrBaseUrl(value) {
  const trimmed = String(value ?? '').trim()
  if (trimmed) localStorage.setItem(LS_BASE, trimmed)
  else localStorage.removeItem(LS_BASE)
}

/** Full scan target for one instrument: <base>#/i/<code> */
export function instrumentUrl(code, base = getQrBaseUrl()) {
  const withSlash = base.endsWith('/') ? base : `${base}/`
  return `${withSlash}#/i/${encodeURIComponent(code)}`
}

/** True if this URL will only resolve on the machine that generated it. */
export function isLocalOnly(url) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|.*\.local)(:|\/|$)/i.test(url)
}
