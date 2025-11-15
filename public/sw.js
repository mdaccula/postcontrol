// Service Worker para PWA e Push Notifications
// Este arquivo é gerado pelo vite-plugin-pwa e estendido manualmente

self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker instalado');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker ativado');
  
  const cacheWhitelist = ['supabase-images-cache']; // Manter cache de imagens
  
  event.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!cacheWhitelist.includes(cacheName) && cacheName.includes('supabase')) {
              console.log('[SW] Limpando cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

// ========================================
// PUSH NOTIFICATIONS
// ========================================

self.addEventListener('push', (event) => {
  console.log('[SW] Push notification recebida', event);

  try {
    let notificationData = {
      title: 'Nova Notificação',
      body: 'Você tem uma nova atualização',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: {},
    };

    if (event.data) {
      try {
        notificationData = event.data.json();
      } catch (error) {
        console.error('[SW] Erro ao parsear dados da notificação:', error);
      }
    }

    const promiseChain = self.registration.showNotification(
      notificationData.title,
      {
        body: notificationData.body,
        icon: notificationData.icon || '/pwa-192x192.png',
        badge: notificationData.badge || '/pwa-192x192.png',
        data: notificationData.data,
        tag: notificationData.data?.type || 'general',
        requireInteraction: false,
        vibrate: [200, 100, 200],
      }
    );

    event.waitUntil(promiseChain);
  } catch (error) {
    console.error('[SW] Erro crítico no push listener:', error);
  }
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notificação clicada', event);

  try {
    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/dashboard';

    const promiseChain = clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then((windowClients) => {
        // Verificar se já existe uma janela aberta
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }

        // Se não encontrou, abrir nova janela
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
      .catch(error => {
        console.error('[SW] Erro ao abrir janela:', error);
      });

    event.waitUntil(promiseChain);
  } catch (error) {
    console.error('[SW] Erro crítico no click listener:', error);
  }
});

self.addEventListener('notificationclose', (event) => {
  try {
    console.log('[SW] Notificação fechada', event);
  } catch (error) {
    console.error('[SW] Erro ao fechar notificação:', error);
  }
});
