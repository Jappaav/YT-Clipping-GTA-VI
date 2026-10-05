// Pure berekeningen voor het overzicht. post_stats bevat lopende totalen per
// dag, dus "views per dag" en "laatste 7 dagen" zijn verschillen tussen
// snapshots.
import type { Clip, Platform, Post, PostStat, Source } from './types'

export type StatsByPost = Map<string, PostStat[]>

/** Groepeer snapshots per post, oplopend gesorteerd op datum. */
export function groupStatsByPost(stats: PostStat[]): StatsByPost {
  const map: StatsByPost = new Map()
  for (const s of stats) {
    const list = map.get(s.post_id)
    if (list) list.push(s)
    else map.set(s.post_id, [s])
  }
  for (const list of map.values()) list.sort((a, b) => a.date.localeCompare(b.date))
  return map
}

function latestViews(byPost: StatsByPost, postId: string): number {
  const list = byPost.get(postId)
  return list && list.length > 0 ? list[list.length - 1].views : 0
}

function dayOf(iso: string): string {
  return iso.slice(0, 10)
}

function daysBetween(fromDay: string, toDay: string): number {
  const ms = new Date(toDay).getTime() - new Date(fromDay).getTime()
  return Math.round(ms / 86_400_000)
}

export interface Kpis {
  totalViews: number
  viewsLast7Days: number
  postCount: number
  avgViewsPerPost: number
}

/** `cutoff` is de datum van 7 dagen geleden ('YYYY-MM-DD'). */
export function computeKpis(posts: Post[], byPost: StatsByPost, cutoff: string): Kpis {
  let totalViews = 0
  let viewsLast7Days = 0

  for (const post of posts) {
    const list = byPost.get(post.id) ?? []
    const latest = latestViews(byPost, post.id)
    totalViews += latest

    // Basislijn: laatste snapshot op of voor de cutoff. Bestaat die niet, dan
    // geldt een recente post als begonnen op 0; een oudere post krijgt zijn
    // eerste snapshot als basislijn (we weten niet wat eerder gebeurde).
    const before = list.filter((s) => s.date <= cutoff)
    let baseline: number
    if (before.length > 0) baseline = before[before.length - 1].views
    else if (dayOf(post.posted_at) > cutoff) baseline = 0
    else baseline = list.length > 0 ? list[0].views : 0

    viewsLast7Days += Math.max(0, latest - baseline)
  }

  return {
    totalViews,
    viewsLast7Days,
    postCount: posts.length,
    avgViewsPerPost: posts.length > 0 ? totalViews / posts.length : 0,
  }
}

export type DailyViewsRow = { date: string } & Record<Platform, number>

/** Nieuwe views per dag per platform (verschil tussen opeenvolgende snapshots). */
export function dailyViewsByPlatform(posts: Post[], byPost: StatsByPost): DailyViewsRow[] {
  const rows = new Map<string, DailyViewsRow>()

  const add = (date: string, platform: Platform, delta: number) => {
    let row = rows.get(date)
    if (!row) {
      row = { date, tiktok: 0, youtube: 0 }
      rows.set(date, row)
    }
    row[platform] += delta
  }

  for (const post of posts) {
    const list = byPost.get(post.id) ?? []
    list.forEach((snap, i) => {
      if (i === 0) {
        // Eerste snapshot: alleen meetellen als de post net online kwam.
        if (daysBetween(dayOf(post.posted_at), snap.date) <= 1) add(snap.date, post.platform, snap.views)
        return
      }
      add(snap.date, post.platform, Math.max(0, snap.views - list[i - 1].views))
    })
  }

  return [...rows.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export interface ClipRanking {
  clip: Clip
  views: number
  postCount: number
}

export function topClips(clips: Clip[], posts: Post[], byPost: StatsByPost, limit = 10): ClipRanking[] {
  const totals = new Map<string, { views: number; postCount: number }>()
  for (const post of posts) {
    const t = totals.get(post.clip_id) ?? { views: 0, postCount: 0 }
    t.views += latestViews(byPost, post.id)
    t.postCount += 1
    totals.set(post.clip_id, t)
  }

  return clips
    .filter((clip) => totals.has(clip.id))
    .map((clip) => ({ clip, ...totals.get(clip.id)! }))
    .sort((a, b) => b.views - a.views)
    .slice(0, limit)
}

export interface SourceRanking {
  source: Source
  avgViews: number
  postCount: number
}

/** Bronnen op gemiddelde views per post (alleen bronnen met posts). */
export function sourceRanking(
  sources: Source[],
  clips: Clip[],
  posts: Post[],
  byPost: StatsByPost,
): SourceRanking[] {
  const sourceOfClip = new Map(clips.map((c) => [c.id, c.source_id]))
  const totals = new Map<string, { views: number; postCount: number }>()

  for (const post of posts) {
    const sourceId = sourceOfClip.get(post.clip_id)
    if (!sourceId) continue
    const t = totals.get(sourceId) ?? { views: 0, postCount: 0 }
    t.views += latestViews(byPost, post.id)
    t.postCount += 1
    totals.set(sourceId, t)
  }

  return sources
    .filter((source) => totals.has(source.id))
    .map((source) => {
      const t = totals.get(source.id)!
      return { source, avgViews: t.views / t.postCount, postCount: t.postCount }
    })
    .sort((a, b) => b.avgViews - a.avgViews)
}
