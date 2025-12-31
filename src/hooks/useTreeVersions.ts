import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTreeVersionHistoryQuery,
  getVersionDetailsQuery,
  getCompareVersionsQuery,
  getTreeActivityLogQuery,
  type TreeVersionHistoryParams,
  type VersionDetailsParams,
  type CompareVersionsParams,
  type TreeActivityLogParams,
} from "~/queries/tree-versions";
import {
  revertToVersionFn,
  createManualVersionFn,
} from "~/fn/tree-versions";

/**
 * Hook to fetch tree version history with pagination
 */
export function useTreeVersionHistory(params: TreeVersionHistoryParams) {
  return useQuery(getTreeVersionHistoryQuery(params));
}

/**
 * Hook to fetch detailed information about a specific version
 */
export function useVersionDetails(params: VersionDetailsParams) {
  return useQuery(getVersionDetailsQuery(params));
}

/**
 * Hook to compare two versions
 */
export function useCompareVersions(params: CompareVersionsParams) {
  return useQuery(getCompareVersionsQuery(params));
}

/**
 * Hook to revert a family tree to a specific version
 */
export function useRevertToVersion(familyTreeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (versionId: string) =>
      revertToVersionFn({
        data: {
          familyTreeId,
          versionId,
        },
      }),
    onSuccess: () => {
      // Invalidate all tree-related queries
      queryClient.invalidateQueries({
        queryKey: ["tree-versions", familyTreeId],
      });
      // Invalidate family members query to refresh the tree view
      queryClient.invalidateQueries({
        queryKey: ["family-members", familyTreeId],
      });
      // Invalidate relationships and marriages
      queryClient.invalidateQueries({
        queryKey: ["parent-child-relationships", familyTreeId],
      });
      queryClient.invalidateQueries({
        queryKey: ["marriage-connections", familyTreeId],
      });
    },
  });
}

/**
 * Hook to create a manual version snapshot
 */
export function useCreateManualVersion(familyTreeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (description?: string) =>
      createManualVersionFn({
        data: {
          familyTreeId,
          description,
        },
      }),
    onSuccess: () => {
      // Invalidate version history to show the new version
      queryClient.invalidateQueries({
        queryKey: ["tree-versions", familyTreeId],
      });
    },
  });
}

/**
 * Hook to fetch tree activity log with pagination
 */
export function useTreeActivityLog(params: TreeActivityLogParams) {
  return useQuery(getTreeActivityLogQuery(params));
}
