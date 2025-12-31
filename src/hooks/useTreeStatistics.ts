import { useQuery } from "@tanstack/react-query";
import {
  getTreeStatisticsQuery,
  getTreeMemberStatsQuery,
  getTreeAgeStatsQuery,
  getTreeGrowthDataQuery,
} from "~/queries/tree-statistics";

// ============================================
// Tree Statistics Hooks
// ============================================

/**
 * Hook for fetching comprehensive tree statistics
 * Returns member stats, relationship stats, age stats, generations, and growth data
 */
export function useTreeStatistics(familyTreeId: string) {
  return useQuery(getTreeStatisticsQuery(familyTreeId));
}

/**
 * Hook for fetching lightweight member count statistics
 * Use this when you only need member counts
 */
export function useTreeMemberStats(familyTreeId: string) {
  return useQuery(getTreeMemberStatsQuery(familyTreeId));
}

/**
 * Hook for fetching age-related statistics
 * Returns oldest/youngest members and generation count
 */
export function useTreeAgeStats(familyTreeId: string) {
  return useQuery(getTreeAgeStatsQuery(familyTreeId));
}

/**
 * Hook for fetching family growth timeline data
 */
export function useTreeGrowthData(familyTreeId: string) {
  return useQuery(getTreeGrowthDataQuery(familyTreeId));
}
