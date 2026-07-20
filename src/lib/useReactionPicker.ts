import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Drives a reaction picker that opens two ways:
 *   • desktop  — hovering the trigger (mouse enter / leave)
 *   • mobile   — long-pressing the trigger (touch hold)
 *
 * A plain tap is left for the caller to handle as a quick "like"; the picker
 * only appears on a deliberate hold. `consumeLongPress()` lets the tap handler
 * bail out when the interaction was actually a long-press.
 */
export function useReactionPicker() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressed = useRef(false)
  // Touch fires synthetic mouse events (incl. mouseenter) after touchend, which
  // would pop the picker open on a plain tap — ignore hover briefly after touch.
  const lastTouch = useRef(0)

  const openNow = useCallback(() => {
    if (Date.now() - lastTouch.current < 700) return
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    setOpen(true)
  }, [])

  const closeSoon = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => setOpen(false), 250)
  }, [])

  const close = useCallback(() => setOpen(false), [])

  const onTouchStart = useCallback(() => {
    lastTouch.current = Date.now()
    longPressed.current = false
    if (pressTimer.current) clearTimeout(pressTimer.current)
    pressTimer.current = setTimeout(() => {
      longPressed.current = true
      setOpen(true)
    }, 400)
  }, [])

  // Finger moved (a scroll, not a hold) — abandon the pending long-press.
  const onTouchMove = useCallback(() => {
    if (pressTimer.current) clearTimeout(pressTimer.current)
  }, [])

  const onTouchEnd = useCallback(() => {
    lastTouch.current = Date.now()
    if (pressTimer.current) clearTimeout(pressTimer.current)
  }, [])

  // True when the finished interaction was a long-press, so the tap handler can
  // suppress its default action. Resets the flag as it reports it.
  const consumeLongPress = useCallback(() => {
    if (longPressed.current) {
      longPressed.current = false
      return true
    }
    return false
  }, [])

  // Mobile has no mouse-leave, so close the picker on an outside tap.
  useEffect(() => {
    if (!open) return
    function handler(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [open])

  return {
    open,
    ref,
    close,
    // spread onto the trigger wrapper
    triggerProps: {
      onMouseEnter: openNow,
      onMouseLeave: closeSoon,
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
    // spread onto the floating picker so hovering it keeps it open
    pickerProps: {
      onMouseEnter: openNow,
      onMouseLeave: closeSoon,
    },
    consumeLongPress,
  }
}
