import { useState, useCallback, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Share2,
  GitCompare,
  Plus,
  UserPlus,
  Heart,
  Link2,
  Download,
  Upload,
  MoreHorizontal,
  Settings,
  History,
  ChevronDown,
  Users,
  Layers,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "~/components/ui/dropdown-menu";
import { FamilyTreeVisualization } from "~/components/FamilyTreeVisualization";
import { getTreeVisualizationQuery } from "~/queries/tree-visualization";
import { AddFamilyMemberDialog } from "~/components/AddFamilyMemberDialog";
import { AddMarriageDialog } from "~/components/AddMarriageDialog";
import { AddRelationshipDialog } from "~/components/AddRelationshipDialog";
import { TreeSettingsDialog } from "~/components/TreeSettingsDialog";
import { TreeActivityLogDialog } from "~/components/TreeActivityLogDialog";
import { TreeExportDialog } from "~/components/TreeExportDialog";
import { TreeSwitcher } from "~/components/TreeSwitcher";
import { TreeComparisonSelector } from "~/components/TreeComparisonSelector";
import { FamilyTreeSearch } from "~/components/FamilyTreeSearch";
import { GenealogyImportDialog } from "~/components/GenealogyImportDialog";
import { TreeSharingDialog } from "~/components/TreeSharingDialog";
import { setCurrentTreeIdFn } from "~/fn/current-tree";
import { useTreeStatistics } from "~/hooks/useTreeStatistics";

export const Route = createFileRoute("/dashboard/trees/$treeId")({
  loader: async ({ params, context }) => {
    // Could prefetch tree data here
  },
  component: TreeVisualizationPage,
});

function TreeVisualizationPage() {
  const { treeId } = Route.useParams();
  const queryClient = useQueryClient();
  const { data: treeData, isLoading } = useQuery(
    getTreeVisualizationQuery(treeId)
  );
  const { data: statistics } = useTreeStatistics(treeId);

  // Dialog open states
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addMarriageOpen, setAddMarriageOpen] = useState(false);
  const [addRelationshipOpen, setAddRelationshipOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // State for export functionality - stores the getter function for the viewport element
  const [getViewportElement, setGetViewportElement] = useState<
    (() => HTMLElement | null) | null
  >(null);

  // Callback to receive the viewport getter from FamilyTreeVisualization
  const handleViewportRef = useCallback(
    (getter: () => HTMLElement | null) => {
      setGetViewportElement(() => getter);
    },
    []
  );

  // Auto-save the current tree selection when viewing a tree
  const setCurrentTreeMutation = useMutation({
    mutationFn: (treeId: string) => setCurrentTreeIdFn({ data: { treeId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-tree-id"] });
    },
  });

  // Auto-save the current tree ID when the page loads
  useEffect(() => {
    setCurrentTreeMutation.mutate(treeId);
  }, [treeId]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Compact Header */}
      <div className="flex-shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Navigation & Tree Info */}
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="ghost" size="icon" className="shrink-0" asChild>
                <Link to="/dashboard/trees">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              
              <div className="min-w-0">
                <TreeSwitcher currentTreeId={treeId} />
              </div>

              {/* Inline Stats - Desktop only */}
              {statistics && (
                <div className="hidden lg:flex items-center gap-3 text-sm text-muted-foreground border-l pl-4 ml-2">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    <span>{statistics.memberStats.totalMembers} members</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Layers className="h-4 w-4" />
                    <span>{statistics.generationCount} generations</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Heart className="h-4 w-4" />
                    <span>{statistics.relationshipStats.totalMarriages} marriages</span>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {/* Search - Always visible */}
              <FamilyTreeSearch familyTreeId={treeId} />

              {/* Add Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="default" size="sm" className="gap-1.5">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Add</span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Add to Tree</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setAddMemberOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Family Member
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setAddMarriageOpen(true)}>
                    <Heart className="h-4 w-4 mr-2" />
                    Marriage
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setAddRelationshipOpen(true)}>
                    <Link2 className="h-4 w-4 mr-2" />
                    Parent-Child Relationship
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Tools Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="hidden sm:inline">Tools</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel>Import & Export</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setImportOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Import from Genealogy DB
                  </DropdownMenuItem>
                  {getViewportElement && (
                    <DropdownMenuItem onSelect={() => setExportOpen(true)}>
                      <Download className="h-4 w-4 mr-2" />
                      Export Tree
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Compare</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setCompareOpen(true)}>
                    <GitCompare className="h-4 w-4 mr-2" />
                    Compare with Another Tree
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>History & Settings</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setActivityOpen(true)}>
                    <History className="h-4 w-4 mr-2" />
                    Activity Log
                  </DropdownMenuItem>
                  {treeData?.tree && (
                    <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>
                      <Settings className="h-4 w-4 mr-2" />
                      Tree Settings
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Share Button - Prominent */}
              <TreeSharingDialog
                familyTreeId={treeId}
                treeName={treeData?.treeName || "Family Tree"}
                trigger={
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Share2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Share</span>
                  </Button>
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tree Visualization - Takes remaining space */}
      <div className="flex-1 min-h-0">
        <FamilyTreeVisualization
          familyTreeId={treeId}
          onViewportRef={handleViewportRef}
          className="h-full rounded-none border-0"
        />
      </div>

      {/* State-controlled Dialogs */}
      <AddFamilyMemberDialog
        familyTreeId={treeId}
        existingMembers={treeData?.members || []}
        open={addMemberOpen}
        onOpenChange={setAddMemberOpen}
      />
      <AddMarriageDialog
        familyTreeId={treeId}
        existingMembers={treeData?.members || []}
        open={addMarriageOpen}
        onOpenChange={setAddMarriageOpen}
      />
      <AddRelationshipDialog
        familyTreeId={treeId}
        existingMembers={treeData?.members || []}
        open={addRelationshipOpen}
        onOpenChange={setAddRelationshipOpen}
      />
      <GenealogyImportDialog
        familyTreeId={treeId}
        treeName={treeData?.treeName || "Family Tree"}
        onImportComplete={() => {
          queryClient.invalidateQueries({
            queryKey: ["tree-visualization", treeId],
          });
        }}
        open={importOpen}
        onOpenChange={setImportOpen}
      />
      {getViewportElement && (
        <TreeExportDialog
          treeName={treeData?.treeName || "Family Tree"}
          getViewportElement={getViewportElement}
          open={exportOpen}
          onOpenChange={setExportOpen}
        />
      )}
      <TreeComparisonSelector
        currentTreeId={treeId}
        open={compareOpen}
        onOpenChange={setCompareOpen}
      />
      <TreeActivityLogDialog
        familyTreeId={treeId}
        open={activityOpen}
        onOpenChange={setActivityOpen}
      />
      {treeData?.tree && (
        <TreeSettingsDialog
          tree={treeData.tree}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
        />
      )}
    </div>
  );
}
