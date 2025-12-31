import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "~/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { updateFamilyTreeFn, deleteFamilyTreeFn } from "~/fn/family-trees";
import type { FamilyTree } from "~/db/schema";

interface TreeSettingsDialogProps {
  tree: FamilyTree;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TreeSettingsDialog({ 
  tree, 
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: TreeSettingsDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmTreeName, setConfirmTreeName] = useState("");

  // Form state
  const [name, setName] = useState(tree.name);
  const [description, setDescription] = useState(tree.description || "");
  const [isPublic, setIsPublic] = useState(tree.isPublic);

  // Update mutation
  const updateTree = useMutation({
    mutationFn: async () => {
      return updateFamilyTreeFn({
        data: {
          id: tree.id,
          name: name.trim(),
          description: description.trim() || null,
          isPublic,
        },
      });
    },
    onSuccess: () => {
      toast.success("Family tree updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["my-family-trees"] });
      queryClient.invalidateQueries({ queryKey: ["tree-visualization", tree.id] });
      setOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update family tree");
    },
  });

  // Delete mutation
  const deleteTree = useMutation({
    mutationFn: async () => {
      return deleteFamilyTreeFn({ data: { id: tree.id } });
    },
    onSuccess: () => {
      toast.success("Family tree deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["my-family-trees"] });
      setDeleteDialogOpen(false);
      setOpen(false);
      navigate({ to: "/dashboard/trees" });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete family tree");
    },
  });

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a name for your family tree");
      return;
    }
    updateTree.mutate();
  };

  const handleDelete = () => {
    if (confirmTreeName !== tree.name) {
      toast.error("Tree name doesn't match. Please type the exact name to confirm.");
      return;
    }
    deleteTree.mutate();
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // Reset form to current tree values when opening
      setName(tree.name);
      setDescription(tree.description || "");
      setIsPublic(tree.isPublic);
    }
    setOpen(newOpen);
  };

  const hasChanges =
    name.trim() !== tree.name ||
    (description.trim() || null) !== tree.description ||
    isPublic !== tree.isPublic;

  const isValid = name.trim().length > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {controlledOpen === undefined && (
          <DialogTrigger asChild>
            {trigger || (
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            )}
          </DialogTrigger>
        )}
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Tree Settings</DialogTitle>
            <DialogDescription>
              Update your family tree details or delete it permanently.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdate} className="space-y-6">
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="settings-name">
                Tree Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="settings-name"
                placeholder="e.g., Smith Family Tree"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={200}
                disabled={updateTree.isPending}
              />
            </div>

            {/* Description Field */}
            <div className="space-y-2">
              <Label htmlFor="settings-description">Description</Label>
              <Textarea
                id="settings-description"
                placeholder="Describe your family tree..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
                rows={3}
                disabled={updateTree.isPending}
              />
            </div>

            {/* Public Toggle */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="settings-public" className="text-base">
                  Make Public
                </Label>
                <p className="text-sm text-muted-foreground">
                  Allow anyone to view this tree
                </p>
              </div>
              <Switch
                id="settings-public"
                checked={isPublic}
                onCheckedChange={setIsPublic}
                disabled={updateTree.isPending}
              />
            </div>

            {/* Danger Zone */}
            <div className="rounded-lg border border-red-200 dark:border-red-900/50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-medium">Danger Zone</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Permanently delete this family tree and all its members. This action cannot be undone.
              </p>
              <Button
                type="button"
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={updateTree.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Tree
              </Button>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={updateTree.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isValid || !hasChanges || updateTree.isPending}
              >
                {updateTree.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Delete Family Tree</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span className="block">
                This will permanently delete <strong>"{tree.name}"</strong> and all its family members,
                relationships, and history. This action cannot be undone.
              </span>
              <span className="block">
                To confirm, type the tree name below:
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Input
              placeholder={tree.name}
              value={confirmTreeName}
              onChange={(e) => setConfirmTreeName(e.target.value)}
              disabled={deleteTree.isPending}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setConfirmTreeName("")}
              disabled={deleteTree.isPending}
            >
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={confirmTreeName !== tree.name || deleteTree.isPending}
            >
              {deleteTree.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Forever
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
