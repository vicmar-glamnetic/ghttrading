/**
 * Member identity rules — shared by the client gate, the settings form and every
 * API route that writes a name. Keep this file free of server-only imports so
 * the browser can pre-validate with exactly the same rules the server enforces.
 *
 * ACCM members display "<Name> - <accmNumber>" (e.g. "Vicmar - 166738") so any
 * post, signal or journal entry can be tied back to a real trading account. The
 * legal name lives in `realName` and is shown to staff and the owner only.
 */

/** Separator between the name and the ACCM number in a display name. */
export const NAME_SEP = ' - '

/**
 * Who has to follow the format. Staff are exempt (the user asked for members
 * only), and so are non-ACCM/other-broker members — they have no ACCM number to
 * put in the name, so gating them would lock them out of the app entirely.
 */
export function isGatedMember(u: { role?: string | null; accmMember?: boolean | null }): boolean {
  return (u.role ?? 'member') === 'member' && u.accmMember !== false
}

/** True once this member has supplied everything the gate asks for. */
export function hasCompleteIdentity(u: {
  role?: string | null; accmMember?: boolean | null
  name?: string | null; realName?: string | null; accmNumber?: string | null
}): boolean {
  if (!isGatedMember(u)) return true
  if (!u.accmNumber || !u.realName) return false
  return validateDisplayName(u.name ?? '', u.accmNumber) === null
}

// --- ACCM number ------------------------------------------------------------

// No spaces or dashes: those would make "<Name> - <number>" ambiguous to parse.
const ACCM_RE = /^[A-Za-z0-9]{4,20}$/

/** Normalise a typed ACCM number (members paste it with spaces/dashes). */
export function normalizeAccmNumber(raw: string): string {
  return raw.replace(/[\s-]/g, '').trim()
}

/** Returns a ready-to-show error, or null when the number is acceptable. */
export function validateAccmNumber(raw: string): string | null {
  const v = normalizeAccmNumber(raw)
  if (!v) return 'Please enter your ACCM account number.'
  if (!ACCM_RE.test(v)) return 'That doesn’t look like an ACCM account number — it should be 4–20 letters or numbers.'
  return null
}

// --- Display name -----------------------------------------------------------

// Letters (incl. accents), spaces, apostrophes, hyphens and dots. No digits: the
// only number in a display name is the ACCM number after the separator.
const NAME_PART_RE = /^[\p{L}][\p{L} .'-]{0,29}$/u

/** Build the required display name from a first name and an ACCM number. */
export function buildDisplayName(namePart: string, accmNumber: string): string {
  return `${namePart.trim()}${NAME_SEP}${normalizeAccmNumber(accmNumber)}`
}

/**
 * Pull the name half out of a display name. Uses the LAST separator so a
 * hyphenated name ("Anne-Marie - 166738") still splits correctly.
 */
export function namePartOf(displayName: string | null | undefined): string {
  if (!displayName) return ''
  const i = displayName.lastIndexOf(NAME_SEP)
  return i === -1 ? displayName.trim() : displayName.slice(0, i).trim()
}

/** Returns a ready-to-show error for the name half, or null when it's fine. */
export function validateNamePart(raw: string): string | null {
  const v = raw.trim()
  if (!v) return 'Please enter the name you want to show.'
  if (v.length < 2) return 'That name is too short.'
  if (v.length > 30) return 'Please keep the name under 30 characters.'
  if (/\d/.test(v)) return 'Leave the numbers out — your ACCM number is added automatically.'
  if (!NAME_PART_RE.test(v)) return 'Use letters only (spaces, apostrophes and hyphens are fine).'
  return null
}

/**
 * Full check of a stored display name against the member's ACCM number.
 * Returns a ready-to-show error, or null when the name is in the right format.
 */
export function validateDisplayName(displayName: string, accmNumber: string | null | undefined): string | null {
  const num = accmNumber ? normalizeAccmNumber(accmNumber) : ''
  if (!num) return 'Add your ACCM account number first.'
  const name = (displayName ?? '').trim()
  const expectedSuffix = `${NAME_SEP}${num}`
  if (!name.endsWith(expectedSuffix)) {
    return `Your display name must end with “${expectedSuffix.trim()}” — for example “Vicmar${NAME_SEP}${num}”.`
  }
  return validateNamePart(name.slice(0, name.length - expectedSuffix.length))
}

// --- Real name --------------------------------------------------------------

/**
 * The legal name behind the account. Two words minimum: a single first name
 * proves nothing against an ACCM account, which is what this field is for.
 */
export function validateRealName(raw: string): string | null {
  const v = raw.trim().replace(/\s+/g, ' ')
  if (!v) return 'Please enter your full real name.'
  if (v.length < 4) return 'Please enter your full real name.'
  if (v.length > 60) return 'Please keep your name under 60 characters.'
  if (!/^[\p{L}][\p{L} .'-]*$/u.test(v)) return 'Use letters only (spaces, apostrophes and hyphens are fine).'
  if (!v.includes(' ')) return 'Please enter your first and last name, as it appears on your ACCM account.'
  return null
}

/** Collapse whitespace so "Vicmar   Yanson" and "Vicmar Yanson" store the same. */
export function normalizeRealName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

// --- Verification -----------------------------------------------------------

export const VERIFY_STATUSES = ['unverified', 'pending', 'verified', 'rejected'] as const
export type VerifyStatus = (typeof VERIFY_STATUSES)[number]

/**
 * Whether proof-of-account upload blocks app access.
 *
 * true: a member cannot use the app until they have submitted a screenshot.
 * Note they are unblocked as soon as it is SUBMITTED (status 'pending'), not
 * when staff approves — holding 260+ members hostage to the review queue would
 * take the community offline for as long as the backlog lasts.
 *
 * A member who genuinely can't produce a screenshot is fully blocked, so staff
 * have a manual override on the admin user list (accmVerifyStatus).
 */
export const PROOF_REQUIRED = true

/**
 * Does the gate still need proof from this member? Submitted ('pending') and
 * approved ('verified') both pass; 'rejected' comes back so they can re-upload
 * with the staff reason in front of them.
 */
export function needsProof(u: {
  role?: string | null; accmMember?: boolean | null; accmVerifyStatus?: string | null
}): boolean {
  if (!PROOF_REQUIRED) return false
  if (!isGatedMember(u)) return false
  return u.accmVerifyStatus !== 'pending' && u.accmVerifyStatus !== 'verified'
}

/** Can this member's real name be shown to `viewer`? Staff and the owner only. */
export function canSeeRealName(
  viewer: { id?: string | null; role?: string | null } | null | undefined,
  profileUserId: string,
): boolean {
  if (!viewer?.id) return false
  if (viewer.id === profileUserId) return true
  return viewer.role === 'admin' || viewer.role === 'coach'
}
