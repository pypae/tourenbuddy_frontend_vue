/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Push notification handler
self.addEventListener('push', (event) => {
  interface PushData {
    title?: string
    body?: string
    url?: string
  }

  let data: PushData = {}
  try {
    data = (event.data?.json() as PushData) ?? {}
  }
  catch {
    // malformed payload — use generic fallback
  }

  const title = data.title ?? 'TourenBuddy'
  const body = data.body ?? 'You have a new notification.'
  const url = data.url ?? '/'

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url },
    }),
  )
})

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl: string = (event.notification.data as { url?: string })?.url ?? '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find(c => new URL(c.url).origin === self.location.origin)
      if (existing) {
        existing.focus()
        existing.navigate(targetUrl)
        return
      }
      self.clients.openWindow(targetUrl)
    }),
  )
})
