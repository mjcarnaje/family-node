import { useState, useCallback } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { ArrowLeft, TreeDeciduous, Loader2, Upload, X, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelContent,
} from "~/components/ui/panel";
import { createFamilyTreeFn } from "~/fn/family-trees";
import { uploadToCloudinary } from "~/utils/storage";
import { authClient } from "~/lib/auth-client";

export const Route = createFileRoute("/dashboard/trees/new")({
  component: NewTreePage,
});

function NewTreePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [coverImage, setCoverImage] = useState<File | null>(null);
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

    setCoverImage(file);
    setCoverImagePreview(URL.createObjectURL(file));
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
    setCoverImage(null);
    setCoverImagePreview(null);
  };

  const createTree = useMutation({
    mutationFn: async () => {
      let coverImageUrl: string | null = null;

      // Upload cover image if selected
      if (coverImage) {
        setIsUploading(true);
        try {
          const userId = session?.user?.id;
          if (!userId) {
            throw new Error("User not authenticated");
          }

          const result = await uploadToCloudinary(coverImage, {
            folder: `cover-images/${userId}`,
            resourceType: "image",
          });
          coverImageUrl = result.secureUrl;
        } catch (error) {
          console.error("Cover image upload error:", error);
          throw new Error("Failed to upload cover image");
        } finally {
          setIsUploading(false);
        }
      }

      return createFamilyTreeFn({
        data: {
          name: name.trim(),
          description: description.trim() || null,
          coverImageUrl,
          isPublic,
        },
      });
    },
    onSuccess: (newTree) => {
      toast.success("Family tree created successfully!");
      queryClient.invalidateQueries({ queryKey: ["my-family-trees"] });
      navigate({
        to: "/dashboard/trees/$treeId",
        params: { treeId: newTree.id },
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create family tree");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a name for your family tree");
      return;
    }
    createTree.mutate();
  };

  const isValid = name.trim().length > 0;
  const isPending = createTree.isPending || isUploading;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard/trees">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Create New Family Tree
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Start building your family history
            </p>
          </div>
        </div>

        {/* Form */}
        <Panel>
          <PanelHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <TreeDeciduous className="h-5 w-5" />
              </div>
              <PanelTitle>Tree Details</PanelTitle>
            </div>
          </PanelHeader>
          <PanelContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Cover Image Upload */}
              <div className="space-y-2">
                <Label>Cover Photo</Label>
                {coverImagePreview ? (
                  <div className="relative rounded-lg overflow-hidden border">
                    <img
                      src={coverImagePreview}
                      alt="Cover preview"
                      className="w-full h-40 object-cover"
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
                      border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                      transition-colors duration-200
                      ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
                      ${isPending ? "cursor-not-allowed opacity-50" : ""}
                    `}
                  >
                    <input {...getInputProps()} disabled={isPending} />
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-3 rounded-full bg-muted">
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
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
                <p className="text-xs text-muted-foreground">
                  Optional: Add a cover photo to personalize your family tree
                </p>
              </div>

              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Tree Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., Smith Family Tree"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={200}
                  disabled={isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Choose a memorable name for your family tree
                </p>
              </div>

              {/* Description Field */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your family tree, its origins, or any special notes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={2000}
                  rows={4}
                  disabled={isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Optional: Add context about this family tree
                </p>
              </div>

              {/* Public Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="public-toggle" className="text-base">
                    Make Public
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Allow anyone to view this family tree
                  </p>
                </div>
                <Switch
                  id="public-toggle"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                  disabled={isPending}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate({ to: "/dashboard/trees" })}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!isValid || isPending}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isUploading ? "Uploading..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      <TreeDeciduous className="h-4 w-4 mr-2" />
                      Create Tree
                    </>
                  )}
                </Button>
              </div>
            </form>
          </PanelContent>
        </Panel>
      </div>
    </div>
  );
}
