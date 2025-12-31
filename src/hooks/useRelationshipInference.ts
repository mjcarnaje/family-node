import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  inferRelationshipQuery,
  getAllRelationshipsGroupedQuery,
  getAllRelationshipsWithDetailsQuery,
  getAllCousinsQuery,
  getAllInLawsQuery,
  getRelationshipSummaryQuery,
  suggestRelationshipsQuery,
  getRelationshipDescriptionQuery,
} from "~/queries/relationship-inference";
import { batchInferRelationshipsFn } from "~/fn/relationship-inference";
import type { InferredRelationship } from "~/data-access/relationship-inference";

/**
 * Relationship Inference Hooks
 *
 * React hooks for accessing relationship inference functionality.
 * Provides automatic caching and refetching via TanStack Query.
 */

/**
 * Hook to infer relationship between two family members
 */
export function useInferRelationship(
  memberId1: string,
  memberId2: string,
  maxGenerations: number = 4
) {
  return useQuery(inferRelationshipQuery(memberId1, memberId2, maxGenerations));
}

/**
 * Hook to get all relationships for a member, grouped by category
 * Returns: { immediate, extended, inLaws }
 */
export function useAllRelationshipsGrouped(
  memberId: string,
  maxGenerations: number = 4
) {
  return useQuery(getAllRelationshipsGroupedQuery(memberId, maxGenerations));
}

/**
 * Hook to get all relationships for a member with full member details
 */
export function useAllRelationshipsWithDetails(
  memberId: string,
  maxGenerations: number = 4
) {
  return useQuery(getAllRelationshipsWithDetailsQuery(memberId, maxGenerations));
}

/**
 * Hook to get all cousin relationships in a family tree
 */
export function useAllCousins(familyTreeId: string) {
  return useQuery(getAllCousinsQuery(familyTreeId));
}

/**
 * Hook to get all in-law relationships in a family tree
 */
export function useAllInLaws(familyTreeId: string) {
  return useQuery(getAllInLawsQuery(familyTreeId));
}

/**
 * Hook to get relationship summary for a family tree
 * Returns counts of different relationship types
 */
export function useRelationshipSummary(familyTreeId: string) {
  return useQuery(getRelationshipSummaryQuery(familyTreeId));
}

/**
 * Hook to get relationship suggestions for a member
 * Suggests extended family relationships based on known connections
 */
export function useSuggestRelationships(
  memberId: string,
  knownConnections: {
    parentIds?: string[];
    childIds?: string[];
    spouseIds?: string[];
  } = {}
) {
  return useQuery(suggestRelationshipsQuery(memberId, knownConnections));
}

/**
 * Hook to get a human-readable relationship description between two members
 */
export function useRelationshipDescription(
  memberId1: string,
  memberId2: string,
  member1Name: string,
  member2Name: string,
  maxGenerations: number = 4
) {
  return useQuery(
    getRelationshipDescriptionQuery(
      memberId1,
      memberId2,
      member1Name,
      member2Name,
      maxGenerations
    )
  );
}

/**
 * Hook to batch infer relationships between a member and multiple other members
 * Useful when displaying relationship info for multiple members at once
 */
export function useBatchInferRelationships() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      fromMemberId,
      toMemberIds,
      maxGenerations = 4,
    }: {
      fromMemberId: string;
      toMemberIds: string[];
      maxGenerations?: number;
    }) =>
      batchInferRelationshipsFn({
        data: { fromMemberId, toMemberIds, maxGenerations },
      }),
    onSuccess: (
      data: Array<{ toMemberId: string; relationship: InferredRelationship | null }>,
      variables
    ) => {
      // Cache individual relationship results
      for (const result of data) {
        if (result.relationship) {
          queryClient.setQueryData(
            [
              "relationship-inference",
              variables.fromMemberId,
              result.toMemberId,
              variables.maxGenerations || 4,
            ],
            result.relationship
          );
        }
      }
    },
  });
}

/**
 * Hook to prefetch relationship data for a member
 * Useful for improving perceived performance when navigating to a member's detail view
 */
export function usePrefetchRelationships(familyTreeId: string) {
  const queryClient = useQueryClient();

  return {
    prefetchMemberRelationships: async (memberId: string) => {
      await Promise.all([
        queryClient.prefetchQuery(getAllRelationshipsGroupedQuery(memberId, 4)),
        queryClient.prefetchQuery(getAllRelationshipsWithDetailsQuery(memberId, 4)),
      ]);
    },
    prefetchTreeRelationships: async () => {
      await Promise.all([
        queryClient.prefetchQuery(getAllCousinsQuery(familyTreeId)),
        queryClient.prefetchQuery(getAllInLawsQuery(familyTreeId)),
        queryClient.prefetchQuery(getRelationshipSummaryQuery(familyTreeId)),
      ]);
    },
  };
}

/**
 * Hook to invalidate relationship cache when family tree data changes
 * Call this after adding/removing members or relationships
 */
export function useInvalidateRelationships(familyTreeId: string) {
  const queryClient = useQueryClient();

  return {
    invalidateAllRelationships: () => {
      queryClient.invalidateQueries({
        queryKey: ["relationship-inference"],
      });
      queryClient.invalidateQueries({
        queryKey: ["relationships-grouped"],
      });
      queryClient.invalidateQueries({
        queryKey: ["relationships-with-details"],
      });
      queryClient.invalidateQueries({
        queryKey: ["tree-cousins", familyTreeId],
      });
      queryClient.invalidateQueries({
        queryKey: ["tree-in-laws", familyTreeId],
      });
      queryClient.invalidateQueries({
        queryKey: ["relationship-summary", familyTreeId],
      });
      queryClient.invalidateQueries({
        queryKey: ["relationship-suggestions"],
      });
      queryClient.invalidateQueries({
        queryKey: ["relationship-description"],
      });
    },
    invalidateMemberRelationships: (memberId: string) => {
      queryClient.invalidateQueries({
        queryKey: ["relationship-inference", memberId],
      });
      queryClient.invalidateQueries({
        queryKey: ["relationships-grouped", memberId],
      });
      queryClient.invalidateQueries({
        queryKey: ["relationships-with-details", memberId],
      });
      queryClient.invalidateQueries({
        queryKey: ["relationship-suggestions", memberId],
      });
    },
  };
}
