import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com', pathname: '/**' },
      { protocol: 'https', hostname: 'res.cloudinary.com',           pathname: '/**' },
      { protocol: 'https', hostname: '*.googleusercontent.com',      pathname: '/**' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: '*.githubusercontent.com',      pathname: '/**' },
      { protocol: 'https', hostname: 'i.ytimg.com',                  pathname: '/**' }, // course lesson thumbnails
    ],
  },
}

export default nextConfig
