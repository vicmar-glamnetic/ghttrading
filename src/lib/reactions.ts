// Shared reaction config — safe to import from both client and server code.

export const REACTIONS = [
  { type: 'like',  label: 'Like',  emoji: '👍', color: '#eab308' },
  { type: 'love',  label: 'Love',  emoji: '❤️', color: '#f43f5e' },
  { type: 'haha',  label: 'Haha',  emoji: '😂', color: '#f59e0b' },
  { type: 'wow',   label: 'Wow',   emoji: '😮', color: '#f59e0b' },
  { type: 'sad',   label: 'Sad',   emoji: '😢', color: '#f59e0b' },
  { type: 'angry', label: 'Angry', emoji: '😡', color: '#f97316' },
] as const

export type ReactionType = (typeof REACTIONS)[number]['type']
export type ReactionConfig = (typeof REACTIONS)[number]

export const REACTION_TYPES = REACTIONS.map(r => r.type) as ReactionType[]

const byType = Object.fromEntries(REACTIONS.map(r => [r.type, r])) as Record<ReactionType, ReactionConfig>

export function getReaction(type?: string | null): ReactionConfig {
  return (type && byType[type as ReactionType]) || REACTIONS[0]
}

export function isReactionType(value: unknown): value is ReactionType {
  return typeof value === 'string' && (REACTION_TYPES as string[]).includes(value)
}
