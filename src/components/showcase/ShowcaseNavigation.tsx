import { useState, useEffect } from "react";
import { Shield, FileCheck, Tablet, Menu, X, Factory, Brain } from "lucide-react";
import cortaLogo from "@/assets/corta-logo.png";

const navItems = [
  { label: "MES", href: "#mes", icon: Factory },
  { label: "QMS", href: "#qms", icon: Shield },
  { label: "CMS", href: "#cms", icon: FileCheck },
  { label: "Edge Apps", href: "#edge", icon: Tablet },
  { label: "AI Engine", href: "#ai", icon: Brain },
];

const ShowcaseNavigation = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-[hsl(220,20%,7%)]/80 backdrop-blur-xl border-b border-[hsl(220,14%,18%)]" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2 sm:gap-3 transition-transform hover:scale-105">
          <img src={cortaLogo} alt="CORTA-PL Logo" className="h-7 sm:h-8 w-auto" />
          <span className="font-bold text-base sm:text-lg tracking-tight">CORTA-PL</span>
        </a>

        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-[hsl(215,12%,50%)] hover:text-[hsl(210,20%,90%)] hover:bg-[hsl(220,16%,16%)]/50 transition-colors"
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </a>
          ))}
        </div>

        <button
          className="md:hidden p-2 rounded-lg hover:bg-[hsl(220,16%,16%)]/50"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-[hsl(220,20%,7%)]/95 backdrop-blur-xl border-b border-[hsl(220,14%,18%)] px-4 py-3 space-y-1">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-[hsl(215,12%,50%)] hover:text-[hsl(210,20%,90%)] hover:bg-[hsl(220,16%,16%)]/50 transition-colors"
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </a>
          ))}
        </div>
      )}
    </nav>
  );
};

export default ShowcaseNavigation;