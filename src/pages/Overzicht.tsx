import { useMemo } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import KpiCard from '../components/KpiCard'
import PageState from '../components/PageState'
import { daysAgoISO, formatNumber, formatShortDate } from '../lib/format'
import { computeKpis, dailyViewsByPlatform, groupStatsByPost, sourceRanking, topClips } from '../lib/stats'
import { supabase } from '../lib/supabase'
import { PLATFORM_LABELS, type Clip, type Post, type PostStat, type Source } from '../lib/types'
import { unwrap, useLoad } from '../lib/useLoad'

async function loadAll() {
  const [clips, sources, posts, stats] = await Promise.all([
    supabase.from('clips').select('*'),
    supabase.from('sources').select('*'),
    supabase.from('posts').select('*'),
    supabase.from('post_stats').select('*').order('date'),
  ])
  return {
    clips: unwrap(clips) as Clip[],
    sources: unwrap(sources) as Source[],
    posts: unwrap(posts) as Post[],
    stats: unwrap(stats) as PostStat[],
  }
}

const PLATFORM_COLORS = { tiktok: '#4f46e5', youtube: '#f59e0b' } as const

export default function Overzicht() {
  const { data, error, loading } = useLoad(loadAll)

  const derived = useMemo(() => {
    if (!data) return null
    const byPost = groupStatsByPost(data.stats)
    return {
      kpis: computeKpis(data.posts, byPost, daysAgoISO(7)),
      daily: dailyViewsByPlatform(data.posts, byPost),
      top: topClips(data.clips, data.posts, byPost, 10),
      sources: sourceRanking(data.sources, data.clips, data.posts, byPost),
    }
  }, [data])

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Overzicht</h1>
      <PageState loading={loading} error={error} />

      {derived && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard label="Totaal views" value={formatNumber(derived.kpis.totalViews)} />
            <KpiCard label="Views laatste 7 dagen" value={formatNumber(derived.kpis.viewsLast7Days)} />
            <KpiCard label="Aantal posts" value={formatNumber(derived.kpis.postCount)} />
            <KpiCard label="Gemiddeld views per post" value={formatNumber(derived.kpis.avgViewsPerPost)} />
          </div>

          <section className="card">
            <h2 className="mb-3 font-medium">Views per dag per platform</h2>
            {derived.daily.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nog geen verloop te tonen. Het verloop verschijnt zodra een post op minstens twee dagen stats heeft.
              </p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={derived.daily}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tickFormatter={formatShortDate} fontSize={12} />
                    <YAxis tickFormatter={formatNumber} fontSize={12} width={60} />
                    <Tooltip
                      labelFormatter={(label) => formatShortDate(String(label))}
                      formatter={(value) => formatNumber(Number(value))}
                    />
                    <Legend />
                    {(['tiktok', 'youtube'] as const).map((p) => (
                      <Line
                        key={p}
                        type="monotone"
                        dataKey={p}
                        name={PLATFORM_LABELS[p]}
                        stroke={PLATFORM_COLORS[p]}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card overflow-x-auto p-0">
              <h2 className="px-4 pt-4 font-medium">Top 10 clips</h2>
              <table className="mt-2 min-w-full divide-y divide-slate-200">
                <thead>
                  <tr>
                    <th className="th">#</th>
                    <th className="th">Clip</th>
                    <th className="th text-right">Views</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {derived.top.length === 0 && (
                    <tr>
                      <td className="td text-slate-500" colSpan={3}>
                        Nog geen gepost.
                      </td>
                    </tr>
                  )}
                  {derived.top.map((r, i) => (
                    <tr key={r.clip.id}>
                      <td className="td">{i + 1}</td>
                      <td className="td">{r.clip.title}</td>
                      <td className="td text-right">{formatNumber(r.views)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="card overflow-x-auto p-0">
              <h2 className="px-4 pt-4 font-medium">Bronnen op gemiddelde views</h2>
              <table className="mt-2 min-w-full divide-y divide-slate-200">
                <thead>
                  <tr>
                    <th className="th">#</th>
                    <th className="th">Bron</th>
                    <th className="th text-right">Posts</th>
                    <th className="th text-right">Gem. views</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {derived.sources.length === 0 && (
                    <tr>
                      <td className="td text-slate-500" colSpan={4}>
                        Nog geen data.
                      </td>
                    </tr>
                  )}
                  {derived.sources.map((r, i) => (
                    <tr key={r.source.id}>
                      <td className="td">{i + 1}</td>
                      <td className="td">{r.source.name}</td>
                      <td className="td text-right">{r.postCount}</td>
                      <td className="td text-right">{formatNumber(r.avgViews)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
