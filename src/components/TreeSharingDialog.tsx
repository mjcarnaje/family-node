import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Users, Mail, UserPlus, Trash2, Crown, Edit, Eye, Shield, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Tooltip } from "~/components/ui/tooltip";
import {
  useTreeCollaborators,
  usePendingInvitations,
  useSendInvitation,
  useUpdateCollaboratorRole,
  useRemoveCollaborator,
  useCancelInvitation,
  useTreeAccess,
  useTreePermissions,
} from "~/hooks/useTreeSharing";
import type { TreeCollaboratorRole } from "~/db/schema";
import { ROLE_INFO, COLLABORATOR_ROLES, type TreeRole } from "~/lib/role-permissions";
import { RoleBadge } from "~/components/RolePermissionsInfo";

const inviteFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  role: z.enum(["viewer", "editor", "admin"]),
});

type InviteFormData = z.infer<typeof inviteFormSchema>;

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

  const { data: access } = useTreeAccess(familyTreeId);
  const { data: collaborators, isLoading: loadingCollaborators } = useTreeCollaborators(familyTreeId);
  const { data: invitations, isLoading: loadingInvitations } = usePendingInvitations(familyTreeId);

  const sendInvitation = useSendInvitation(familyTreeId);
  const updateRole = useUpdateCollaboratorRole(familyTreeId);
  const removeCollaborator = useRemoveCollaborator(familyTreeId);
  const cancelInvitation = useCancelInvitation(familyTreeId);

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
      role: "viewer",
    },
  });

  const canManage = access?.canManage ?? false;

  const onSubmit = async (data: InviteFormData) => {
    await sendInvitation.mutateAsync(data);
    form.reset();
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Share "{treeName}"
          </DialogTitle>
          <DialogDescription>
            Invite family members to view or edit this family tree.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Invite Form */}
          {canManage && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="flex gap-2">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              placeholder="Enter email address"
                              className="pl-9"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-[110px]">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
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
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    disabled={sendInvitation.isPending}
                    size="icon"
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </Form>
          )}

          {/* Pending Invitations */}
          {canManage && invitations && invitations.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                Pending Invitations
              </h4>
              <div className="space-y-2">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between rounded-lg border bg-muted/50 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-muted text-xs">
                          {invitation.inviteeEmail[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {invitation.inviteeEmail}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Invited as {getRoleLabel(invitation.role)}
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
                        <Tooltip content={ROLE_INFO[collaborator.role].shortDescription}>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground cursor-help">
                            {getRoleIcon(collaborator.role)}
                            {getRoleLabel(collaborator.role)}
                          </div>
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
              <Tooltip content="Each role has specific permissions that determine what actions users can perform on the family tree.">
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </Tooltip>
            </div>
            <div className="space-y-2 text-xs">
              {COLLABORATOR_ROLES.map((role) => {
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
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
