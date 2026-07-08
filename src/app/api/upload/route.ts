import { NextResponse } from 'next/server'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { auth } from '@/lib/auth'

// Vercel Blob client-upload handshake. The browser uploads the file straight to
// Blob storage; we only mint a scoped token here and store the returned URL.
export async function POST(request: Request) {
  const body = (await request.json()) as HandleUploadBody

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const session = await auth()
        if (!session?.user?.id) throw new Error('Unauthorized')
        return {
          allowedContentTypes: [
            'image/jpeg', 'image/png', 'image/webp', 'image/gif',
            'video/mp4', 'video/webm', 'video/quicktime',
          ],
          maximumSizeInBytes: 64 * 1024 * 1024, // 64 MB
          addRandomSuffix: true,
        }
      },
      onUploadCompleted: async () => {
        // No-op — the client stores the URL on the relevant record.
      },
    })
    return NextResponse.json(json)
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 })
  }
}
