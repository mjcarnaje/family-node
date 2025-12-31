import { useState } from "react";
import {
  useTreeVersionHistory,
  useRevertToVersion,
  useCreateManualVersion,
} from "~/hooks/useTreeVersions";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { History, RotateCcw, Save, ChevronDown, ChevronUp, Clock, User } from "lucide-react";
import { toast } from "sonner";
import type { TreeVersion } from "~/db/schema";

interface TreeVersionHistoryProps {
  familyTreeId: string;
  isOwner?: boolean;
}

export function TreeVersionHistory({
  familyTreeId,
  isOwner = false,
}: TreeVersionHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<TreeVersion | null>(null);
  const [isRevertDialogOpen, setIsRevertDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data, isLoading, error } = useTreeVersionHistory({
    familyTreeId,
    limit: isExpanded ? 50 : 5,
  });

  const revertMutation = useRevertToVersion(familyTreeId);
  const createVersionMutation = useCreateManualVersion(familyTreeId);

  const handleRevert = async () => {
    if (!selectedVersion) return;

    try {
      await revertMutation.mutateAsync(selectedVersion.id);
      toast.success(`Successfully reverted to version ${selectedVersion.versionNumber}`);
      setIsRevertDialogOpen(false);
      setSelectedVersion(null);
    } catch (error) {
      toast.error("Failed to revert to the selected version");
    }
  };

  const handleCreateVersion = async () => {
    try {
      const result = await createVersionMutation.mutateAsync("Manual snapshot");
      toast.success(`Created version ${result.versionNumber}`);
      setIsCreateDialogOpen(false);
    } catch (error) {
      toast.error("Failed to create version snapshot");
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            Version History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            Version History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Failed to load version history
          </p>
        </CardContent>
      </Card>
    );
  }

  const versions = data?.versions || [];
  const totalCount = data?.totalCount || 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5" />
              Version History
            </CardTitle>
            <CardDescription className="mt-1">
              {totalCount} version{totalCount !== 1 ? "s" : ""} saved
            </CardDescription>
          </div>
          {isOwner && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Save className="h-4 w-4 mr-1" />
                  Save Version
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Version Snapshot</DialogTitle>
                  <DialogDescription>
                    Create a snapshot of the current state of your family tree. You can
                    revert to this version later if needed.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateVersion}
                    disabled={createVersionMutation.isPending}
                  >
                    {createVersionMutation.isPending ? "Creating..." : "Create Snapshot"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {versions.length === 0 ? (
          <div className="text-center py-6">
            <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground text-sm">
              No versions yet. Changes will be saved automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {versions.map((version) => (
              <VersionItem
                key={version.id}
                version={version}
                isOwner={isOwner}
                onRevert={(v) => {
                  setSelectedVersion(v);
                  setIsRevertDialogOpen(true);
                }}
                formatDate={formatDate}
              />
            ))}

            {totalCount > 5 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Show All ({totalCount})
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {/* Revert Confirmation Dialog */}
        <Dialog open={isRevertDialogOpen} onOpenChange={setIsRevertDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Revert to Version {selectedVersion?.versionNumber}?</DialogTitle>
              <DialogDescription>
                This will restore your family tree to the state it was in at version{" "}
                {selectedVersion?.versionNumber}. All current changes will be saved as a
                new version before reverting.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {selectedVersion && formatDate(selectedVersion.createdAt)}
                  </span>
                </div>
                {selectedVersion?.changeDescription && (
                  <p className="text-sm text-muted-foreground">
                    {selectedVersion.changeDescription}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsRevertDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRevert}
                disabled={revertMutation.isPending}
              >
                {revertMutation.isPending ? (
                  <>
                    <RotateCcw className="h-4 w-4 mr-1 animate-spin" />
                    Reverting...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Revert
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

interface VersionItemProps {
  version: TreeVersion;
  isOwner: boolean;
  onRevert: (version: TreeVersion) => void;
  formatDate: (date: Date) => string;
}

function VersionItem({ version, isOwner, onRevert, formatDate }: VersionItemProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">Version {version.versionNumber}</span>
          {version.versionNumber === 1 && (
            <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full">
              Initial
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDate(version.createdAt)}
          </span>
        </div>
        {version.changeDescription && (
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {version.changeDescription}
          </p>
        )}
      </div>
      {isOwner && (
        <Button
          variant="ghost"
          size="sm"
          className="ml-2 shrink-0"
          onClick={() => onRevert(version)}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
