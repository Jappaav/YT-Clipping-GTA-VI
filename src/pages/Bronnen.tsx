import { useState, type FormEvent } from 'react'
import Modal from '../components/Modal'
import PageState from '../components/PageState'
import { supabase } from '../lib/supabase'
import { SOURCE_TYPES, type Source, type SourceType } from '../lib/types'
import { unwrap, useLoad } from '../lib/useLoad'

async function loadSources(): Promise<Source[]> {
  return unwrap(await supabase.from('sources').select('*').order('name'))
}

export default function Bronnen() {
  const { data: sources, error, loading, reload } = useLoad(loadSources)
  // null = gesloten, 'new' = nieuw, Source = bewerken
  const [editing, setEditing] = useState<Source | 'new' | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Bronnen</h1>
        <button className="btn-primary" onClick={() => setEditing('new')}>
          Bron toevoegen
        </button>
      </div>

      <PageState loading={loading && !sources} error={error} />

      {sources && (
        <div className="card overflow-x-auto p-0">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr>
                <th className="th">Naam</th>
                <th className="th">Type</th>
                <th className="th">Link</th>
                <th className="th">Notities</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sources.length === 0 && (
                <tr>
                  <td className="td text-slate-500" colSpan={5}>
                    Nog geen bronnen. Voeg de eerste toe.
                  </td>
                </tr>
              )}
              {sources.map((s) => (
                <tr key={s.id}>
                  <td className="td font-medium">{s.name}</td>
                  <td className="td">{s.type}</td>
                  <td className="td">
                    {s.url && (
                      <a href={s.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                        Openen
                      </a>
                    )}
                  </td>
                  <td className="td text-slate-600">{s.notes}</td>
                  <td className="td text-right">
                    <button className="text-indigo-600 hover:underline" onClick={() => setEditing(s)}>
                      Bewerken
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <SourceForm
          source={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            void reload()
          }}
        />
      )}
    </div>
  )
}

interface FormProps {
  source: Source | null
  onClose: () => void
  onSaved: () => void
}

function SourceForm({ source, onClose, onSaved }: FormProps) {
  const [name, setName] = useState(source?.name ?? '')
  const [url, setUrl] = useState(source?.url ?? '')
  const [type, setType] = useState<SourceType>(source?.type ?? 'overig')
  const [notes, setNotes] = useState(source?.notes ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const values = { name: name.trim(), url: url.trim() || null, type, notes: notes.trim() || null }
    const { error } = source
      ? await supabase.from('sources').update(values).eq('id', source.id)
      : await supabase.from('sources').insert(values)
    setBusy(false)
    if (error) setError(error.message)
    else onSaved()
  }

  return (
    <Modal title={source ? 'Bron bewerken' : 'Bron toevoegen'} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="label">Naam</label>
          <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value as SourceType)}>
            {SOURCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Link</label>
          <input className="input" type="url" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <div>
          <label className="label">Notities</label>
          <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Annuleren
          </button>
          <button className="btn-primary" disabled={busy}>
            {busy ? 'Opslaan…' : 'Opslaan'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
