'use client'
import { upload } from '@vercel/blob/client'

export interface UploadedFile { url: string; name: string; type: string }

/** Max image size we accept, in MB. Kept in sync with the UI copy. */
export const IMAGE_MAX_MB = 8

const IMAGE_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
]

/**
 * Validate a user-selected image before uploading. Returns a friendly, ready-to-
 * show message when the file isn't acceptable, or null when it's good to go.
 */
export function validateImage(file: File, maxMB = IMAGE_MAX_MB): string | null {
  const isImage = file.type.startsWith('image/') || IMAGE_TYPES.includes(file.type)
  if (!isImage) return 'That doesn’t look like an image. Please pick a JPG, PNG, GIF or WebP.'
  if (file.size > maxMB * 1024 * 1024) {
    const mb = (file.size / (1024 * 1024)).toFixed(1)
    return `That image is ${mb}MB — please choose one under ${maxMB}MB.`
  }
  return null
}

const isHeicName = (name: string) => /\.(heic|heif)$/i.test(name)

/**
 * iPhone photos are often HEIC, which Chrome, Firefox and Android can't display.
 * Convert them to JPEG in the browser; any other file is returned unchanged.
 * The converter is loaded only when a HEIC file is actually picked.
 */
export async function toWebImage(file: File): Promise<File> {
  const heicType = /image\/hei[cf]/i.test(file.type)
  if (!heicType && !isHeicName(file.name)) return file
  const { heicTo } = await import('heic-to/next')
  const jpeg = await heicTo({ blob: file, type: 'image/jpeg', quality: 0.85 })
  const name = isHeicName(file.name) ? file.name.replace(/\.(heic|heif)$/i, '.jpg') : `${file.name}.jpg`
  return new File([jpeg], name, { type: 'image/jpeg' })
}

/**
 * Upload a file directly to Vercel Blob (bypasses the 4.5 MB serverless body
 * limit, so videos work) and return its public URL. The DB stores only the URL.
 */
export async function uploadToBlob(input: File): Promise<UploadedFile> {
  const file = await toWebImage(input)
  const blob = await upload(file.name, file, {
    access: 'public',
    handleUploadUrl: '/api/upload',
  })
  return { url: blob.url, name: file.name, type: file.type }
}

/**
 * Turn any upload error into a short, human message. Vercel Blob throws
 * technical strings (e.g. "Failed to retrieve the client token") that we never
 * want to show a member.
 */
export function friendlyUploadError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (/token/i.test(msg)) return 'Uploads aren’t configured right now. Please try again later.'
  if (/network|fetch|load failed/i.test(msg)) return 'Network problem — check your connection and try again.'
  if (/too large|size/i.test(msg)) return `That file is too large (max ${IMAGE_MAX_MB}MB).`
  return 'Upload failed. Please try again.'
}
