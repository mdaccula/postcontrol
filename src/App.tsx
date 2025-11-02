import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { RequireAuth } from "@/components/RequireAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { lazy, Suspense } from "react";

// Lazy load pages for better performance and reduced Total Blocking Time
const Home = lazy(() => import("./pages/Home"));
const Submit = lazy(() => import("./pages/Submit"));
const Auth = lazy(() => import("./pages/Auth"));
const Admin = lazy(() => import("./pages/Admin"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const MasterAdmin = lazy(() => import("./pages/MasterAdmin"));
const AgencySignup = lazy(() => import("./pages/AgencySignup"));
const AgencySignupBySlug = lazy(() => import("./pages/AgencySignupBySlug"));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite").then(m => ({ default: m.AcceptInvite })));
const GuestDashboard = lazy(() => import("./pages/GuestDashboard").then(m => ({ default: m.GuestDashboard })));
const NotFound = lazy(() => import("./pages/NotFound"));

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
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          }>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/agency/:token" element={<AgencySignup />} />
              <Route path="/agencia/:slug" element={<AgencySignupBySlug />} />
              <Route path="/accept-invite" element={<AcceptInvite />} />
              
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
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
  );
};

export default App;
