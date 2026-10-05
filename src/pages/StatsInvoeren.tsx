import { useEffect, useState } from 'react'
import PageState from '../components/PageState'
import { formatDate, todayISO } from '../lib/format'
import { supabase } from '../lib/supabase'
import { PLATFORM_LABELS, type Clip, type Post, type PostStat } from '../lib/types'
import { unwrap, useLoad } from '../lib/useLoad'

type Latest = Pick<PostStat, 'post_id' | 'date' | 'views' | 'likes' | 'comments' | 'shares'>

async function loadAll() {
  const [posts, clips, latest] = await Promise.all([
    supabase.from('posts').select('*').order('posted_at', { ascending: false }),
    supabase.from('clips').select('id, title'),
    supabase.from('latest_post_stats').select('*'),
  ])
  return {
    posts: unwrap(posts) as Post[],
    clips: unwrap(clips) as Pick<Clip, 'id' | 'title'>[],
    latest: unwrap(latest) as Latest[],
  }
}

type Fields = Record<'views' | 'likes' | 'comments' | 'shares', string>
const FIELD_LABELS: [keyof Fields, string][] = [
  ['views', 'Views'],
  ['likes', 'Likes'],
  ['comments', 'Reacties'],
  ['shares', 'Shares'],
]

export default function StatsInvoeren() {
  const { data, error, loading, reload } = useLoad(loadAll)
  const [date, setDate] = useState(todayISO())
  const [values, setValues] = useState<Record<string, Fields>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  // Vul de velden vooraf in met de nieuwste bekende cijfers (lopende totalen).
  useEffect(() => {
    if (!data) return
    const latestByPost = new Map(data.latest.map((l) => [l.post_id, l]))
    const next: Record<string, Fields> = {}
    for (const p of data.posts) {
      const l = latestByPost.get(p.id)
      next[p.id] = {
        views: String(l?.views ?? ''),
        likes: String(l?.likes ?? ''),
        comments: String(l?.comments ?? ''),
        shares: String(l?.shares ?? ''),
      }
    }
    setValues(next)
  }, [data])

  function setField(postId: string, field: keyof Fields, value: string) {
    setValues((prev) => ({ ...prev, [postId]: { ...prev[postId], [field]: value } }))
  }

  async function save() {
    if (!data) return
    setSaving(true)
    setMessage(null)

    // Alleen posts waarvan minstens één veld is ingevuld; lege velden tellen als 0.
    const rows = data.posts
      .filter((p) => Object.values(values[p.id] ?? {}).some((v) => v !== ''))
      .map((p) => {
        const f = values[p.id]
        return {
          post_id: p.id,
          date,
          views: Number(f.views) || 0,
          likes: Number(f.likes) || 0,
          comments: Number(f.comments) || 0,
          shares: Number(f.shares) || 0,
        }
      })

    if (rows.length === 0) {
      setSaving(false)
      setMessage({ ok: false, text: 'Vul eerst cijfers in.' })
      return
    }

    const { error } = await supabase.from('post_stats').upsert(rows, { onConflict: 'post_id,date' })
    setSaving(false)
    if (error) {
      setMessage({ ok: false, text: error.message })
      return
    }
    setMessage({ ok: true, text: `${rows.length} post(s) opgeslagen voor ${formatDate(date)}.` })
    void reload()
  }

  const clipTitle = new Map((data?.clips ?? []).map((c) => [c.id, c.title]))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Stats invoeren</h1>
          <p className="text-sm text-slate-500">
            Vul de huidige totalen in zoals TikTok/YouTube ze toont. Opnieuw opslaan op dezelfde dag overschrijft.
          </p>
        </div>
        <div>
          <label className="label">Datum</label>
          <input className="input" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <PageState loading={loading && !data} error={error} />

      {data && data.posts.length === 0 && (
        <p className="text-sm text-slate-500">Nog geen posts. Koppel eerst een post aan een clip bij Clips.</p>
      )}

      {data && data.posts.length > 0 && (
        <>
          <div className="card overflow-x-auto p-0">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr>
                  <th className="th">Post</th>
                  {FIELD_LABELS.map(([key, label]) => (
                    <th key={key} className="th">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.posts.map((p) => (
                  <tr key={p.id}>
                    <td className="td">
                      <div className="font-medium">{clipTitle.get(p.clip_id)}</div>
                      <div className="text-xs text-slate-500">
                        {PLATFORM_LABELS[p.platform]} · {formatDate(p.posted_at)}
                      </div>
                    </td>
                    {FIELD_LABELS.map(([key, label]) => (
                      <td key={key} className="td">
                        <input
                          className="input w-28"
                          type="number"
                          min={0}
                          inputMode="numeric"
                          aria-label={`${label} ${clipTitle.get(p.clip_id) ?? ''}`}
                          value={values[p.id]?.[key] ?? ''}
                          onChange={(e) => setField(p.id, key, e.target.value)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3">
            <button className="btn-primary" onClick={() => void save()} disabled={saving}>
              {saving ? 'Opslaan…' : 'Opslaan'}
            </button>
            {message && <span className={`text-sm ${message.ok ? 'text-green-700' : 'text-red-600'}`}>{message.text}</span>}
          </div>
        </>
      )}
    </div>
  )
}
