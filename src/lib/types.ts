export const SOURCE_TYPES = ['podcast', 'stream', 'youtube', 'overig'] as const
export const CLIP_STATUSES = ['idee', 'geknipt', 'gepost'] as const
export const PLATFORMS = ['tiktok', 'youtube'] as const

export type SourceType = (typeof SOURCE_TYPES)[number]
export type ClipStatus = (typeof CLIP_STATUSES)[number]
export type Platform = (typeof PLATFORMS)[number]

export const PLATFORM_LABELS: Record<Platform, string> = {
  tiktok: 'TikTok',
  youtube: 'YouTube Shorts',
}

export interface Source {
  id: string
  name: string
  url: string | null
  type: SourceType
  notes: string | null
  created_at: string
}

export interface Clip {
  id: string
  source_id: string | null
  title: string
  source_timestamp: string | null
  status: ClipStatus
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface Post {
  id: string
  clip_id: string
  platform: Platform
  url: string | null
  external_id: string | null
  posted_at: string
}

export interface PostStat {
  id: string
  post_id: string
  date: string // 'YYYY-MM-DD'
  views: number
  likes: number
  comments: number
  shares: number
}
