import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { findFamilyTreeById } from "~/data-access/family-trees";
import { findFamilyMembersByTreeId } from "~/data-access/family-members";
import { findParentChildRelationshipsByTreeId } from "~/data-access/parent-child-relationships";
import { findMarriageConnectionsByTreeId } from "~/data-access/marriage-connections";
import type {
  FamilyMember,
  FamilyTree,
  ParentChildRelationship,
  MarriageConnection,
} from "~/db/schema";

// Types for public tree visualization data
export interface PublicTreeVisualizationData {
  tree: FamilyTree;
  members: FamilyMember[];
  relationships: ParentChildRelationship[];
  marriages: MarriageConnection[];
  treeName: string;
  treeDescription: string | null;
  ownerName: string | null;
}

/**
 * Get public family tree data - no authentication required
 * Only returns data if the tree's privacy level is "public"
 */
export const getPublicFamilyTreeFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({ familyTreeId: z.string().min(1, "Family tree ID is required") })
  )
  .handler(async ({ data }): Promise<PublicTreeVisualizationData> => {
    // Fetch the family tree
    const familyTree = await findFamilyTreeById(data.familyTreeId);

    if (!familyTree) {
      throw new Error("Family tree not found");
    }

    // Check if tree is public
    if (familyTree.privacyLevel !== "public") {
      throw new Error("This family tree is private");
    }

    // Fetch all data needed for visualization in parallel
    const [members, relationships, marriages] = await Promise.all([
      findFamilyMembersByTreeId(data.familyTreeId),
      findParentChildRelationshipsByTreeId(data.familyTreeId),
      findMarriageConnectionsByTreeId(data.familyTreeId),
    ]);

    // Get owner name from tree (if available in the joined data)
    // For now we return null, but this could be extended to fetch owner info
    const ownerName = null;

    return {
      tree: familyTree,
      members,
      relationships,
      marriages,
      treeName: familyTree.name,
      treeDescription: familyTree.description,
      ownerName,
    };
  });

/**
 * Check if a family tree is public - no authentication required
 * Used for lightweight checks before loading full data
 */
export const isTreePublicFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({ familyTreeId: z.string().min(1, "Family tree ID is required") })
  )
  .handler(async ({ data }): Promise<{ isPublic: boolean; treeName: string | null }> => {
    const familyTree = await findFamilyTreeById(data.familyTreeId);

    if (!familyTree) {
      return { isPublic: false, treeName: null };
    }

    return {
      isPublic: familyTree.privacyLevel === "public",
      treeName: familyTree.name,
    };
  });
