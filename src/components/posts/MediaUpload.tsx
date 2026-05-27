'use client'
import { useState, useRef } from 'react'
import Image from 'next/image'
import { X, Image as ImageIcon, Video, Loader2 } from 'lucide-react'

interface UploadedFile {
  url: string
  name: string
  type: string
}

interface MediaUploadProps {
  onUpload: (files: UploadedFile[]) => void
  existingFiles?: UploadedFile[]
}

export function MediaUpload({ onUpload, existingFiles = [] }: MediaUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>(existingFiles)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(selectedFiles: FileList | null) {
    if (!selectedFiles || selectedFiles.length === 0) return
    setUploading(true)
    setError('')

    try {
      const formData = new FormData()
      Array.from(selectedFiles).forEach(file => formData.append('files', file))

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      const newFiles = [...files, ...data.files]
      setFiles(newFiles)
      onUpload(newFiles)
    } catch {
      setError('Upload failed. Try again.')
    } finally {
      setUploading(false)
    }
  }

  function removeFile(index: number) {
    const newFiles = files.filter((_, i) => i !== index)
    setFiles(newFiles)
    onUpload(newFiles)
  }

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        className={`upload-zone rounded-xl p-6 text-center cursor-pointer transition-all ${dragging ? 'dragging' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
            <p className="text-sm text-[#9090a8]">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-3">
              <ImageIcon className="w-6 h-6 text-[#5a5a72]" />
              <Video className="w-6 h-6 text-[#5a5a72]" />
            </div>
            <p className="text-sm text-[#9090a8]">
              <span className="text-yellow-500 font-semibold">Click to upload</span> or drag & drop
            </p>
            <p className="text-xs text-[#5a5a72]">Images up to 8MB · Videos up to 64MB</p>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Preview Grid */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {files.map((file, i) => (
            <div key={i} className="relative rounded-lg overflow-hidden bg-[#1e1e2c] aspect-video group">
              {file.type.startsWith('video') ? (
                <video src={file.url} className="w-full h-full object-cover" />
              ) : (
                <Image src={file.url} alt={file.name} fill className="object-cover" />
              )}
              <button
                onClick={() => removeFile(i)}
                className="absolute top-1 right-1 w-6 h-6 bg-black/70 hover:bg-black rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-white" />
              </button>
              {file.type.startsWith('video') && (
                <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Video className="w-3 h-3" /> Video
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
