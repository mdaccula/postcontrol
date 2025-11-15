import { useState, useEffect } from 'react';

export const usePWAUpdate = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);

        // Verificar se já tem update esperando
        if (reg.waiting) {
          setUpdateAvailable(true);
        }

        // Detectar quando novo service worker está esperando
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Novo service worker instalado e há um antigo ativo
                setUpdateAvailable(true);
              }
            });
          }
        });
      });

      // Detectar quando novo service worker assume o controle
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  }, []);

  const applyUpdate = () => {
    if (registration?.waiting) {
      // Enviar mensagem para o service worker fazer skip waiting
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  return {
    updateAvailable,
    applyUpdate
  };
};
