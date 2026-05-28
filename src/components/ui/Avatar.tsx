'use client'
import { useState } from 'react'
import Image from 'next/image'
import { getInitials, cn } from '@/lib/utils'

interface AvatarProps {
  src?: string | null
  name?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizes = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-20 h-20 text-xl',
}

const sizePx = { xs: 24, sm: 32, md: 40, lg: 48, xl: 80 }

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const [imgError, setImgError] = useState(false)

  const showImage = src && !imgError

  return (
    <div className={cn(
      'relative rounded-full overflow-hidden flex items-center justify-center shrink-0 font-bold',
      'bg-linear-to-br from-yellow-500 to-yellow-700 text-black',
      sizes[size],
      className,
    )}>
      {showImage ? (
        src.startsWith('data:') ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={name || 'Avatar'}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <Image
            src={src}
            alt={name || 'Avatar'}
            width={sizePx[size]}
            height={sizePx[size]}
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        )
      ) : (
        <span className="select-none">{name ? getInitials(name) : '?'}</span>
      )}
    </div>
  )
}
