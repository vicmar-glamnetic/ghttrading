'use client'
import { useEffect, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from 'lucide-react'

interface ImageLightboxProps {
  images: string[]       // only non-video URLs
  startIndex: number
  onClose: () => void
}

export function ImageLightbox({ images, startIndex, onClose }: ImageLightboxProps) {
  const [index, setIndex] = useState(startIndex)
  const [zoomed, setZoomed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)  // for fade-in

  const current = images[index]
  const hasMultiple = images.length > 1

  useEffect(() => {
    setMounted(true)
    // Tiny delay so the CSS transition fires
    requestAnimationFrame(() => setVisible(true))

    // Lock body scroll
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  function close() {
    setVisible(false)
    setTimeout(onClose, 200)   // wait for fade-out
  }

  const prev = useCallback(() => {
    setZoomed(false)
    setIndex(i => (i - 1 + images.length) % images.length)
  }, [images.length])

  const next = useCallback(() => {
    setZoomed(false)
    setIndex(i => (i + 1) % images.length)
  }, [images.length])

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape')       close()
      if (e.key === 'ArrowLeft')    prev()
      if (e.key === 'ArrowRight')   next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prev, next])

  function handleDownload() {
    const a = document.createElement('a')
    a.href = current
    a.download = `image-${index + 1}.jpg`
    a.click()
  }

  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ transition: 'opacity 0.2s', opacity: visible ? 1 : 0 }}
    >
      {/* Dark backdrop */}
      <div
        className="absolute inset-0 bg-black/92"
        onClick={close}
      />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-linear-to-b from-black/80 to-transparent">
        {/* Counter */}
        {hasMultiple && (
          <span className="text-sm font-semibold text-white/80">
            {index + 1} / {images.length}
          </span>
        )}
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setZoomed(z => !z)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title={zoomed ? 'Zoom out' : 'Zoom in'}
          >
            {zoomed ? <ZoomOut className="w-5 h-5" /> : <ZoomIn className="w-5 h-5" />}
          </button>
          <button
            onClick={handleDownload}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Download"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={close}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Prev button */}
      {hasMultiple && (
        <button
          onClick={prev}
          className="absolute left-3 z-10 p-2.5 rounded-full bg-black/60 hover:bg-black/80 border border-white/10 text-white transition-all hover:scale-110 active:scale-95"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Image */}
      <div
        className="relative z-10 flex items-center justify-center w-full h-full px-16 py-16"
        onClick={e => { if (e.target === e.currentTarget) close() }}
      >
        <div
          className={`relative transition-transform duration-200 ${zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
          style={{
            maxWidth:  zoomed ? '95vw'  : '90vw',
            maxHeight: zoomed ? '95vh'  : '85vh',
            transform: zoomed ? 'scale(1.5)' : 'scale(1)',
          }}
          onClick={() => setZoomed(z => !z)}
        >
          {current.startsWith('data:') ? (
            // Base64 image — use plain <img> (Next Image doesn't like data URIs for unoptimized)
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={current}
              alt={`Image ${index + 1}`}
              style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 8, display: 'block' }}
            />
          ) : (
            <Image
              src={current}
              alt={`Image ${index + 1}`}
              width={1200}
              height={900}
              style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 8 }}
              className="shadow-2xl"
              priority
            />
          )}
        </div>
      </div>

      {/* Next button */}
      {hasMultiple && (
        <button
          onClick={next}
          className="absolute right-3 z-10 p-2.5 rounded-full bg-black/60 hover:bg-black/80 border border-white/10 text-white transition-all hover:scale-110 active:scale-95"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Bottom thumbnail strip (when > 1 image) */}
      {hasMultiple && (
        <div className="absolute bottom-4 left-0 right-0 z-10 flex justify-center gap-2 px-4">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => { setIndex(i); setZoomed(false) }}
              className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                i === index ? 'border-yellow-500 scale-110' : 'border-white/20 opacity-50 hover:opacity-80'
              }`}
            >
              {img.startsWith('data:') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img} alt="" className="w-full h-full object-cover" />
              ) : (
                <Image src={img} alt="" fill className="object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body
  )
}
