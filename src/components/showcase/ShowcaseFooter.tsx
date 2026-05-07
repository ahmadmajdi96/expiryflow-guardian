import { Sparkles } from "lucide-react";
import cortaLogo from "@/assets/corta-logo.png";

const ShowcaseFooter = () => (
  <footer className="py-12 sm:py-16 px-4 sm:px-6 border-t border-[hsl(220,14%,18%)]">
    <div className="max-w-6xl mx-auto text-center">
      <div className="flex items-center justify-center gap-3 mb-6">
        <img src={cortaLogo} alt="CORTA-PL Logo" className="h-10 w-auto" height={40} loading="lazy" />
        <span className="font-bold text-2xl tracking-tight">CORTA-PL</span>
      </div>
      <p className="text-[hsl(215,12%,50%)] max-w-lg mx-auto mb-8">
        AI-Powered Enterprise Manufacturing Intelligence for the modern food production facility.
        From raw material to finished goods — every step monitored, every metric optimized.
      </p>
      <div className="flex items-center justify-center gap-8 text-sm text-[hsl(215,12%,50%)] mb-10">
        <span>MES</span>
        <span className="w-1 h-1 rounded-full bg-[hsl(220,14%,18%)]" />
        <span>QMS</span>
        <span className="w-1 h-1 rounded-full bg-[hsl(220,14%,18%)]" />
        <span>CMS</span>
        <span className="w-1 h-1 rounded-full bg-[hsl(220,14%,18%)]" />
        <span>Edge Apps</span>
        <span className="w-1 h-1 rounded-full bg-[hsl(220,14%,18%)]" />
        <span>AI Engine</span>
      </div>

      <a
        href="https://cortanexai.com"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[hsl(210,100%,56%)]/20 bg-[hsl(210,100%,56%)]/5 backdrop-blur-sm group hover:border-[hsl(210,100%,56%)]/40 hover:bg-[hsl(210,100%,56%)]/10 transition-all duration-500"
      >
        <Sparkles className="w-4 h-4 text-[hsl(210,100%,56%)] animate-pulse" />
        <span className="text-sm font-medium text-[hsl(215,12%,50%)]">
          Powered by{" "}
          <span className="bg-clip-text text-transparent font-semibold tracking-tight" style={{ backgroundImage: "linear-gradient(135deg, hsl(210 100% 56%), hsl(142 71% 45%))" }}>CortaneX AI</span>
        </span>
      </a>

      <div className="mt-8 text-xs text-[hsl(215,12%,50%)]/50">
        © 2026 CORTA-PL Production Suite. All rights reserved.
      </div>
    </div>
  </footer>
);

export default ShowcaseFooter;