import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { useAuthStore } from "@/stores/authStore";
import { useGTM } from "@/hooks/useGTM";

// Criar instância única do QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
      gcTime: 1000 * 60 * 10, // 10 minutos - mantém cache por mais tempo
      retry: 1,
      refetchOnWindowFocus: false, // ✅ FASE B: Evita refetch ao trocar de aba
      refetchOnReconnect: false, // ✅ FASE B: Evita refetch ao reconectar rede
      refetchOnMount: false, // ✅ FASE B: Não refetch ao montar se dados em cache
    },
  },
});

// Injetar queryClient no authStore para permitir limpeza no logout
useAuthStore.getState().setQueryClient(queryClient);

// Componente wrapper para usar hooks
const AppWrapper = () => {
  useGTM(); // Carregar GTM automaticamente
  return <App />;
};

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AppWrapper />
    </QueryClientProvider>
  </HelmetProvider>
);

// Fallback manual para registro do SW
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(registration => console.log('✅ SW registrado manualmente:', registration.scope))
      .catch(error => console.error('❌ Falha no registro manual do SW:', error));
  });
}
