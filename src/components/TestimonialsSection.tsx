import { Card, CardContent } from "~/components/ui/card";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Star, Quote } from "lucide-react";
import { FadeIn } from "~/components/ui/fade-in";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Family Historian",
    discovery: "Found 4 generations",
    image: "SC",
    quote: "Family Node made it so easy to visualize my family's journey. I finally connected the dots between my great-grandparents' stories and our current generation.",
    rating: 5,
  },
  {
    name: "Marcus Johnson",
    role: "Genealogy Enthusiast",
    discovery: "Connected 12 cousins",
    image: "MJ",
    quote: "The collaborative features are incredible. My cousins and I have been building our tree together, and we've discovered so many relatives we never knew existed.",
    rating: 5,
  },
  {
    name: "Emily Rodriguez",
    role: "Memory Keeper",
    discovery: "Archived 200+ photos",
    image: "ER",
    quote: "Being able to attach photos and stories to each person in my tree has been a game-changer. It's not just names on a chart anymore; it's a living history.",
    rating: 5,
  },
  {
    name: "David Kim",
    role: "Legacy Builder",
    discovery: "Mapped 150+ nodes",
    image: "DK",
    quote: "The interactive node interface is exactly what I was looking for. It's clean, modern, and makes navigating through centuries of family history a breeze.",
    rating: 5,
  },
  {
    name: "Jessica Martinez",
    role: "Heritage Researcher",
    discovery: "Traced back to 1750",
    image: "JM",
    quote: "I've used many genealogy tools, but Family Node is the most intuitive. The automatic organization keeps everything tidy even as the tree grows complex.",
    rating: 5,
  },
  {
    name: "Alex Thompson",
    role: "New User",
    discovery: "Started in 10 mins",
    image: "AT",
    quote: "I was worried it would be too complicated, but I had my immediate family mapped out in minutes. The onboarding process is incredibly smooth.",
    rating: 5,
  },
];

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="w-full py-24 relative overflow-hidden bg-background">
      {/* Background Elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-7xl opacity-50 pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-b from-primary/10 to-transparent rounded-full blur-[120px]"></div>
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-t from-purple-500/10 to-transparent rounded-full blur-[120px]"></div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <FadeIn>
          <div className="flex flex-col items-center text-center mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 text-xs font-bold uppercase tracking-wide mb-6 border border-yellow-500/20">
              <Star className="h-3 w-3 fill-current" />
              Trusted by Families
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-6xl mb-6 text-foreground">
              Shared <span className="text-gradient-primary">Experiences</span>
            </h2>
            <p className="text-lg text-muted-foreground sm:text-xl max-w-2xl leading-relaxed">
              Discover how families are using Family Node to preserve their heritage 
              and connect with their roots.
            </p>
          </div>
        </FadeIn>

        {/* Masonry-ish Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <FadeIn key={index} delay={index * 100} className={`h-full ${index === 1 || index === 4 ? 'lg:translate-y-8' : ''}`}>
              <div className="bg-card/40 backdrop-blur-sm border border-border p-8 rounded-2xl h-full flex flex-col relative group hover:bg-card/60 transition-colors">
                {/* Quote Icon Background */}
                <div className="absolute top-6 right-8 opacity-5 group-hover:opacity-10 transition-opacity">
                   <Quote className="h-16 w-16 text-primary rotate-12" />
                </div>
                
                <div className="flex gap-1 mb-6">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-yellow-500 text-yellow-500"
                    />
                  ))}
                </div>

                <p className="text-foreground/90 mb-8 text-lg leading-relaxed relative z-10 font-medium">
                  "{testimonial.quote}"
                </p>

                <div className="mt-auto flex items-center gap-4 border-t border-border pt-6">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center font-bold text-white text-sm shadow-lg">
                    {testimonial.image}
                  </div>
                  <div>
                    <div className="font-bold text-foreground text-sm">{testimonial.name}</div>
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mt-0.5">
                      {testimonial.role}
                    </div>
                  </div>
                </div>
                
                {/* Discovery Badge */}
                 <div className="absolute -bottom-3 right-6 bg-primary/10 border border-primary/20 text-primary text-xs font-bold px-3 py-1 rounded-full backdrop-blur-md">
                    {testimonial.discovery}
                 </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
