import {
  TrendingDown, Tag, ShieldCheck, Eye, Layers, Zap,
  BarChart3, Lock, Boxes, Sparkles,
} from "lucide-react";

const benefits = [
  { icon: TrendingDown, title: "Cut Food Waste 40–60%", description: "Predictive expiry forecasting + AI markdowns clear stock before it spoils.", colorVar: "--qms-color" },
  { icon: Tag, title: "Recover Margin on Near-Expiry", description: "AI-set discount % maximises sell-through without over-discounting.", colorVar: "--qms-color" },
  { icon: Boxes, title: "100% FEFO Compliance", description: "AI putaway and oldest-first picking eliminate human FEFO errors.", colorVar: "--mes-color" },
  { icon: Eye, title: "Full Batch Traceability", description: "Every receipt, move, pick and write-off tied to a batch ID for one-click recall.", colorVar: "--cms-color" },
  { icon: Zap, title: "70% Faster Receiving", description: "Smart Receiving parses delivery notes — no manual batch + expiry keying.", colorVar: "--mes-color" },
  { icon: ShieldCheck, title: "Audit-Ready by Default", description: "Every AI prompt, score and human decision logged for QA and regulators.", colorVar: "--cms-color" },
  { icon: Layers, title: "Unified Multi-Store Model", description: "DC + every store on one batch graph — transfers, picks and alerts in real time.", colorVar: "--ai-color" },
  { icon: Sparkles, title: "AI Copilot, Always On", description: "Floating Expiry Assistant answers stock questions with deep-links to batches.", colorVar: "--ai-color" },
  { icon: Lock, title: "Role-Based Access", description: "Admin, Warehouse Clerk, QC Inspector and Store Manager — RLS enforced end-to-end.", colorVar: "--cms-color" },
  { icon: BarChart3, title: "CoreERP Integrated", description: "PO/SO webhooks, automatic inbound/outbound order sync and event log.", colorVar: "--mes-color" },
];

const ShowcaseBenefits = () => (
  <section id="benefits" className="py-16 sm:py-24 px-4 sm:px-6 relative scroll-mt-20">
    <div className="absolute inset-0 pp-hero-gradient opacity-50" />
    <div className="relative max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="section-title mb-4">
          Why <span className="pp-gradient-text">CORTA WMS</span>?
        </h2>
        <p className="section-subtitle mx-auto">Measurable impact on waste, margin and compliance from week one.</p>
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
