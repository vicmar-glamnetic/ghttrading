'use client'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * A height-capped scroll box that always shows how much more there is.
 *
 * Phones use overlay scrollbars: they fade out after a gesture and never show
 * at rest, so a clipped list reads as a *short* list — people simply don't know
 * to swipe. This draws its own slim rail and thumb down the right edge, plus a
 * fade while there's still content below, so "more here, drag it" is visible
 * before you touch anything. The native bar is hidden inside this box to avoid
 * showing two.
 *
 * The rail hides itself when the content fits, so a filtered-down list doesn't
 * carry a full-height thumb that looks broken.
 */
export function ScrollArea({ children, className = '', contentClassName = '', fadeFrom = 'from-surface' }: {
  children: ReactNode
  /** Viewport classes — put the height cap here, e.g. `max-h-44`. */
  className?: string
  /** Classes for the content wrapper — the list's own layout, e.g. `flex flex-wrap gap-1.5`. */
  contentClassName?: string
  /** Gradient start for the bottom fade. Match the surface behind the box. */
  fadeFrom?: string
}) {
  const viewport = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)
  // null = content fits, no rail. size/offset are fractions of the rail height.
  const [thumb, setThumb] = useState<{ size: number; offset: number; atEnd: boolean } | null>(null)

  const measure = useCallback(() => {
    const el = viewport.current
    if (!el) return
    const { scrollHeight, clientHeight, scrollTop } = el
    const scrollable = scrollHeight - clientHeight
    if (scrollable < 4) { setThumb(null); return }
    // Floor the thumb at 18% of the rail: proportional alone gets too small to
    // notice once a list is long, which defeats the point of showing it.
    const size = Math.max(clientHeight / scrollHeight, 0.18)
    const progress = Math.min(Math.max(scrollTop / scrollable, 0), 1)
    setThumb({ size, offset: progress * (1 - size), atEnd: progress > 0.98 })
  }, [])

  // Driven by ResizeObserver and scroll events rather than measured in the
  // effect body, so the first measurement, a filtered list, a resize and a
  // scroll all land the same way — and none of them cascade a render.
  useEffect(() => {
    const els = [viewport.current, content.current].filter(Boolean) as Element[]
    if (!els.length || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    els.forEach(el => ro.observe(el))
    return () => ro.disconnect()
  }, [measure])

  return (
    <div className="relative">
      <div
        ref={viewport}
        onScroll={measure}
        // pr-3 is always reserved for the rail: adding it only when scrollable
        // would reflow the list the moment a filter shortens it.
        className={`overflow-y-auto overscroll-contain pr-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
      >
        <div ref={content} className={contentClassName}>{children}</div>
      </div>
      {thumb && (
        <>
          {!thumb.atEnd && (
            <div className={`pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t ${fadeFrom} to-transparent`} />
          )}
          <div className="pointer-events-none absolute right-0 top-0.5 bottom-0.5 w-1.5 rounded-full bg-line">
            <div
              className="absolute left-0 w-full rounded-full bg-yellow-500/80"
              style={{ height: `${thumb.size * 100}%`, top: `${thumb.offset * 100}%` }}
            />
          </div>
        </>
      )}
    </div>
  )
}
