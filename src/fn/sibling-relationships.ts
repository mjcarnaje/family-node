import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  findSiblingsOfMember,
  findSiblingsOfMemberWithDetails,
  areSiblings,
  findUniqueSiblingPairsInTree,
} from "~/data-access/sibling-relationships";
import { findFamilyMemberById } from "~/data-access/family-members";
import { findFamilyTreeById } from "~/data-access/family-trees";

/**
 * Get all siblings of a family member (computed from shared parents)
 * Returns sibling relationships with type (full, half, step)
 */
export const getSiblingsOfMemberFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({ memberId: z.string().min(1, "Member ID is required") })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // First get the member to find their tree
    const member = await findFamilyMemberById(data.memberId);
    if (!member) {
      throw new Error("Family member not found");
    }

    // Verify access to the family tree
    const familyTree = await findFamilyTreeById(member.familyTreeId);
    if (!familyTree) {
      throw new Error("Family tree not found");
    }

    const isOwner = familyTree.ownerId === context.userId;
    const isPublic = familyTree.isPublic;

    if (!isOwner && !isPublic) {
      throw new Error(
        "Unauthorized: You don't have permission to view siblings for this member"
      );
    }

    const siblings = await findSiblingsOfMember(data.memberId);
    return siblings;
  });

/**
 * Get all siblings of a family member with full details
 */
export const getSiblingsOfMemberWithDetailsFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({ memberId: z.string().min(1, "Member ID is required") })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // First get the member to find their tree
    const member = await findFamilyMemberById(data.memberId);
    if (!member) {
      throw new Error("Family member not found");
    }

    // Verify access to the family tree
    const familyTree = await findFamilyTreeById(member.familyTreeId);
    if (!familyTree) {
      throw new Error("Family tree not found");
    }

    const isOwner = familyTree.ownerId === context.userId;
    const isPublic = familyTree.isPublic;

    if (!isOwner && !isPublic) {
      throw new Error(
        "Unauthorized: You don't have permission to view siblings for this member"
      );
    }

    const siblings = await findSiblingsOfMemberWithDetails(data.memberId);
    return siblings;
  });

/**
 * Check if two family members are siblings
 */
export const checkIfSiblingsFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      memberId1: z.string().min(1, "First member ID is required"),
      memberId2: z.string().min(1, "Second member ID is required"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Get both members to verify they belong to the same tree
    const [member1, member2] = await Promise.all([
      findFamilyMemberById(data.memberId1),
      findFamilyMemberById(data.memberId2),
    ]);

    if (!member1) {
      throw new Error("First family member not found");
    }

    if (!member2) {
      throw new Error("Second family member not found");
    }

    if (member1.familyTreeId !== member2.familyTreeId) {
      throw new Error("Members must belong to the same family tree");
    }

    // Verify access to the family tree
    const familyTree = await findFamilyTreeById(member1.familyTreeId);
    if (!familyTree) {
      throw new Error("Family tree not found");
    }

    const isOwner = familyTree.ownerId === context.userId;
    const isPublic = familyTree.isPublic;

    if (!isOwner && !isPublic) {
      throw new Error(
        "Unauthorized: You don't have permission to check sibling relationships in this tree"
      );
    }

    const result = await areSiblings(data.memberId1, data.memberId2);
    return result;
  });

/**
 * Get all sibling pairs in a family tree
 */
export const getAllSiblingPairsInTreeFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({ familyTreeId: z.string().min(1, "Family tree ID is required") })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Verify access to the family tree
    const familyTree = await findFamilyTreeById(data.familyTreeId);
    if (!familyTree) {
      throw new Error("Family tree not found");
    }

    const isOwner = familyTree.ownerId === context.userId;
    const isPublic = familyTree.isPublic;

    if (!isOwner && !isPublic) {
      throw new Error(
        "Unauthorized: You don't have permission to view sibling relationships in this tree"
      );
    }

    const siblingPairs = await findUniqueSiblingPairsInTree(data.familyTreeId);
    return siblingPairs;
  });
