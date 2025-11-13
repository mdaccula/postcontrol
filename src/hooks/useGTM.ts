import { useEffect, useState } from 'react';
import { sb } from '@/lib/supabaseSafe';

/**
 * Hook para carregar e injetar Google Tag Manager dinamicamente
 * Busca o GTM ID das configurações de admin e injeta o script no head
 */
export const useGTM = () => {
  const [gtmLoaded, setGtmLoaded] = useState(false);

  useEffect(() => {
    const loadGTM = async () => {
      try {
        let gtmId: string | null = null;

        // 🆕 CORREÇÃO #3: Priorizar variável de ambiente pública primeiro
        console.log('🔍 [GTM] Buscando GTM ID...');
        
        // 1. Tentar variável de ambiente primeiro (público, funciona para todos)
        gtmId = import.meta.env.VITE_GTM_ID?.trim() || null;
        
        if (gtmId) {
          console.log('✅ [GTM] GTM ID encontrado em variável de ambiente');
        } else {
          // 2. Fallback: tentar buscar do banco (apenas para admins autenticados)
          try {
            const { data: settings } = await sb
              .from('admin_settings')
              .select('setting_value')
              .eq('setting_key', 'gtm_id')
              .maybeSingle();
            
            gtmId = settings?.setting_value?.trim() || null;
            if (gtmId) {
              console.log('✅ [GTM] GTM ID encontrado no banco de dados');
            }
          } catch (error) {
            console.log('ℹ️ [GTM] Não foi possível buscar GTM do banco (usuário não autenticado ou RLS)');
          }
        }

        if (!gtmId || gtmId === '') {
          console.log('⚠️ [GTM] GTM ID não configurado em nenhuma fonte');
          return;
        }

        // Verificar se já foi injetado
        if (document.querySelector(`script[data-gtm-id="${gtmId}"]`)) {
          console.log('✅ GTM já carregado:', gtmId);
          setGtmLoaded(true);
          return;
        }

        console.log('📊 Injetando Google Tag Manager:', gtmId);

        // Injetar script do GTM no head
        const script = document.createElement('script');
        script.setAttribute('data-gtm-id', gtmId);
        script.innerHTML = `
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${gtmId}');
        `;
        document.head.appendChild(script);

        // Injetar noscript no body
        const noscript = document.createElement('noscript');
        noscript.innerHTML = `
          <iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}"
          height="0" width="0" style="display:none;visibility:hidden"></iframe>
        `;
        document.body.insertBefore(noscript, document.body.firstChild);

        setGtmLoaded(true);
        console.log('✅ GTM injetado com sucesso');
      } catch (error) {
        console.error('❌ Erro ao carregar GTM:', error);
      }
    };

    loadGTM();
  }, []);

  return { gtmLoaded };
};
