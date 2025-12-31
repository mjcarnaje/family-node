import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { authClient } from "~/lib/auth-client";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { UserPlus, Eye, EyeOff, Network, Shield, Heart } from "lucide-react";

const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type SignUpForm = z.infer<typeof signUpSchema>;

export const Route = createFileRoute("/sign-up")({
  head: () => ({
    meta: [
      { title: "Create Account | Family Nodes" },
      { name: "description", content: "Create a free Family Nodes account to start building your family tree and preserving your family history for future generations." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: search.redirect as string | undefined,
  }),
});

function RouteComponent() {
  const router = useRouter();
  const { redirect } = Route.useSearch();
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: SignUpForm) => {
    setIsLoading(true);
    setAuthError("");

    try {
      const result = await authClient.signUp.email({
        email: data.email,
        password: data.password,
        name: data.name,
      });

      if (result.error) {
        setAuthError(result.error.message || "Sign up failed");
      } else {
        if (redirect) {
          window.location.href = redirect;
        } else {
          router.navigate({ to: "/dashboard" });
        }
      }
    } catch (err) {
      setAuthError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto relative min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0 bg-background">
      <aside
        className="relative hidden h-full flex-col bg-muted/30 p-12 text-foreground lg:flex border-r border-border overflow-hidden"
        aria-label="Family Nodes branding and information"
        role="complementary"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5" />
        <div className="absolute top-32 right-32 h-48 w-48 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-32 left-32 h-32 w-32 rounded-full bg-gradient-to-br from-accent/10 to-primary/10 blur-2xl" />

        <header className="relative z-20 flex items-center text-xl font-heading font-bold">
          <div
            className="mr-4 rounded-xl bg-primary/10 p-3 backdrop-blur-sm border border-primary/20 shadow-lg"
            aria-hidden="true"
          >
            <Network className="h-6 w-6 text-primary" />
          </div>
          <h1 className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Family Nodes
          </h1>
        </header>

        <main className="relative z-20 flex-1 flex flex-col justify-center">
          <div className="space-y-8 text-center max-w-md mx-auto">
            <h2 className="text-4xl font-heading font-extrabold leading-tight text-foreground">
              Start Your Legacy
            </h2>
            <p className="text-muted-foreground text-lg font-serif italic">
              Join thousands of families preserving their history for future generations.
            </p>

            <div
              className="flex justify-center space-x-12 pt-8"
              role="region"
              aria-label="Platform statistics"
            >
              <div className="text-center">
                <div className="text-2xl font-heading font-bold text-foreground">
                  5,000+
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-widest font-sans">
                  Families
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-heading font-bold text-foreground">
                  100K+
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-widest font-sans">
                  Members
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-heading font-bold text-foreground">
                  Free
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-widest font-sans">
                  To Start
                </div>
              </div>
            </div>

            <div className="pt-12 grid grid-cols-1 gap-4">
              <div className="flex items-center gap-3 bg-card p-4 rounded-xl border border-border shadow-sm">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Shield className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-foreground font-sans">Private & Secure</div>
                  <div className="text-xs text-muted-foreground font-sans">Your data stays in your family</div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-card p-4 rounded-xl border border-border shadow-sm">
                <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                  <Heart className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-foreground font-sans">Family Centric</div>
                  <div className="text-xs text-muted-foreground font-sans">Built for collaboration</div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="relative z-20 mt-auto text-center">
          <p className="text-sm text-muted-foreground font-sans uppercase tracking-widest">
            Begin Your Journey Today
          </p>
        </footer>
      </aside>

      <div className="lg:p-8 flex items-center">
        <div className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[400px]">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-3xl font-heading font-bold tracking-tight text-foreground">
              Create Account
            </h1>
            <p className="text-sm text-muted-foreground font-sans">
              Join Family Nodes and start building your tree
            </p>
          </div>
          
          <div className="grid gap-6 bg-card p-8 rounded-2xl border border-border shadow-sm">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="grid gap-5">
                  {authError && (
                    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                      <p className="text-sm text-destructive font-sans">{authError}</p>
                    </div>
                  )}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-sans font-semibold">Full Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="John Doe"
                            type="text"
                            className="rounded-xl border-border bg-background focus:ring-primary/20"
                            disabled={isLoading}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-sans font-semibold">Email</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="name@example.com"
                            type="email"
                            className="rounded-xl border-border bg-background focus:ring-primary/20"
                            disabled={isLoading}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-sans font-semibold">Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              placeholder="Create a password"
                              type={showPassword ? "text" : "password"}
                              className="rounded-xl border-border bg-background focus:ring-primary/20 pr-10"
                              disabled={isLoading}
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                              disabled={isLoading}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    disabled={isLoading}
                    type="submit"
                    className="w-full h-12 rounded-xl bg-primary text-white font-sans font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                  >
                    {isLoading ? "Creating account..." : "Create Account"}
                  </Button>
                </div>
              </form>
            </Form>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-3 text-muted-foreground font-sans tracking-widest">
                  Or
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              type="button"
              disabled={isLoading}
              onClick={() => authClient.signIn.social({ provider: "google" })}
              className="w-full h-12 rounded-xl border-border font-sans font-semibold hover:bg-accent/10"
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground font-sans">
            Already have an account?{" "}
            <Link
              to="/sign-in"
              className="text-primary font-bold hover:underline"
              search={{ redirect: undefined }}
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
