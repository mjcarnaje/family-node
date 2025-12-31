import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "~/components/Hero";
import { BenefitsSection } from "~/components/BenefitsSection";
import { CurriculumSection } from "~/components/CurriculumSection";
import { TestimonialsSection } from "~/components/TestimonialsSection";
import { CommunitySection } from "~/components/CommunitySection";
import { HowItWorksSection } from "~/components/HowItWorksSection";
import { FAQSection, faqs } from "~/components/FAQSection";
import { FinalCTASection } from "~/components/FinalCTASection";
import { SectionDivider } from "~/components/SectionDivider";
import {
  softwareApplicationSchema,
  faqSchema,
  combineSchemas,
} from "~/utils/seo";

export const Route = createFileRoute("/")({
  head: () => ({
    scripts: [
      // Structured data for homepage (SoftwareApplication + FAQ)
      {
        type: "application/ld+json",
        children: combineSchemas(
          softwareApplicationSchema(),
          faqSchema(faqs)
        ),
      },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] relative">
      {/* Noise Texture */}
      <div className="noise-overlay"></div>

      {/* Background Ambience */}
      <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden bg-background">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(var(--foreground),0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(var(--foreground),0.03)_1px,transparent_1px)] bg-[length:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)] opacity-20"></div>
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[128px] animate-blob"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-accent/20 rounded-full blur-[128px] animate-blob animation-delay-2000"></div>
        <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] bg-secondary/10 rounded-full blur-[100px] animate-pulse-slow"></div>
      </div>

      <main className="flex-1 relative z-10">
        <Hero />
        <SectionDivider />
        <BenefitsSection />
        <SectionDivider />
        <CurriculumSection />
        <SectionDivider />
        <TestimonialsSection />
        <SectionDivider />
        <CommunitySection />
        <SectionDivider />
        <HowItWorksSection />
        <SectionDivider />
        <FAQSection />
        <SectionDivider />
        <FinalCTASection />
      </main>
    </div>
  );
}
