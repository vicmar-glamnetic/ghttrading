// @mentions in post and comment text. Shared by the server (who to notify)
// and the browser (turning mentions into profile links).

/**
 * "@name" at the start of the text or after whitespace. Usernames come from
 * members' names, so allow letters, numbers and _ . - (a trailing . or - is
 * treated as punctuation, not part of the name).
 */
export const MENTION_RE = /(^|\s)@([\p{L}\p{N}_][\p{L}\p{N}_.-]*[\p{L}\p{N}_]|[\p{L}\p{N}_])/gu

export function extractMentions(text: string): string[] {
  const out = new Set<string>()
  for (const m of text.matchAll(MENTION_RE)) out.add(m[2].toLowerCase())
  return [...out].slice(0, 20)
}
