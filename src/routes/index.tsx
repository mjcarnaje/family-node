import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import * as React from "react";
import { Hero } from "~/components/Hero";
import { BenefitsSection } from "~/components/BenefitsSection";
import { CurriculumSection } from "~/components/CurriculumSection";
import { TestimonialsSection } from "~/components/TestimonialsSection";
import { CommunitySection } from "~/components/CommunitySection";
import { HowItWorksSection } from "~/components/HowItWorksSection";
import { FAQSection } from "~/components/FAQSection";
import { FinalCTASection } from "~/components/FinalCTASection";
import { SectionDivider } from "~/components/SectionDivider";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  useEffect(() => {
    // Add structured data for SEO
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Family Node",
      description:
        "Interactive Family Tree Platform for visualizing and preserving family history",
      applicationCategory: "Genealogy",
      url: typeof window !== "undefined" ? window.location.origin : "",
    };

    const faqStructuredData = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is Family Node?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Family Node is a modern platform that allows you to build and visualize your family tree through an interactive, node-based interface.",
          },
        },
        {
          "@type": "Question",
          name: "How secure is my family data?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "We take your privacy and security very seriously. Your family data is stored securely using industry-standard encryption.",
          },
        },
      ],
    };

    // Remove existing structured data scripts if any
    const existingScripts = document.querySelectorAll(
      'script[type="application/ld+json"]'
    );
    existingScripts.forEach((script) => script.remove());

    // Add new structured data
    const addScript = (data: object) => {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(data);
      document.head.appendChild(script);
    };

    addScript(structuredData);
    addScript(faqStructuredData);

    return () => {
      // Cleanup on unmount
      const scripts = document.querySelectorAll(
        'script[type="application/ld+json"]'
      );
      scripts.forEach((script) => script.remove());
    };
  }, []);

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
