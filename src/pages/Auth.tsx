import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Boxes, ShieldCheck, Layers, BarChart3 } from "lucide-react";
import { toast } from "sonner";

const Auth = () => {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    nav("/");
  };
  const signUp = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/`, data: { full_name: name } },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created. You can sign in now.");
  };

  const demoAccounts = [
    { label: "Admin", email: "admin@corta.demo", name: "System Admin", role: "admin" },
    { label: "Warehouse", email: "warehouse@corta.demo", name: "Warehouse Clerk", role: "warehouse_clerk" },
    { label: "QC Inspector", email: "qc@corta.demo", name: "QC Inspector", role: "qc_inspector" },
    { label: "Store Mgr", email: "store@corta.demo", name: "Store Manager", role: "store_manager" },
  ];

  const DEMO_PASSWORD = "Corta!Inv2026#Secure";

  const handleDemoLogin = async (account: typeof demoAccounts[0]) => {
    setEmail(account.email); setPassword(DEMO_PASSWORD); setBusy(true);
    let { error } = await supabase.auth.signInWithPassword({ email: account.email, password: DEMO_PASSWORD });
    if (error) {
      const { error: signUpErr } = await supabase.auth.signUp({
        email: account.email, password: DEMO_PASSWORD,
        options: { emailRedirectTo: `${window.location.origin}/`, data: { full_name: account.name } },
      });
      if (signUpErr && !signUpErr.message.toLowerCase().includes("registered")) {
        setBusy(false); return toast.error(signUpErr.message);
      }
      // Sign in after signup — role is auto-assigned by server-side trigger
      ({ error } = await supabase.auth.signInWithPassword({ email: account.email, password: DEMO_PASSWORD }));
    }
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Signed in as ${account.label}`);
    nav("/");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 text-white relative overflow-hidden" style={{ background: "var(--gradient-primary)" }}>
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0"><Boxes className="h-6 w-6" /></div>
          <div>
            <div className="text-xl font-bold">CORTA WMS</div>
            <div className="text-xs text-white/70">ExpirySmart WMS</div>
          </div>
        </div>
        <div className="space-y-6 max-w-md">
          <h2 className="text-3xl font-bold leading-tight">Batch-level inventory, FEFO execution and expiry intelligence — in one system.</h2>
          <p className="text-white/80">From receiving to markdown — manage batches, expiry zones, QC and AI-driven pricing in real time.</p>
          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="space-y-2"><Layers className="h-5 w-5" /><div className="text-sm font-medium">FEFO Execution</div></div>
            <div className="space-y-2"><BarChart3 className="h-5 w-5" /><div className="text-sm font-medium">Expiry Zones</div></div>
            <div className="space-y-2"><ShieldCheck className="h-5 w-5" /><div className="text-sm font-medium">Role-based access</div></div>
          </div>
        </div>
        <div className="text-xs text-white/60">© 2026 CORTA Inventory · Connected to CoreERP</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8">
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-lg flex items-center justify-center text-white" style={{ background: "var(--gradient-primary)" }}>
              <Boxes className="h-5 w-5" />
            </div>
            <div><h1 className="text-lg font-bold">CORTA WMS</h1></div>
          </div>
          <h2 className="text-2xl font-bold mb-1">Welcome back</h2>
          <p className="text-sm text-muted-foreground mb-6">Sign in to your ExpirySmart WMS workspace.</p>
          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={signIn} className="space-y-4 mt-4">
                <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div><Label>Password</Label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                <Button type="submit" className="w-full" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={signUp} className="space-y-4 mt-4">
                <div><Label>Full name</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div><Label>Password</Label><Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                <Button type="submit" className="w-full" disabled={busy}>{busy ? "Creating..." : "Create account"}</Button>
                <p className="text-xs text-muted-foreground">First user receives admin role. Additional users are assigned roles by admins.</p>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 pt-5 border-t">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Demo accounts · click to sign in</div>
            <div className="grid grid-cols-2 gap-1.5">
              {demoAccounts.map(r => (
                <button key={r.email} type="button" disabled={busy} onClick={() => handleDemoLogin(r)}
                  className="text-[11px] px-2 py-1.5 rounded-md border border-border bg-muted/30 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-colors text-left disabled:opacity-50">
                  <span className="font-semibold">{r.label}</span>
                  <span className="text-muted-foreground block truncate text-[10px]">{r.email}</span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">Account + role auto-created on first click.</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Auth;