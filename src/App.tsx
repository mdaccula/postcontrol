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
import PublicEvent from "./pages/PublicEvent";
import { AcceptInvite } from "./pages/AcceptInvite";
import { GuestDashboard } from "./pages/GuestDashboard";
import Install from "./pages/Install";
import PushDiagnostic from "./pages/PushDiagnostic";
import NotFound from "./pages/NotFound";
import GuestListRegister from "./pages/GuestListRegister";
import GuestListConfirmation from "./pages/GuestListConfirmation";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { PWAUpdatePrompt } from "@/components/PWAUpdatePrompt";

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
          <PWAInstallPrompt />
          <PWAUpdatePrompt />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/agency/:token" element={<AgencySignup />} />
            <Route path="/agencia/:slug" element={<AgencySignupBySlug />} />
            <Route path="/agencia/:agencySlug/evento/:eventSlug" element={<PublicEvent />} />
            <Route path="/accept-invite" element={<AcceptInvite />} />
            <Route path="/install" element={<Install />} />
            <Route path="/push-diagnostic" element={<PushDiagnostic />} />
            
            {/* Guest List Public Routes */}
            <Route path="/lista/:slug" element={<GuestListRegister />} />
            <Route path="/lista/:slug/confirmacao/:id" element={<GuestListConfirmation />} />
            
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

            <Route path="/guest-dashboard" element={
              <RequireAuth>
                <GuestDashboard />
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
