import { useState } from "react";
import { UserPlus, Trash2, Edit2, X, Mail, Eye, Pencil, Shield, Users } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  useTreeCollaborators,
  useAddTreeCollaborator,
  useUpdateTreeCollaborator,
  useRemoveTreeCollaborator,
  COLLABORATOR_ROLES,
} from "~/hooks/useTreePrivacy";
import type { TreeCollaboratorRole } from "~/db/schema";

interface TreeCollaboratorManagerProps {
  treeId: string;
}

const ROLE_CONFIG: Record<
  TreeCollaboratorRole,
  { label: string; description: string; icon: React.ReactNode }
> = {
  viewer: {
    label: "Viewer",
    description: "Can only view the tree",
    icon: <Eye className="size-4" />,
  },
  editor: {
    label: "Editor",
    description: "Can view and edit members",
    icon: <Pencil className="size-4" />,
  },
  admin: {
    label: "Admin",
    description: "Can manage collaborators",
    icon: <Shield className="size-4" />,
  },
};

export function TreeCollaboratorManager({ treeId }: TreeCollaboratorManagerProps) {
  const { data: collaborators, isLoading } = useTreeCollaborators(treeId);
  const addCollaborator = useAddTreeCollaborator();
  const updateCollaborator = useUpdateTreeCollaborator();
  const removeCollaborator = useRemoveTreeCollaborator();

  const [isAdding, setIsAdding] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<TreeCollaboratorRole>("viewer");
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAddCollaborator = async () => {
    if (!newEmail.trim()) return;

    try {
      await addCollaborator.mutateAsync({
        treeId,
        email: newEmail.trim(),
        role: newRole,
      });
      setNewEmail("");
      setNewRole("viewer");
      setIsAdding(false);
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleUpdateRole = async (collaboratorId: string, role: TreeCollaboratorRole) => {
    await updateCollaborator.mutateAsync({
      collaboratorId,
      treeId,
      role,
    });
    setEditingId(null);
  };

  const handleRemove = async (collaboratorId: string) => {
    await removeCollaborator.mutateAsync({ collaboratorId, treeId });
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Family Members</h3>
          <p className="text-xs text-muted-foreground">
            Invite family members to view or edit this tree
          </p>
        </div>
        {!isAdding && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="gap-2"
          >
            <UserPlus className="size-4" />
            Invite
          </Button>
        )}
      </div>

      {/* Add new collaborator form */}
      {isAdding && (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">Invite by Email</span>
          </div>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="Enter email address"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="flex-1"
            />
            <Select value={newRole} onValueChange={(v) => setNewRole(v as TreeCollaboratorRole)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLLABORATOR_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    <div className="flex items-center gap-2">
                      {ROLE_CONFIG[role].icon}
                      <span>{ROLE_CONFIG[role].label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsAdding(false);
                setNewEmail("");
                setNewRole("viewer");
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddCollaborator}
              disabled={!newEmail.trim() || addCollaborator.isPending}
            >
              {addCollaborator.isPending ? "Sending..." : "Send Invite"}
            </Button>
          </div>
        </div>
      )}

      {/* Collaborators list */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Loading collaborators...
          </div>
        ) : collaborators && collaborators.length > 0 ? (
          collaborators.map((collab) => (
            <div
              key={collab.id}
              className="flex items-center justify-between rounded-lg border p-3 bg-background"
            >
              <div className="flex items-center gap-3">
                <Avatar className="size-10">
                  <AvatarImage src={collab.user.image ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {getInitials(collab.user.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-sm">{collab.user.name}</div>
                  <div className="text-xs text-muted-foreground">{collab.user.email}</div>
                  {!collab.acceptedAt && (
                    <div className="text-xs text-amber-600 mt-0.5">Pending invitation</div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {editingId === collab.id ? (
                  <Select
                    value={collab.role}
                    onValueChange={(v) => handleUpdateRole(collab.id, v as TreeCollaboratorRole)}
                  >
                    <SelectTrigger className="w-28 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLLABORATOR_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          <div className="flex items-center gap-2">
                            {ROLE_CONFIG[role].icon}
                            <span>{ROLE_CONFIG[role].label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
                    {ROLE_CONFIG[collab.role].icon}
                    <span>{ROLE_CONFIG[collab.role].label}</span>
                  </div>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => setEditingId(editingId === collab.id ? null : collab.id)}
                  disabled={updateCollaborator.isPending}
                >
                  {editingId === collab.id ? (
                    <X className="size-4" />
                  ) : (
                    <Edit2 className="size-4" />
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleRemove(collab.id)}
                  disabled={removeCollaborator.isPending}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-sm text-muted-foreground border rounded-lg bg-muted/20">
            <Users className="size-8 mx-auto mb-2 opacity-50" />
            <p>No collaborators yet</p>
            <p className="text-xs mt-1">Invite family members to share this tree</p>
          </div>
        )}
      </div>
    </div>
  );
}
