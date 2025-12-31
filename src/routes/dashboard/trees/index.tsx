import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { Plus, TreeDeciduous, Eye, Users2, Calendar, GitCompare } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelContent,
} from "~/components/ui/panel";
import { TreeComparisonSelector } from "~/components/TreeComparisonSelector";
import { getMyFamilyTreesFn } from "~/fn/family-trees";

// Query options for fetching user's family trees
const getMyTreesQuery = () =>
  queryOptions({
    queryKey: ["my-family-trees"],
    queryFn: () => getMyFamilyTreesFn(),
  });

export const Route = createFileRoute("/dashboard/trees/")({
  loader: async ({ context }) => {
    // Prefetch the trees data
  },
  component: TreesListPage,
});

function TreesListPage() {
  const { data: trees, isLoading, error } = useQuery(getMyTreesQuery());

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <TreeDeciduous className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">Loading family trees...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-red-500">Failed to load family trees</p>
            <p className="text-sm text-muted-foreground mt-2">
              {error.message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Family Trees
            </h1>
            <p className="text-muted-foreground mt-2">
              View and manage your family trees with interactive visualization.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {trees && trees.length >= 2 && (
              <TreeComparisonSelector />
            )}
            <Button asChild>
              <Link to="/dashboard/trees/new">
                <Plus className="h-4 w-4 mr-2" />
                Create New Tree
              </Link>
            </Button>
          </div>
        </div>

        {/* Trees Grid */}
        {trees && trees.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trees.map((tree) => (
              <Panel
                key={tree.id}
                className="hover:shadow-lg hover:border-primary/40 transition-all duration-300 group hover:-translate-y-1"
              >
                <Link
                  to="/dashboard/trees/$treeId"
                  params={{ treeId: tree.id }}
                  className="block focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-xl"
                >
                  <PanelHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <TreeDeciduous className="h-5 w-5" />
                        </div>
                        <PanelTitle className="text-lg group-hover:text-primary transition-colors">
                          {tree.name}
                        </PanelTitle>
                      </div>
                      <Eye className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </PanelHeader>
                  <PanelContent>
                    {tree.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {tree.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Users2 className="h-3.5 w-3.5" />
                        <span>
                          {tree.memberCount} {tree.memberCount === 1 ? "member" : "members"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                          {new Date(tree.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            tree.isPublic
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          {tree.isPublic ? "Public" : "Private"}
                        </span>
                      </div>
                    </div>
                  </PanelContent>
                </Link>
              </Panel>
            ))}
          </div>
        ) : (
          <Panel className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <TreeDeciduous className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground">
                No family trees yet
              </h3>
              <p className="text-sm text-muted-foreground/80 mt-2 max-w-sm">
                Create your first family tree to start documenting your family
                history with interactive visualization.
              </p>
              <Button asChild className="mt-6">
                <Link to="/dashboard/trees/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Tree
                </Link>
              </Button>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}
