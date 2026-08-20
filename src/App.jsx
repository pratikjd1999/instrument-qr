import { useCallback, useEffect, useState } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import Home from './pages/Home.jsx'
import InstrumentDetail from './pages/InstrumentDetail.jsx'
import Admin from './pages/Admin.jsx'
import QrPage from './pages/QrPage.jsx'
import { loadInstruments } from './lib/api.js'

export default function App() {
  const [state, setState] = useState({
    instruments: [],
    pendingCount: 0,
    writable: false,
    loading: true,
  })
  const location = useLocation()

  const refresh = useCallback(async () => {
    const next = await loadInstruments()
    setState({ ...next, loading: false })
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // The detail page is what a QR opens, so it gets the whole screen with no
  // navigation chrome competing for attention.
  const isDetail = location.pathname.startsWith('/i/')

  return (
    <div className="shell">
      <header className="topbar">
        <NavLink to="/" className="topbar-mark">
          <strong>Instrument Lookup</strong>
          <span>{state.instruments.length} on record</span>
        </NavLink>
        {!isDetail && (
          <nav className="topbar-nav">
            <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
              Index
            </NavLink>
            <NavLink to="/admin" className={({ isActive }) => (isActive ? 'active' : '')}>
              Admin
            </NavLink>
          </nav>
        )}
      </header>

      <main>
        <Routes>
          <Route
            path="/"
            element={<Home instruments={state.instruments} loading={state.loading} />}
          />
          <Route
            path="/i/:code"
            element={<InstrumentDetail instruments={state.instruments} loading={state.loading} />}
          />
          <Route
            path="/admin"
            element={
              <Admin
                instruments={state.instruments}
                writable={state.writable}
                pendingCount={state.pendingCount}
                refresh={refresh}
              />
            }
          />
          <Route path="/admin/qr/:code" element={<QrPage instruments={state.instruments} />} />
          <Route
            path="*"
            element={
              <div className="empty">
                <div className="empty-code">404</div>
                <p>No such page.</p>
              </div>
            }
          />
        </Routes>
      </main>
    </div>
  )
}
