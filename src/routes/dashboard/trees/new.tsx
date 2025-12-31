import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, TreeDeciduous, Loader2 } from "lucide-react";
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

export const Route = createFileRoute("/dashboard/trees/new")({
  component: NewTreePage,
});

function NewTreePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const createTree = useMutation({
    mutationFn: async () => {
      return createFamilyTreeFn({
        data: {
          name: name.trim(),
          description: description.trim() || null,
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
                  disabled={createTree.isPending}
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
                  disabled={createTree.isPending}
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
                  disabled={createTree.isPending}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate({ to: "/dashboard/trees" })}
                  disabled={createTree.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!isValid || createTree.isPending}
                >
                  {createTree.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
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
