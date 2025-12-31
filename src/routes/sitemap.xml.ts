import { createFileRoute } from "@tanstack/react-router";
import { findPublicFamilyTrees } from "~/data-access/family-trees";
import { SITE_URL } from "~/utils/seo";

/**
 * GET /sitemap.xml
 *
 * Generates a dynamic XML sitemap including:
 * - Static pages (home, sign-in, sign-up)
 * - All public family trees
 *
 * This helps search engines discover and index all public content.
 */
export const Route = createFileRoute("/sitemap/xml")({
  server: {
    handlers: {
      GET: async () => {
        try {
          // Fetch all public family trees
          const publicTrees = await findPublicFamilyTrees();

          // Static pages with their priorities and change frequencies
          const staticPages = [
            { url: "/", priority: "1.0", changefreq: "daily" },
            { url: "/sign-in", priority: "0.5", changefreq: "monthly" },
            { url: "/sign-up", priority: "0.5", changefreq: "monthly" },
          ];

          // Build XML sitemap
          const urlEntries = [
            // Static pages
            ...staticPages.map(
              (page) => `
  <url>
    <loc>${SITE_URL}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
            ),
            // Dynamic public tree pages
            ...publicTrees.map(
              (tree) => `
  <url>
    <loc>${SITE_URL}/tree/${tree.id}</loc>
    <lastmod>${tree.updatedAt ? new Date(tree.updatedAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
            ),
          ];

          const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">${urlEntries.join("")}
</urlset>`;

          return new Response(sitemap, {
            status: 200,
            headers: {
              "Content-Type": "application/xml",
              "Cache-Control": "public, max-age=3600, s-maxage=3600",
            },
          });
        } catch (error) {
          console.error("Error generating sitemap:", error);

          // Return a minimal sitemap on error
          const fallbackSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <priority>1.0</priority>
  </url>
</urlset>`;

          return new Response(fallbackSitemap, {
            status: 200,
            headers: {
              "Content-Type": "application/xml",
            },
          });
        }
      },
    },
  },
});
