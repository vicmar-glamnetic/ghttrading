'use client'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Settings, Shield, User } from 'lucide-react'

export default function SettingsPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('profile')

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'privacy', label: 'Privacy', icon: Shield },
  ]

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
              activeTab === tab.id ? 'border-b-2 border-yellow-500 text-yellow-500' : 'text-[#5a5a72] hover:bg-[#1e1e2c] hover:text-[#9090a8]'
            }`}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>
      <div className="p-6">
        {activeTab === 'profile' && (
          <div className="space-y-4 max-w-md">
            <div className="flex items-center gap-4">
              <Avatar src={session?.user?.image} name={session?.user?.name} size="lg" />
              <div>
                <Button variant="outline" size="sm">Change Photo</Button>
                <p className="text-xs text-[#5a5a72] mt-1">JPG, PNG up to 8MB</p>
              </div>
            </div>
            {[
              { label: 'Full Name', value: session?.user?.name || '', disabled: false },
              { label: 'Email', value: session?.user?.email || '', disabled: true },
            ].map(f => (
              <div key={f.label}>
                <label className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider block mb-1.5">{f.label}</label>
                <input defaultValue={f.value} disabled={f.disabled}
                  className="w-full bg-[#1e1e2c] border border-[#2a2a3a] focus:border-yellow-500/50 rounded-lg px-3 py-2.5 text-sm outline-none text-[#f0f0f8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                />
              </div>
            ))}
            <div>
              <label className="text-xs font-semibold text-[#9090a8] uppercase tracking-wider block mb-1.5">Bio</label>
              <textarea rows={3} placeholder="Tell the community about yourself..."
                className="w-full bg-[#1e1e2c] border border-[#2a2a3a] focus:border-yellow-500/50 rounded-lg px-3 py-2.5 text-sm outline-none text-[#f0f0f8] placeholder-[#5a5a72] resize-none transition-colors"
              />
            </div>
            <Button variant="gold">Save Changes</Button>
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
