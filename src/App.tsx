import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import AppLayout from "@/components/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import ExpiryAlerts from "./pages/ExpiryAlerts";
import Receiving from "./pages/Receiving";
import QCInspection from "./pages/QCInspection";
import Quarantine from "./pages/Quarantine";
import Transfers from "./pages/Transfers";
import AlertSettings from "./pages/AlertSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const Wrap = ({ children }: { children: React.ReactNode }) => <AppLayout>{children}</AppLayout>;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Wrap><Dashboard /></Wrap>} />
            <Route path="/expiry-alerts" element={<Wrap><ExpiryAlerts /></Wrap>} />
            <Route path="/receiving" element={<Wrap><Receiving /></Wrap>} />
            <Route path="/qc-inspection" element={<Wrap><QCInspection /></Wrap>} />
            <Route path="/quarantine" element={<Wrap><Quarantine /></Wrap>} />
            <Route path="/transfers" element={<Wrap><Transfers /></Wrap>} />
            <Route path="/settings" element={<Wrap><AlertSettings /></Wrap>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
