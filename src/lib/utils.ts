import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function timeAgo(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

export function getInitials(name: string): string {
  // Ignore separators and other junk tokens ("Armand - 641545" must not read "A-").
  const words = name.split(/\s+/).filter((w) => /^\p{L}/u.test(w))

  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()

  // Single usable word (or none): fall back to its first two characters.
  const chars = (words[0] ?? name).replace(/[^\p{L}\p{N}]/gu, '')
  return chars.slice(0, 2).toUpperCase() || '?'
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
