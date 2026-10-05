/** Toont laad- of foutmelding; geeft null als alles goed is. */
export default function PageState({ loading, error }: { loading: boolean; error: string | null }) {
  if (error) {
    return <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">Fout: {error}</p>
  }
  if (loading) return <p className="text-sm text-slate-500">Laden…</p>
  return null
}
