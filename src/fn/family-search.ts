import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  searchFamilyTreeWithAuth,
  searchFamilyMembersWithAuth,
  quickSearchFamilyMembersWithAuth,
  searchWithCategory,
  SearchAuthorizationError,
  TreeNotFoundError,
  type SearchCategory,
} from "~/use-cases/family-search";
import type { SearchResults, MemberSearchResult } from "~/data-access/family-search";
import type { FamilyMember } from "~/db/schema";

// Validation schema for search filters
const searchFiltersSchema = z.object({
  familyTreeId: z.string().min(1, "Family tree ID is required"),
  query: z.string().min(1, "Search query is required"),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional().default(0),
});

// Validation schema for search with category
const searchWithCategorySchema = searchFiltersSchema.extend({
  category: z.enum(["all", "members", "stories", "events"]).optional().default("all"),
});

// Validation schema for quick search
const quickSearchSchema = z.object({
  familyTreeId: z.string().min(1, "Family tree ID is required"),
  query: z.string(),
  limit: z.number().min(1).max(50).optional().default(10),
});

/**
 * Search family tree members, stories, and events with full-text search
 * Returns ranked results across all categories
 */
export const searchFamilyTreeFn = createServerFn({
  method: "GET",
})
  .inputValidator(searchFiltersSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }): Promise<SearchResults> => {
    try {
      const results = await searchFamilyTreeWithAuth(
        context.userId,
        data.familyTreeId,
        {
          query: data.query,
          dateFrom: data.dateFrom,
          dateTo: data.dateTo,
          limit: data.limit,
          offset: data.offset,
        }
      );
      return results;
    } catch (error) {
      if (error instanceof SearchAuthorizationError) {
        throw new Error(error.message);
      }
      if (error instanceof TreeNotFoundError) {
        throw new Error(error.message);
      }
      throw error;
    }
  });

/**
 * Search family tree with specific category
 * Allows searching only members, stories, events, or all
 */
export const searchFamilyTreeByCategoryFn = createServerFn({
  method: "GET",
})
  .inputValidator(searchWithCategorySchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }): Promise<SearchResults> => {
    try {
      const results = await searchWithCategory(
        context.userId,
        data.familyTreeId,
        {
          query: data.query,
          dateFrom: data.dateFrom,
          dateTo: data.dateTo,
          limit: data.limit,
          offset: data.offset,
        },
        data.category as SearchCategory
      );
      return results;
    } catch (error) {
      if (error instanceof SearchAuthorizationError) {
        throw new Error(error.message);
      }
      if (error instanceof TreeNotFoundError) {
        throw new Error(error.message);
      }
      throw error;
    }
  });

/**
 * Search only family members with full-text search
 * Returns ranked member results
 */
export const searchFamilyMembersFn = createServerFn({
  method: "GET",
})
  .inputValidator(searchFiltersSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }): Promise<{ results: MemberSearchResult[]; total: number }> => {
    try {
      const results = await searchFamilyMembersWithAuth(
        context.userId,
        data.familyTreeId,
        {
          query: data.query,
          dateFrom: data.dateFrom,
          dateTo: data.dateTo,
          limit: data.limit,
          offset: data.offset,
        }
      );
      return results;
    } catch (error) {
      if (error instanceof SearchAuthorizationError) {
        throw new Error(error.message);
      }
      if (error instanceof TreeNotFoundError) {
        throw new Error(error.message);
      }
      throw error;
    }
  });

/**
 * Quick search for family members by name (for autocomplete)
 * Uses simpler LIKE matching for speed
 */
export const quickSearchFamilyMembersFn = createServerFn({
  method: "GET",
})
  .inputValidator(quickSearchSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }): Promise<FamilyMember[]> => {
    try {
      // Return empty array for empty queries
      if (!data.query.trim()) {
        return [];
      }

      const results = await quickSearchFamilyMembersWithAuth(
        context.userId,
        data.familyTreeId,
        data.query,
        data.limit
      );
      return results;
    } catch (error) {
      if (error instanceof SearchAuthorizationError) {
        throw new Error(error.message);
      }
      if (error instanceof TreeNotFoundError) {
        throw new Error(error.message);
      }
      throw error;
    }
  });
