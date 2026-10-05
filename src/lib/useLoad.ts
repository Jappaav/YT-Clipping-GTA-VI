import { useCallback, useEffect, useState } from 'react'

/** Laadt data bij het openen van een pagina en biedt `reload` na wijzigingen. */
export function useLoad<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setData(await load())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Er ging iets mis bij het laden.')
    } finally {
      setLoading(false)
    }
    // `load` is per pagina een stabiele functie op moduleniveau
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return { data, error, loading, reload }
}

/** Geeft de data van een Supabase-resultaat terug, of gooit de fout. */
export function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message)
  return result.data as T
}
