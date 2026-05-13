import heroFactory from "@/assets/hero-factory.jpg";
import cortaLogo from "@/assets/corta-logo.png";

const ShowcaseHero = () => (
  <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
    <div className="absolute inset-0">
      <img
        src={heroFactory}
        alt="Modern food manufacturing production line"
        className="w-full h-full object-cover"
        width={1920}
        height={800}
      />
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, hsl(220 25% 7% / 0.9), hsl(220 25% 7% / 0.7), hsl(220 25% 7%))" }} />
      <div className="absolute inset-0 pp-hero-gradient" />
    </div>

    <div className="absolute inset-0 pp-grid-pattern opacity-30" />

    <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 text-center pt-20 sm:pt-0">
      <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full border pp-border backdrop-blur-sm mb-6 sm:mb-8" style={{ background: "hsl(220 22% 11% / 0.5)" }}>
        <span className="pp-pulse-dot" />
        <span className="text-xs sm:text-sm font-medium pp-muted-text">AI-Powered Enterprise Manufacturing Intelligence Platform</span>
      </div>

      <div className="flex justify-center mb-4 sm:mb-6">
        <img src={cortaLogo} alt="CORTA-PL Logo" className="h-16 sm:h-20 md:h-24 w-auto animate-fade-in" />
      </div>

      <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-4 sm:mb-6">
        <span className="pp-gradient-text">CORTA-PL</span>
        <br />
        <span>Production Suite</span>
      </h1>

      <p className="text-lg sm:text-xl md:text-2xl pp-muted-text max-w-3xl mx-auto mb-8 sm:mb-12 leading-relaxed px-2">
        A unified ecosystem of MES, QMS, and CMS applications purpose-built for
        food manufacturing — powered by <span className="pp-gradient-text font-semibold">CortaneX AI</span> for predictive insights and intelligent automation.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
        <a
          href="#architecture"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border pp-border font-medium hover:border-white/30"
          style={{ background: "hsl(220 22% 11% / 0.6)" }}
        >
          Explore platform
        </a>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 max-w-4xl mx-auto">
        {[
          { value: "3", label: "Core Platforms" },
          { value: "13+", label: "Edge Applications" },
          { value: "AI", label: "Powered Intelligence" },
          { value: "ISA-95", label: "Compliant" },
        ].map((stat) => (
          <div key={stat.label} className="data-card text-center backdrop-blur-sm p-4 sm:p-6">
            <div className="pp-metric pp-gradient-text text-xl sm:text-3xl">{stat.value}</div>
            <div className="text-[10px] sm:text-xs uppercase tracking-widest pp-muted-text mt-1">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>

    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
      <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-1.5">
        <div className="w-1.5 h-3 rounded-full animate-pulse" style={{ background: "hsl(var(--mes-color))" }} />
      </div>
    </div>
  </section>
);

export default ShowcaseHero;
