import { useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { Settings, Trash2, Loader2, AlertTriangle, ImageIcon, X } from "lucide-react";
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
import { uploadToCloudinary } from "~/utils/storage";
import { authClient } from "~/lib/auth-client";
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
  const { data: session } = authClient.useSession();

  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmTreeName, setConfirmTreeName] = useState("");

  // Form state
  const [name, setName] = useState(tree.name);
  const [description, setDescription] = useState(tree.description || "");
  const [isPublic, setIsPublic] = useState(tree.isPublic);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(tree.coverImageUrl || null);
  const [newCoverImage, setNewCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setNewCoverImage(file);
    setCoverImagePreview(URL.createObjectURL(file));
    // Clear the existing cover image URL since we have a new one
    setCoverImageUrl(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp"],
    },
    maxFiles: 1,
  });

  const removeCoverImage = () => {
    if (coverImagePreview) {
      URL.revokeObjectURL(coverImagePreview);
    }
    setNewCoverImage(null);
    setCoverImagePreview(null);
    setCoverImageUrl(null);
  };

  // Update mutation
  const updateTree = useMutation({
    mutationFn: async () => {
      let finalCoverImageUrl: string | null = coverImageUrl;

      // Upload new cover image if selected
      if (newCoverImage) {
        setIsUploading(true);
        try {
          const userId = session?.user?.id;
          if (!userId) {
            throw new Error("User not authenticated");
          }

          const result = await uploadToCloudinary(newCoverImage, {
            folder: `cover-images/${userId}`,
            resourceType: "image",
          });
          finalCoverImageUrl = result.secureUrl;
        } catch (error) {
          console.error("Cover image upload error:", error);
          throw new Error("Failed to upload cover image");
        } finally {
          setIsUploading(false);
        }
      }

      return updateFamilyTreeFn({
        data: {
          id: tree.id,
          name: name.trim(),
          description: description.trim() || null,
          coverImageUrl: finalCoverImageUrl,
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
      setCoverImageUrl(tree.coverImageUrl || null);
      setNewCoverImage(null);
      setCoverImagePreview(null);
    }
    setOpen(newOpen);
  };

  const coverImageChanged =
    newCoverImage !== null ||
    (coverImageUrl !== (tree.coverImageUrl || null));

  const hasChanges =
    name.trim() !== tree.name ||
    (description.trim() || null) !== tree.description ||
    isPublic !== tree.isPublic ||
    coverImageChanged;

  const isValid = name.trim().length > 0;
  const isPending = updateTree.isPending || isUploading;

  // Determine what image to show
  const displayImageUrl = coverImagePreview || coverImageUrl;

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
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tree Settings</DialogTitle>
            <DialogDescription>
              Update your family tree details or delete it permanently.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdate} className="space-y-6">
            {/* Cover Image Upload */}
            <div className="space-y-2">
              <Label>Cover Photo</Label>
              {displayImageUrl ? (
                <div className="relative rounded-lg overflow-hidden border">
                  <img
                    src={displayImageUrl}
                    alt="Cover preview"
                    className="w-full h-32 object-cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={removeCoverImage}
                    disabled={isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  {...getRootProps()}
                  className={`
                    border-2 border-dashed rounded-lg p-4 text-center cursor-pointer
                    transition-colors duration-200
                    ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
                    ${isPending ? "cursor-not-allowed opacity-50" : ""}
                  `}
                >
                  <input {...getInputProps()} disabled={isPending} />
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-2 rounded-full bg-muted">
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {isDragActive ? "Drop the image here" : "Click or drag to upload"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG, GIF up to 5MB
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

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
                disabled={isPending}
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
                disabled={isPending}
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
                disabled={isPending}
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
                disabled={isPending}
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
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isValid || !hasChanges || isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isUploading ? "Uploading..." : "Saving..."}
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
