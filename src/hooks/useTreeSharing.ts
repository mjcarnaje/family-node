import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getTreeCollaboratorsQuery,
  getUserTreeRoleQuery,
  getPendingInvitationsQuery,
  getMyPendingInvitationsQuery,
  checkTreeAccessQuery,
  getInvitationByTokenQuery,
  getTreePermissionsQuery,
  getRoleInfoQuery,
} from "~/queries/tree-sharing";
import {
  addCollaboratorFn,
  updateCollaboratorRoleFn,
  removeCollaboratorFn,
  sendInvitationFn,
  createInviteLinkFn,
  acceptInvitationFn,
  acceptInvitationByIdFn,
  cancelInvitationFn,
} from "~/fn/tree-sharing";
import type { TreeCollaboratorRole } from "~/db/schema";
import type { InviteRole } from "~/lib/role-permissions";

// ============================================
// Query Hooks
// ============================================

// Hook to get tree collaborators
export function useTreeCollaborators(familyTreeId: string) {
  return useQuery(getTreeCollaboratorsQuery(familyTreeId));
}

// Hook to get user's role in a tree
export function useUserTreeRole(familyTreeId: string) {
  return useQuery(getUserTreeRoleQuery(familyTreeId));
}

// Hook to get pending invitations for a tree
export function usePendingInvitations(familyTreeId: string) {
  return useQuery(getPendingInvitationsQuery(familyTreeId));
}

// Hook to get user's pending invitations
export function useMyPendingInvitations() {
  return useQuery(getMyPendingInvitationsQuery());
}

// Hook to check tree access
export function useTreeAccess(familyTreeId: string) {
  return useQuery(checkTreeAccessQuery(familyTreeId));
}

// Hook to get invitation by token
export function useInvitationByToken(token: string) {
  return useQuery(getInvitationByTokenQuery(token));
}

// Hook to get detailed permissions for a tree
export function useTreePermissions(familyTreeId: string) {
  return useQuery(getTreePermissionsQuery(familyTreeId));
}

// Hook to get role information (static, can be cached indefinitely)
export function useRoleInfo() {
  return useQuery(getRoleInfoQuery());
}

// ============================================
// Mutation Hooks
// ============================================

// Hook to add a collaborator
export function useAddCollaborator(familyTreeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { userId: string; role: TreeCollaboratorRole }) =>
      addCollaboratorFn({
        data: {
          familyTreeId,
          userId: data.userId,
          role: data.role,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tree-collaborators", familyTreeId] });
      toast.success("Collaborator added successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add collaborator");
    },
  });
}

// Hook to update a collaborator's role
export function useUpdateCollaboratorRole(familyTreeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { userId: string; role: TreeCollaboratorRole }) =>
      updateCollaboratorRoleFn({
        data: {
          familyTreeId,
          userId: data.userId,
          role: data.role,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tree-collaborators", familyTreeId] });
      toast.success("Collaborator role updated");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update collaborator role");
    },
  });
}

// Hook to remove a collaborator
export function useRemoveCollaborator(familyTreeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      removeCollaboratorFn({
        data: {
          familyTreeId,
          userId,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tree-collaborators", familyTreeId] });
      toast.success("Collaborator removed");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to remove collaborator");
    },
  });
}

// Hook to send an invitation (legacy - with email)
// Only editor and admin roles are available for invitations
export function useSendInvitation(familyTreeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { email: string; role: InviteRole }) =>
      sendInvitationFn({
        data: {
          familyTreeId,
          email: data.email,
          role: data.role,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tree-invitations", familyTreeId] });
      toast.success("Invitation sent successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send invitation");
    },
  });
}

// Hook to create an invite link (without sending email)
// Only editor and admin roles are available for invitations
export function useCreateInviteLink(familyTreeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (role: InviteRole) =>
      createInviteLinkFn({
        data: {
          familyTreeId,
          role,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tree-invitations", familyTreeId] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create invite link");
    },
  });
}

// Hook to accept an invitation
export function useAcceptInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) =>
      acceptInvitationFn({
        data: { token },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-invitations"] });
      queryClient.invalidateQueries({ queryKey: ["family-trees"] });
      toast.success("Invitation accepted! You now have access to this tree.");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to accept invitation");
    },
  });
}

// Hook to accept an invitation by ID (for logged-in users)
export function useAcceptInvitationById() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: string) =>
      acceptInvitationByIdFn({
        data: { invitationId },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-invitations"] });
      queryClient.invalidateQueries({ queryKey: ["family-trees"] });
      toast.success("Invitation accepted! You now have access to this tree.");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to accept invitation");
    },
  });
}

// Hook to cancel an invitation by token
export function useCancelInvitation(familyTreeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) =>
      cancelInvitationFn({
        data: { token },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tree-invitations", familyTreeId] });
      toast.success("Invitation cancelled");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to cancel invitation");
    },
  });
}
