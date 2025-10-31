import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { RequireAuth } from "@/components/RequireAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Home from "./pages/Home";
import Submit from "./pages/Submit";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import Dashboard from "./pages/Dashboard";
import MasterAdmin from "./pages/MasterAdmin";
import AgencySignup from "./pages/AgencySignup";
import AgencySignupBySlug from "./pages/AgencySignupBySlug";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  useAuth(); // Inicializa o listener de autenticação
  
  return (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="app-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/agency/:token" element={<AgencySignup />} />
            <Route path="/agencia/:slug" element={<AgencySignupBySlug />} />
            
            {/* Protected Routes - Require Authentication */}
            <Route path="/submit" element={
              <RequireAuth>
                <Submit />
              </RequireAuth>
            } />
            
            <Route path="/dashboard" element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            } />
            
            {/* Agency Admin Routes */}
            <Route path="/admin" element={
              <RequireAuth>
                <ProtectedRoute requireAgencyAdmin>
                  <Admin />
                </ProtectedRoute>
              </RequireAuth>
            } />
            
            {/* Master Admin Routes */}
            <Route path="/master-admin" element={
              <RequireAuth>
                <ProtectedRoute requireMasterAdmin>
                  <MasterAdmin />
                </ProtectedRoute>
              </RequireAuth>
            } />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
  );
};

export default App;
