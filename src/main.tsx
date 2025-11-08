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
      retry: 1,
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
