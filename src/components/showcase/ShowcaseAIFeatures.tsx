import { Brain, Cpu, Eye, MessageSquare, TrendingUp, Zap } from "lucide-react";

const aiFeatures = [
  { icon: Brain, title: "Predictive Analytics Engine", desc: "Deep learning over production, quality, and compliance data forecasts failures, predicts deviations, and recommends optimal process parameters." },
  { icon: Eye, title: "Computer Vision Inspection", desc: "AI-powered visual inspection for label compliance, defect detection on production lines, and automated GMP audit photo analysis." },
  { icon: MessageSquare, title: "Natural Language Processing", desc: "Auto-classifies complaints, parses regulatory documents, and generates CAPA reports. Ask in plain English; get instant insights." },
  { icon: Cpu, title: "Intelligent Automation", desc: "AI workflow orchestration auto-routes deviations, escalates critical events, and optimizes scheduling across all production lines." },
  { icon: TrendingUp, title: "Adaptive Learning Models", desc: "Self-improving algorithms continuously learn from your operational data — predictions get more accurate the more you use the platform." },
  { icon: Zap, title: "Real-Time Decision Support", desc: "AI copilot surfaces actionable recommendations during critical events with confidence scores and supporting evidence." },
];

const ShowcaseAIFeatures = () => (
  <section id="ai" className="py-16 sm:py-24 px-4 sm:px-6 relative scroll-mt-20">
    <div className="absolute inset-0 pp-hero-gradient opacity-60" />
    <div className="relative max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
          style={{
            background: "hsl(var(--ai-color) / 0.08)",
            border: "1px solid hsl(var(--ai-color) / 0.25)",
            color: "hsl(var(--ai-color))",
          }}
        >
          <Brain className="w-4 h-4" />
          <span className="text-sm font-medium">CortaneX AI Engine</span>
        </div>
        <h2 className="section-title mb-4">
          AI That <span className="pp-gradient-text">Understands Manufacturing</span>
        </h2>
        <p className="section-subtitle mx-auto">
          Purpose-built AI models trained on manufacturing data — specialized intelligence
          that speaks your operational language.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {aiFeatures.map((f) => (
          <div key={f.title} className="benefit-card group">
            <div
              className="p-2.5 rounded-lg w-fit mb-4"
              style={{
                background: "hsl(var(--ai-color) / 0.1)",
                border: "1px solid hsl(var(--ai-color) / 0.25)",
              }}
            >
              <f.icon className="w-5 h-5" style={{ color: "hsl(var(--ai-color))" }} />
            </div>
            <h3 className="font-semibold mb-2 text-sm">{f.title}</h3>
            <p className="text-xs pp-muted-text leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default ShowcaseAIFeatures;
