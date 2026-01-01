import { useState } from "react";
import { Users, Trash2, Crown, Edit, Eye, Shield, Info, Link, Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Button } from "~/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import {
  useTreeCollaborators,
  usePendingInvitations,
  useCreateInviteLink,
  useUpdateCollaboratorRole,
  useRemoveCollaborator,
  useCancelInvitation,
  useTreeAccess,
} from "~/hooks/useTreeSharing";
import type { TreeCollaboratorRole } from "~/db/schema";
import { ROLE_INFO, COLLABORATOR_ROLES, INVITE_ROLES, type TreeRole, type InviteRole } from "~/lib/role-permissions";
import { RoleBadge } from "~/components/RolePermissionsInfo";
import { PublicAccessSection } from "~/components/PublicAccessSection";

interface TreeSharingDialogProps {
  familyTreeId: string;
  treeName: string;
  trigger?: React.ReactNode;
}

export function TreeSharingDialog({
  familyTreeId,
  treeName,
  trigger,
}: TreeSharingDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<InviteRole>("editor");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: access } = useTreeAccess(familyTreeId);
  const { data: collaborators, isLoading: loadingCollaborators } = useTreeCollaborators(familyTreeId);
  const { data: invitations } = usePendingInvitations(familyTreeId);

  const createInviteLink = useCreateInviteLink(familyTreeId);
  const updateRole = useUpdateCollaboratorRole(familyTreeId);
  const removeCollaborator = useRemoveCollaborator(familyTreeId);
  const cancelInvitation = useCancelInvitation(familyTreeId);

  const canManage = access?.canManage ?? false;

  const handleGenerateLink = async () => {
    const result = await createInviteLink.mutateAsync(selectedRole);
    setGeneratedLink(result.invitationLink);
    setCopied(false);
  };

  const handleCopyLink = async () => {
    if (!generatedLink) return;

    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast.success("Invite link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleRoleChange = async (userId: string, role: TreeCollaboratorRole) => {
    await updateRole.mutateAsync({ userId, role });
  };

  const handleRemoveCollaborator = async (userId: string) => {
    await removeCollaborator.mutateAsync(userId);
  };

  const handleCancelInvitation = async (invitationId: string) => {
    await cancelInvitation.mutateAsync(invitationId);
  };

  const getRoleIcon = (role: TreeRole) => {
    const iconClass = "h-4 w-4";
    const colorMap: Record<TreeRole, string> = {
      owner: "text-yellow-500",
      admin: "text-blue-500",
      editor: "text-green-500",
      viewer: "text-gray-500",
    };

    switch (role) {
      case "owner":
        return <Crown className={`${iconClass} ${colorMap[role]}`} />;
      case "admin":
        return <Shield className={`${iconClass} ${colorMap[role]}`} />;
      case "editor":
        return <Edit className={`${iconClass} ${colorMap[role]}`} />;
      case "viewer":
        return <Eye className={`${iconClass} ${colorMap[role]}`} />;
    }
  };

  const getRoleLabel = (role: TreeRole) => {
    return ROLE_INFO[role].label;
  };

  const getRoleDescription = (role: TreeRole) => {
    return ROLE_INFO[role].shortDescription;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Users className="mr-2 h-4 w-4" />
            Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Share "{treeName}"
          </DialogTitle>
          <DialogDescription>
            Invite family members to view or edit this family tree.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 overflow-y-auto flex-1">
          {/* Public Access Section */}
          <PublicAccessSection
            familyTreeId={familyTreeId}
            canManage={canManage}
          />

          {/* Divider */}
          {canManage && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Collaborator Invites
                </span>
              </div>
            </div>
          )}

          {/* Invite Link Generator */}
          {canManage && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Select
                  value={selectedRole}
                  onValueChange={(value: InviteRole) => {
                    setSelectedRole(value);
                    setGeneratedLink(null);
                  }}
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVITE_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        <div className="flex items-center gap-2">
                          {getRoleIcon(role)}
                          {ROLE_INFO[role].label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleGenerateLink}
                  disabled={createInviteLink.isPending}
                  className="flex-1"
                >
                  <Link className="mr-2 h-4 w-4" />
                  {createInviteLink.isPending ? "Generating..." : "Generate Invite Link"}
                </Button>
              </div>

              {generatedLink && (
                <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
                  <code className="flex-1 truncate text-sm text-muted-foreground">
                    {generatedLink}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyLink}
                    className="shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="mr-2 h-4 w-4 text-green-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Pending Invitations */}
          {canManage && invitations && invitations.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                Pending Invite Links
              </h4>
              <div className="space-y-2">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between rounded-lg border bg-muted/50 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <Link className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium flex items-center gap-2">
                          {getRoleIcon(invitation.role)}
                          {getRoleLabel(invitation.role)} invite
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCancelInvitation(invitation.token)}
                      disabled={cancelInvitation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Collaborators List */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              People with access
            </h4>
            {loadingCollaborators ? (
              <div className="text-center py-4 text-sm text-muted-foreground">
                Loading...
              </div>
            ) : (
              <div className="space-y-2">
                {collaborators?.map((collaborator) => (
                  <div
                    key={collaborator.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={collaborator.user.image || undefined} />
                        <AvatarFallback>
                          {getInitials(collaborator.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {collaborator.user.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {collaborator.user.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {canManage ? (
                        <>
                          <Select
                            value={collaborator.role}
                            onValueChange={(value: TreeCollaboratorRole) =>
                              handleRoleChange(collaborator.userId, value)
                            }
                          >
                            <SelectTrigger className="w-[110px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {COLLABORATOR_ROLES.map((role) => (
                                <SelectItem key={role} value={role}>
                                  <div className="flex items-center gap-2">
                                    {getRoleIcon(role)}
                                    {ROLE_INFO[role].label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleRemoveCollaborator(collaborator.userId)
                            }
                            disabled={removeCollaborator.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground cursor-help">
                              {getRoleIcon(collaborator.role)}
                              {getRoleLabel(collaborator.role)}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {ROLE_INFO[collaborator.role].shortDescription}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                ))}

                {collaborators?.length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <Users className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    No collaborators yet
                    {canManage && (
                      <p className="mt-1">
                        Invite family members using the form above
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Role Descriptions */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-medium">Permission Levels</h4>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  Each role has specific permissions that determine what actions users can perform on the family tree.
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="space-y-2 text-xs">
              {INVITE_ROLES.map((role) => {
                const info = ROLE_INFO[role];
                return (
                  <div key={role} className="flex items-start gap-2">
                    {getRoleIcon(role)}
                    <div>
                      <span className="font-medium">{info.label}:</span>{" "}
                      <span className="text-muted-foreground">{info.shortDescription}</span>
                    </div>
                  </div>
                );
              })}
              <div className="flex items-start gap-2">
                {getRoleIcon("owner")}
                <div>
                  <span className="font-medium">{ROLE_INFO.owner.label}:</span>{" "}
                  <span className="text-muted-foreground">{ROLE_INFO.owner.shortDescription}</span>
                </div>
              </div>
              <div className="pt-2 mt-2 border-t text-muted-foreground">
                <span className="italic">Tip: Use the public link above to share view-only access with anyone.</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
