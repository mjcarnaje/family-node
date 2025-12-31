import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "./useDebounce";
import {
  familySearchByCategoryQuery,
  quickMemberSearchQuery,
  type FamilySearchWithCategoryParams,
} from "~/queries/family-search";

/**
 * Search category type
 */
export type SearchCategory = "all" | "members" | "stories" | "events";

/**
 * Hook options for family search
 */
interface UseFamilySearchOptions {
  /** The family tree ID to search within */
  familyTreeId: string;
  /** Debounce delay in milliseconds (default: 300ms) */
  debounceMs?: number;
  /** Default category to search (default: "all") */
  defaultCategory?: SearchCategory;
  /** Default result limit (default: 20) */
  defaultLimit?: number;
}

/**
 * Hook for full-text search across family tree members, stories, and events
 * Includes debounced input, pagination, and category filtering
 */
export function useFamilySearch(options: UseFamilySearchOptions) {
  const {
    familyTreeId,
    debounceMs = 300,
    defaultCategory = "all",
    defaultLimit = 20,
  } = options;

  // Search state
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SearchCategory>(defaultCategory);
  const [dateFrom, setDateFrom] = useState<string | undefined>();
  const [dateTo, setDateTo] = useState<string | undefined>();
  const [limit] = useState(defaultLimit);
  const [offset, setOffset] = useState(0);

  // Debounce the search query
  const debouncedQuery = useDebounce(query, debounceMs);

  // Build query parameters
  const searchParams: FamilySearchWithCategoryParams = useMemo(
    () => ({
      familyTreeId,
      query: debouncedQuery,
      category,
      dateFrom,
      dateTo,
      limit,
      offset,
    }),
    [familyTreeId, debouncedQuery, category, dateFrom, dateTo, limit, offset]
  );

  // Execute the search query
  const searchResult = useQuery(familySearchByCategoryQuery(searchParams));

  // Pagination helpers
  const hasNextPage = useMemo(() => {
    if (!searchResult.data) return false;
    const total =
      searchResult.data.totalMembers +
      searchResult.data.totalStories +
      searchResult.data.totalEvents;
    return offset + limit < total;
  }, [searchResult.data, offset, limit]);

  const hasPrevPage = offset > 0;

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setOffset((prev) => prev + limit);
    }
  }, [hasNextPage, limit]);

  const prevPage = useCallback(() => {
    if (hasPrevPage) {
      setOffset((prev) => Math.max(0, prev - limit));
    }
  }, [hasPrevPage, limit]);

  const resetPagination = useCallback(() => {
    setOffset(0);
  }, []);

  // Handle query change with pagination reset
  const handleQueryChange = useCallback((newQuery: string) => {
    setQuery(newQuery);
    setOffset(0);
  }, []);

  // Handle category change with pagination reset
  const handleCategoryChange = useCallback((newCategory: SearchCategory) => {
    setCategory(newCategory);
    setOffset(0);
  }, []);

  // Handle date filter change with pagination reset
  const handleDateFilterChange = useCallback(
    (from: string | undefined, to: string | undefined) => {
      setDateFrom(from);
      setDateTo(to);
      setOffset(0);
    },
    []
  );

  // Clear all filters
  const clearFilters = useCallback(() => {
    setQuery("");
    setCategory(defaultCategory);
    setDateFrom(undefined);
    setDateTo(undefined);
    setOffset(0);
  }, [defaultCategory]);

  // Computed values
  const totalResults = useMemo(() => {
    if (!searchResult.data) return 0;
    return (
      searchResult.data.totalMembers +
      searchResult.data.totalStories +
      searchResult.data.totalEvents
    );
  }, [searchResult.data]);

  const isEmpty = useMemo(() => {
    return totalResults === 0 && debouncedQuery.length > 0 && !searchResult.isLoading;
  }, [totalResults, debouncedQuery, searchResult.isLoading]);

  return {
    // State
    query,
    debouncedQuery,
    category,
    dateFrom,
    dateTo,
    offset,
    limit,

    // Results
    data: searchResult.data,
    isLoading: searchResult.isLoading,
    isError: searchResult.isError,
    error: searchResult.error,
    isFetching: searchResult.isFetching,

    // Computed
    totalResults,
    isEmpty,
    hasNextPage,
    hasPrevPage,

    // Actions
    setQuery: handleQueryChange,
    setCategory: handleCategoryChange,
    setDateFilter: handleDateFilterChange,
    nextPage,
    prevPage,
    resetPagination,
    clearFilters,
  };
}

/**
 * Hook options for quick member search (autocomplete)
 */
interface UseQuickSearchOptions {
  /** The family tree ID to search within */
  familyTreeId: string;
  /** Debounce delay in milliseconds (default: 150ms) */
  debounceMs?: number;
  /** Result limit (default: 10) */
  limit?: number;
}

/**
 * Hook for quick member search (autocomplete functionality)
 * Uses LIKE matching for speed, debounced input
 */
export function useQuickMemberSearch(options: UseQuickSearchOptions) {
  const { familyTreeId, debounceMs = 150, limit = 10 } = options;

  // Search state
  const [query, setQuery] = useState("");

  // Debounce the search query
  const debouncedQuery = useDebounce(query, debounceMs);

  // Execute the quick search query
  const searchResult = useQuery(
    quickMemberSearchQuery({
      familyTreeId,
      query: debouncedQuery,
      limit,
    })
  );

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery("");
  }, []);

  return {
    // State
    query,
    debouncedQuery,

    // Results
    results: searchResult.data ?? [],
    isLoading: searchResult.isLoading,
    isError: searchResult.isError,
    error: searchResult.error,
    isFetching: searchResult.isFetching,

    // Actions
    setQuery,
    clearSearch,
  };
}
