import heroFactory from "@/assets/hero-factory.jpg";
import cortaLogo from "@/assets/corta-logo.png";

const ShowcaseHero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={heroFactory}
          alt="Modern food manufacturing production line"
          className="w-full h-full object-cover"
          width={1920}
          height={800}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(220,20%,7%)]/90 via-[hsl(220,20%,7%)]/70 to-[hsl(220,20%,7%)]" />
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 50% at 50% -20%, hsl(210 100% 56% / 0.15), transparent)" }} />
      </div>

      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: "linear-gradient(hsl(220 14% 18% / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(220 14% 18% / 0.3) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 text-center pt-20 sm:pt-0">
        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full border border-[hsl(220,14%,18%)] bg-[hsl(220,18%,10%)]/50 backdrop-blur-sm mb-6 sm:mb-8">
          <span className="relative inline-block w-2.5 h-2.5 rounded-full bg-[hsl(142,71%,45%)]">
            <span className="absolute inset-0 rounded-full bg-[hsl(142,71%,45%)] animate-ping opacity-40" />
          </span>
          <span className="text-xs sm:text-sm font-medium text-[hsl(215,12%,50%)]">AI-Powered Enterprise Manufacturing Intelligence Platform</span>
        </div>

        <div className="flex justify-center mb-4 sm:mb-6">
          <img src={cortaLogo} alt="CORTA-PL Logo" className="h-16 sm:h-20 md:h-24 w-auto animate-fade-in" />
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-4 sm:mb-6">
          <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg, hsl(210 100% 56%), hsl(142 71% 45%))" }}>CORTA-PL</span>
          <br />
          <span className="text-[hsl(210,20%,90%)]">Production Suite</span>
        </h1>

        <p className="text-lg sm:text-xl md:text-2xl text-[hsl(215,12%,50%)] max-w-3xl mx-auto mb-8 sm:mb-12 leading-relaxed px-2">
          A unified ecosystem of MES, QMS, and CMS applications purpose-built for
          food manufacturing — powered by <span className="bg-clip-text text-transparent font-semibold" style={{ backgroundImage: "linear-gradient(135deg, hsl(210 100% 56%), hsl(142 71% 45%))" }}>CortaneX AI</span> for predictive insights and intelligent automation.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 max-w-4xl mx-auto">
          {[
            { value: "3", label: "Core Platforms" },
            { value: "13+", label: "Edge Applications" },
            { value: "AI", label: "Powered Intelligence" },
            { value: "ISA-95", label: "Compliant" },
          ].map((stat) => (
            <div key={stat.label} className="bg-[hsl(220,18%,10%)] border border-[hsl(220,14%,18%)] rounded-lg p-4 sm:p-6 text-center backdrop-blur-sm transition-all duration-300 hover:border-[hsl(210,100%,56%)]/40 hover:-translate-y-0.5" style={{ boxShadow: "none" }}>
              <div className="font-mono text-xl sm:text-3xl font-bold text-[hsl(210,100%,56%)] tracking-tight">{stat.value}</div>
              <div className="text-[10px] sm:text-xs font-medium uppercase tracking-widest text-[hsl(215,12%,50%)] mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-[hsl(215,12%,50%)]/30 flex items-start justify-center p-1.5">
          <div className="w-1.5 h-3 rounded-full bg-[hsl(210,100%,56%)] animate-pulse" />
        </div>
      </div>
    </section>
  );
};

export default ShowcaseHero;