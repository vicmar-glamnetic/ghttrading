'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Settings, Shield } from 'lucide-react'

export default function SettingsPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('profile')

  const tabs = [
    { id: 'profile', label: 'Profile', icon: Settings },
    { id: 'privacy', label: 'Privacy', icon: Shield },
  ]

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      <div className="flex border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
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
              <Button variant="secondary" size="sm">Change Photo</Button>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Full Name</label>
              <input
                defaultValue={session?.user?.name || ''}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
              <input
                defaultValue={session?.user?.email || ''}
                disabled
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Bio</label>
              <textarea
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
                placeholder="Tell people about yourself..."
              />
            </div>
            <Button>Save Changes</Button>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="max-w-md space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="text-sm font-medium">Who can see my posts</p>
                <p className="text-xs text-gray-500">Default post privacy</p>
              </div>
              <select className="text-sm border border-gray-300 rounded-lg px-2 py-1 outline-none">
                <option>Public</option>
                <option>Friends</option>
                <option>Only me</option>
              </select>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div>
                <p className="text-sm font-medium">Who can send friend requests</p>
                <p className="text-xs text-gray-500">Control connection requests</p>
              </div>
              <select className="text-sm border border-gray-300 rounded-lg px-2 py-1 outline-none">
                <option>Everyone</option>
                <option>Friends of friends</option>
              </select>
            </div>
            <Button>Save Privacy Settings</Button>
          </div>
        )}
      </div>
    </div>
  )
}
