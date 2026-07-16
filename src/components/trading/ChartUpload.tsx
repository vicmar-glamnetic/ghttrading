'use client'
import { useState, useRef } from 'react'
import Image from 'next/image'
import { ImagePlus, X, Loader2 } from 'lucide-react'
import { uploadToBlob, validateImage, friendlyUploadError } from '@/lib/upload'

/**
 * Single chart screenshot picker — the marked-up chart behind a signal or a
 * journal entry. Uploads straight to Blob and hands back the URL; the caller
 * stores it on the record.
 */
export function ChartUpload({ value, onChange, label = 'Add chart screenshot' }: {
  value: string | null
  onChange: (url: string | null) => void
  label?: string
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File | undefined) {
    if (!file) return
    const invalid = validateImage(file)
    if (invalid) { setError(invalid); return }
    setUploading(true)
    setError('')
    try {
      const { url } = await uploadToBlob(file)
      onChange(url)
    } catch (err) {
      setError(friendlyUploadError(err))
    } finally {
      setUploading(false)
    }
  }

  if (value) {
    return (
      <div className="space-y-1.5">
        <div className="relative rounded-lg overflow-hidden border border-line bg-sunken">
          {/* Charts are wide and vary in aspect; cap the height and letterbox. */}
          <Image
            src={value}
            alt="Trade chart"
            width={1200}
            height={675}
            className="w-full max-h-56 object-contain"
            unoptimized
          />
          <button
            type="button"
            onClick={() => { onChange(null); setError('') }}
            aria-label="Remove chart"
            className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 text-white hover:bg-black transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-[11px] text-ink3 hover:text-yellow-500 transition-colors"
        >
          Replace chart
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => handleFile(e.target.files?.[0])}
        />
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files?.[0]) }}
        className={`w-full flex items-center justify-center gap-2 rounded-lg border border-dashed py-4 text-xs transition-colors disabled:opacity-60 ${
          dragging ? 'border-yellow-500/60 bg-yellow-500/5 text-yellow-500' : 'border-line text-ink3 hover:border-line2 hover:text-ink2'
        }`}
      >
        {uploading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
        ) : (
          <><ImagePlus className="w-4 h-4" /> {label}</>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => handleFile(e.target.files?.[0])}
      />
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  )
}
