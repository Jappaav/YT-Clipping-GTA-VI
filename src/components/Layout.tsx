import { NavLink, Outlet } from 'react-router-dom'
import { isDemo, supabase } from '../lib/supabase'

const links = [
  { to: '/', label: 'Overzicht', end: true },
  { to: '/clips', label: 'Clips' },
  { to: '/bronnen', label: 'Bronnen' },
  { to: '/stats', label: 'Stats invoeren' },
]

export default function Layout() {
  return (
    <div className="min-h-screen">
      {isDemo && (
        <div className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">
          Demo met voorbeeldgegevens. Wat je hier invult wordt niet bewaard en verdwijnt zodra je ververst.
        </div>
      )}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="font-semibold">Clipping Dashboard</span>
          <nav className="flex flex-1 flex-wrap gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm font-medium ${
                    isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          {!isDemo && (
            <button className="btn-secondary" onClick={() => void supabase.auth.signOut()}>
              Uitloggen
            </button>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
