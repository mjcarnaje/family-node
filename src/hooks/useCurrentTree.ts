import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import {
  getCurrentTreeIdFn,
  setCurrentTreeIdFn,
  clearCurrentTreeIdFn,
} from "~/fn/current-tree";
import { getMyFamilyTreesFn } from "~/fn/family-trees";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

// Query options for current tree ID
export const getCurrentTreeIdQuery = () =>
  queryOptions({
    queryKey: ["current-tree-id"],
    queryFn: () => getCurrentTreeIdFn(),
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });

// Query options for fetching all user's trees (for the switcher dropdown)
export const getMyTreesForSwitcherQuery = () =>
  queryOptions({
    queryKey: ["my-family-trees"],
    queryFn: () => getMyFamilyTreesFn(),
  });

/**
 * Hook for getting the current tree ID
 */
export function useCurrentTreeId() {
  return useQuery(getCurrentTreeIdQuery());
}

/**
 * Hook for setting the current tree
 */
export function useSetCurrentTree() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (treeId: string) => setCurrentTreeIdFn({ data: { treeId } }),
    onSuccess: (treeId) => {
      // Invalidate the current tree query to refetch
      queryClient.invalidateQueries({ queryKey: ["current-tree-id"] });
      // Navigate to the new tree
      navigate({
        to: "/dashboard/trees/$treeId",
        params: { treeId },
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to switch tree");
    },
  });
}

/**
 * Hook for clearing the current tree selection
 */
export function useClearCurrentTree() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => clearCurrentTreeIdFn(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-tree-id"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to clear tree selection");
    },
  });
}

/**
 * Combined hook for the tree switcher component
 * Provides current tree ID, list of trees, and switch functionality
 */
export function useTreeSwitcher() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const currentTreeIdQuery = useQuery(getCurrentTreeIdQuery());
  const treesQuery = useQuery(getMyTreesForSwitcherQuery());

  const setCurrentTreeMutation = useMutation({
    mutationFn: (treeId: string) => setCurrentTreeIdFn({ data: { treeId } }),
    onSuccess: (treeId) => {
      queryClient.invalidateQueries({ queryKey: ["current-tree-id"] });
      navigate({
        to: "/dashboard/trees/$treeId",
        params: { treeId },
      });
      toast.success("Switched to family tree");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to switch tree");
    },
  });

  const currentTree = treesQuery.data?.find(
    (tree) => tree.id === currentTreeIdQuery.data
  );

  return {
    currentTreeId: currentTreeIdQuery.data,
    currentTree,
    trees: treesQuery.data || [],
    isLoading: currentTreeIdQuery.isLoading || treesQuery.isLoading,
    isError: currentTreeIdQuery.isError || treesQuery.isError,
    switchTree: (treeId: string) => setCurrentTreeMutation.mutate(treeId),
    isSwitching: setCurrentTreeMutation.isPending,
  };
}
