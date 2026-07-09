import { Newspaper } from 'lucide-react'
import { NewsFeed, type NewsItem } from './NewsFeed'

export const metadata = { title: 'Forex News · Gold Heist Trading' }
export const revalidate = 900 // refresh at most every 15 min

// Multiple sources so headlines aren't tied to a single site. Each is fetched
// independently — if one is down or blocks us, the others still show.
const SOURCES = [
  { name: 'Investing.com', url: 'https://www.investing.com/rss/news_1.rss' },
  { name: 'Investing.com', url: 'https://www.investing.com/rss/news_11.rss' }, // commodities (gold)
  { name: 'FXStreet',      url: 'https://www.fxstreet.com/rss/news' },
  { name: 'ForexLive',     url: 'https://investinglive.com/feed/' },
  { name: 'MarketWatch',   url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories' },
]

function decode(s: string) {
  return s
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&#x2019;/g, '’')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim()
}

function parseDate(s: string): number {
  if (!s) return 0
  let t = Date.parse(s)
  if (isNaN(t)) t = Date.parse(s.replace(' ', 'T'))
  return isNaN(t) ? 0 : t
}

function extractImage(block: string): string | null {
  const encl = /<enclosure[^>]*url="([^"]+)"/.exec(block)
  if (encl) return encl[1]
  const media = /<media:(?:content|thumbnail)[^>]*url="([^"]+)"/.exec(block)
  if (media) return media[1]
  const desc = /<description[^>]*>([\s\S]*?)<\/description>/.exec(block)
  if (desc) {
    const img = /<img[^>]*src="([^"]+)"/.exec(decode(desc[1]))
    if (img) return img[1]
  }
  return null
}

async function fetchFeed(source: { name: string; url: string }): Promise<NewsItem[]> {
  try {
    const res = await fetch(source.url, { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 900 } })
    if (!res.ok) return []
    const xml = await res.text()
    const items: NewsItem[] = []
    const itemRe = /<item>([\s\S]*?)<\/item>/g
    const pick = (block: string, tag: string) => {
      const r = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`).exec(block)
      return r ? decode(r[1]) : ''
    }
    let m: RegExpExecArray | null
    while ((m = itemRe.exec(xml)) && items.length < 20) {
      const block = m[1]
      const title = pick(block, 'title')
      const link = pick(block, 'link')
      const pubDate = pick(block, 'pubDate')
      if (title && link) {
        items.push({ title, link, source: source.name, ts: parseDate(pubDate), image: extractImage(block) })
      }
    }
    return items
  } catch {
    return []
  }
}

async function getNews(): Promise<NewsItem[]> {
  const results = await Promise.all(SOURCES.map(fetchFeed))
  const all = results.flat()

  // Dedupe by normalized title (same story often syndicated across sites).
  const seen = new Set<string>()
  const unique = all.filter(n => {
    const key = n.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 80)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return unique.sort((a, b) => b.ts - a.ts).slice(0, 60)
}

export default async function NewsPage() {
  const news = await getNews()

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Newspaper className="w-5 h-5 text-yellow-500" />
        <h1 className="font-bold text-ink text-lg">Forex News</h1>
        <span className="ml-auto text-xs text-ink3">Latest market headlines</span>
      </div>

      {news.length === 0 ? (
        <div className="bg-surface rounded-xl border border-line p-12 text-center">
          <Newspaper className="w-12 h-12 text-yellow-500/30 mx-auto mb-3" />
          <p className="text-ink3">Couldn&apos;t load news right now. Please check back shortly.</p>
        </div>
      ) : (
        <NewsFeed items={news} />
      )}

      <p className="text-[10px] text-ink3 text-center">
        Headlines aggregated from Investing.com, FXStreet, ForexLive &amp; MarketWatch. Updated periodically.
      </p>
    </div>
  )
}
