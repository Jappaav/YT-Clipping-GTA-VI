// Nep-database voor de demomodus (`npm run demo`). Doet alsof het Supabase is,
// maar bewaart alles alleen in het geheugen: bij verversen is alles weer
// teruggezet. Ondersteunt alleen de aanroepen die de app gebruikt.
type Row = Record<string, any>

let counter = 0
const uid = () => `demo-${++counter}`
const dayISO = (daysAgo: number) => {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function seed(): Record<string, Row[]> {
  const sources: Row[] = [
    ['Gaming Podcast Weekly', 'podcast'],
    ['Livestream Nightly', 'stream'],
    ['Officieel studiokanaal', 'youtube'],
    ['Interview-compilatie', 'overig'],
  ].map(([name, type]) => ({ id: uid(), name, type, url: null, notes: null, created_at: dayISO(30) }))

  // [titel, bron, tijdstip, status]
  const clipDefs: [string, number, string, string][] = [
    ['Reactie op de nieuwe trailer', 2, '00:02:10', 'gepost'],
    ['Grappigste moment van de podcast', 0, '01:23:10', 'gepost'],
    ['Alle details die je gemist hebt', 2, '00:04:45', 'gepost'],
    ['Host verspreekt zich live', 1, '02:11:30', 'gepost'],
    ['Waarom iedereen hierover praat', 0, '00:47:05', 'gepost'],
    ['Beste moment uit het interview', 3, '00:15:20', 'gepost'],
    ['Onverwachte onthulling', 1, '01:02:00', 'gepost'],
    ['Kaartvergelijking', 2, '00:08:12', 'geknipt'],
    ['Reactie van de community', 0, '00:33:40', 'geknipt'],
    ['Theorie over het verhaal', 3, '00:51:15', 'idee'],
  ]
  const clips: Row[] = clipDefs.map(([title, s, ts, status], i) => ({
    id: uid(),
    title,
    source_id: sources[s].id,
    source_timestamp: ts,
    status,
    notes: null,
    created_by: null,
    created_at: dayISO(20 - i),
  }))

  // [clip-index, platform, dagen geleden gepost, eindtotaal views]
  const postDefs: [number, string, number, number][] = [
    [0, 'tiktok', 13, 84000], [0, 'youtube', 13, 41000],
    [1, 'tiktok', 11, 23000], [2, 'tiktok', 10, 61000], [2, 'youtube', 10, 18500],
    [3, 'tiktok', 8, 9400], [4, 'youtube', 7, 27500], [4, 'tiktok', 7, 15200],
    [5, 'tiktok', 5, 36500], [6, 'youtube', 3, 12800], [6, 'tiktok', 3, 22400],
  ]
  const posts: Row[] = []
  const stats: Row[] = []
  postDefs.forEach(([c, platform, age, finalViews], i) => {
    const post = { id: uid(), clip_id: clips[c].id, platform, url: null, external_id: null, posted_at: dayISO(age) }
    posts.push(post)
    for (let t = 0; t <= age; t++) {
      const progress = 1 - Math.exp(-(t + 1) / 4) // snelle start, daarna afvlakkend
      const views = Math.round(finalViews * progress * (1 + ((i * 7 + t * 3) % 5) / 100))
      stats.push({
        id: uid(),
        post_id: post.id,
        date: dayISO(age - t),
        views,
        likes: Math.round(views * 0.08),
        comments: Math.round(views * 0.006),
        shares: Math.round(views * 0.012),
      })
    }
  })

  return { sources, clips, posts, post_stats: stats }
}

const db = seed()

function latestPostStats(): Row[] {
  const latest = new Map<string, Row>()
  for (const s of db.post_stats) {
    const cur = latest.get(s.post_id)
    if (!cur || s.date > cur.date) latest.set(s.post_id, s)
  }
  return [...latest.values()]
}

class Query implements PromiseLike<{ data: any; error: null }> {
  private op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' | null = null
  private payload: any
  private conflictKeys: string[] = []
  private filters: [string, unknown][] = []
  private sort: { col: string; asc: boolean } | null = null

  constructor(private table: string) {}

  select(_columns?: string) {
    if (!this.op) this.op = 'select'
    return this
  }
  insert(values: Row | Row[]) {
    this.op = 'insert'
    this.payload = values
    return this
  }
  update(values: Row) {
    this.op = 'update'
    this.payload = values
    return this
  }
  upsert(values: Row[], options?: { onConflict?: string }) {
    this.op = 'upsert'
    this.payload = values
    this.conflictKeys = (options?.onConflict ?? 'id').split(',').map((k) => k.trim())
    return this
  }
  delete() {
    this.op = 'delete'
    return this
  }
  eq(column: string, value: unknown) {
    this.filters.push([column, value])
    return this
  }
  order(column: string, options?: { ascending?: boolean }) {
    this.sort = { col: column, asc: options?.ascending ?? true }
    return this
  }

  then<R1 = { data: any; error: null }, R2 = never>(
    onfulfilled?: ((value: { data: any; error: null }) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): Promise<R1 | R2> {
    return Promise.resolve({ data: this.run(), error: null as null }).then(onfulfilled, onrejected)
  }

  private matches(row: Row) {
    return this.filters.every(([col, value]) => row[col] === value)
  }

  private defaults(row: Row): Row {
    const base: Row = { id: uid(), ...row }
    if (this.table === 'clips') {
      base.created_at ??= new Date().toISOString()
      base.status ??= 'idee'
    }
    if (this.table === 'sources') {
      base.created_at ??= new Date().toISOString()
      base.type ??= 'overig'
    }
    if (this.table === 'posts') base.posted_at ??= new Date().toISOString()
    return base
  }

  private run(): any {
    if (this.table === 'latest_post_stats') return latestPostStats()
    const rows = db[this.table]

    switch (this.op) {
      case 'insert': {
        const created = ([] as Row[]).concat(this.payload).map((r) => this.defaults(r))
        rows.push(...created)
        return created
      }
      case 'update': {
        const hit = rows.filter((r) => this.matches(r))
        hit.forEach((r) => Object.assign(r, this.payload))
        return hit
      }
      case 'upsert': {
        const result: Row[] = []
        for (const incoming of this.payload as Row[]) {
          const existing = rows.find((r) => this.conflictKeys.every((k) => r[k] === incoming[k]))
          if (existing) {
            Object.assign(existing, incoming)
            result.push(existing)
          } else {
            const created = this.defaults(incoming)
            rows.push(created)
            result.push(created)
          }
        }
        return result
      }
      case 'delete': {
        const gone = new Set(rows.filter((r) => this.matches(r)).map((r) => r.id))
        db[this.table] = rows.filter((r) => !gone.has(r.id))
        // Zoals in de echte database: bijbehorende gegevens verdwijnen mee.
        if (this.table === 'posts') db.post_stats = db.post_stats.filter((s) => !gone.has(s.post_id))
        if (this.table === 'clips') {
          const postIds = new Set(db.posts.filter((p) => gone.has(p.clip_id)).map((p) => p.id))
          db.posts = db.posts.filter((p) => !gone.has(p.clip_id))
          db.post_stats = db.post_stats.filter((s) => !postIds.has(s.post_id))
        }
        if (this.table === 'sources') db.clips.forEach((c) => gone.has(c.source_id) && (c.source_id = null))
        return null
      }
      default: {
        const found = rows.filter((r) => this.matches(r)).map((r) => ({ ...r }))
        if (this.sort) {
          const { col, asc } = this.sort
          found.sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (asc ? 1 : -1))
        }
        return found
      }
    }
  }
}

export function createDemoClient() {
  return { from: (table: string) => new Query(table) }
}
