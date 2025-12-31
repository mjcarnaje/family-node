import { useState } from "react";
import { Lock, Users, Globe, Shield, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";
import {
  useTreePrivacyManagement,
  useUpdateTreePrivacyLevel,
  TREE_PRIVACY_LEVELS,
} from "~/hooks/useTreePrivacy";
import type { TreePrivacyLevel } from "~/db/schema";
import { TreeCollaboratorManager } from "./TreeCollaboratorManager";

interface TreePrivacySettingsProps {
  treeId: string;
  treeName: string;
}

const PRIVACY_OPTIONS: Array<{
  value: TreePrivacyLevel;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    value: "private",
    label: "Private",
    description: "Only you can view and edit this tree",
    icon: <Lock className="size-5" />,
  },
  {
    value: "family",
    label: "Family Only",
    description: "Share with specific family members you invite",
    icon: <Users className="size-5" />,
  },
  {
    value: "public",
    label: "Public",
    description: "Anyone with the link can view (read-only)",
    icon: <Globe className="size-5" />,
  },
];

export function TreePrivacySettings({ treeId, treeName }: TreePrivacySettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { settings, accessLevel, isLoading, isOwner } = useTreePrivacyManagement(treeId);
  const updatePrivacy = useUpdateTreePrivacyLevel();

  const currentPrivacy = settings.data?.privacyLevel ?? "private";
  const currentOption = PRIVACY_OPTIONS.find((opt) => opt.value === currentPrivacy);

  const handlePrivacyChange = async (newLevel: TreePrivacyLevel) => {
    await updatePrivacy.mutateAsync({ treeId, privacyLevel: newLevel });
  };

  if (!isOwner) {
    // Non-owners can only view their access level
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Shield className="size-4" />
        <span>
          You have{" "}
          <span className="font-medium text-foreground">
            {accessLevel.data?.role ?? "view"}
          </span>{" "}
          access
        </span>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {currentOption?.icon}
          <span>{currentOption?.label ?? "Privacy"}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="size-5" />
            Privacy Settings
          </DialogTitle>
          <DialogDescription>
            Control who can view and edit &quot;{treeName}&quot;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Privacy Level Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Visibility</label>
              {isLoading && (
                <span className="text-xs text-muted-foreground">Loading...</span>
              )}
            </div>

            <div className="grid gap-3">
              {PRIVACY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handlePrivacyChange(option.value)}
                  disabled={updatePrivacy.isPending}
                  className={cn(
                    "flex items-start gap-4 rounded-lg border p-4 text-left transition-all hover:bg-accent/50",
                    currentPrivacy === option.value &&
                      "border-primary bg-primary/5 ring-1 ring-primary",
                    updatePrivacy.isPending && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div
                    className={cn(
                      "rounded-full p-2",
                      currentPrivacy === option.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {option.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{option.label}</div>
                    <div className="text-sm text-muted-foreground">
                      {option.description}
                    </div>
                  </div>
                  {currentPrivacy === option.value && (
                    <div className="self-center rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                      Current
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Collaborator Management (only for family privacy) */}
          {currentPrivacy === "family" && (
            <div className="border-t pt-6">
              <TreeCollaboratorManager treeId={treeId} />
            </div>
          )}

          {/* Info for public trees */}
          {currentPrivacy === "public" && (
            <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-4">
              <Info className="size-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Public Access</p>
                <p className="mt-1">
                  Anyone with the link can view your family tree, but only you and invited
                  collaborators can make changes. Switch to &quot;Family Only&quot; to
                  invite specific people with editing permissions.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
