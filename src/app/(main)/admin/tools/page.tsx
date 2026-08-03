'use client'
import { useState, useEffect, useCallback } from 'react'
import { Wrench, Mail, UserMinus } from 'lucide-react'
import { Button } from '@/components/ui/Button'

/**
 * The one-off maintenance jobs: billing setup, the media migration, the weekly
 * recap, the win-back blast and the unverified purge. They used to sit above the
 * user table, which meant scrolling past five cards to reach the members —
 * they're a tab of their own now.
 */
export default function AdminToolsPage() {
  // PayPal plan setup
  const [ppLoading, setPpLoading] = useState(false)
  const [ppPlans, setPpPlans] = useState<{ standardPlanId: string; accmPlanId: string } | null>(null)
  const [ppError, setPpError] = useState('')

  // One-time base64 → Blob migration
  const [migBusy, setMigBusy] = useState(false)
  const [migStatus, setMigStatus] = useState('')

  // Weekly recap
  const [recapBusy, setRecapBusy] = useState(false)
  const [recapMsg, setRecapMsg] = useState('')

  // Win-back email to expired non-ACCM ($5) members
  const [winbackBusy, setWinbackBusy] = useState(false)
  const [winbackMsg, setWinbackMsg] = useState('')
  const [winbackCount, setWinbackCount] = useState<number | null>(null)

  // Purge of never-verified ACCM accounts
  const [purgeBusy, setPurgeBusy] = useState(false)
  const [purgeMsg, setPurgeMsg] = useState('')
  const [purgeCount, setPurgeCount] = useState<number | null>(null)
  const [purgeMinAge, setPurgeMinAge] = useState(15) // days; the API is the source of truth

  useEffect(() => {
    fetch('/api/admin/winback')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setWinbackCount(d.count) })
      .catch(() => {})
  }, [])

  // The purge count follows the "Not verified" tile on the users tab, so it
  // moves as members verify or new ones sign up.
  const loadPurgeCount = useCallback(() => {
    fetch('/api/admin/purge-unverified')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setPurgeCount(d.count); if (d.minAgeDays) setPurgeMinAge(d.minAgeDays) } })
      .catch(() => {})
  }, [])

  useEffect(() => { loadPurgeCount() }, [loadPurgeCount])

  async function sendWinback() {
    if (!winbackCount) return
    if (!confirm(`Send the $5 win-back email to ${winbackCount} expired non-ACCM member${winbackCount === 1 ? '' : 's'}?`)) return
    setWinbackBusy(true); setWinbackMsg('')
    try {
      const res = await fetch('/api/admin/winback', { method: 'POST' })
      const d = await res.json()
      if (!res.ok) setWinbackMsg(d.error || 'Failed to send')
      else if (d.total === 0) setWinbackMsg('No expired non-ACCM members to email right now.')
      else setWinbackMsg(`✓ Sent to ${d.sent} of ${d.total}${d.failed ? ` · ${d.failed} failed` : ''}`)
    } catch {
      setWinbackMsg('Failed to send')
    } finally { setWinbackBusy(false) }
  }

  // Irreversible and bulk, so it asks twice: the count first, then the word.
  async function purgeUnverified() {
    if (!purgeCount) return
    const label = `${purgeCount} unverified ACCM account${purgeCount === 1 ? '' : 's'}`
    if (!confirm(
      `Permanently delete ${label}?\n\n` +
      `Every one of them signed up more than ${purgeMinAge} days ago and never verified. ` +
      'Their posts, journals and messages go with them. Members waiting in the ' +
      'review queue and non-ACCM (Standard) members are NOT touched.\n\n' +
      'Everyone deleted is emailed that they can register again and verify.\n\n' +
      'This cannot be undone.',
    )) return
    if (prompt(`Type DELETE to confirm removing ${label}.`)?.trim().toUpperCase() !== 'DELETE') {
      setPurgeMsg('Cancelled — nothing was deleted.')
      return
    }
    setPurgeBusy(true); setPurgeMsg('')
    try {
      const res = await fetch('/api/admin/purge-unverified', { method: 'POST' })
      const d = await res.json()
      if (!res.ok) setPurgeMsg(d.error || 'Failed to delete')
      else if (d.deleted === 0) setPurgeMsg('No unverified ACCM accounts to delete right now.')
      else setPurgeMsg(`✓ Deleted ${d.deleted} account${d.deleted === 1 ? '' : 's'} · emailed ${d.sent}${d.failed ? ` · ${d.failed} email(s) failed` : ''}`)
    } catch {
      setPurgeMsg('Failed to delete')
    } finally {
      setPurgeBusy(false)
      loadPurgeCount()
    }
  }

  async function postRecap() {
    setRecapBusy(true); setRecapMsg('')
    try {
      const res = await fetch('/api/cron/weekly-recap', { method: 'POST' })
      const d = await res.json()
      if (!res.ok) setRecapMsg(d.error || 'Failed')
      else if (d.skipped) setRecapMsg(`Skipped — ${d.skipped}`)
      else setRecapMsg(`✓ Posted: ${d.wins}W/${d.losses}L · ${d.net >= 0 ? '+' : ''}${d.net} gold pips`)
    } finally { setRecapBusy(false) }
  }

  async function migrateBlob() {
    setMigBusy(true); setMigStatus('Starting…')
    try {
      let total = 0
      for (let i = 0; i < 500; i++) { // safety cap; each call migrates a small batch
        const res = await fetch('/api/admin/migrate-blob', { method: 'POST' })
        const d = await res.json()
        if (!res.ok) { setMigStatus(`Error: ${d.error || 'failed'} (is the Blob store connected?)`); break }
        total += d.migrated
        setMigStatus(`Migrated ${total} so far · ${d.remaining} remaining…`)
        if (d.done || d.remaining === 0) { setMigStatus(`✓ Done — migrated ${total} item(s). All images now on Blob.`); break }
      }
    } finally {
      setMigBusy(false)
    }
  }

  async function setupPaypal() {
    setPpLoading(true); setPpError(''); setPpPlans(null)
    try {
      const res = await fetch('/api/admin/paypal/setup', { method: 'POST' })
      const data = await res.json()
      if (res.ok) setPpPlans({ standardPlanId: data.standardPlanId, accmPlanId: data.accmPlanId })
      else setPpError(data.error || 'Setup failed')
    } catch {
      setPpError('Setup failed')
    } finally {
      setPpLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Wrench className="w-5 h-5 text-yellow-500" />
        <h1 className="font-bold text-ink text-lg">Admin · Tools</h1>
      </div>
      <p className="text-xs text-ink3">
        One-off jobs. Each runs the moment you press its button — read the description first.
      </p>

      {/* PayPal plan setup */}
      <div className="rounded-xl border border-line bg-surface p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">PayPal billing</p>
            <p className="text-xs text-ink3">Create both subscription plans — $1.99 (ACCM) &amp; $5 (standard). Needs PAYPAL_CLIENT_ID &amp; SECRET set first.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={setupPaypal} loading={ppLoading} className="text-xs shrink-0">
            Set up plans
          </Button>
        </div>
        {ppError && <p className="text-xs text-red-400 mt-2">{ppError}</p>}
        {ppPlans && (
          <div className="mt-3 space-y-2">
            {[
              { env: 'NEXT_PUBLIC_PAYPAL_PLAN_ID_ACCM', label: '$1.99 ACCM', id: ppPlans.accmPlanId },
              { env: 'NEXT_PUBLIC_PAYPAL_PLAN_ID', label: '$5 standard', id: ppPlans.standardPlanId },
            ].map(({ env, label, id }) => (
              <div key={env} className="rounded-lg bg-sunken border border-line p-3">
                <p className="text-[10px] font-bold text-ink3 uppercase tracking-wider mb-1">{label} — set as {env}</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-yellow-500 font-mono break-all flex-1">{id}</code>
                  <button onClick={() => navigator.clipboard.writeText(id)} className="text-xs text-ink3 hover:text-yellow-500 shrink-0">Copy</button>
                </div>
              </div>
            ))}
            <p className="text-[10px] text-ink3">Add both to your env (locally + Vercel), then redeploy. Run this once only.</p>
          </div>
        )}
      </div>

      {/* Media migration → Blob */}
      <div className="rounded-xl border border-line bg-surface p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">Migrate media to Blob</p>
            <p className="text-xs text-ink3">Move existing base64 images out of the database into Vercel Blob to cut data transfer. Connect a Blob store first. Safe to run repeatedly.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={migrateBlob} loading={migBusy} className="text-xs shrink-0">
            Run migration
          </Button>
        </div>
        {migStatus && <p className="text-xs text-ink2 mt-2">{migStatus}</p>}
      </div>

      {/* Weekly recap */}
      <div className="rounded-xl border border-line bg-surface p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">Weekly performance recap</p>
            <p className="text-xs text-ink3">Post this week&apos;s signal results (W/L, win rate, net pips) to the feed. Also runs automatically every Monday.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={postRecap} loading={recapBusy} className="text-xs shrink-0">
            Post recap now
          </Button>
        </div>
        {recapMsg && <p className="text-xs text-ink2 mt-2">{recapMsg}</p>}
      </div>

      {/* Win-back expired non-ACCM members */}
      <div className="rounded-xl border border-line bg-surface p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-yellow-500" /> Win-back email · $5 offer
            </p>
            <p className="text-xs text-ink3">
              Email expired non-ACCM (Standard) members whose access has lapsed, inviting them back for $5/mo with the full perks list.
              {winbackCount !== null && (
                <> <span className="font-semibold text-ink2">{winbackCount}</span> eligible right now.</>
              )}
            </p>
          </div>
          <Button
            variant="secondary" size="sm" onClick={sendWinback} loading={winbackBusy}
            disabled={winbackCount === 0}
            className="text-xs shrink-0"
          >
            {winbackCount === 0 ? 'No one to email' : 'Send win-back email'}
          </Button>
        </div>
        {winbackMsg && <p className="text-xs text-ink2 mt-2">{winbackMsg}</p>}
      </div>

      {/* Purge never-verified ACCM sign-ups */}
      <div className="rounded-xl border border-red-500/25 bg-surface p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink flex items-center gap-1.5">
              <UserMinus className="w-4 h-4 text-red-400" /> Delete unverified accounts
            </p>
            <p className="text-xs text-ink3">
              Permanently removes ACCM members who signed up over {purgeMinAge} days ago and never
              submitted proof, and emails each one that they can register again and verify. Newer
              sign-ups, members in review, rejected members and non-ACCM (Standard) members are left
              alone.
              {purgeCount !== null && (
                <> <span className="font-semibold text-ink2">{purgeCount}</span> would be deleted.</>
              )}
            </p>
          </div>
          <Button
            variant="secondary" size="sm" onClick={purgeUnverified} loading={purgeBusy}
            disabled={purgeCount === 0}
            className="text-xs shrink-0 text-red-400 border-red-400/30 hover:bg-red-500/10"
          >
            {purgeCount === 0 ? 'Nothing to delete' : 'Delete unverified accounts'}
          </Button>
        </div>
        {purgeMsg && <p className="text-xs text-ink2 mt-2">{purgeMsg}</p>}
      </div>
    </div>
  )
}
