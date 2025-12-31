import { queryOptions } from "@tanstack/react-query";
import {
  getTreeVersionHistoryFn,
  getVersionDetailsFn,
  compareVersionsFn,
  getTreeActivityLogFn,
} from "~/fn/tree-versions";

export interface TreeVersionHistoryParams {
  familyTreeId: string;
  limit?: number;
  offset?: number;
}

export interface VersionDetailsParams {
  versionId: string;
}

export interface CompareVersionsParams {
  versionId1: string;
  versionId2: string;
}

export interface TreeActivityLogParams {
  familyTreeId: string;
  limit?: number;
  offset?: number;
}

/**
 * Query options for fetching tree version history
 */
export const getTreeVersionHistoryQuery = (params: TreeVersionHistoryParams) =>
  queryOptions({
    queryKey: [
      "tree-versions",
      params.familyTreeId,
      params.limit,
      params.offset,
    ],
    queryFn: () =>
      getTreeVersionHistoryFn({
        data: {
          familyTreeId: params.familyTreeId,
          limit: params.limit,
          offset: params.offset,
        },
      }),
    enabled: !!params.familyTreeId,
  });

/**
 * Query options for fetching version details
 */
export const getVersionDetailsQuery = (params: VersionDetailsParams) =>
  queryOptions({
    queryKey: ["tree-version-details", params.versionId],
    queryFn: () =>
      getVersionDetailsFn({
        data: {
          versionId: params.versionId,
        },
      }),
    enabled: !!params.versionId,
  });

/**
 * Query options for comparing two versions
 */
export const getCompareVersionsQuery = (params: CompareVersionsParams) =>
  queryOptions({
    queryKey: ["tree-version-compare", params.versionId1, params.versionId2],
    queryFn: () =>
      compareVersionsFn({
        data: {
          versionId1: params.versionId1,
          versionId2: params.versionId2,
        },
      }),
    enabled: !!params.versionId1 && !!params.versionId2,
  });

/**
 * Query options for fetching tree activity log
 */
export const getTreeActivityLogQuery = (params: TreeActivityLogParams) =>
  queryOptions({
    queryKey: [
      "tree-activity-log",
      params.familyTreeId,
      params.limit,
      params.offset,
    ],
    queryFn: () =>
      getTreeActivityLogFn({
        data: {
          familyTreeId: params.familyTreeId,
          limit: params.limit,
          offset: params.offset,
        },
      }),
    enabled: !!params.familyTreeId,
  });
