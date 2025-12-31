import { queryOptions } from "@tanstack/react-query";
import { getTreeComparisonDataFn } from "~/fn/tree-comparison";

export interface TreeComparisonParams {
  treeId1: string;
  treeId2: string;
}

/**
 * Query options for comparing two family trees
 */
export const getTreeComparisonQuery = (params: TreeComparisonParams) =>
  queryOptions({
    queryKey: ["tree-comparison", params.treeId1, params.treeId2],
    queryFn: () =>
      getTreeComparisonDataFn({
        data: {
          treeId1: params.treeId1,
          treeId2: params.treeId2,
        },
      }),
    enabled: !!params.treeId1 && !!params.treeId2,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
