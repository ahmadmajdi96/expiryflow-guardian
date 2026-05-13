import {
  TrendingUp, Clock, ShieldCheck, Eye, Layers, Wifi,
  BarChart3, Lock, Zap, Globe,
} from "lucide-react";

const benefits = [
  { icon: TrendingUp, title: "Increase OEE by 15–25%", description: "Real-time visibility into availability, performance, and quality losses enables targeted improvement.", colorVar: "--mes-color" },
  { icon: Clock, title: "Reduce Downtime by 30%", description: "Predictive maintenance alerts and AI-optimized scheduling keep lines running longer.", colorVar: "--mes-color" },
  { icon: ShieldCheck, title: "Audit-Ready in Minutes", description: "AI-assembled evidence packages with clause mapping for BRCGS, SQF, FSSC 22000.", colorVar: "--qms-color" },
  { icon: Eye, title: "100% Traceability", description: "End-to-end lot genealogy with one-click mock recalls in under 2 hours.", colorVar: "--qms-color" },
  { icon: Layers, title: "Unified Data Model", description: "MES, QMS, and CMS share a common backbone with AI cross-referencing.", colorVar: "--ai-color" },
  { icon: Wifi, title: "Edge-First Architecture", description: "Purpose-built tablet apps with offline AI inference — no more paper forms.", colorVar: "--edge-color" },
  { icon: BarChart3, title: "AI-Driven Analytics", description: "Automated SPC, trend prediction, and shift reports that turn data into decisions.", colorVar: "--ai-color" },
  { icon: Lock, title: "Role-Based Access", description: "Intelligent access control with anomaly detection for security events.", colorVar: "--cms-color" },
  { icon: Zap, title: "Rapid Deployment", description: "Modular architecture with AI-guided onboarding — start with MES, add modules as you grow.", colorVar: "--mes-color" },
  { icon: Globe, title: "Multi-Site Ready", description: "AI-consolidated analytics across all facilities with site-specific optimization.", colorVar: "--cms-color" },
];

const ShowcaseBenefits = () => (
  <section id="benefits" className="py-16 sm:py-24 px-4 sm:px-6 relative scroll-mt-20">
    <div className="absolute inset-0 pp-hero-gradient opacity-50" />
    <div className="relative max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="section-title mb-4">
          Why <span className="pp-gradient-text">CORTA-PL</span>?
        </h2>
        <p className="section-subtitle mx-auto">Measurable impact on your production line KPIs from day one.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {benefits.map((b) => (
          <div key={b.title} className="benefit-card group">
            <div
              className="p-2.5 rounded-lg w-fit mb-4"
              style={{
                background: `hsl(var(${b.colorVar}) / 0.1)`,
                border: `1px solid hsl(var(${b.colorVar}) / 0.25)`,
              }}
            >
              <b.icon className="w-5 h-5" style={{ color: `hsl(var(${b.colorVar}))` }} />
            </div>
            <h3 className="font-semibold mb-2 text-sm">{b.title}</h3>
            <p className="text-xs pp-muted-text leading-relaxed">{b.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default ShowcaseBenefits;
