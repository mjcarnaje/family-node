import { Share2, Users, Heart, Network, Image as ImageIcon, History } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { FadeIn } from "~/components/ui/fade-in";

const benefits = [
  {
    icon: Network,
    title: "Interactive Visualization",
    description: "Build and explore your family tree through an intuitive, node-based interface that automatically organizes relationships.",
  },
  {
    icon: Users,
    title: "Member Management",
    description: "Easily add and manage family members, tracking personal information, important dates, and life events.",
  },
  {
    icon: ImageIcon,
    title: "Preserve Memories",
    description: "Upload profile images and attach media to family members, creating a rich visual history for your descendants.",
  },
  {
    icon: Share2,
    title: "Collaborative Building",
    description: "Invite family members to contribute to the tree, sharing the workload and discovering new connections together.",
  },
  {
    icon: Heart,
    title: "Private & Secure",
    description: "Your family data is yours. Control who can view and edit your tree with comprehensive privacy settings.",
  },
  {
    icon: History,
    title: "Automatic Organization",
    description: "Our system intelligently maps generations and hierarchies, ensuring your tree remains clean and navigable.",
  },
];

export function BenefitsSection() {
  return (
    <section id="benefits" className="w-full py-24 relative overflow-hidden">
      {/* Background blobs for this section */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <FadeIn>
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl mb-6 text-foreground">
              Everything You Need to <span className="text-gradient-primary">Connect</span>
            </h2>
            <p className="text-lg text-muted-foreground sm:text-xl max-w-3xl mx-auto leading-relaxed">
              We've built a comprehensive platform that addresses every aspect of
              preserving and exploring your family history.
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto auto-rows-[250px]">
          {/* Large Card 1 */}
          <div className="md:col-span-2 row-span-1 md:row-span-1 glass-card p-8 rounded-2xl relative overflow-hidden group">
             <div className="relative z-10 flex flex-col justify-between h-full">
               <div className="flex items-start justify-between">
                 <div className="rounded-lg bg-muted border border-border p-3">
                   <Network className="h-6 w-6 text-primary" />
                 </div>
                 <div className="px-3 py-1 rounded-full bg-accent/50 border border-border text-xs text-muted-foreground">Interactive</div>
               </div>
               <div>
                 <h3 className="text-2xl font-bold text-foreground mb-2">Node-Based Visualization</h3>
                 <p className="text-muted-foreground max-w-lg">Build and explore your family tree through an intuitive interface that automatically organizes complex relationships.</p>
               </div>
             </div>
             <div className="absolute right-0 top-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] group-hover:bg-primary/20 transition-colors"></div>
          </div>

          {/* Tall Card */}
          <div className="md:col-span-1 md:row-span-2 glass-card gradient-border p-8 rounded-2xl relative overflow-hidden group">
            <div className="relative z-10 h-full flex flex-col">
               <div className="rounded-lg bg-muted border border-border p-3 w-fit mb-6">
                 <History className="h-6 w-6 text-purple-600 dark:text-purple-400" />
               </div>
               <h3 className="text-2xl font-bold text-foreground mb-4">Preserve Your Legacy</h3>
               <p className="text-muted-foreground mb-8">Save stories, photos, and key life events. Ensure your family's history is never forgotten.</p>
               
               <div className="mt-auto bg-slate-950 p-4 rounded-lg border border-border font-mono text-xs text-slate-300 overflow-hidden shadow-inner group-hover:border-primary/30 transition-colors">
                  <div className="opacity-70 select-none space-y-1">
                    <p><span className="text-purple-400">family</span> add --member <span className="text-green-400">"Grandfather Joe"</span></p>
                    <p><span className="text-purple-400">family</span> connect --parent <span className="text-green-400">"Grandfather Joe"</span></p>
                    <p className="text-slate-500">Creating relationship node...</p>
                    <p className="text-slate-500">Auto-organizing tree layout...</p>
                    <p className="text-green-400">Success: Legacy node updated.</p>
                  </div>
               </div>
            </div>
          </div>

          {/* Regular Cards */}
          <div className="md:col-span-1 row-span-1 glass-card p-8 rounded-2xl group hover:bg-accent/5 transition-colors">
             <div className="rounded-lg bg-muted border border-border p-3 w-fit mb-4">
               <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
             </div>
             <h3 className="text-xl font-bold text-foreground mb-2">Member Profiles</h3>
             <p className="text-muted-foreground text-sm">Detailed profiles for every member, from bios to profile pictures.</p>
          </div>

          <div className="md:col-span-1 row-span-1 glass-card p-8 rounded-2xl group hover:bg-accent/5 transition-colors">
             <div className="rounded-lg bg-muted border border-border p-3 w-fit mb-4">
               <Share2 className="h-6 w-6 text-green-600 dark:text-green-400" />
             </div>
             <h3 className="text-xl font-bold text-foreground mb-2">Easy Sharing</h3>
             <p className="text-muted-foreground text-sm">Share your tree with family members and collaborate in real-time.</p>
          </div>

           {/* Wide Card */}
           <div className="md:col-span-2 row-span-1 glass-card p-8 rounded-2xl flex flex-col md:flex-row gap-6 items-center">
             <div className="flex-1">
               <div className="rounded-lg bg-muted border border-border p-3 w-fit mb-4">
                 <ImageIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
               </div>
               <h3 className="text-xl font-bold text-foreground mb-2">Media Integration</h3>
               <p className="text-muted-foreground text-sm">Upload and organize family photos and important documents.</p>
             </div>
             <div className="flex-1 border-l border-border pl-6 hidden md:block">
               <div className="rounded-lg bg-muted border border-border p-3 w-fit mb-4">
                 <Heart className="h-6 w-6 text-red-600 dark:text-red-400" />
               </div>
               <h3 className="text-xl font-bold text-foreground mb-2">Safe & Secure</h3>
               <p className="text-muted-foreground text-sm">Your family history is protected with industry-standard security.</p>
             </div>
           </div>

        </div>
      </div>
    </section>
  );
}
