// Canonical ordering so a pair of users always maps to one conversation.
export function orderPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a]
}

export const USER_LITE = { select: { id: true, name: true, image: true, username: true } }
