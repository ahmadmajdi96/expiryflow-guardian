import {
  TrendingUp, Clock, ShieldCheck, Eye, Layers, Wifi,
  BarChart3, Lock, Zap, Globe,
} from "lucide-react";

const benefits = [
  { icon: TrendingUp, title: "Increase OEE by 15–25%", description: "Real-time visibility into availability, performance, and quality losses enables targeted improvement." },
  { icon: Clock, title: "Reduce Downtime by 30%", description: "Predictive maintenance alerts and AI-optimized scheduling keep lines running longer." },
  { icon: ShieldCheck, title: "Audit-Ready in Minutes", description: "AI-assembled evidence packages with clause mapping for BRCGS, SQF, FSSC 22000." },
  { icon: Eye, title: "100% Traceability", description: "End-to-end lot genealogy with AI-powered one-click mock recalls in under 2 hours." },
  { icon: Layers, title: "Unified Data Model", description: "MES, QMS, and CMS share a common data backbone with AI cross-referencing." },
  { icon: Wifi, title: "Edge-First Architecture", description: "Purpose-built tablet apps with offline AI inference — no more paper forms." },
  { icon: BarChart3, title: "AI-Driven Analytics", description: "Automated SPC, trend prediction, and shift reports that transform data into decisions." },
  { icon: Lock, title: "Role-Based Access", description: "Intelligent access control with AI-powered anomaly detection for security events." },
  { icon: Zap, title: "Rapid Deployment", description: "Modular architecture with AI-guided onboarding — start with MES, add modules as you grow." },
  { icon: Globe, title: "Multi-Site Ready", description: "AI-consolidated analytics across all facilities with site-specific optimization recommendations." },
];

const ShowcaseBenefits = () => (
  <section className="py-16 sm:py-24 px-4 sm:px-6 relative">
    <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 50% at 50% -20%, hsl(210 100% 56% / 0.08), transparent)", opacity: 0.5 }} />
    <div className="relative max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
          Why <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg, hsl(210 100% 56%), hsl(142 71% 45%))" }}>CORTA-PL</span>?
        </h2>
        <p className="text-lg text-[hsl(215,12%,50%)] max-w-3xl mx-auto">
          Measurable impact on your production line KPIs from day one.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {benefits.map((b) => (
          <div key={b.title} className="bg-[hsl(220,16%,16%)]/50 border border-[hsl(220,14%,18%)] rounded-lg p-6 backdrop-blur-sm transition-all duration-300 hover:border-[hsl(210,100%,56%)]/30">
            <div className="p-2.5 rounded-lg bg-[hsl(210,100%,56%)]/10 border border-[hsl(210,100%,56%)]/20 w-fit mb-4">
              <b.icon className="w-5 h-5 text-[hsl(210,100%,56%)]" />
            </div>
            <h3 className="font-semibold mb-2 text-sm">{b.title}</h3>
            <p className="text-xs text-[hsl(215,12%,50%)] leading-relaxed">{b.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default ShowcaseBenefits;