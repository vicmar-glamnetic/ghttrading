import { NextResponse } from 'next/server'

// Proxy + parse the forex news RSS (browsers can't fetch it directly — CORS).
export const revalidate = 900 // 15 min

const FEED = 'https://www.investing.com/rss/news_1.rss'

function decode(s: string) {
  return s
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&#x2019;/g, '’')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim()
}

export async function GET() {
  try {
    const res = await fetch(FEED, { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 900 } })
    if (!res.ok) return NextResponse.json([])
    const xml = await res.text()
    const items: { title: string; link: string; pubDate: string; image: string | null }[] = []
    const itemRe = /<item>([\s\S]*?)<\/item>/g
    const pick = (block: string, tag: string) => {
      const r = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`).exec(block)
      return r ? decode(r[1]) : ''
    }
    let m: RegExpExecArray | null
    while ((m = itemRe.exec(xml)) && items.length < 24) {
      const block = m[1]
      const encl = /<enclosure[^>]*url="([^"]+)"/.exec(block)
      const title = pick(block, 'title')
      const link = pick(block, 'link')
      if (title && link) items.push({ title, link, pubDate: pick(block, 'pubDate'), image: encl?.[1] ?? null })
    }
    return NextResponse.json(items)
  } catch {
    return NextResponse.json([])
  }
}
