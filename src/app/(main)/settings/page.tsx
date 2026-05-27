'use client'
import { useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Settings, Shield, User, Camera } from 'lucide-react'

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
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(session?.user?.image || null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'privacy', label: 'Privacy', icon: Shield },
  ]

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
        updateSession()
      }
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleSaveProfile() {
    setSaving(true)
    try {
      await fetch(`/api/users/${session?.user?.id}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, bio }),
      })
      await updateSession()
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-[#16161f] rounded-xl border border-[#2a2a3a] overflow-hidden">
      <div className="flex items-center gap-3 p-4 border-b border-[#2a2a3a]">
        <Settings className="w-5 h-5 text-yellow-500" />
        <h1 className="text-lg font-bold text-[#f0f0f8]">Settings</h1>
      </div>

      <div className="flex border-b border-[#2a2a3a]">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-yellow-500 text-yellow-500'
                : 'text-[#5a5a72] hover:bg-[#1e1e2c] hover:text-[#9090a8]'
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
                <p className="text-xs text-[#5a5a72] mt-1">JPG, PNG up to 8MB</p>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider block mb-1.5">Full Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-[#1e1e2c] border border-[#2a2a3a] focus:border-yellow-500/50 rounded-lg px-3 py-2.5 text-sm outline-none text-[#f0f0f8] transition-colors"
              />
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider block mb-1.5">Email</label>
              <input
                defaultValue={session?.user?.email || ''}
                disabled
                className="w-full bg-[#1e1e2c] border border-[#2a2a3a] rounded-lg px-3 py-2.5 text-sm outline-none text-[#f0f0f8] opacity-50 cursor-not-allowed transition-colors"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider block mb-1.5">Bio</label>
              <textarea
                rows={3}
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Tell the community about yourself…"
                className="w-full bg-[#1e1e2c] border border-[#2a2a3a] focus:border-yellow-500/50 rounded-lg px-3 py-2.5 text-sm outline-none text-[#f0f0f8] placeholder-[#5a5a72] resize-none transition-colors"
              />
            </div>

            <Button variant="gold" onClick={handleSaveProfile} loading={saving} disabled={!name.trim()}>
              {saved ? '✓ Saved!' : 'Save Changes'}
            </Button>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="max-w-md space-y-4">
            {[
              { label: 'Default post visibility', desc: 'Who can see your posts by default' },
              { label: 'Friend requests', desc: 'Who can send you friend requests' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-3 border-b border-[#2a2a3a]">
                <div>
                  <p className="text-sm font-medium text-[#f0f0f8]">{item.label}</p>
                  <p className="text-xs text-[#5a5a72]">{item.desc}</p>
                </div>
                <select className="bg-[#1e1e2c] border border-[#2a2a3a] text-sm text-[#9090a8] rounded-lg px-2 py-1.5 outline-none focus:border-yellow-500/50">
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
