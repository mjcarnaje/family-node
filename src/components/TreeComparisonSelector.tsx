import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { GitCompare, TreeDeciduous, ChevronRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Label } from "~/components/ui/label";
import { getMyFamilyTreesFn } from "~/fn/family-trees";

// Query options for fetching user's family trees
const getMyTreesQuery = () =>
  queryOptions({
    queryKey: ["my-family-trees"],
    queryFn: () => getMyFamilyTreesFn(),
  });

interface TreeComparisonSelectorProps {
  currentTreeId?: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TreeComparisonSelector({
  currentTreeId,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: TreeComparisonSelectorProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const [tree1Id, setTree1Id] = useState<string>(currentTreeId || "");
  const [tree2Id, setTree2Id] = useState<string>("");
  const navigate = useNavigate();

  const { data: trees, isLoading } = useQuery(getMyTreesQuery());

  const handleCompare = () => {
    if (tree1Id && tree2Id && tree1Id !== tree2Id) {
      navigate({
        to: "/dashboard/trees/compare/$treeId1/$treeId2",
        params: { treeId1: tree1Id, treeId2: tree2Id },
      });
      setOpen(false);
    }
  };

  const canCompare = tree1Id && tree2Id && tree1Id !== tree2Id;
  const isControlled = controlledOpen !== undefined;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm">
              <GitCompare className="h-4 w-4 mr-2" />
              Compare Trees
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Compare Family Trees
          </DialogTitle>
          <DialogDescription>
            Select two family trees to compare side-by-side. This will show you
            the differences in members, relationships, and marriages.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Tree 1 Selection */}
          <div className="grid gap-2">
            <Label htmlFor="tree1">First Tree</Label>
            <Select
              value={tree1Id}
              onValueChange={setTree1Id}
              disabled={isLoading}
            >
              <SelectTrigger id="tree1" data-testid="tree1-selector">
                <SelectValue placeholder="Select first tree" />
              </SelectTrigger>
              <SelectContent>
                {trees?.map((tree) => (
                  <SelectItem
                    key={tree.id}
                    value={tree.id}
                    disabled={tree.id === tree2Id}
                  >
                    <div className="flex items-center gap-2">
                      <TreeDeciduous className="h-4 w-4 text-muted-foreground" />
                      <span>{tree.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({tree.memberCount} members)
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Visual separator */}
          <div className="flex items-center justify-center">
            <ChevronRight className="h-6 w-6 text-muted-foreground rotate-90" />
          </div>

          {/* Tree 2 Selection */}
          <div className="grid gap-2">
            <Label htmlFor="tree2">Second Tree</Label>
            <Select
              value={tree2Id}
              onValueChange={setTree2Id}
              disabled={isLoading}
            >
              <SelectTrigger id="tree2" data-testid="tree2-selector">
                <SelectValue placeholder="Select second tree" />
              </SelectTrigger>
              <SelectContent>
                {trees?.map((tree) => (
                  <SelectItem
                    key={tree.id}
                    value={tree.id}
                    disabled={tree.id === tree1Id}
                  >
                    <div className="flex items-center gap-2">
                      <TreeDeciduous className="h-4 w-4 text-muted-foreground" />
                      <span>{tree.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({tree.memberCount} members)
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Same tree warning */}
          {tree1Id && tree2Id && tree1Id === tree2Id && (
            <p className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded-md">
              Please select two different trees to compare.
            </p>
          )}

          {/* No trees warning */}
          {trees && trees.length < 2 && (
            <p className="text-sm text-muted-foreground bg-muted p-2 rounded-md">
              You need at least two family trees to use the comparison feature.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCompare}
            disabled={!canCompare}
            data-testid="compare-button"
          >
            <GitCompare className="h-4 w-4 mr-2" />
            Compare
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
