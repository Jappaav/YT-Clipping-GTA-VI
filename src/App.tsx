import { Navigate, Route, Routes } from 'react-router-dom'
import AuthGate from './auth/AuthGate'
import Layout from './components/Layout'
import { isDemo } from './lib/supabase'
import Bronnen from './pages/Bronnen'
import Clips from './pages/Clips'
import Overzicht from './pages/Overzicht'
import StatsInvoeren from './pages/StatsInvoeren'

export default function App() {
  const routes = (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Overzicht />} />
        <Route path="clips" element={<Clips />} />
        <Route path="bronnen" element={<Bronnen />} />
        <Route path="stats" element={<StatsInvoeren />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )

  // In de demomodus is er geen database en dus ook geen login.
  return isDemo ? routes : <AuthGate>{routes}</AuthGate>
}
