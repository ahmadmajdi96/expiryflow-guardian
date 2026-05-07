import { Brain, Cpu, Eye, MessageSquare, TrendingUp, Zap } from "lucide-react";

const aiFeatures = [
  {
    icon: Brain,
    title: "Predictive Analytics Engine",
    desc: "Deep learning models analyze production, quality, and compliance data to forecast failures, predict quality deviations, and recommend optimal process parameters — turning reactive operations into proactive intelligence.",
  },
  {
    icon: Eye,
    title: "Computer Vision Inspection",
    desc: "AI-powered visual inspection for label compliance verification, defect detection on production lines, and automated GMP audit photo analysis — eliminating human error from visual quality checks.",
  },
  {
    icon: MessageSquare,
    title: "Natural Language Processing",
    desc: "Automated complaint classification, regulatory document parsing, and CAPA report generation. Ask questions about your production data in plain English and get instant insights.",
  },
  {
    icon: Cpu,
    title: "Intelligent Automation",
    desc: "AI-driven workflow orchestration that auto-routes deviations, escalates critical events, generates corrective action plans, and optimizes scheduling across all production lines.",
  },
  {
    icon: TrendingUp,
    title: "Adaptive Learning Models",
    desc: "Self-improving algorithms continuously learn from your operational data. The more you use CORTA-PL, the more accurate predictions become — custom-tuned to your specific manufacturing processes.",
  },
  {
    icon: Zap,
    title: "Real-Time Decision Support",
    desc: "AI copilot surfaces actionable recommendations during critical events — from optimal batch disposition to emergency recall sequencing — with confidence scores and supporting evidence.",
  },
];

const ShowcaseAIFeatures = () => (
  <section id="ai" className="py-16 sm:py-24 px-4 sm:px-6 relative scroll-mt-8">
    <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 50% at 50% -20%, hsl(210 100% 56% / 0.08), transparent)" }} />
    <div className="relative max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[hsl(210,100%,56%)]/20 bg-[hsl(210,100%,56%)]/5 mb-6">
          <Brain className="w-4 h-4 text-[hsl(210,100%,56%)]" />
          <span className="text-sm font-medium text-[hsl(210,100%,56%)]">CortaneX AI Engine</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
          AI That <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg, hsl(210 100% 56%), hsl(142 71% 45%))" }}>Understands Manufacturing</span>
        </h2>
        <p className="text-lg text-[hsl(215,12%,50%)] max-w-3xl mx-auto">
          Purpose-built AI models trained on manufacturing data — not generic chatbots, but specialized intelligence that speaks your operational language.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {aiFeatures.map((f) => (
          <div key={f.title} className="bg-[hsl(220,18%,10%)] border border-[hsl(220,14%,18%)] rounded-xl p-6 transition-all duration-300 hover:border-[hsl(210,100%,56%)]/30 hover:-translate-y-0.5 group">
            <div className="p-2.5 rounded-lg bg-[hsl(210,100%,56%)]/10 border border-[hsl(210,100%,56%)]/20 w-fit mb-4">
              <f.icon className="w-5 h-5 text-[hsl(210,100%,56%)]" />
            </div>
            <h3 className="font-semibold mb-2 text-sm">{f.title}</h3>
            <p className="text-xs text-[hsl(215,12%,50%)] leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default ShowcaseAIFeatures;