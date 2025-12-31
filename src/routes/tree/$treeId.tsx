import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Home,
  ArrowLeft,
  Lock,
  Users,
  Share2,
  ExternalLink,
  TreeDeciduous,
} from "lucide-react";
import { Page } from "~/components/Page";
import { AppBreadcrumb } from "~/components/AppBreadcrumb";
import { Button } from "~/components/ui/button";
import { publicFamilyTreeQueryOptions } from "~/queries/public-family-tree";
import { PublicFamilyTreeVisualization } from "~/components/PublicFamilyTreeVisualization";
import { seo } from "~/utils/seo";
import { toast } from "sonner";
import type { PublicTreeVisualizationData } from "~/fn/public-family-tree";

export const Route = createFileRoute("/tree/$treeId")({
  loader: async ({ context: { queryClient }, params: { treeId } }) => {
    // Prefetch and return the public tree data
    try {
      const data = await queryClient.fetchQuery(publicFamilyTreeQueryOptions(treeId));
      return data;
    } catch {
      // Return null if the tree is not found or private
      return null;
    }
  },
  head: ({ loaderData }) => {
    // Get tree name from loader data for SEO
    const treeData = loaderData as PublicTreeVisualizationData | null;
    const treeName = treeData?.treeName || "Public Family Tree";
    const memberCount = treeData?.members?.length || 0;
    const description = treeData?.treeDescription
      ? `${treeData.treeDescription} - Explore this public family tree with ${memberCount} members.`
      : `Explore the ${treeName} family tree and discover the family history and connections with ${memberCount} members.`;

    return {
      meta: [
        ...seo({
          title: `${treeName} | Family Nodes`,
          description,
          keywords:
            "family tree, genealogy, family history, public tree, ancestry, family connections",
        }),
      ],
    };
  },
  component: PublicTreePage,
});

function PublicTreePage() {
  const { treeId } = Route.useParams();
  const {
    data: treeData,
    isLoading,
    error,
  } = useQuery(publicFamilyTreeQueryOptions(treeId));

  // Handle share functionality
  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: treeData?.treeName || "Family Tree",
          text: `Check out this family tree: ${treeData?.treeName}`,
          url,
        });
      } catch (err) {
        // User cancelled or error - fall back to clipboard
        copyToClipboard(url);
      }
    } else {
      copyToClipboard(url);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Link copied to clipboard!");
  };

  // Loading state
  if (isLoading) {
    return (
      <Page>
        <div className="space-y-6 max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted/50 rounded w-1/3"></div>
            <div className="h-8 bg-muted/50 rounded w-1/2"></div>
            <div className="h-[600px] bg-muted/50 rounded"></div>
          </div>
        </div>
      </Page>
    );
  }

  // Error state - tree not found or private
  if (error || !treeData) {
    const isPrivate = error?.message?.includes("private");

    return (
      <Page>
        <div className="text-center space-y-4 py-12">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {isPrivate ? "Private Family Tree" : "Family Tree Not Available"}
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            {isPrivate
              ? "This family tree is set to private. Only the owner and invited collaborators can view it."
              : "This family tree doesn't exist or is no longer available."}
          </p>
          <div className="flex justify-center gap-4">
            <Button asChild variant="outline">
              <Link to="/" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </Page>
    );
  }

  const { tree, members, relationships, marriages, treeName, treeDescription } =
    treeData;

  return (
    <Page>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <AppBreadcrumb
          items={[
            { label: "Home", href: "/", icon: Home },
            { label: "Public Trees", icon: TreeDeciduous },
            { label: treeName || "Family Tree" },
          ]}
        />

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-foreground">{treeName}</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                <Users className="h-3 w-3" />
                Public
              </span>
            </div>
            {treeDescription && (
              <p className="text-muted-foreground max-w-2xl">
                {treeDescription}
              </p>
            )}
            <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {members.length} member{members.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>

        {/* Public notice banner */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <ExternalLink className="h-5 w-5 text-blue-500 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Public Family Tree
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                You're viewing a public family tree. You can explore the family
                structure, view member profiles, but cannot make any edits.
              </p>
            </div>
          </div>
        </div>

        {/* Tree Visualization */}
        <PublicFamilyTreeVisualization
          familyTreeId={treeId}
          treeName={treeName || "Family Tree"}
          treeDescription={treeDescription}
          members={members}
          relationships={relationships}
          marriages={marriages}
        />

        {/* Back button */}
        <div className="flex justify-center pb-8">
          <Button asChild variant="outline">
            <Link to="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>
      </div>
    </Page>
  );
}
