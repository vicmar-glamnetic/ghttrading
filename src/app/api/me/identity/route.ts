import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { consumeCode } from '@/lib/securityCode'
import {
  buildDisplayName, hasCompleteIdentity, isGatedMember, namePartOf, needsProof,
  normalizeAccmNumber, normalizeRealName,
  validateAccmNumber, validateNamePart, validateRealName,
} from '@/lib/identity'

const SELECT = {
  id: true, name: true, realName: true, accmNumber: true, accmMember: true, role: true,
  accmVerifyStatus: true, accmProofUrl: true, accmRejectReason: true,
} as const

/** Current identity + what the gate still needs from this member. */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await db.user.findUnique({ where: { id: session.user.id }, select: SELECT })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    ...user,
    namePart: namePartOf(user.name),
    gated: isGatedMember(user),
    complete: hasCompleteIdentity(user),
    needsProof: needsProof(user),
  })
}

/**
 * Set the member's public display name ("<Name> - <accmNumber>"), private real
 * name, and ACCM number. Members only — staff and other-broker members never see
 * this gate, so they have no reason to hit this route.
 *
 * Changing details that are already established requires an e-mailed code (see
 * needsCode below): a stolen session alone must not be able to repoint a trusted
 * community identity, and the ACCM number is what member rebates are keyed on.
 */
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const current = await db.user.findUnique({ where: { id: session.user.id }, select: SELECT })
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!isGatedMember(current)) {
    return NextResponse.json({ error: 'This only applies to ACCM members.' }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))

  // --- ACCM number ---------------------------------------------------------
  let accmNumber = current.accmNumber
  const accmProvided = typeof body.accmNumber === 'string' && body.accmNumber.trim() !== ''
  if (accmProvided) {
    const err = validateAccmNumber(body.accmNumber)
    if (err) return NextResponse.json({ error: err, field: 'accmNumber' }, { status: 400 })
    accmNumber = normalizeAccmNumber(body.accmNumber)
  }
  if (!accmNumber) {
    return NextResponse.json({ error: 'Please enter your ACCM account number.', field: 'accmNumber' }, { status: 400 })
  }

  // --- Display name --------------------------------------------------------
  // Accept either the name half on its own or a full display name; we always
  // rebuild the stored value so the suffix can't be faked.
  const rawNamePart = typeof body.namePart === 'string' && body.namePart.trim() !== ''
    ? body.namePart
    : namePartOf(typeof body.name === 'string' ? body.name : '')
  const nameErr = validateNamePart(rawNamePart)
  if (nameErr) return NextResponse.json({ error: nameErr, field: 'namePart' }, { status: 400 })
  const name = buildDisplayName(rawNamePart, accmNumber)

  // --- Real name -----------------------------------------------------------
  const realErr = validateRealName(typeof body.realName === 'string' ? body.realName : '')
  if (realErr) return NextResponse.json({ error: realErr, field: 'realName' }, { status: 400 })
  const realName = normalizeRealName(body.realName)

  // --- Step-up verification ------------------------------------------------
  const accmChanged = accmNumber !== current.accmNumber
  const identityChanged = name !== current.name || realName !== current.realName
  // First-time setup needs no code (the e-mail was already verified at sign-up
  // and there is nothing on file yet to protect). Changing details that already
  // exist does.
  const needsCode =
    (current.accmNumber != null && accmChanged) ||
    (hasCompleteIdentity(current) && identityChanged)

  if (needsCode) {
    const code = typeof body.code === 'string' ? body.code : ''
    if (!code) {
      return NextResponse.json(
        { error: 'For your security, confirm this change with the code we e-mailed you.', codeRequired: true },
        { status: 428 },
      )
    }
    const check = await consumeCode(session.user.id, 'identity', code)
    if (!check.ok) return NextResponse.json({ error: check.error, field: 'code', codeRequired: true }, { status: 400 })
  }

  // A different ACCM number is a different account — any prior approval and the
  // proof behind it no longer apply, so verification restarts from scratch.
  const resetVerification = accmChanged && current.accmVerifyStatus !== 'unverified'

  try {
    const user = await db.user.update({
      where: { id: session.user.id },
      data: {
        name, realName, accmNumber,
        ...(resetVerification
          ? { accmVerifyStatus: 'unverified', accmProofUrl: null, accmProofAt: null, accmVerifiedAt: null, accmVerifiedById: null, accmRejectReason: null }
          : {}),
      },
      select: SELECT,
    })
    return NextResponse.json({ ...user, namePart: namePartOf(user.name), complete: hasCompleteIdentity(user) })
  } catch (err) {
    if ((err as { code?: string })?.code === 'P2002') {
      return NextResponse.json(
        { error: 'That ACCM number is already registered to another account.', field: 'accmNumber' },
        { status: 409 },
      )
    }
    throw err
  }
}
