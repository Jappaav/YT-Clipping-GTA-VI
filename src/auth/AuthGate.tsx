import type { Session } from '@supabase/supabase-js'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { isConfigured, supabase } from '../lib/supabase'

type Access = 'checking' | 'allowed' | 'denied'

function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-sm space-y-4">{children}</div>
    </div>
  )
}

export default function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoaded, setSessionLoaded] = useState(false)
  const [access, setAccess] = useState<Access>('checking')

  useEffect(() => {
    if (!isConfigured) return
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSessionLoaded(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  // Controleer of het e-mailadres in allowed_users staat. RLS laat alleen de
  // eigen rij door, dus een filter is niet nodig.
  useEffect(() => {
    if (!session?.user.email) return
    setAccess('checking')
    void supabase
      .from('allowed_users')
      .select('email')
      .maybeSingle()
      .then(({ data, error }) => setAccess(!error && data ? 'allowed' : 'denied'))
  }, [session?.user.email])

  if (!isConfigured) {
    return (
      <Centered>
        <h1 className="text-lg font-semibold">Supabase is nog niet ingesteld</h1>
        <p className="text-sm text-slate-600">
          Kopieer <code>.env.example</code> naar <code>.env</code>, vul je Supabase-URL en anon key in en start de
          app opnieuw. Zie de README.
        </p>
      </Centered>
    )
  }

  if (!sessionLoaded) return <Centered>Laden…</Centered>
  if (!session) return <LoginForm />
  if (access === 'checking') return <Centered>Toegang controleren…</Centered>

  if (access === 'denied') {
    return (
      <Centered>
        <h1 className="text-lg font-semibold">Geen toegang</h1>
        <p className="text-sm text-slate-600">
          Het e-mailadres <strong>{session.user.email}</strong> heeft geen toegang tot dit dashboard. Vraag de
          beheerder om je toe te voegen.
        </p>
        <button className="btn-secondary w-full" onClick={() => void supabase.auth.signOut()}>
          Uitloggen
        </button>
      </Centered>
    )
  }

  return <>{children}</>
}

function LoginForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    })
    setBusy(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  if (sent) {
    return (
      <Centered>
        <h1 className="text-lg font-semibold">Check je mail</h1>
        <p className="text-sm text-slate-600">
          We hebben een inloglink gestuurd naar <strong>{email}</strong>. Open de link op dit apparaat om in te
          loggen.
        </p>
      </Centered>
    )
  }

  return (
    <Centered>
      <h1 className="text-lg font-semibold">Clipping Dashboard</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="label" htmlFor="email">
            E-mailadres
          </label>
          <input
            id="email"
            type="email"
            required
            autoFocus
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Versturen…' : 'Stuur inloglink'}
        </button>
      </form>
    </Centered>
  )
}
