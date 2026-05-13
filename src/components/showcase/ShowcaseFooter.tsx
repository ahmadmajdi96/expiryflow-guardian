import { Sparkles } from "lucide-react";
import cortaLogo from "@/assets/corta-logo.png";

const ShowcaseFooter = () => (
  <footer className="py-12 sm:py-16 px-4 sm:px-6 border-t pp-border">
    <div className="max-w-6xl mx-auto text-center">
      <div className="flex items-center justify-center gap-3 mb-6">
        <img src={cortaLogo} alt="CORTA WMS Logo" className="h-10 w-auto" loading="lazy" />
        <span className="font-bold text-2xl tracking-tight">CORTA WMS</span>
      </div>
      <p className="pp-muted-text max-w-lg mx-auto mb-8">
        AI-Powered Warehouse & Expiry Intelligence — batch-level inventory, FEFO execution and
        predictive forecasting in one platform, connected to CoreERP.
      </p>
      <div className="flex items-center justify-center flex-wrap gap-4 sm:gap-6 text-sm pp-muted-text mb-10">
        <span>FEFO Operations</span>
        <span className="w-1 h-1 rounded-full bg-white/20" />
        <span>Expiry Intelligence</span>
        <span className="w-1 h-1 rounded-full bg-white/20" />
        <span>Quality &amp; Compliance</span>
        <span className="w-1 h-1 rounded-full bg-white/20" />
        <span>AI Engine</span>
      </div>

      <a
        href="https://cortanexai.com"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border pp-border backdrop-blur-sm hover-scale"
        style={{ background: "hsl(var(--mes-color) / 0.08)" }}
      >
        <Sparkles className="w-4 h-4 animate-pulse" style={{ color: "hsl(var(--mes-color))" }} />
        <span className="text-sm font-medium pp-muted-text">
          Powered by <span className="pp-gradient-text font-semibold tracking-tight">CortaneX AI</span>
        </span>
      </a>

      <div className="mt-8 text-xs pp-muted-text/60">
        © 2026 CORTA WMS — ExpirySmart Warehouse Management. All rights reserved.
      </div>
    </div>
  </footer>
);

export default ShowcaseFooter;
