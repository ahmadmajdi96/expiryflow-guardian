import ShowcaseNavigation from "@/components/showcase/ShowcaseNavigation";
import ShowcaseHero from "@/components/showcase/ShowcaseHero";
import ShowcaseArchitecture from "@/components/showcase/ShowcaseArchitecture";
import ShowcaseModules from "@/components/showcase/ShowcaseModules";
import ShowcaseBenefits from "@/components/showcase/ShowcaseBenefits";
import ShowcaseAIFeatures from "@/components/showcase/ShowcaseAIFeatures";
import ShowcaseStandards from "@/components/showcase/ShowcaseStandards";
import ShowcaseFooter from "@/components/showcase/ShowcaseFooter";
import ShowcaseAIChat from "@/components/showcase/ShowcaseAIChat";

const Showcase = () => {
  return (
    <div className="min-h-screen bg-[hsl(220,20%,7%)] text-[hsl(210,20%,90%)] scrollbar-thin">
      <ShowcaseNavigation />
      <ShowcaseHero />
      <ShowcaseArchitecture />
      <ShowcaseModules />
      <ShowcaseAIFeatures />
      <ShowcaseBenefits />
      <ShowcaseStandards />
      <ShowcaseFooter />
      <ShowcaseAIChat />
    </div>
  );
};

export default Showcase;