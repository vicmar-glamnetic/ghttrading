'use client'
import { Avatar } from '@/components/ui/Avatar'
import { isOnline } from '@/lib/presence'
import { cn } from '@/lib/utils'

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

// The dot scales with the avatar, and its border matches the surface it sits on
// so it reads as a cutout rather than a sticker.
const dotSize: Record<Size, string> = {
  xs: 'w-2 h-2 border',
  sm: 'w-3 h-3 border-2',
  md: 'w-3 h-3 border-2',
  lg: 'w-3.5 h-3.5 border-2',
  xl: 'w-5 h-5 border-4',
}

/**
 * Avatar with a green presence dot. Avatar itself clips to a circle, so the dot
 * has to live on a wrapper — it would be cut off inside.
 */
export function OnlineAvatar({
  src, name, size = 'md', lastSeenAt, className, ringClass = 'border-surface',
}: {
  src?: string | null
  name?: string | null
  size?: Size
  lastSeenAt: string | Date | null | undefined
  className?: string
  /** Border colour of the dot — match the background it overlaps. */
  ringClass?: string
}) {
  const online = isOnline(lastSeenAt)
  return (
    <div className={cn('relative shrink-0', className)}>
      <Avatar src={src} name={name} size={size} />
      {online && (
        <span
          title="Online now"
          aria-label="Online now"
          className={cn(
            'absolute bottom-0 right-0 rounded-full bg-green-400',
            dotSize[size],
            ringClass,
          )}
        />
      )}
    </div>
  )
}
