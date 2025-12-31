import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  inferRelationshipBetweenMembers,
  inferAllRelationshipsGrouped,
  inferAllRelationshipsWithDetails,
  getAllCousinsInTree,
  getAllInLawsInTree,
  getTreeRelationshipSummary,
  suggestRelationshipsForMember,
  getRelationshipDescription,
  getRelationshipCategory,
  type GroupedRelationships,
} from "~/use-cases/relationship-inference";
import type {
  InferredRelationship,
  InferredRelationshipWithDetails,
} from "~/data-access/relationship-inference";

/**
 * Relationship Inference Server Functions
 *
 * API endpoints for relationship inference functionality.
 * All endpoints require authentication and verify access to the family tree.
 */

/**
 * Infer the relationship between two family members
 */
export const inferRelationshipBetweenMembersFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      memberId1: z.string().min(1, "First member ID is required"),
      memberId2: z.string().min(1, "Second member ID is required"),
      maxGenerations: z.number().min(1).max(10).optional().default(4),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const relationship = await inferRelationshipBetweenMembers(
      data.memberId1,
      data.memberId2,
      context.userId,
      { maxGenerations: data.maxGenerations }
    );

    return relationship;
  });

/**
 * Get all relationships for a member, grouped by category
 */
export const getAllRelationshipsGroupedFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      memberId: z.string().min(1, "Member ID is required"),
      maxGenerations: z.number().min(1).max(10).optional().default(4),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }): Promise<GroupedRelationships> => {
    return inferAllRelationshipsGrouped(data.memberId, context.userId, {
      maxGenerations: data.maxGenerations,
    });
  });

/**
 * Get all relationships for a member with full member details
 */
export const getAllRelationshipsWithDetailsFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      memberId: z.string().min(1, "Member ID is required"),
      maxGenerations: z.number().min(1).max(10).optional().default(4),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }): Promise<InferredRelationshipWithDetails[]> => {
    return inferAllRelationshipsWithDetails(data.memberId, context.userId, {
      maxGenerations: data.maxGenerations,
    });
  });

/**
 * Get all cousin relationships in a family tree
 */
export const getAllCousinsInTreeFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      familyTreeId: z.string().min(1, "Family tree ID is required"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    return getAllCousinsInTree(data.familyTreeId, context.userId);
  });

/**
 * Get all in-law relationships in a family tree
 */
export const getAllInLawsInTreeFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      familyTreeId: z.string().min(1, "Family tree ID is required"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }): Promise<InferredRelationship[]> => {
    return getAllInLawsInTree(data.familyTreeId, context.userId);
  });

/**
 * Get a summary of all relationships in a family tree
 */
export const getRelationshipSummaryFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      familyTreeId: z.string().min(1, "Family tree ID is required"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    return getTreeRelationshipSummary(data.familyTreeId, context.userId);
  });

/**
 * Suggest relationships for a member based on their known connections
 */
export const suggestRelationshipsFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      memberId: z.string().min(1, "Member ID is required"),
      parentIds: z.array(z.string()).optional(),
      childIds: z.array(z.string()).optional(),
      spouseIds: z.array(z.string()).optional(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }): Promise<InferredRelationship[]> => {
    return suggestRelationshipsForMember(data.memberId, context.userId, {
      parentIds: data.parentIds,
      childIds: data.childIds,
      spouseIds: data.spouseIds,
    });
  });

/**
 * Get a human-readable description of a relationship
 */
export const getRelationshipDescriptionFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      memberId1: z.string().min(1, "First member ID is required"),
      memberId2: z.string().min(1, "Second member ID is required"),
      member1Name: z.string().min(1, "First member name is required"),
      member2Name: z.string().min(1, "Second member name is required"),
      maxGenerations: z.number().min(1).max(10).optional().default(4),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const relationship = await inferRelationshipBetweenMembers(
      data.memberId1,
      data.memberId2,
      context.userId,
      { maxGenerations: data.maxGenerations }
    );

    if (!relationship) {
      return {
        found: false,
        description: `No known relationship found between ${data.member1Name} and ${data.member2Name}`,
      };
    }

    return {
      found: true,
      relationship,
      description: getRelationshipDescription(
        relationship,
        data.member1Name,
        data.member2Name
      ),
      category: getRelationshipCategory(relationship.relationshipType),
    };
  });

/**
 * Batch infer relationships between a member and multiple other members
 */
export const batchInferRelationshipsFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      fromMemberId: z.string().min(1, "From member ID is required"),
      toMemberIds: z.array(z.string()).min(1, "At least one to member ID is required"),
      maxGenerations: z.number().min(1).max(10).optional().default(4),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const results: Array<{
      toMemberId: string;
      relationship: InferredRelationship | null;
    }> = [];

    for (const toMemberId of data.toMemberIds) {
      try {
        const relationship = await inferRelationshipBetweenMembers(
          data.fromMemberId,
          toMemberId,
          context.userId,
          { maxGenerations: data.maxGenerations }
        );
        results.push({ toMemberId, relationship });
      } catch {
        results.push({ toMemberId, relationship: null });
      }
    }

    return results;
  });
