'use client'
import { upload } from '@vercel/blob/client'

export interface UploadedFile { url: string; name: string; type: string }

/**
 * Upload a file directly to Vercel Blob (bypasses the 4.5 MB serverless body
 * limit, so videos work) and return its public URL. The DB stores only the URL.
 */
export async function uploadToBlob(file: File): Promise<UploadedFile> {
  const blob = await upload(file.name, file, {
    access: 'public',
    handleUploadUrl: '/api/upload',
  })
  return { url: blob.url, name: file.name, type: file.type }
}
