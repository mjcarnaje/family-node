import { queryOptions } from "@tanstack/react-query";
import {
  getTreeCollaboratorsFn,
  getUserTreeRoleFn,
  getPendingInvitationsFn,
  getMyPendingInvitationsFn,
  checkTreeAccessFn,
  getInvitationByTokenFn,
  getTreePermissionsFn,
  getRoleInfoFn,
} from "~/fn/tree-sharing";

// Query options for getting tree collaborators
export const getTreeCollaboratorsQuery = (familyTreeId: string) =>
  queryOptions({
    queryKey: ["tree-collaborators", familyTreeId],
    queryFn: () => getTreeCollaboratorsFn({ data: { familyTreeId } }),
    enabled: !!familyTreeId,
  });

// Query options for getting user's role in a tree
export const getUserTreeRoleQuery = (familyTreeId: string) =>
  queryOptions({
    queryKey: ["tree-role", familyTreeId],
    queryFn: () => getUserTreeRoleFn({ data: { familyTreeId } }),
    enabled: !!familyTreeId,
  });

// Query options for getting pending invitations for a tree
export const getPendingInvitationsQuery = (familyTreeId: string) =>
  queryOptions({
    queryKey: ["tree-invitations", familyTreeId],
    queryFn: () => getPendingInvitationsFn({ data: { familyTreeId } }),
    enabled: !!familyTreeId,
  });

// Query options for getting user's pending invitations
export const getMyPendingInvitationsQuery = () =>
  queryOptions({
    queryKey: ["my-invitations"],
    queryFn: () => getMyPendingInvitationsFn(),
  });

// Query options for checking tree access
export const checkTreeAccessQuery = (familyTreeId: string) =>
  queryOptions({
    queryKey: ["tree-access", familyTreeId],
    queryFn: () => checkTreeAccessFn({ data: { familyTreeId } }),
    enabled: !!familyTreeId,
  });

// Query options for getting invitation by token
export const getInvitationByTokenQuery = (token: string) =>
  queryOptions({
    queryKey: ["invitation", token],
    queryFn: () => getInvitationByTokenFn({ data: { token } }),
    enabled: !!token,
  });

// Query options for getting detailed tree permissions
export const getTreePermissionsQuery = (familyTreeId: string) =>
  queryOptions({
    queryKey: ["tree-permissions", familyTreeId],
    queryFn: () => getTreePermissionsFn({ data: { familyTreeId } }),
    enabled: !!familyTreeId,
  });

// Query options for getting role information (static data)
export const getRoleInfoQuery = () =>
  queryOptions({
    queryKey: ["role-info"],
    queryFn: () => getRoleInfoFn(),
    staleTime: Infinity, // Role info is static, cache indefinitely
    gcTime: Infinity,
  });
