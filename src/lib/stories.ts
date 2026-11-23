/**
 * Shared story settings, used by the API and the feed UI alike (no server
 * imports here).
 */

/** How long a story stays up. */
export const STORY_TTL_HOURS = 24

/** How long a photo or text story shows before moving on, in ms. */
export const STORY_IMAGE_MS = 5000

/** Videos play to the end, but never longer than this. */
export const STORY_VIDEO_MAX_MS = 30000

/** Longest text story / caption we accept. */
export const STORY_TEXT_MAX = 250

/** Background gradients for text stories, by key (the key is what's stored). */
export const STORY_BACKGROUNDS: Record<string, string> = {
  gold:   'linear-gradient(135deg, #55461f 0%, #ad9045 45%, #d4b159 100%)',
  heist:  'linear-gradient(135deg, #0a0a0f 0%, #3d3216 50%, #ad9045 100%)',
  ocean:  'linear-gradient(135deg, #10213f 0%, #2f5bb8 55%, #6b93e0 100%)',
  night:  'linear-gradient(160deg, #0a0a0f 0%, #1e1e2c 55%, #3a3a4a 100%)',
  bull:   'linear-gradient(135deg, #0f3d2b 0%, #0f6d35 50%, #22c55e 100%)',
  bear:   'linear-gradient(135deg, #3d1010 0%, #b23f3f 50%, #ef4444 100%)',
  sunset: 'linear-gradient(135deg, #5c1f5c 0%, #d14f4f 50%, #d4b159 100%)',
}
export const DEFAULT_STORY_BG = 'gold'

export function storyBackground(key?: string | null): string {
  return STORY_BACKGROUNDS[key ?? ''] ?? STORY_BACKGROUNDS[DEFAULT_STORY_BG]
}

export interface StoryItem {
  id: string
  mediaUrl: string | null
  mediaType: 'image' | 'video' | null
  text: string | null
  bg: string | null
  createdAt: string
  seen: boolean
  /** Your reaction to someone else's story (lib/reactions type), if any. */
  myReaction?: string | null
  /** Only filled in on your own stories. */
  viewCount?: number
}

export interface StoryGroup {
  author: { id: string; name: string | null; image: string | null }
  stories: StoryItem[]
  /** Every story in the group has been seen by the viewer. */
  allSeen: boolean
  isMine: boolean
}
