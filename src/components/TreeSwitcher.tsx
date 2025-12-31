import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { TreeDeciduous, ChevronDown, Plus, Check, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Button } from "~/components/ui/button";
import { Link } from "@tanstack/react-router";
import { getMyFamilyTreesFn } from "~/fn/family-trees";
import { setCurrentTreeIdFn } from "~/fn/current-tree";
import { queryOptions } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "~/lib/utils";

// Query options for fetching all user's trees
const getMyTreesQuery = () =>
  queryOptions({
    queryKey: ["my-family-trees"],
    queryFn: () => getMyFamilyTreesFn(),
  });

interface TreeSwitcherProps {
  currentTreeId: string;
  className?: string;
}

export function TreeSwitcher({ currentTreeId, className }: TreeSwitcherProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: trees, isLoading: isLoadingTrees } = useQuery(getMyTreesQuery());

  const setCurrentTreeMutation = useMutation({
    mutationFn: (treeId: string) => setCurrentTreeIdFn({ data: { treeId } }),
    onSuccess: (treeId) => {
      // Update the cookie/cache for current tree
      queryClient.invalidateQueries({ queryKey: ["current-tree-id"] });
      // Navigate to the selected tree
      navigate({
        to: "/dashboard/trees/$treeId",
        params: { treeId },
      });
      toast.success("Switched family tree");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to switch tree");
    },
  });

  const currentTree = trees?.find((tree) => tree.id === currentTreeId);

  const handleTreeChange = (treeId: string) => {
    if (treeId === currentTreeId) return;
    setCurrentTreeMutation.mutate(treeId);
  };

  if (isLoadingTrees) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading trees...</span>
      </div>
    );
  }

  if (!trees || trees.length === 0) {
    return (
      <Button variant="outline" size="sm" asChild className={className}>
        <Link to="/dashboard/trees/new">
          <Plus className="h-4 w-4 mr-2" />
          Create Tree
        </Link>
      </Button>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Select
        value={currentTreeId}
        onValueChange={handleTreeChange}
        disabled={setCurrentTreeMutation.isPending}
      >
        <SelectTrigger
          className="w-[200px] sm:w-[250px]"
          aria-label="Switch family tree"
        >
          <div className="flex items-center gap-2">
            <TreeDeciduous className="h-4 w-4 text-primary shrink-0" />
            <SelectValue placeholder="Select a tree">
              {setCurrentTreeMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Switching...
                </span>
              ) : (
                <span className="truncate">
                  {currentTree?.name || "Select a tree"}
                </span>
              )}
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent>
          {trees.map((tree) => (
            <SelectItem
              key={tree.id}
              value={tree.id}
              className="cursor-pointer"
            >
              <div className="flex items-center justify-between w-full gap-2">
                <div className="flex flex-col">
                  <span className="font-medium truncate max-w-[180px]">
                    {tree.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {tree.memberCount} {tree.memberCount === 1 ? "member" : "members"}
                  </span>
                </div>
                {tree.id === currentTreeId && (
                  <Check className="h-4 w-4 text-primary shrink-0" />
                )}
              </div>
            </SelectItem>
          ))}
          <div className="border-t mt-1 pt-1">
            <Link
              to="/dashboard/trees/new"
              className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-sm transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create new tree
            </Link>
          </div>
        </SelectContent>
      </Select>
    </div>
  );
}
