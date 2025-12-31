import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { authClient } from "~/lib/auth-client";
import { ModeToggle } from "./mode-toggle";
import { Button, buttonVariants } from "./ui/button";
import {
  LogOut,
  User,
  Menu,
  Settings,
  LayoutDashboard,
  Star,
  Info,
  Zap,
} from "lucide-react";

function Logo({ className }: { className?: string }) {
  return (
    <img
      src="/icon.svg"
      alt="Family Node"
      className={className}
    />
  );
}
import { UserAvatar } from "./UserAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { useState } from "react";
import * as React from "react";
import { cn } from "~/lib/utils";

const dashboardLink = {
  title: "Dashboard",
  href: "/dashboard",
  icon: LayoutDashboard,
};

const navItems = [
  {
    title: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

export function Header() {
  const { data: session, isPending } = authClient.useSession();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await authClient.signOut();
    navigate({ to: "/" });
  };

  const scrollToSection = (sectionId: string) => async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (currentPath !== "/") {
      await navigate({ to: "/" });
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    } else {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-screen-2xl mx-auto px-8 flex h-14 items-center">
        <div className="mr-4 flex gap-16">
          <Link to="/" className="flex items-center gap-2 group">
            <Logo className="h-6 w-6 shrink-0 transition-transform group-hover:scale-105" />
            <span className="hidden font-heading font-bold text-sm sm:inline-block whitespace-nowrap leading-none">
              Family Node
            </span>
          </Link>

          {session ? (
            <nav className="hidden md:flex items-center gap-2 text-sm">
              <Link
                to={dashboardLink.href}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 group ${
                  currentPath.startsWith("/dashboard")
                    ? "text-foreground"
                    : "text-foreground/70 hover:text-foreground"
                }`}
              >
                <LayoutDashboard
                  className={`h-4 w-4 relative z-10 transition-transform ${
                    currentPath.startsWith("/dashboard")
                      ? "scale-110"
                      : "group-hover:scale-110"
                  }`}
                />
                <span className="relative z-10">{dashboardLink.title}</span>
                <span
                  className={`absolute inset-0 rounded-lg bg-primary/5 transition-opacity duration-200 ${
                    currentPath.startsWith("/dashboard")
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100"
                  }`}
                ></span>
                <span
                  className={`absolute inset-0 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 blur-sm transition-opacity duration-200 ${
                    currentPath.startsWith("/dashboard")
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100"
                  }`}
                ></span>
              </Link>
            </nav>
          ) : (
            <nav className="hidden md:flex items-center gap-2 text-sm">
              <Link
                to="/"
                onClick={scrollToSection("features")}
                className="relative flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 group text-foreground/70 hover:text-foreground"
              >
                <span className="relative z-10">Features</span>
                <span className="absolute inset-0 rounded-lg bg-primary/5 transition-opacity duration-200 opacity-0 group-hover:opacity-100"></span>
                <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 blur-sm transition-opacity duration-200 opacity-0 group-hover:opacity-100"></span>
              </Link>
              <Link
                to="/"
                onClick={scrollToSection("how-it-works")}
                className="relative flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 group text-foreground/70 hover:text-foreground"
              >
                <span className="relative z-10">How It Works</span>
                <span className="absolute inset-0 rounded-lg bg-primary/5 transition-opacity duration-200 opacity-0 group-hover:opacity-100"></span>
                <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 blur-sm transition-opacity duration-200 opacity-0 group-hover:opacity-100"></span>
              </Link>
              <Link
                to="/"
                onClick={scrollToSection("faq")}
                className="relative flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 group text-foreground/70 hover:text-foreground"
              >
                <span className="relative z-10">FAQ</span>
                <span className="absolute inset-0 rounded-lg bg-primary/5 transition-opacity duration-200 opacity-0 group-hover:opacity-100"></span>
                <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 blur-sm transition-opacity duration-200 opacity-0 group-hover:opacity-100"></span>
              </Link>
            </nav>
          )}
        </div>

        {/* Mobile menu */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="pr-0 bg-background/80 backdrop-blur-md border-r border-border/50"
          >
            <div className="px-7 pt-8 h-full flex flex-col">
              <Link
                to="/"
                className="flex items-center gap-2 mb-8"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Logo className="h-7 w-7 shrink-0" />
                <span className="font-heading font-bold text-base whitespace-nowrap leading-none">
                  Family Node
                </span>
              </Link>
              <nav className="flex flex-col gap-2">
                {session ? (
                  navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      item.href === "/dashboard"
                        ? currentPath === "/dashboard"
                        : currentPath.startsWith(item.href);

                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                          isActive
                            ? "bg-primary/20 text-primary border border-primary/20 shadow-[0_0_20px_rgba(var(--primary),0.1)]"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                        )}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Icon
                          className={cn(
                            "h-5 w-5 transition-transform",
                            isActive && "scale-110"
                          )}
                        />
                        <span>{item.title}</span>
                      </Link>
                    );
                  })
                ) : (
                  <>
                    <Link
                      to="/"
                      onClick={(e) => {
                        setMobileMenuOpen(false);
                        scrollToSection("features")(e as any);
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-white/5"
                    >
                      <Zap className="h-5 w-5" />
                      <span>Features</span>
                    </Link>
                    <Link
                      to="/"
                      onClick={(e) => {
                        setMobileMenuOpen(false);
                        scrollToSection("how-it-works")(e as any);
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-white/5"
                    >
                      <Info className="h-5 w-5" />
                      <span>How It Works</span>
                    </Link>
                    <Link
                      to="/"
                      onClick={(e) => {
                        setMobileMenuOpen(false);
                        scrollToSection("faq")(e as any);
                      }}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-white/5"
                    >
                      <Star className="h-5 w-5" />
                      <span>FAQ</span>
                    </Link>
                    <div className="mt-4 pt-4 border-t border-border flex flex-col gap-2">
                      <Link
                        to="/sign-in"
                        search={{ redirect: undefined }}
                        className={cn(buttonVariants({ variant: "outline" }), "w-full justify-center")}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Sign In
                      </Link>
                      <Link
                        to="/sign-up"
                        search={{ redirect: undefined }}
                        className={cn(buttonVariants({ variant: "default" }), "w-full justify-center")}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Sign Up
                      </Link>
                    </div>
                  </>
                )}
              </nav>
            </div>
          </SheetContent>
        </Sheet>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none"></div>
          <nav className="flex items-center gap-4">
            {isPending ? (
              <div className="flex h-9 w-9 items-center justify-center">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : session ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-8 w-8 rounded-full"
                    >
                      <UserAvatar
                        imageKey={session?.user?.image || null}
                        name={session?.user?.name || null}
                        email={session?.user?.email || null}
                        size="sm"
                      />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          Account
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {session.user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link
                        to="/profile/$userId"
                        params={{ userId: session.user.id }}
                      >
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard/settings">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link
                  className={buttonVariants({ variant: "outline" })}
                  to="/sign-in"
                  search={{ redirect: undefined }}
                >
                  Sign In
                </Link>
                <Link
                  className={buttonVariants({ variant: "default" })}
                  to="/sign-up"
                  search={{ redirect: undefined }}
                >
                  Sign Up
                </Link>
              </>
            )}
            <ModeToggle />
          </nav>
        </div>
      </div>
    </header>
  );
}
