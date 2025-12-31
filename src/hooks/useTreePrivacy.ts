import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  treePrivacySettingsQueryOptions,
  treeCollaboratorsQueryOptions,
  userTreeAccessLevelQueryOptions,
  accessibleTreesQueryOptions,
  pendingInvitationsQueryOptions,
} from "~/queries/tree-privacy";
import {
  updateTreePrivacyLevelFn,
  addTreeCollaboratorFn,
  updateTreeCollaboratorFn,
  removeTreeCollaboratorFn,
  acceptCollaboratorInvitationFn,
  declineCollaboratorInvitationFn,
  TREE_PRIVACY_LEVELS,
  COLLABORATOR_ROLES,
} from "~/fn/tree-privacy";
import { getErrorMessage } from "~/utils/error";
import type { TreePrivacyLevel, TreeCollaboratorRole } from "~/db/schema";

// ============================================
// Query Hooks
// ============================================

// Hook for tree privacy settings
export function useTreePrivacySettings(treeId: string, enabled = true) {
  return useQuery({
    ...treePrivacySettingsQueryOptions(treeId),
    enabled: enabled && !!treeId,
  });
}

// Hook for tree collaborators
export function useTreeCollaborators(treeId: string, enabled = true) {
  return useQuery({
    ...treeCollaboratorsQueryOptions(treeId),
    enabled: enabled && !!treeId,
  });
}

// Hook for user's access level to a tree
export function useUserTreeAccessLevel(treeId: string, enabled = true) {
  return useQuery({
    ...userTreeAccessLevelQueryOptions(treeId),
    enabled: enabled && !!treeId,
  });
}

// Hook for all accessible trees
export function useAccessibleTrees(enabled = true) {
  return useQuery({
    ...accessibleTreesQueryOptions(),
    enabled,
  });
}

// Hook for pending invitations
export function usePendingInvitations(enabled = true) {
  return useQuery({
    ...pendingInvitationsQueryOptions(),
    enabled,
  });
}

// ============================================
// Mutation Hooks
// ============================================

// Hook for updating tree privacy level
export function useUpdateTreePrivacyLevel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { treeId: string; privacyLevel: TreePrivacyLevel }) =>
      updateTreePrivacyLevelFn({ data }),
    onSuccess: (_, variables) => {
      const privacyLabels: Record<TreePrivacyLevel, string> = {
        private: "Private",
        family: "Family Only",
        public: "Public",
      };
      toast.success("Privacy settings updated", {
        description: `Tree is now ${privacyLabels[variables.privacyLevel]}.`,
      });
      queryClient.invalidateQueries({
        queryKey: ["tree-privacy", "settings", variables.treeId],
      });
      queryClient.invalidateQueries({
        queryKey: ["tree-privacy", "access-level", variables.treeId],
      });
    },
    onError: (error) => {
      toast.error("Failed to update privacy settings", {
        description: getErrorMessage(error),
      });
    },
  });
}

// Hook for adding a collaborator
export function useAddTreeCollaborator() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      treeId: string;
      email: string;
      role: TreeCollaboratorRole;
      canViewSensitiveInfo?: boolean;
      canViewContactInfo?: boolean;
    }) => addTreeCollaboratorFn({ data }),
    onSuccess: (result, variables) => {
      toast.success("Collaborator added", {
        description: `${result.user.name} has been invited to collaborate.`,
      });
      queryClient.invalidateQueries({
        queryKey: ["tree-privacy", "collaborators", variables.treeId],
      });
    },
    onError: (error) => {
      toast.error("Failed to add collaborator", {
        description: getErrorMessage(error),
      });
    },
  });
}

// Hook for updating a collaborator
export function useUpdateTreeCollaborator() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      collaboratorId: string;
      treeId: string; // For cache invalidation
      role?: TreeCollaboratorRole;
      canViewSensitiveInfo?: boolean;
      canViewContactInfo?: boolean;
    }) => {
      const { treeId, ...updateData } = data;
      return updateTreeCollaboratorFn({ data: updateData });
    },
    onSuccess: (_, variables) => {
      toast.success("Collaborator updated", {
        description: "Permissions have been updated.",
      });
      queryClient.invalidateQueries({
        queryKey: ["tree-privacy", "collaborators", variables.treeId],
      });
    },
    onError: (error) => {
      toast.error("Failed to update collaborator", {
        description: getErrorMessage(error),
      });
    },
  });
}

// Hook for removing a collaborator
export function useRemoveTreeCollaborator() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { collaboratorId: string; treeId: string }) =>
      removeTreeCollaboratorFn({ data: { collaboratorId: data.collaboratorId } }),
    onSuccess: (_, variables) => {
      toast.success("Collaborator removed", {
        description: "The collaborator has been removed from the tree.",
      });
      queryClient.invalidateQueries({
        queryKey: ["tree-privacy", "collaborators", variables.treeId],
      });
    },
    onError: (error) => {
      toast.error("Failed to remove collaborator", {
        description: getErrorMessage(error),
      });
    },
  });
}

// Hook for accepting an invitation
export function useAcceptInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (collaboratorId: string) =>
      acceptCollaboratorInvitationFn({ data: { collaboratorId } }),
    onSuccess: () => {
      toast.success("Invitation accepted", {
        description: "You now have access to the family tree.",
      });
      queryClient.invalidateQueries({
        queryKey: ["tree-privacy", "pending-invitations"],
      });
      queryClient.invalidateQueries({
        queryKey: ["tree-privacy", "accessible-trees"],
      });
    },
    onError: (error) => {
      toast.error("Failed to accept invitation", {
        description: getErrorMessage(error),
      });
    },
  });
}

// Hook for declining an invitation
export function useDeclineInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (collaboratorId: string) =>
      declineCollaboratorInvitationFn({ data: { collaboratorId } }),
    onSuccess: () => {
      toast.success("Invitation declined", {
        description: "The invitation has been declined.",
      });
      queryClient.invalidateQueries({
        queryKey: ["tree-privacy", "pending-invitations"],
      });
    },
    onError: (error) => {
      toast.error("Failed to decline invitation", {
        description: getErrorMessage(error),
      });
    },
  });
}

// ============================================
// Utility Hooks
// ============================================

// Combined hook for managing tree privacy
export function useTreePrivacyManagement(treeId: string) {
  const queryClient = useQueryClient();
  const settings = useTreePrivacySettings(treeId);
  const collaborators = useTreeCollaborators(treeId);
  const accessLevel = useUserTreeAccessLevel(treeId);

  const invalidateAll = () => {
    queryClient.invalidateQueries({
      queryKey: ["tree-privacy", "settings", treeId],
    });
    queryClient.invalidateQueries({
      queryKey: ["tree-privacy", "collaborators", treeId],
    });
    queryClient.invalidateQueries({
      queryKey: ["tree-privacy", "access-level", treeId],
    });
  };

  return {
    settings,
    collaborators,
    accessLevel,
    invalidateAll,
    isLoading: settings.isLoading || collaborators.isLoading || accessLevel.isLoading,
    isOwner: accessLevel.data?.isOwner ?? false,
    canManageCollaborators: accessLevel.data?.canManageCollaborators ?? false,
    canEdit: accessLevel.data?.canEdit ?? false,
    canView: accessLevel.data?.canView ?? false,
  };
}

// Export constants for use in components
export { TREE_PRIVACY_LEVELS, COLLABORATOR_ROLES };
