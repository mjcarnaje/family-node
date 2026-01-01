import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Home,
  ArrowLeft,
  Lock,
  Users,
  Share2,
  ExternalLink,
  TreeDeciduous,
  KeyRound,
} from "lucide-react";
import { Page } from "~/components/Page";
import { AppBreadcrumb } from "~/components/AppBreadcrumb";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { publicTreeInfoBySlugQueryOptions } from "~/queries/public-family-tree";
import { PublicFamilyTreeVisualization } from "~/components/PublicFamilyTreeVisualization";
import { useGetPublicTreeBySlug } from "~/hooks/usePublicFamilyTree";
import {
  seo,
  canonicalLink,
  breadcrumbSchema,
  combineSchemas,
  SITE_URL,
} from "~/utils/seo";
import { toast } from "sonner";
import type { PublicTreeVisualizationData } from "~/fn/public-family-tree";

export const Route = createFileRoute("/tree/public/$slug")({
  head: ({ params }) => {
    const treeUrl = `/tree/public/${params.slug}`;

    return {
      meta: [
        ...seo({
          title: "Public Family Tree",
          description: "Explore this public family tree and discover the family history and connections.",
          url: treeUrl,
          keywords: "family tree, genealogy, family history, public tree, ancestry",
        }),
      ],
      links: [canonicalLink(treeUrl)],
      scripts: [
        {
          type: "application/ld+json",
          children: combineSchemas(
            breadcrumbSchema([
              { name: "Home", url: "/" },
              { name: "Public Trees" },
              { name: "Family Tree" },
            ])
          ),
        },
      ],
    };
  },
  component: PublicTreeBySlugPage,
});

function PublicTreeBySlugPage() {
  const { slug } = Route.useParams();
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [treeData, setTreeData] = useState<PublicTreeVisualizationData | null>(null);

  // First, get tree info to check if it exists and requires PIN
  const {
    data: treeInfo,
    isLoading: loadingInfo,
    error: infoError,
  } = useQuery(publicTreeInfoBySlugQueryOptions(slug));

  // Mutation to fetch full tree data with optional PIN
  const getTreeMutation = useGetPublicTreeBySlug();

  // Auto-fetch tree data if no PIN required
  const shouldAutoFetch = treeInfo?.found && !treeInfo.requiresPin && !treeData;

  // Fetch tree data without PIN if not required
  if (shouldAutoFetch && !getTreeMutation.isPending) {
    getTreeMutation.mutate(
      { slug },
      {
        onSuccess: (data) => setTreeData(data),
      }
    );
  }

  // Handle PIN submission
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);

    if (!pin.trim()) {
      setPinError("Please enter the PIN");
      return;
    }

    getTreeMutation.mutate(
      { slug, pin },
      {
        onSuccess: (data) => {
          setTreeData(data);
          setPinError(null);
        },
        onError: (error) => {
          if (error.message.includes("Invalid PIN")) {
            setPinError("Invalid PIN. Please try again.");
          } else {
            setPinError(error.message);
          }
        },
      }
    );
  };

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
      } catch {
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
  if (loadingInfo) {
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

  // Tree not found
  if (infoError || !treeInfo?.found) {
    return (
      <Page>
        <div className="text-center space-y-4 py-12">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <TreeDeciduous className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Family Tree Not Found
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            This family tree doesn't exist, has been made private, or the link may have changed.
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

  // PIN required but not yet entered
  if (treeInfo.requiresPin && !treeData) {
    return (
      <Page>
        <div className="max-w-md mx-auto py-12">
          <div className="text-center space-y-4 mb-8">
            <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <KeyRound className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {treeInfo.treeName || "Protected Family Tree"}
            </h1>
            {treeInfo.treeDescription && (
              <p className="text-muted-foreground">
                {treeInfo.treeDescription}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              This family tree is protected with a PIN. Enter the PIN to view.
            </p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin">Enter PIN</Label>
              <Input
                id="pin"
                type="password"
                placeholder="Enter PIN code"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setPinError(null);
                }}
                maxLength={8}
                className={pinError ? "border-destructive" : ""}
                autoFocus
              />
              {pinError && (
                <p className="text-sm text-destructive">{pinError}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={getTreeMutation.isPending}
            >
              {getTreeMutation.isPending ? "Verifying..." : "View Family Tree"}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <Button asChild variant="ghost" size="sm">
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

  // Loading tree data
  if (!treeData && getTreeMutation.isPending) {
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

  // Tree data loaded successfully
  if (!treeData) {
    return null; // Should not reach here
  }

  const { members, relationships, marriages, treeName, treeDescription, tree } = treeData;

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
          familyTreeId={tree.id}
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
