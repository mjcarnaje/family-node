import { queryOptions } from "@tanstack/react-query";
import { getTreeVisualizationDataFn } from "~/fn/tree-visualization";

// Query options for getting tree visualization data
export const getTreeVisualizationQuery = (familyTreeId: string) =>
  queryOptions({
    queryKey: ["tree-visualization", familyTreeId],
    queryFn: () => getTreeVisualizationDataFn({ data: { familyTreeId } }),
    enabled: !!familyTreeId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
