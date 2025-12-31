import { Users, Calendar, MessageSquare, TrendingUp, Award, Network } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { FadeIn } from "~/components/ui/fade-in";

const communityFeatures = [
  {
    icon: Users,
    stat: "5,000+",
    label: "Families",
    description: "Join thousands of families building their legacies together",
  },
  {
    icon: Network,
    stat: "100k+",
    label: "Members Added",
    description: "A growing network of ancestors and descendants preserved",
  },
  {
    icon: MessageSquare,
    stat: "Daily",
    label: "Collaborations",
    description: "Families connecting and sharing stories in real-time",
  },
  {
    icon: Calendar,
    stat: "Weekly",
    label: "New Features",
    description: "Continuous improvements to your tree-building experience",
  },
  {
    icon: TrendingUp,
    stat: "Growing",
    label: "Visual History",
    description: "Every day more stories and photos are preserved for the future",
  },
  {
    icon: Award,
    stat: "Top Rated",
    label: "User Experience",
    description: "The most intuitive family tree platform on the web",
  },
];

export function CommunitySection() {
  return (
    <section id="community" className="w-full py-24 relative overflow-hidden bg-background">
      {/* Map Background (Simulated with radial gradients) */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-[20%] left-[20%] w-96 h-96 bg-primary/20 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[20%] right-[20%] w-96 h-96 bg-purple-500/20 rounded-full blur-[120px]"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <FadeIn>
          <div className="text-center mb-20">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-6xl mb-6 text-foreground">
              Our Growing <span className="text-primary">Community</span>
            </h2>
            <p className="text-lg text-muted-foreground sm:text-xl max-w-2xl mx-auto">
              Join a network of families who are preserving their history for the future.
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16 max-w-6xl mx-auto">
          {communityFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <FadeIn key={index} delay={index * 100} className="h-full">
                <div className="flex flex-col items-center text-center group">
                  <div className="mb-6 relative">
                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <Icon className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors relative z-10" />
                  </div>
                  
                  <h3 className="text-5xl md:text-6xl font-bold mb-4 tracking-tighter text-foreground group-hover:scale-110 transition-transform duration-300">
                    {feature.stat}
                  </h3>
                  
                  <div className="text-lg font-bold text-primary mb-2 uppercase tracking-widest text-xs">
                    {feature.label}
                  </div>
                  
                  <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
