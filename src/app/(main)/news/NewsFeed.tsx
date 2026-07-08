'use client'
import { useState, useMemo } from 'react'
import { ExternalLink } from 'lucide-react'

export interface NewsItem {
  title: string
  link: string
  source: string
  ts: number // epoch ms (0 if unknown)
  image: string | null
}

function timeAgo(ts: number): string {
  if (!ts) return ''
  const mins = Math.round((Date.now() - ts) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}

export function NewsFeed({ items }: { items: NewsItem[] }) {
  const [source, setSource] = useState('all')

  const sources = useMemo(() => Array.from(new Set(items.map(i => i.source))), [items])
  const filtered = source === 'all' ? items : items.filter(i => i.source === source)

  return (
    <div className="space-y-3">
      {/* Source filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {['all', ...sources].map(s => (
          <button key={s} onClick={() => setSource(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              source === s ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' : 'text-ink3 hover:bg-elevated border border-transparent'
            }`}>
            {s === 'all' ? 'All Sources' : s}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((n, i) => (
          <a key={n.link + i} href={n.link} target="_blank" rel="noopener noreferrer"
            className="flex gap-3 bg-surface rounded-xl border border-line p-3 hover:border-yellow-500/30 transition-colors group">
            {n.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={n.image} alt="" className="w-24 h-24 sm:w-32 sm:h-24 object-cover rounded-lg shrink-0 bg-elevated" loading="lazy" />
            )}
            <div className="min-w-0 flex flex-col">
              <p className="text-sm font-semibold text-ink leading-snug line-clamp-3 group-hover:text-yellow-500 transition-colors">{n.title}</p>
              <div className="mt-auto pt-2 flex items-center gap-2 text-xs text-ink3">
                <span className="font-medium text-ink2">{n.source}</span>
                {timeAgo(n.ts) && <><span>·</span><span>{timeAgo(n.ts)}</span></>}
                <ExternalLink className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
