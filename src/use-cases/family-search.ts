import {
  searchFamilyMembers,
  searchFamilyStories,
  searchFamilyEvents,
  searchFamilyTree,
  quickSearchFamilyMembers,
  type SearchFilters,
  type SearchResults,
  type MemberSearchResult,
  type StorySearchResult,
  type EventSearchResult,
} from "~/data-access/family-search";
import { findFamilyTreeById } from "~/data-access/family-trees";
import { userHasTreeAccess } from "~/data-access/tree-sharing";
import type { FamilyMember } from "~/db/schema";

/**
 * Error thrown when a user is not authorized to search a tree
 */
export class SearchAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SearchAuthorizationError";
  }
}

/**
 * Error thrown when a tree is not found
 */
export class TreeNotFoundError extends Error {
  constructor(treeId: string) {
    super(`Family tree not found: ${treeId}`);
    this.name = "TreeNotFoundError";
  }
}

/**
 * Verify that a user has access to search a tree
 * Returns true if user has access, throws an error otherwise
 */
async function verifySearchAccess(
  userId: string,
  familyTreeId: string
): Promise<void> {
  // Check if tree exists
  const tree = await findFamilyTreeById(familyTreeId);
  if (!tree) {
    throw new TreeNotFoundError(familyTreeId);
  }

  // Check if user is owner
  if (tree.ownerId === userId) {
    return;
  }

  // Check if tree is public
  if (tree.isPublic || tree.privacyLevel === "public") {
    return;
  }

  // Check if user is a collaborator
  const hasAccess = await userHasTreeAccess(userId, familyTreeId);
  if (!hasAccess) {
    throw new SearchAuthorizationError(
      "You don't have permission to search this family tree"
    );
  }
}

/**
 * Search family members with authorization check
 */
export async function searchFamilyMembersWithAuth(
  userId: string,
  familyTreeId: string,
  filters: SearchFilters
): Promise<{ results: MemberSearchResult[]; total: number }> {
  await verifySearchAccess(userId, familyTreeId);
  return searchFamilyMembers(familyTreeId, filters);
}

/**
 * Search family stories with authorization check
 */
export async function searchFamilyStoriesWithAuth(
  userId: string,
  familyTreeId: string,
  filters: SearchFilters
): Promise<{ results: StorySearchResult[]; total: number }> {
  await verifySearchAccess(userId, familyTreeId);
  return searchFamilyStories(familyTreeId, filters);
}

/**
 * Search family events with authorization check
 */
export async function searchFamilyEventsWithAuth(
  userId: string,
  familyTreeId: string,
  filters: SearchFilters
): Promise<{ results: EventSearchResult[]; total: number }> {
  await verifySearchAccess(userId, familyTreeId);
  return searchFamilyEvents(familyTreeId, filters);
}

/**
 * Perform a combined search across members, stories, and events with authorization
 */
export async function searchFamilyTreeWithAuth(
  userId: string,
  familyTreeId: string,
  filters: SearchFilters
): Promise<SearchResults> {
  await verifySearchAccess(userId, familyTreeId);
  return searchFamilyTree(familyTreeId, filters);
}

/**
 * Quick search for family members by name with authorization (for autocomplete)
 */
export async function quickSearchFamilyMembersWithAuth(
  userId: string,
  familyTreeId: string,
  query: string,
  limit?: number
): Promise<FamilyMember[]> {
  await verifySearchAccess(userId, familyTreeId);
  return quickSearchFamilyMembers(familyTreeId, query, limit);
}

/**
 * Search type enum for type-safe search category selection
 */
export type SearchCategory = "all" | "members" | "stories" | "events";

/**
 * Unified search function that can search specific categories or all
 */
export async function searchWithCategory(
  userId: string,
  familyTreeId: string,
  filters: SearchFilters,
  category: SearchCategory = "all"
): Promise<SearchResults> {
  await verifySearchAccess(userId, familyTreeId);

  switch (category) {
    case "members": {
      const result = await searchFamilyMembers(familyTreeId, filters);
      return {
        members: result.results,
        stories: [],
        events: [],
        totalMembers: result.total,
        totalStories: 0,
        totalEvents: 0,
      };
    }
    case "stories": {
      const result = await searchFamilyStories(familyTreeId, filters);
      return {
        members: [],
        stories: result.results,
        events: [],
        totalMembers: 0,
        totalStories: result.total,
        totalEvents: 0,
      };
    }
    case "events": {
      const result = await searchFamilyEvents(familyTreeId, filters);
      return {
        members: [],
        stories: [],
        events: result.results,
        totalMembers: 0,
        totalStories: 0,
        totalEvents: result.total,
      };
    }
    case "all":
    default:
      return searchFamilyTree(familyTreeId, filters);
  }
}
