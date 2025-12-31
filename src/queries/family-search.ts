import { queryOptions } from "@tanstack/react-query";
import {
  searchFamilyTreeFn,
  searchFamilyTreeByCategoryFn,
  searchFamilyMembersFn,
  quickSearchFamilyMembersFn,
} from "~/fn/family-search";

/**
 * Search parameters for family tree full-text search
 */
export interface FamilySearchParams {
  familyTreeId: string;
  query: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

/**
 * Search parameters with category filter
 */
export interface FamilySearchWithCategoryParams extends FamilySearchParams {
  category?: "all" | "members" | "stories" | "events";
}

/**
 * Quick search parameters for autocomplete
 */
export interface QuickSearchParams {
  familyTreeId: string;
  query: string;
  limit?: number;
}

/**
 * Query options for full-text search across all categories
 * Searches members, stories, and events
 */
export const familySearchQuery = (params: FamilySearchParams) =>
  queryOptions({
    queryKey: [
      "family-search",
      params.familyTreeId,
      params.query,
      params.dateFrom,
      params.dateTo,
      params.limit,
      params.offset,
    ],
    queryFn: () =>
      searchFamilyTreeFn({
        data: {
          familyTreeId: params.familyTreeId,
          query: params.query,
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
          limit: params.limit,
          offset: params.offset,
        },
      }),
    // Don't refetch on window focus for search results
    refetchOnWindowFocus: false,
    // Keep stale data for 5 minutes
    staleTime: 5 * 60 * 1000,
    // Only enable when we have a query
    enabled: !!params.query && params.query.trim().length > 0,
  });

/**
 * Query options for full-text search with category filter
 * Allows searching specific categories (members, stories, events, or all)
 */
export const familySearchByCategoryQuery = (params: FamilySearchWithCategoryParams) =>
  queryOptions({
    queryKey: [
      "family-search",
      params.familyTreeId,
      params.query,
      params.category,
      params.dateFrom,
      params.dateTo,
      params.limit,
      params.offset,
    ],
    queryFn: () =>
      searchFamilyTreeByCategoryFn({
        data: {
          familyTreeId: params.familyTreeId,
          query: params.query,
          category: params.category,
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
          limit: params.limit,
          offset: params.offset,
        },
      }),
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    enabled: !!params.query && params.query.trim().length > 0,
  });

/**
 * Query options for member-only full-text search
 */
export const memberSearchQuery = (params: FamilySearchParams) =>
  queryOptions({
    queryKey: [
      "member-search",
      params.familyTreeId,
      params.query,
      params.dateFrom,
      params.dateTo,
      params.limit,
      params.offset,
    ],
    queryFn: () =>
      searchFamilyMembersFn({
        data: {
          familyTreeId: params.familyTreeId,
          query: params.query,
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
          limit: params.limit,
          offset: params.offset,
        },
      }),
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    enabled: !!params.query && params.query.trim().length > 0,
  });

/**
 * Query options for quick member search (autocomplete)
 * Uses simpler LIKE matching for speed
 */
export const quickMemberSearchQuery = (params: QuickSearchParams) =>
  queryOptions({
    queryKey: [
      "quick-member-search",
      params.familyTreeId,
      params.query,
      params.limit,
    ],
    queryFn: () =>
      quickSearchFamilyMembersFn({
        data: {
          familyTreeId: params.familyTreeId,
          query: params.query,
          limit: params.limit,
        },
      }),
    refetchOnWindowFocus: false,
    // Shorter stale time for autocomplete
    staleTime: 30 * 1000,
    // Only enable when we have at least 1 character
    enabled: !!params.query && params.query.trim().length >= 1,
  });
