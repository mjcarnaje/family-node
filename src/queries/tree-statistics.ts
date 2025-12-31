import { queryOptions } from "@tanstack/react-query";
import {
  getTreeStatisticsFn,
  getTreeMemberStatsFn,
  getTreeAgeStatsFn,
  getTreeGrowthDataFn,
} from "~/fn/tree-statistics";

// ============================================
// Tree Statistics Query Options
// ============================================

/**
 * Query options for getting comprehensive tree statistics
 */
export const getTreeStatisticsQuery = (familyTreeId: string) =>
  queryOptions({
    queryKey: ["tree-statistics", familyTreeId],
    queryFn: () => getTreeStatisticsFn({ data: { familyTreeId } }),
    enabled: !!familyTreeId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

/**
 * Query options for getting lightweight member count stats
 */
export const getTreeMemberStatsQuery = (familyTreeId: string) =>
  queryOptions({
    queryKey: ["tree-member-stats", familyTreeId],
    queryFn: () => getTreeMemberStatsFn({ data: { familyTreeId } }),
    enabled: !!familyTreeId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

/**
 * Query options for getting age-related statistics
 */
export const getTreeAgeStatsQuery = (familyTreeId: string) =>
  queryOptions({
    queryKey: ["tree-age-stats", familyTreeId],
    queryFn: () => getTreeAgeStatsFn({ data: { familyTreeId } }),
    enabled: !!familyTreeId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

/**
 * Query options for getting family growth timeline
 */
export const getTreeGrowthDataQuery = (familyTreeId: string) =>
  queryOptions({
    queryKey: ["tree-growth-data", familyTreeId],
    queryFn: () => getTreeGrowthDataFn({ data: { familyTreeId } }),
    enabled: !!familyTreeId,
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes (growth data changes less frequently)
  });
