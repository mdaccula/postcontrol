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

// 🔍 FASE 5: PUSH EVENT COM LOGS DETALHADOS
self.addEventListener('push', (event) => {
  const startTime = performance.now();
  
  console.group('🔔 [SW PUSH] Push Recebido');
  console.log('🔔 Push recebido em', new Date().toISOString(), 'dados:', event.data?.text());
  console.log('⏰ Timestamp:', new Date().toISOString());
  console.log('📦 Event data exists:', !!event.data);
  console.log('🔢 Payload size:', event.data ? event.data.text().length : 0, 'bytes');
  
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
        console.log('📄 Raw payload:', rawData.substring(0, 100) + '...');
        
        notificationData = JSON.parse(rawData);
        console.log('✅ Parsed notification data:', {
          title: notificationData.title,
          body: notificationData.body?.substring(0, 50),
          type: notificationData.data?.type,
          hasIcon: !!notificationData.icon
        });
      } catch (error) {
        console.error('❌ Parse error crítico:', error);
        console.groupEnd();
        return; // ❌ Não exibir notificação com dados corrompidos
      }
    } else {
      console.log('⚠️ Nenhum payload recebido, usando notificação padrão');
    }

    const notificationOptions = {
      body: notificationData.body,
      icon: notificationData.icon || '/pwa-192x192.png',
      badge: notificationData.badge || '/pwa-192x192.png',
      data: notificationData.data,
      tag: notificationData.data?.type || 'general',
      requireInteraction: false,
      vibrate: [200, 100, 200],
    };

    console.log('🔔 Notification options preparadas:', {
      tag: notificationOptions.tag,
      requireInteraction: notificationOptions.requireInteraction,
      dataKeys: Object.keys(notificationOptions.data || {})
    });

    const promiseChain = self.registration.showNotification(
      notificationData.title,
      notificationOptions as any
    ).then(() => {
      const duration = performance.now() - startTime;
      console.log('✅ Notificação exibida com sucesso');
      console.log(`⏱️ Tempo de processamento: ${duration.toFixed(2)}ms`);
      console.groupEnd();
    }).catch((error) => {
      const duration = performance.now() - startTime;
      console.error('❌ Erro ao exibir notificação:', error);
      console.error('Stack:', error instanceof Error ? error.stack : 'N/A');
      console.log(`⏱️ Tempo até erro: ${duration.toFixed(2)}ms`);
      console.groupEnd();
    });

    event.waitUntil(promiseChain);
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error('❌ ERRO CRÍTICO no push listener:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A');
    console.log(`⏱️ Tempo até erro crítico: ${duration.toFixed(2)}ms`);
    console.groupEnd();
  }
});

// 🔍 FASE 5: NOTIFICATION CLICK COM LOGS DETALHADOS
self.addEventListener('notificationclick', (event) => {
  console.group('👆 [SW CLICK] Notificação Clicada');
  console.log('⏰ Timestamp:', new Date().toISOString());
  console.log('🏷️ Tag:', event.notification.tag);
  console.log('📋 Title:', event.notification.title);
  console.log('📦 Data:', event.notification.data);

  try {
    event.notification.close();
    console.log('✅ Notificação fechada');

    const urlToOpen = event.notification.data?.url || '/dashboard';
    const fullUrl = new URL(urlToOpen, self.location.origin).href;
    console.log('🔗 URL de destino:', fullUrl);

    const promiseChain = self.clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then((windowClients) => {
        console.log('🪟 Total de janelas abertas:', windowClients.length);
        
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
