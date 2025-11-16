/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

declare const self: ServiceWorkerGlobalScope;

// ========================================
// WORKBOX PRECACHING
// ========================================

// Este ponto de injeção será substituído pelo Workbox durante o build
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

self.skipWaiting();
clientsClaim();

// ========================================
// SKIP WAITING PARA FORÇAR ATUALIZAÇÃO
// ========================================

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Forçando atualização imediata');
    self.skipWaiting();
  }
});

// ========================================
// PUSH NOTIFICATIONS
// ========================================

self.addEventListener('push', (event) => {
  console.log('========================================');
  console.log('[SW] 📥 PUSH RECEBIDO:', new Date().toISOString());
  console.log('[SW] Event data exists:', !!event.data);
  
  try {
    let notificationData: any = {
      title: 'Nova Notificação',
      body: 'Você tem uma nova atualização',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: {},
    };

    if (event.data) {
      try {
        const rawData = event.data.text();
        console.log('[SW] 📄 Raw data:', rawData);
        
        notificationData = JSON.parse(rawData);
        console.log('[SW] ✅ Dados parseados com sucesso:', notificationData);
      } catch (error) {
        console.error('[SW] ❌ Erro ao parsear dados da notificação:', error);
        console.log('[SW] Usando dados padrão');
      }
    } else {
      console.log('[SW] ⚠️ Nenhum dado recebido, usando notificação padrão');
    }

    console.log('[SW] 🔔 Preparando para exibir notificação:', {
      title: notificationData.title,
      body: notificationData.body,
      tag: notificationData.data?.type || 'general'
    });

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
      } as any
    ).then(() => {
      console.log('[SW] ✅ Notificação exibida com sucesso');
      console.log('========================================');
    }).catch((error) => {
      console.error('[SW] ❌ Erro ao exibir notificação:', error);
      console.log('========================================');
    });

    event.waitUntil(promiseChain);
  } catch (error) {
    console.error('[SW] ❌ ERRO CRÍTICO no push listener:', error);
    console.error('[SW] Stack trace:', error instanceof Error ? error.stack : 'N/A');
    console.log('========================================');
  }
});

self.addEventListener('notificationclick', (event) => {
  console.log('========================================');
  console.log('[SW] 👆 NOTIFICAÇÃO CLICADA:', new Date().toISOString());
  console.log('[SW] Notification data:', event.notification.data);
  console.log('[SW] Notification tag:', event.notification.tag);

  try {
    event.notification.close();
    console.log('[SW] ✅ Notificação fechada');

    const urlToOpen = event.notification.data?.url || '/dashboard';
    console.log('[SW] 🔗 URL para abrir:', urlToOpen);

    const promiseChain = self.clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then((windowClients) => {
        console.log('[SW] 🪟 Janelas abertas:', windowClients.length);
        
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          console.log(`[SW] Verificando janela ${i + 1}:`, client.url);
          
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            console.log('[SW] ✅ Janela encontrada, focando...');
            return client.focus();
          }
        }

        console.log('[SW] 🆕 Abrindo nova janela...');
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
      .then(() => {
        console.log('[SW] ✅ Navegação concluída com sucesso');
        console.log('========================================');
      })
      .catch(error => {
        console.error('[SW] ❌ Erro ao abrir/focar janela:', error);
        console.log('========================================');
      });

    event.waitUntil(promiseChain);
  } catch (error) {
    console.error('[SW] ❌ ERRO CRÍTICO no click listener:', error);
    console.error('[SW] Stack trace:', error instanceof Error ? error.stack : 'N/A');
    console.log('========================================');
  }
});

self.addEventListener('notificationclose', (event) => {
  try {
    console.log('========================================');
    console.log('[SW] ❌ NOTIFICAÇÃO FECHADA:', new Date().toISOString());
    console.log('[SW] Notification tag:', event.notification.tag);
    console.log('[SW] Notification data:', event.notification.data);
    console.log('========================================');
  } catch (error) {
    console.error('[SW] ❌ Erro ao processar fechamento:', error);
  }
});
