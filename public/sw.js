/* GHT Trading service worker — handles Web Push for signal alerts. */

self.addEventListener('push', event => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = {} }

  const title = data.title || 'GHT Trading'
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon.png',
    badge: '/favicon-32.png',
    tag: data.tag || 'ght-signal',
    data: { url: data.url || '/ideas' },
    vibrate: [80, 40, 80],
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/ideas'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if ('focus' in client) { client.navigate(url); return client.focus() }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    }),
  )
})
