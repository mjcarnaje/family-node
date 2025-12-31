/**
 * SEO Configuration for Family Nodes
 * Generates comprehensive meta tags for optimal search engine optimization
 */

// Site-wide constants
export const SITE_NAME = "Family Nodes";
export const SITE_URL = "https://familynodes.com";
export const TWITTER_HANDLE = "@familynodes";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og.png`;
export const DEFAULT_LOCALE = "en_US";

interface SeoConfig {
  title: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: "website" | "article" | "profile";
  noindex?: boolean;
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
}

interface MetaTag {
  title?: string;
  name?: string;
  property?: string;
  content?: string;
  charSet?: string;
}

/**
 * Generates comprehensive SEO meta tags for a page
 *
 * @example
 * // Basic usage
 * seo({
 *   title: "My Page",
 *   description: "Page description",
 * })
 *
 * @example
 * // With custom image and URL
 * seo({
 *   title: "Family Tree",
 *   description: "View this family tree",
 *   image: "https://example.com/tree.png",
 *   url: "/tree/123",
 * })
 */
export const seo = ({
  title,
  description,
  keywords,
  image,
  url,
  type = "website",
  noindex = false,
  publishedTime,
  modifiedTime,
  author,
}: SeoConfig): MetaTag[] => {
  // Use default image if none provided
  const ogImage = image || DEFAULT_OG_IMAGE;

  // Construct full URL
  const canonicalUrl = url
    ? (url.startsWith("http") ? url : `${SITE_URL}${url.startsWith("/") ? url : `/${url}`}`)
    : undefined;

  // Format title with site name
  const formattedTitle = title.includes(SITE_NAME)
    ? title
    : `${title} | ${SITE_NAME}`;

  const tags: MetaTag[] = [
    // Basic meta tags
    { title: formattedTitle },
    { name: "description", content: description },
    { name: "keywords", content: keywords },

    // Robots directives
    ...(noindex
      ? [{ name: "robots", content: "noindex, nofollow" }]
      : [{ name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" }]
    ),

    // Open Graph tags
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:type", content: type },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: ogImage },
    { property: "og:image:alt", content: `${title} - ${SITE_NAME}` },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:locale", content: DEFAULT_LOCALE },
    ...(canonicalUrl ? [{ property: "og:url", content: canonicalUrl }] : []),

    // Article-specific meta (for blog posts, etc.)
    ...(publishedTime ? [{ property: "article:published_time", content: publishedTime }] : []),
    ...(modifiedTime ? [{ property: "article:modified_time", content: modifiedTime }] : []),
    ...(author ? [{ property: "article:author", content: author }] : []),

    // Twitter Card tags
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:site", content: TWITTER_HANDLE },
    { name: "twitter:creator", content: TWITTER_HANDLE },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: ogImage },
    { name: "twitter:image:alt", content: `${title} - ${SITE_NAME}` },
  ];

  // Filter out undefined content
  return tags.filter((tag) =>
    tag.title !== undefined ||
    tag.content !== undefined
  );
};

/**
 * Generates canonical link tag
 */
export const canonicalLink = (path: string) => ({
  rel: "canonical",
  href: path.startsWith("http") ? path : `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`,
});

/**
 * Generates JSON-LD structured data for Organization
 */
export const organizationSchema = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/android-chrome-512x512.png`,
  sameAs: [
    `https://twitter.com/${TWITTER_HANDLE.replace("@", "")}`,
  ],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    url: `${SITE_URL}/contact`,
  },
});

/**
 * Generates JSON-LD structured data for WebSite with SearchAction
 */
export const websiteSchema = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description: "Create, visualize, and share your family history with Family Nodes. Build interactive family trees and preserve your family's legacy.",
  publisher: {
    "@type": "Organization",
    name: SITE_NAME,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/android-chrome-512x512.png`,
    },
  },
});

/**
 * Generates JSON-LD structured data for SoftwareApplication
 */
export const softwareApplicationSchema = () => ({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  applicationCategory: "LifestyleApplication",
  applicationSubCategory: "Genealogy",
  operatingSystem: "Web Browser",
  url: SITE_URL,
  description: "Interactive Family Tree Platform for visualizing and preserving family history",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "150",
    bestRating: "5",
    worstRating: "1",
  },
});

/**
 * Generates JSON-LD structured data for FAQPage
 */
export const faqSchema = (faqs: Array<{ question: string; answer: string }>) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
});

/**
 * Generates JSON-LD structured data for BreadcrumbList
 */
export const breadcrumbSchema = (
  items: Array<{ name: string; url?: string }>
) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    ...(item.url && { item: item.url.startsWith("http") ? item.url : `${SITE_URL}${item.url}` }),
  })),
});

/**
 * Generates JSON-LD structured data for Person (profile pages)
 */
export const personSchema = ({
  name,
  url,
  image,
  description,
}: {
  name: string;
  url: string;
  image?: string;
  description?: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "Person",
  name,
  url: url.startsWith("http") ? url : `${SITE_URL}${url}`,
  ...(image && { image }),
  ...(description && { description }),
});

/**
 * Combines multiple JSON-LD schemas into a single script tag content
 */
export const combineSchemas = (...schemas: object[]) =>
  JSON.stringify(schemas.length === 1 ? schemas[0] : schemas);
