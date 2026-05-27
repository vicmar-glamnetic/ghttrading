'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Settings, CreditCard, Shield } from 'lucide-react'

export default function SettingsPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('profile')
  const [stripeLoading, setStripeLoading] = useState(false)

  async function handleSubscribe() {
    setStripeLoading(true)
    const res = await fetch('/api/stripe/create-subscription', { method: 'POST' })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    setStripeLoading(false)
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: Settings },
    { id: 'subscription', label: 'Subscription', icon: CreditCard },
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

        {activeTab === 'subscription' && (
          <div className="max-w-md space-y-6">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Current Plan</h3>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  Free
                </span>
              </div>
              <p className="text-sm text-gray-600">Enjoy the community for free</p>
            </div>

            <div className="border-2 border-blue-500 rounded-xl p-4 bg-blue-50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-blue-800">Premium</h3>
                <span className="text-xl font-bold text-blue-600">$2<span className="text-sm font-normal">/month</span></span>
              </div>
              <ul className="space-y-1 text-sm text-blue-700 mb-4">
                <li>✓ Unlimited posts</li>
                <li>✓ Priority support</li>
                <li>✓ Premium badge</li>
                <li>✓ Advanced analytics</li>
                <li>✓ No ads</li>
              </ul>
              <Button onClick={handleSubscribe} loading={stripeLoading} className="w-full">
                Upgrade to Premium
              </Button>
            </div>
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
