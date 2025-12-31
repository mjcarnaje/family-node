import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { FadeIn } from "~/components/ui/fade-in";

const faqs = [
  {
    question: "What is Family Nodes?",
    answer: "Family Nodes is a modern platform that allows you to build and visualize your family tree through an interactive, node-based interface. It's designed to make exploring your family history intuitive and engaging, while allowing you to preserve stories and media for future generations.",
  },
  {
    question: "How secure is my family data?",
    answer: "We take your privacy and security very seriously. Your family data is stored securely using industry-standard encryption. You have complete control over who can view and edit your tree through our comprehensive privacy settings.",
  },
  {
    question: "Can I share my tree with family members?",
    answer: "Absolutely! Family Nodes is built for collaboration. You can invite family members to view your tree or grant them editing permissions so you can build your family legacy together in real-time.",
  },
  {
    question: "What kind of media can I upload?",
    answer: "You can upload profile images for every family member and attach photos, documents, and stories to individual nodes. This helps create a rich, visual history of your family beyond just names and dates.",
  },
  {
    question: "How much does it cost?",
    answer: "Family Nodes is completely free! There are no subscriptions, no hidden fees, and no limits. Build unlimited family trees with unlimited members, upload unlimited media, and enjoy all features at no cost.",
  },
  {
    question: "Is there a limit to how many people I can add?",
    answer: "No limits at all! You can add as many family members as you need, create multiple family trees, upload unlimited photos and documents, and use all features without any restrictions. Everything is free, forever.",
  },
  {
    question: "How do I start building my tree?",
    answer: "Getting started is easy! After creating an account, you can begin by adding yourself and then your immediate family members. Our interactive interface will guide you through connecting parents, children, and spouses to expand your tree.",
  },
  {
    question: "Can I export my family tree?",
    answer: "Yes, we support exporting your tree data in standard formats so you can keep a backup of your family history or use it with other genealogy tools.",
  },
];

export function FAQSection() {
  return (
    <section id="faq" className="w-full py-16 sm:py-24">
      <div className="container mx-auto px-4 relative z-10">
        <FadeIn>
          <div className="text-center mb-16">
            <h2 className="text-3xl font-heading font-extrabold tracking-tight sm:text-4xl lg:text-5xl mb-6 text-foreground">
              Frequently Asked <span className="text-gradient-primary">Questions</span>
            </h2>
            <p className="text-lg text-muted-foreground sm:text-xl max-w-3xl mx-auto leading-relaxed font-serif italic">
              Everything you need to know about building, preserving, and sharing 
              your family history with Family Nodes.
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={200}>
          <div className="max-w-4xl mx-auto">
            <Accordion type="single" collapsible className="w-full glass-card rounded-2xl overflow-hidden">
              {faqs.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="px-6 border-b border-border last:border-0 data-[state=open]:bg-muted/50 transition-colors">
                  <AccordionTrigger className="text-left text-base text-foreground hover:text-primary transition-colors py-6 font-medium">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
