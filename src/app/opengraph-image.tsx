import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const alt = 'Gold Heist Trading Community — premium gold signals, live analysis & community'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Branded social-share card shown when the site is linked (Messenger, FB, etc.).
// The logo is loaded from the public HTTPS URL (Satori fetches it reliably).
const LOGO = 'https://community.ghttrading.co/logo.png'

export default async function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0f',
          backgroundImage: 'radial-gradient(60% 60% at 50% 32%, rgba(173,144,69,0.28), transparent 70%)',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO} width={156} height={156} style={{ borderRadius: 28, marginBottom: 40 }} alt="" />
        <div style={{ display: 'flex', fontSize: 82, fontWeight: 800 }}>
          <span style={{ color: '#d4b159' }}>GHT</span>
          <span style={{ color: '#f5f5f7', marginLeft: 18 }}>Trading</span>
        </div>
        <div
          style={{
            display: 'flex',
            color: '#9a9aa6',
            fontSize: 34,
            marginTop: 22,
            maxWidth: 860,
            textAlign: 'center',
          }}
        >
          Premium gold signals, live analysis &amp; a community of traders
        </div>
        <div style={{ display: 'flex', color: '#ad9045', fontSize: 28, marginTop: 46, letterSpacing: 2 }}>
          community.ghttrading.co
        </div>
      </div>
    ),
    { ...size },
  )
}
