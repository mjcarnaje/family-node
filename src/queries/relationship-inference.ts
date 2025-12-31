import { queryOptions } from "@tanstack/react-query";
import {
  inferRelationshipBetweenMembersFn,
  getAllRelationshipsGroupedFn,
  getAllRelationshipsWithDetailsFn,
  getAllCousinsInTreeFn,
  getAllInLawsInTreeFn,
  getRelationshipSummaryFn,
  suggestRelationshipsFn,
  getRelationshipDescriptionFn,
} from "~/fn/relationship-inference";

/**
 * Relationship Inference Queries
 *
 * TanStack Query options for relationship inference endpoints.
 * These provide caching and automatic refetching for relationship data.
 */

/**
 * Query for inferring relationship between two members
 */
export const inferRelationshipQuery = (
  memberId1: string,
  memberId2: string,
  maxGenerations: number = 4
) =>
  queryOptions({
    queryKey: ["relationship-inference", memberId1, memberId2, maxGenerations],
    queryFn: () =>
      inferRelationshipBetweenMembersFn({
        data: { memberId1, memberId2, maxGenerations },
      }),
    enabled: !!memberId1 && !!memberId2 && memberId1 !== memberId2,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

/**
 * Query for getting all relationships grouped by category
 */
export const getAllRelationshipsGroupedQuery = (
  memberId: string,
  maxGenerations: number = 4
) =>
  queryOptions({
    queryKey: ["relationships-grouped", memberId, maxGenerations],
    queryFn: () =>
      getAllRelationshipsGroupedFn({
        data: { memberId, maxGenerations },
      }),
    enabled: !!memberId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

/**
 * Query for getting all relationships with full member details
 */
export const getAllRelationshipsWithDetailsQuery = (
  memberId: string,
  maxGenerations: number = 4
) =>
  queryOptions({
    queryKey: ["relationships-with-details", memberId, maxGenerations],
    queryFn: () =>
      getAllRelationshipsWithDetailsFn({
        data: { memberId, maxGenerations },
      }),
    enabled: !!memberId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

/**
 * Query for getting all cousin relationships in a tree
 */
export const getAllCousinsQuery = (familyTreeId: string) =>
  queryOptions({
    queryKey: ["tree-cousins", familyTreeId],
    queryFn: () =>
      getAllCousinsInTreeFn({
        data: { familyTreeId },
      }),
    enabled: !!familyTreeId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

/**
 * Query for getting all in-law relationships in a tree
 */
export const getAllInLawsQuery = (familyTreeId: string) =>
  queryOptions({
    queryKey: ["tree-in-laws", familyTreeId],
    queryFn: () =>
      getAllInLawsInTreeFn({
        data: { familyTreeId },
      }),
    enabled: !!familyTreeId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

/**
 * Query for getting relationship summary for a tree
 */
export const getRelationshipSummaryQuery = (familyTreeId: string) =>
  queryOptions({
    queryKey: ["relationship-summary", familyTreeId],
    queryFn: () =>
      getRelationshipSummaryFn({
        data: { familyTreeId },
      }),
    enabled: !!familyTreeId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

/**
 * Query for suggesting relationships for a member
 */
export const suggestRelationshipsQuery = (
  memberId: string,
  knownConnections: {
    parentIds?: string[];
    childIds?: string[];
    spouseIds?: string[];
  } = {}
) =>
  queryOptions({
    queryKey: [
      "relationship-suggestions",
      memberId,
      knownConnections.parentIds,
      knownConnections.childIds,
      knownConnections.spouseIds,
    ],
    queryFn: () =>
      suggestRelationshipsFn({
        data: {
          memberId,
          parentIds: knownConnections.parentIds,
          childIds: knownConnections.childIds,
          spouseIds: knownConnections.spouseIds,
        },
      }),
    enabled: !!memberId,
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes (suggestions may change more frequently)
  });

/**
 * Query for getting relationship description between two members
 */
export const getRelationshipDescriptionQuery = (
  memberId1: string,
  memberId2: string,
  member1Name: string,
  member2Name: string,
  maxGenerations: number = 4
) =>
  queryOptions({
    queryKey: [
      "relationship-description",
      memberId1,
      memberId2,
      maxGenerations,
    ],
    queryFn: () =>
      getRelationshipDescriptionFn({
        data: {
          memberId1,
          memberId2,
          member1Name,
          member2Name,
          maxGenerations,
        },
      }),
    enabled:
      !!memberId1 &&
      !!memberId2 &&
      !!member1Name &&
      !!member2Name &&
      memberId1 !== memberId2,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
