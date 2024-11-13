/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { getMessaging } from 'firebase/messaging/sw';
import { initializeApp } from 'firebase/app';

declare const self: ServiceWorkerGlobalScope;

// Inizializza Firebase
const firebaseApp = initializeApp({
  apiKey: "AIzaSyD38C-wyEziutHYrQG4rFatW-9Z5In37Ss",
  authDomain: "criptax-8d87d.firebaseapp.com",
  projectId: "criptax-8d87d",
  storageBucket: "criptax-8d87d.appspot.com",
  messagingSenderId: "693837443791",
  appId: "1:693837443791:web:c3d93b462cc82458e6bdba",
  measurementId: "G-YNX6MZDC7K"
});

const messaging = getMessaging(firebaseApp);

clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);

// Gestione notifiche push in background
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.notification.body,
      icon: data.notification.icon || '/logo.svg',
      badge: '/logo.svg',
      tag: data.data?.chatId || 'default',
      data: data.data,
      actions: [
        {
          action: 'open',
          title: 'Apri'
        },
        {
          action: 'close',
          title: 'Chiudi'
        }
      ],
      vibrate: [200, 100, 200],
      renotify: true
    };

    event.waitUntil(
      self.registration.showNotification(data.notification.title, options)
    );
  } catch (error) {
    console.error('Errore nella gestione della notifica push:', error);
  }
});

// Gestione click sulle notifiche
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const urlToOpen = event.notification.data?.url || 
    (event.notification.data?.chatId ? `/chat/${event.notification.data.chatId}` : '/');

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        return clients.openWindow(urlToOpen);
      })
  );
});

// Gestione pagina singola
const fileExtensionRegexp = new RegExp('/[^/?]+\\.[^/]+$');
registerRoute(
  ({ request, url }: { request: Request; url: URL }) => {
    if (request.mode !== 'navigate') return false;
    if (url.pathname.startsWith('/_')) return false;
    if (url.pathname.match(fileExtensionRegexp)) return false;
    return true;
  },
  createHandlerBoundToURL(process.env.PUBLIC_URL + '/index.html')
);

// Cache per immagini
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 giorni
      }),
    ],
  })
);

// Cache per API
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new StaleWhileRevalidate({
    cacheName: 'api-cache',
  })
);

// Gestione aggiornamenti service worker
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Gestione errori
self.addEventListener('error', (event) => {
  console.error('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker unhandled promise rejection:', event.reason);
}); 