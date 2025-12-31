import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, GitCompare } from "lucide-react";
import { Button } from "~/components/ui/button";
import { TreeComparisonView } from "~/components/TreeComparisonView";

export const Route = createFileRoute("/dashboard/trees/compare/$treeId1/$treeId2")({
  component: TreeComparisonPage,
});

function TreeComparisonPage() {
  const { treeId1, treeId2 } = Route.useParams();

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/dashboard/trees">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <GitCompare className="h-6 w-6 text-primary" />
                Tree Comparison
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Side-by-side comparison of family trees
              </p>
            </div>
          </div>
        </div>

        {/* Comparison View */}
        <TreeComparisonView treeId1={treeId1} treeId2={treeId2} />
      </div>
    </div>
  );
}
