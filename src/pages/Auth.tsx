import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Boxes } from "lucide-react";
import { toast } from "sonner";

const Auth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--gradient-hero)" }}>
      <div className="w-full max-w-sm page-section p-8 animate-scale-in">
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="h-12 w-12 rounded-xl flex items-center justify-center shadow-md" style={{ background: "var(--gradient-primary)", color: "hsl(var(--primary-foreground))" }}>
            <Boxes className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">CORTA Inventory</h1>
          <p className="text-sm text-muted-foreground">ExpirySmart WMS</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@company.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" minLength={6} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Please wait…" : isLogin ? "Sign In" : "Create Account"}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-4">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button type="button" className="text-primary font-medium hover:underline" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;