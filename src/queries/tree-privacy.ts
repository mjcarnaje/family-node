import { queryOptions } from "@tanstack/react-query";
import {
  getTreePrivacySettingsFn,
  getTreeCollaboratorsFn,
  getUserTreeAccessLevelFn,
  getAccessibleTreesFn,
  getPendingInvitationsFn,
} from "~/fn/tree-privacy";

// Query options for tree privacy settings
export const treePrivacySettingsQueryOptions = (treeId: string) =>
  queryOptions({
    queryKey: ["tree-privacy", "settings", treeId],
    queryFn: () => getTreePrivacySettingsFn({ data: { treeId } }),
    enabled: !!treeId,
  });

// Query options for tree collaborators
export const treeCollaboratorsQueryOptions = (treeId: string) =>
  queryOptions({
    queryKey: ["tree-privacy", "collaborators", treeId],
    queryFn: () => getTreeCollaboratorsFn({ data: { treeId } }),
    enabled: !!treeId,
  });

// Query options for user's access level to a tree
export const userTreeAccessLevelQueryOptions = (treeId: string) =>
  queryOptions({
    queryKey: ["tree-privacy", "access-level", treeId],
    queryFn: () => getUserTreeAccessLevelFn({ data: { treeId } }),
    enabled: !!treeId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

// Query options for all accessible trees
export const accessibleTreesQueryOptions = () =>
  queryOptions({
    queryKey: ["tree-privacy", "accessible-trees"],
    queryFn: () => getAccessibleTreesFn(),
  });

// Query options for pending invitations
export const pendingInvitationsQueryOptions = () =>
  queryOptions({
    queryKey: ["tree-privacy", "pending-invitations"],
    queryFn: () => getPendingInvitationsFn(),
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
  });
