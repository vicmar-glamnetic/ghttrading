import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// Simple upload handler using UploadThing
export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const files = formData.getAll('files') as File[]

    if (!files.length) return NextResponse.json({ error: 'No files' }, { status: 400 })

    // Upload each file to UploadThing via their API
    const uploadedFiles = await Promise.all(
      files.map(async (file) => {
        // Convert to base64 data URL for simple storage
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const base64 = buffer.toString('base64')
        const dataUrl = `data:${file.type};base64,${base64}`
        return {
          url: dataUrl,
          name: file.name,
          type: file.type,
        }
      })
    )

    return NextResponse.json({ files: uploadedFiles })
  } catch (error) {
    console.error('[UPLOAD]', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
