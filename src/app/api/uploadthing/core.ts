import { createUploadthing, type FileRouter } from 'uploadthing/next'
import { auth } from '@/lib/auth'

const f = createUploadthing()

export const ourFileRouter = {
  postMedia: f({
    image: { maxFileSize: '8MB', maxFileCount: 4 },
    video: { maxFileSize: '64MB', maxFileCount: 1 },
  })
    .middleware(async () => {
      const session = await auth()
      if (!session?.user?.id) throw new Error('Unauthorized')
      return { userId: session.user.id }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { url: file.ufsUrl, name: file.name, type: file.type }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter
