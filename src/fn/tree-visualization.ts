import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
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

// Types for tree visualization data
export interface TreeVisualizationData {
  tree: FamilyTree;
  members: FamilyMember[];
  relationships: ParentChildRelationship[];
  marriages: MarriageConnection[];
  treeName: string;
  treeDescription: string | null;
}

/**
 * Get all data needed for tree visualization
 * Requires authentication and either ownership or public access to the tree
 */
export const getTreeVisualizationDataFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({ familyTreeId: z.string().min(1, "Family tree ID is required") })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }): Promise<TreeVisualizationData> => {
    // Verify access to the family tree
    const familyTree = await findFamilyTreeById(data.familyTreeId);
    if (!familyTree) {
      throw new Error("Family tree not found");
    }

    const isOwner = familyTree.ownerId === context.userId;
    const isPublic = familyTree.isPublic;

    if (!isOwner && !isPublic) {
      throw new Error(
        "Unauthorized: You don't have permission to view this family tree"
      );
    }

    // Fetch all data needed for visualization in parallel
    const [members, relationships, marriages] = await Promise.all([
      findFamilyMembersByTreeId(data.familyTreeId),
      findParentChildRelationshipsByTreeId(data.familyTreeId),
      findMarriageConnectionsByTreeId(data.familyTreeId),
    ]);

    return {
      tree: familyTree,
      members,
      relationships,
      marriages,
      treeName: familyTree.name,
      treeDescription: familyTree.description,
    };
  });
