import { useMemo, useState, type FormEvent } from 'react'
import Modal from '../components/Modal'
import PageState from '../components/PageState'
import { formatDate, formatNumber, todayISO } from '../lib/format'
import { supabase } from '../lib/supabase'
import {
  CLIP_STATUSES,
  PLATFORM_LABELS,
  PLATFORMS,
  type Clip,
  type ClipStatus,
  type Platform,
  type Post,
  type Source,
} from '../lib/types'
import { unwrap, useLoad } from '../lib/useLoad'

interface LatestStat {
  post_id: string
  views: number
}

async function loadAll() {
  const [clips, sources, posts, latest] = await Promise.all([
    supabase.from('clips').select('*').order('created_at', { ascending: false }),
    supabase.from('sources').select('*').order('name'),
    supabase.from('posts').select('*').order('posted_at', { ascending: false }),
    supabase.from('latest_post_stats').select('post_id, views'),
  ])
  return {
    clips: unwrap(clips) as Clip[],
    sources: unwrap(sources) as Source[],
    posts: unwrap(posts) as Post[],
    latest: unwrap(latest) as LatestStat[],
  }
}

export default function Clips() {
  const { data, error, loading, reload } = useLoad(loadAll)
  const [statusFilter, setStatusFilter] = useState<ClipStatus | ''>('')
  const [platformFilter, setPlatformFilter] = useState<Platform | ''>('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [editing, setEditing] = useState<Clip | 'new' | null>(null)

  const sourceName = useMemo(() => new Map((data?.sources ?? []).map((s) => [s.id, s.name])), [data])
  const viewsByPost = useMemo(() => new Map((data?.latest ?? []).map((l) => [l.post_id, l.views])), [data])
  const postsByClip = useMemo(() => {
    const map = new Map<string, Post[]>()
    for (const p of data?.posts ?? []) map.set(p.clip_id, [...(map.get(p.clip_id) ?? []), p])
    return map
  }, [data])

  const visible = (data?.clips ?? []).filter((c) => {
    if (statusFilter && c.status !== statusFilter) return false
    if (sourceFilter && c.source_id !== sourceFilter) return false
    if (platformFilter && !(postsByClip.get(c.id) ?? []).some((p) => p.platform === platformFilter)) return false
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Clips</h1>
        <button className="btn-primary" onClick={() => setEditing('new')}>
          Clip toevoegen
        </button>
      </div>

      <PageState loading={loading && !data} error={error} />

      {data && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ClipStatus | '')}>
              <option value="">Alle statussen</option>
              {CLIP_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select className="input" value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value as Platform | '')}>
              <option value="">Alle platforms</option>
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {PLATFORM_LABELS[p]}
                </option>
              ))}
            </select>
            <select className="input" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
              <option value="">Alle bronnen</option>
              {data.sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="card overflow-x-auto p-0">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr>
                  <th className="th">Titel</th>
                  <th className="th">Bron</th>
                  <th className="th">Tijdstip</th>
                  <th className="th">Status</th>
                  <th className="th">Posts</th>
                  <th className="th text-right">Views</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.length === 0 && (
                  <tr>
                    <td className="td text-slate-500" colSpan={7}>
                      Geen clips gevonden.
                    </td>
                  </tr>
                )}
                {visible.map((c) => {
                  const posts = postsByClip.get(c.id) ?? []
                  const views = posts.reduce((sum, p) => sum + (viewsByPost.get(p.id) ?? 0), 0)
                  return (
                    <tr key={c.id}>
                      <td className="td font-medium">{c.title}</td>
                      <td className="td">{c.source_id ? sourceName.get(c.source_id) : ''}</td>
                      <td className="td">{c.source_timestamp}</td>
                      <td className="td">{c.status}</td>
                      <td className="td">{posts.map((p) => PLATFORM_LABELS[p.platform]).join(', ')}</td>
                      <td className="td text-right">{formatNumber(views)}</td>
                      <td className="td text-right">
                        <button className="text-indigo-600 hover:underline" onClick={() => setEditing(c)}>
                          Bewerken
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {data && editing && (
        <ClipForm
          clip={editing === 'new' ? null : editing}
          sources={data.sources}
          posts={editing === 'new' ? [] : (postsByClip.get(editing.id) ?? [])}
          onClose={() => setEditing(null)}
          onChanged={() => void reload()}
        />
      )}
    </div>
  )
}

interface ClipFormProps {
  clip: Clip | null
  sources: Source[]
  posts: Post[]
  onClose: () => void
  onChanged: () => void
}

function ClipForm({ clip, sources, posts, onClose, onChanged }: ClipFormProps) {
  const [title, setTitle] = useState(clip?.title ?? '')
  const [sourceId, setSourceId] = useState(clip?.source_id ?? '')
  const [timestamp, setTimestamp] = useState(clip?.source_timestamp ?? '')
  const [status, setStatus] = useState<ClipStatus>(clip?.status ?? 'idee')
  const [notes, setNotes] = useState(clip?.notes ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const values = {
      title: title.trim(),
      source_id: sourceId || null,
      source_timestamp: timestamp.trim() || null,
      status,
      notes: notes.trim() || null,
    }
    const { error } = clip
      ? await supabase.from('clips').update(values).eq('id', clip.id)
      : await supabase.from('clips').insert(values)
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    onChanged()
    onClose()
  }

  return (
    <Modal title={clip ? 'Clip bewerken' : 'Clip toevoegen'} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="label">Titel</label>
          <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Bron</label>
            <select className="input" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
              <option value="">Geen bron</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Tijdstip in bron</label>
            <input
              className="input"
              placeholder="01:23:10"
              value={timestamp}
              onChange={(e) => setTimestamp(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as ClipStatus)}>
            {CLIP_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Notities</label>
          <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
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

      {clip ? (
        <PostsEditor clipId={clip.id} posts={posts} onChanged={onChanged} />
      ) : (
        <p className="border-t border-slate-200 pt-3 text-sm text-slate-500">
          Sla de clip eerst op; daarna kun je er posts aan koppelen.
        </p>
      )}
    </Modal>
  )
}

function PostsEditor({ clipId, posts, onChanged }: { clipId: string; posts: Post[]; onChanged: () => void }) {
  const [platform, setPlatform] = useState<Platform>('tiktok')
  const [url, setUrl] = useState('')
  const [externalId, setExternalId] = useState('')
  const [postedAt, setPostedAt] = useState(todayISO())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function addPost(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.from('posts').insert({
      clip_id: clipId,
      platform,
      url: url.trim() || null,
      external_id: externalId.trim() || null,
      posted_at: postedAt,
    })
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    setUrl('')
    setExternalId('')
    onChanged()
  }

  async function removePost(post: Post) {
    if (!window.confirm('Deze post en alle bijbehorende stats verwijderen?')) return
    const { error } = await supabase.from('posts').delete().eq('id', post.id)
    if (error) setError(error.message)
    else onChanged()
  }

  return (
    <div className="space-y-3 border-t border-slate-200 pt-3">
      <h3 className="font-medium">Posts</h3>
      {posts.length === 0 && <p className="text-sm text-slate-500">Nog geen posts gekoppeld.</p>}
      <ul className="space-y-1">
        {posts.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
            <span>
              {PLATFORM_LABELS[p.platform]} · {formatDate(p.posted_at)}
              {p.url && (
                <>
                  {' · '}
                  <a href={p.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                    link
                  </a>
                </>
              )}
            </span>
            <button className="text-red-600 hover:underline" onClick={() => void removePost(p)}>
              Verwijderen
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={addPost} className="space-y-2 rounded-md bg-slate-50 p-3">
        <div className="grid grid-cols-2 gap-2">
          <select className="input" value={platform} onChange={(e) => setPlatform(e.target.value as Platform)}>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {PLATFORM_LABELS[p]}
              </option>
            ))}
          </select>
          <input className="input" type="date" required value={postedAt} onChange={(e) => setPostedAt(e.target.value)} />
        </div>
        <input className="input" type="url" placeholder="Link naar de post" value={url} onChange={(e) => setUrl(e.target.value)} />
        <input
          className="input"
          placeholder="Extern ID (optioneel, voor latere API-koppeling)"
          value={externalId}
          onChange={(e) => setExternalId(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-secondary" disabled={busy}>
          Post koppelen
        </button>
      </form>
    </div>
  )
}
