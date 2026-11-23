import Link from 'next/link'
import { Fragment } from 'react'
import { MENTION_RE } from '@/lib/mentionText'

/** Post/comment text with @mentions turned into profile links. */
export function RichText({ text }: { text: string }) {
  const parts: React.ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(MENTION_RE)) {
    const at = m.index! + m[1].length // skip the leading space
    if (at > last) parts.push(<Fragment key={last}>{text.slice(last, at)}</Fragment>)
    parts.push(
      <Link key={at} href={`/u/${encodeURIComponent(m[2])}`} onClick={e => e.stopPropagation()}
        className="font-semibold text-yellow-500 hover:text-yellow-400 hover:underline">
        @{m[2]}
      </Link>,
    )
    last = at + 1 + m[2].length
  }
  if (last < text.length) parts.push(<Fragment key={last}>{text.slice(last)}</Fragment>)
  return <>{parts}</>
}
