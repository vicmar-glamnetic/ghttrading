'use client'
import { useState, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { updateMyProfile } from '@/lib/useMyProfile'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Settings, Shield, User, Camera, Bell } from 'lucide-react'
import { pushSupported, getPushState, enablePush, disablePush } from '@/lib/pushClient'

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession()
  const [activeTab, setActiveTab] = useState('profile')
  const [name, setName] = useState(session?.user?.name || '')
  const [username, setUsername] = useState((session?.user as { username?: string })?.username || '')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(session?.user?.image || null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Seed from the live profile — the session strips large avatars, so pull the
  // real image/name from /api/me.
  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then(d => {
      if (d?.image !== undefined) setAvatarUrl(d.image)
      if (d?.name) setName(d.name)
      if (d?.username) setUsername(d.username)
    }).catch(() => {})
  }, [])

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Shield },
  ]

  // Push notification state for this device.
  const [pushOn, setPushOn] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const [pushDenied, setPushDenied] = useState(false)
  const canPush = pushSupported()

  useEffect(() => {
    if (!canPush) return
    getPushState().then(s => { setPushOn(s.subscribed); setPushDenied(s.permission === 'denied') }).catch(() => {})
  }, [canPush])

  async function togglePush() {
    setPushBusy(true)
    try {
      if (pushOn) { await disablePush(); setPushOn(false) }
      else {
        const ok = await enablePush()
        setPushOn(ok)
        if (!ok) setPushDenied(Notification.permission === 'denied')
      }
    } finally {
      setPushBusy(false)
    }
  }

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const dataUrl = await fileToDataUrl(file)
      const res = await fetch(`/api/users/${session?.user?.id}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl }),
      })
      if (res.ok) {
        setAvatarUrl(dataUrl)
        updateMyProfile({ image: dataUrl })
        updateSession()
      }
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleSaveProfile() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/users/${session?.user?.id}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, bio }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || 'Could not save changes. Please try again.')
        return
      }
      updateMyProfile({ name })
      await updateSession()
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-surface rounded-xl border border-line overflow-hidden">
      <div className="flex items-center gap-3 p-4 border-b border-line">
        <Settings className="w-5 h-5 text-yellow-500" />
        <h1 className="text-lg font-bold text-ink">Settings</h1>
      </div>

      <div className="flex border-b border-line">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-yellow-500 text-yellow-500'
                : 'text-ink3 hover:bg-elevated hover:text-ink2'
            }`}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {activeTab === 'profile' && (
          <div className="space-y-5 max-w-md">
            {/* Avatar upload */}
            <div className="flex items-center gap-4">
              <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
                <Avatar src={avatarUrl} name={session?.user?.name} size="lg" />
                <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploading
                    ? <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                    : <Camera className="w-4 h-4 text-white" />
                  }
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
              </div>
              <div>
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? 'Uploading…' : 'Change Photo'}
                </Button>
                <p className="text-xs text-ink3 mt-1">JPG, PNG up to 8MB</p>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="text-xs font-semibold text-ink2 uppercase tracking-wider block mb-1.5">Full Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-elevated border border-line focus:border-yellow-500/50 rounded-lg px-3 py-2.5 text-sm outline-none text-ink transition-colors"
              />
            </div>

            {/* Username */}
            <div>
              <label className="text-xs font-semibold text-ink2 uppercase tracking-wider block mb-1.5">Username</label>
              <div className="flex items-center bg-elevated border border-line focus-within:border-yellow-500/50 rounded-lg px-3 transition-colors">
                <span className="text-sm text-ink3">@</span>
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  maxLength={20}
                  placeholder="username"
                  className="flex-1 bg-transparent py-2.5 pl-1 text-sm outline-none text-ink"
                />
              </div>
              <p className="text-xs text-ink3 mt-1">3–20 characters: lowercase letters, numbers, or underscores.</p>
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="text-xs font-semibold text-ink2 uppercase tracking-wider block mb-1.5">Email</label>
              <input
                defaultValue={session?.user?.email || ''}
                disabled
                className="w-full bg-elevated border border-line rounded-lg px-3 py-2.5 text-sm outline-none text-ink opacity-50 cursor-not-allowed transition-colors"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="text-xs font-semibold text-ink2 uppercase tracking-wider block mb-1.5">Bio</label>
              <textarea
                rows={3}
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Tell the community about yourself…"
                className="w-full bg-elevated border border-line focus:border-yellow-500/50 rounded-lg px-3 py-2.5 text-sm outline-none text-ink placeholder-ink3 resize-none transition-colors"
              />
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <Button variant="gold" onClick={handleSaveProfile} loading={saving} disabled={!name.trim() || username.length < 3}>
              {saved ? '✓ Saved!' : 'Save Changes'}
            </Button>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="max-w-md space-y-4">
            <div className="flex items-start justify-between gap-4 rounded-xl border border-line bg-elevated p-4">
              <div>
                <p className="text-sm font-semibold text-ink flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-yellow-500" /> New signal alerts
                </p>
                <p className="text-xs text-ink3 mt-1">
                  Get a push notification on this device the moment a coach posts a new signal — even with the app closed.
                </p>
              </div>
              <button
                onClick={togglePush}
                disabled={!canPush || pushBusy || pushDenied}
                aria-label="Toggle signal alerts"
                className={`relative shrink-0 w-12 h-7 rounded-full transition-colors ${pushOn ? 'bg-yellow-500' : 'bg-line2'} disabled:opacity-50`}
              >
                <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${pushOn ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
            {!canPush && (
              <p className="text-xs text-ink3">
                Push isn&rsquo;t available in this browser. On iPhone, add the app to your Home Screen first (Install page), then enable alerts here.
              </p>
            )}
            {pushDenied && (
              <p className="text-xs text-red-400">
                Notifications are blocked in your browser settings. Allow notifications for this site, then try again.
              </p>
            )}
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="max-w-md space-y-4">
            {[
              { label: 'Default post visibility', desc: 'Who can see your posts by default' },
              { label: 'Friend requests', desc: 'Who can send you friend requests' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-3 border-b border-line">
                <div>
                  <p className="text-sm font-medium text-ink">{item.label}</p>
                  <p className="text-xs text-ink3">{item.desc}</p>
                </div>
                <select className="bg-elevated border border-line text-sm text-ink2 rounded-lg px-2 py-1.5 outline-none focus:border-yellow-500/50">
                  <option>Public</option>
                  <option>Traders Only</option>
                  <option>Only me</option>
                </select>
              </div>
            ))}
            <Button variant="gold">Save Privacy Settings</Button>
          </div>
        )}
      </div>
    </div>
  )
}
