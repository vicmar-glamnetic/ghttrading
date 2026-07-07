import { Newspaper, ExternalLink } from 'lucide-react'

export const metadata = { title: 'Forex News · GHT Trading' }
export const revalidate = 900 // refresh at most every 15 min

const FEED = 'https://www.investing.com/rss/news_1.rss'

interface NewsItem { title: string; link: string; pubDate: string; image: string | null }

function decode(s: string) {
  return s
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&#x2019;/g, '’')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim()
}

async function getNews(): Promise<NewsItem[]> {
  try {
    const res = await fetch(FEED, { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 900 } })
    if (!res.ok) return []
    const xml = await res.text()
    const items: NewsItem[] = []
    const itemRe = /<item>([\s\S]*?)<\/item>/g
    let m: RegExpExecArray | null
    const pick = (block: string, tag: string) => {
      const r = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`).exec(block)
      return r ? decode(r[1]) : ''
    }
    while ((m = itemRe.exec(xml)) && items.length < 24) {
      const block = m[1]
      const encl = /<enclosure[^>]*url="([^"]+)"/.exec(block)
      const title = pick(block, 'title')
      const link = pick(block, 'link')
      if (title && link) items.push({ title, link, pubDate: pick(block, 'pubDate'), image: encl?.[1] ?? null })
    }
    return items
  } catch {
    return []
  }
}

function timeAgo(pubDate: string): string {
  const d = new Date(pubDate.replace(' ', 'T'))
  if (isNaN(d.getTime())) return ''
  const diff = Date.now() - d.getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
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
        <div className="space-y-3">
          {news.map((n, i) => (
            <a
              key={i}
              href={n.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-3 bg-surface rounded-xl border border-line p-3 hover:border-yellow-500/30 transition-colors group"
            >
              {n.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={n.image} alt="" className="w-24 h-24 sm:w-32 sm:h-24 object-cover rounded-lg shrink-0 bg-elevated" loading="lazy" />
              )}
              <div className="min-w-0 flex flex-col">
                <p className="text-sm font-semibold text-ink leading-snug line-clamp-3 group-hover:text-yellow-500 transition-colors">
                  {n.title}
                </p>
                <div className="mt-auto pt-2 flex items-center gap-2 text-xs text-ink3">
                  <span>Investing.com</span>
                  {timeAgo(n.pubDate) && <><span>·</span><span>{timeAgo(n.pubDate)}</span></>}
                  <ExternalLink className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      <p className="text-[10px] text-ink3 text-center">News headlines via Investing.com. Updated periodically.</p>
    </div>
  )
}
