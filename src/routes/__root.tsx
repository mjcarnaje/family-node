/// <reference types="vite/client" />
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouterState,
} from "@tanstack/react-router";
import * as React from "react";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { DefaultCatchBoundary } from "~/components/DefaultCatchBoundary";
import { NotFound } from "~/components/NotFound";
import appCss from "~/styles/app.css?url";
import {
  seo,
  canonicalLink,
  organizationSchema,
  websiteSchema,
  combineSchemas,
  SITE_URL,
} from "~/utils/seo";
import { Header } from "~/components/Header";
import { ThemeProvider } from "~/components/theme-provider";
import { Toaster } from "~/components/ui/sonner";
import NProgress from "nprogress";
import "nprogress/nprogress.css";
import { Footer } from "~/components/Footer";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      // Theme color for mobile browsers
      { name: "theme-color", content: "#18181b" },
      { name: "msapplication-TileColor", content: "#18181b" },
      // Author and generator
      { name: "author", content: "Family Nodes" },
      { name: "generator", content: "TanStack Start" },
      // Language
      { httpEquiv: "content-language", content: "en" },
      ...seo({
        title: "Family Nodes | Interactive Family Tree Platform",
        description:
          "Create, visualize, and share your family history with Family Nodes. Build interactive family trees, connect with relatives, and preserve your family's legacy for generations to come.",
        keywords:
          "family tree, genealogy, family history, ancestry, interactive family tree, family connections, family heritage, genealogy software, family tree builder, ancestry visualization",
        url: "/",
      }),
    ],
    links: [
      // Canonical URL (homepage)
      canonicalLink("/"),
      // DNS prefetch and preconnect for performance
      { rel: "dns-prefetch", href: "https://res.cloudinary.com" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap" },
      { rel: "stylesheet", href: appCss },
      // Favicons
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/apple-touch-icon.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/favicon-32x32.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "/favicon-16x16.png",
      },
      { rel: "manifest", href: "/site.webmanifest" },
      { rel: "icon", href: "/favicon.ico" },
    ],
    scripts: [
      // Structured data (JSON-LD) for Organization and WebSite
      {
        type: "application/ld+json",
        children: combineSchemas(organizationSchema(), websiteSchema()),
      },
    ],
  }),
  errorComponent: (props) => {
    return (
      <RootDocument>
        <DefaultCatchBoundary {...props} />
      </RootDocument>
    );
  },
  notFoundComponent: () => <NotFound />,
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const routerState = useRouterState();
  const prevPathnameRef = React.useRef("");

  // Hide footer on dashboard routes
  const isDashboard = routerState.location.pathname.startsWith("/dashboard");

  React.useEffect(() => {
    const currentPathname = routerState.location.pathname;
    const pathnameChanged = prevPathnameRef.current !== currentPathname;

    if (pathnameChanged && routerState.status === "pending") {
      NProgress.start();
      prevPathnameRef.current = currentPathname;
    }

    if (routerState.status === "idle") {
      NProgress.done();
    }
  }, [routerState.status, routerState.location.pathname]);

  return (
    <html suppressHydrationWarning>
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Constants (must match ThemeProvider.tsx)
                const THEME_COOKIE_NAME = 'ui-theme';
                const COOKIE_EXPIRY_DAYS = 365;
                const MILLISECONDS_PER_DAY = 864e5;
                const DARK_MODE_MEDIA_QUERY = '(prefers-color-scheme: dark)';
                const THEME_CLASSES = { LIGHT: 'light', DARK: 'dark' };
                
                // Get theme from cookie
                let theme = document.cookie.match(new RegExp('(^| )' + THEME_COOKIE_NAME + '=([^;]+)'))?.[2];
                
                let resolvedTheme;
                let root = document.documentElement;
                
                // Clear any existing theme classes
                root.classList.remove(THEME_CLASSES.LIGHT, THEME_CLASSES.DARK);
                
                if (!theme || theme === 'system') {
                  // Use system preference for system theme or if no theme is set
                  resolvedTheme = window.matchMedia(DARK_MODE_MEDIA_QUERY).matches ? THEME_CLASSES.DARK : THEME_CLASSES.LIGHT;
                  
                  if (!theme) {
                    // Set cookie with system preference on first visit
                    const expires = new Date(Date.now() + COOKIE_EXPIRY_DAYS * MILLISECONDS_PER_DAY).toUTCString();
                    document.cookie = THEME_COOKIE_NAME + '=system; expires=' + expires + '; path=/; SameSite=Lax';
                  }
                } else {
                  resolvedTheme = theme;
                }
                
                root.classList.add(resolvedTheme);
                
                // Add data attribute for debugging
                root.setAttribute('data-theme', theme || 'system');
                root.setAttribute('data-resolved-theme', resolvedTheme);
              })();
            `,
          }}
        />
        <style>{`
          #nprogress .bar {
            background: var(--primary) !important;
            height: 3px;
          }
          #nprogress .peg {
            box-shadow: 0 0 10px var(--primary), 0 0 5px var(--primary);
          }
          #nprogress .spinner-icon {
            display: none;
          }
        `}</style>
      </head>
      <body>
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
          <div className={`min-h-screen bg-background ${isDashboard ? "" : "pb-20"}`}>
            <Header />
            <main>{children}</main>
            {!isDashboard && <Footer />}
          </div>
          {import.meta.env.DEV && (
            <>
              <TanStackRouterDevtools position="bottom-right" />
              <ReactQueryDevtools buttonPosition="bottom-left" />
            </>
          )}
          <Toaster />
          <Scripts />
        </ThemeProvider>
      </body>
    </html>
  );
}
