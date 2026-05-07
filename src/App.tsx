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
import MarkdownApprovals from "./pages/MarkdownApprovals";
import BatchDetails from "./pages/BatchDetails";
import WebhookLog from "./pages/WebhookLog";
import PickRequests from "./pages/PickRequests";
import NotFound from "./pages/NotFound";
import Products from "./pages/Products";
import Stores from "./pages/Stores";
import UserManagement from "./pages/UserManagement";
import InboundOrders from "./pages/InboundOrders";
import OutboundOrders from "./pages/OutboundOrders";
import Showcase from "./pages/Showcase";

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
            <Route path="/markdown-approvals" element={<Wrap><MarkdownApprovals /></Wrap>} />
            <Route path="/pick-requests" element={<Wrap><PickRequests /></Wrap>} />
            <Route path="/webhook-log" element={<Wrap><WebhookLog /></Wrap>} />
            <Route path="/batch/:id" element={<Wrap><BatchDetails /></Wrap>} />
            <Route path="/settings" element={<Wrap><AlertSettings /></Wrap>} />
            <Route path="/products" element={<Wrap><Products /></Wrap>} />
            <Route path="/stores" element={<Wrap><Stores /></Wrap>} />
            <Route path="/users" element={<Wrap><UserManagement /></Wrap>} />
            <Route path="/inbound-orders" element={<Wrap><InboundOrders /></Wrap>} />
            <Route path="/outbound-orders" element={<Wrap><OutboundOrders /></Wrap>} />
            <Route path="/showcase" element={<Showcase />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
