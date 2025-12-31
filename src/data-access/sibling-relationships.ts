import { eq, and, or, inArray } from "drizzle-orm";
import { database } from "~/db";
import {
  parentChildRelationship,
  familyMember,
  type FamilyMember,
  type ParentChildRelationship,
} from "~/db/schema";

/**
 * Sibling relationship type (computed from parent-child relationships)
 */
export interface SiblingRelationship {
  memberId: string;
  siblingId: string;
  relationshipType: "full" | "half" | "step";
  sharedParentIds: string[];
}

/**
 * Extended sibling info with member details
 */
export interface SiblingWithDetails extends SiblingRelationship {
  sibling: FamilyMember;
}

/**
 * Find all siblings of a family member (computed from shared parents)
 * Returns siblings with their relationship type (full, half, or step)
 */
export async function findSiblingsOfMember(
  memberId: string
): Promise<SiblingRelationship[]> {
  // First, find all parents of this member
  const parentRelationships = await database
    .select()
    .from(parentChildRelationship)
    .where(eq(parentChildRelationship.childId, memberId));

  if (parentRelationships.length === 0) {
    return [];
  }

  const parentIds = parentRelationships.map((rel) => rel.parentId);

  // Find all children of these parents (potential siblings)
  const siblingRelationships = await database
    .select()
    .from(parentChildRelationship)
    .where(inArray(parentChildRelationship.parentId, parentIds));

  // Group by child to find siblings and determine relationship type
  const siblingMap = new Map<
    string,
    { parentIds: Set<string>; relationshipTypes: Set<string> }
  >();

  for (const rel of siblingRelationships) {
    // Skip the member themselves
    if (rel.childId === memberId) continue;

    if (!siblingMap.has(rel.childId)) {
      siblingMap.set(rel.childId, {
        parentIds: new Set(),
        relationshipTypes: new Set(),
      });
    }

    const entry = siblingMap.get(rel.childId)!;
    entry.parentIds.add(rel.parentId);
    entry.relationshipTypes.add(rel.relationshipType);
  }

  // Determine relationship type for each sibling
  const siblings: SiblingRelationship[] = [];

  for (const [siblingId, { parentIds: sharedParents, relationshipTypes }] of siblingMap) {
    // Both share the same set of parents (assuming 2 biological parents)
    // Full sibling: share both biological parents
    // Half sibling: share exactly one biological parent
    // Step sibling: share a step parent or only through step relationship

    let relationshipType: "full" | "half" | "step";

    // Check if all relationships are step relationships
    const allStep = [...relationshipTypes].every((t) => t === "step");
    const memberParentIds = new Set(parentIds);
    const commonParents = [...sharedParents].filter((id) => memberParentIds.has(id));

    if (allStep) {
      relationshipType = "step";
    } else if (commonParents.length >= 2) {
      // Share at least 2 parents - likely full siblings
      relationshipType = "full";
    } else {
      // Share only 1 parent - half siblings
      relationshipType = "half";
    }

    siblings.push({
      memberId,
      siblingId,
      relationshipType,
      sharedParentIds: commonParents,
    });
  }

  return siblings;
}

/**
 * Find all siblings of a family member with their full details
 */
export async function findSiblingsOfMemberWithDetails(
  memberId: string
): Promise<SiblingWithDetails[]> {
  const siblingRelationships = await findSiblingsOfMember(memberId);

  if (siblingRelationships.length === 0) {
    return [];
  }

  const siblingIds = siblingRelationships.map((rel) => rel.siblingId);

  // Fetch sibling details
  const siblings = await database
    .select()
    .from(familyMember)
    .where(inArray(familyMember.id, siblingIds));

  const siblingMap = new Map(siblings.map((s) => [s.id, s]));

  return siblingRelationships
    .map((rel) => ({
      ...rel,
      sibling: siblingMap.get(rel.siblingId)!,
    }))
    .filter((rel) => rel.sibling); // Filter out any that weren't found
}

/**
 * Check if two members are siblings (share at least one parent)
 */
export async function areSiblings(
  memberId1: string,
  memberId2: string
): Promise<{ areSiblings: boolean; relationshipType?: "full" | "half" | "step" }> {
  // Find parents of both members
  const [parents1, parents2] = await Promise.all([
    database
      .select({ parentId: parentChildRelationship.parentId })
      .from(parentChildRelationship)
      .where(eq(parentChildRelationship.childId, memberId1)),
    database
      .select({ parentId: parentChildRelationship.parentId })
      .from(parentChildRelationship)
      .where(eq(parentChildRelationship.childId, memberId2)),
  ]);

  const parentIds1 = new Set(parents1.map((p) => p.parentId));
  const parentIds2 = new Set(parents2.map((p) => p.parentId));

  // Find common parents
  const commonParents = [...parentIds1].filter((id) => parentIds2.has(id));

  if (commonParents.length === 0) {
    return { areSiblings: false };
  }

  // Determine relationship type
  let relationshipType: "full" | "half" | "step";

  if (commonParents.length >= 2) {
    relationshipType = "full";
  } else {
    relationshipType = "half";
  }

  return { areSiblings: true, relationshipType };
}

/**
 * Find all siblings in a family tree (grouped by member)
 */
export async function findAllSiblingRelationshipsInTree(
  familyTreeId: string
): Promise<Map<string, SiblingRelationship[]>> {
  // Get all parent-child relationships in the tree
  const relationships = await database
    .select()
    .from(parentChildRelationship)
    .where(eq(parentChildRelationship.familyTreeId, familyTreeId));

  // Group relationships by parent
  const childrenByParent = new Map<string, ParentChildRelationship[]>();
  for (const rel of relationships) {
    if (!childrenByParent.has(rel.parentId)) {
      childrenByParent.set(rel.parentId, []);
    }
    childrenByParent.get(rel.parentId)!.push(rel);
  }

  // Group parents by child
  const parentsByChild = new Map<string, ParentChildRelationship[]>();
  for (const rel of relationships) {
    if (!parentsByChild.has(rel.childId)) {
      parentsByChild.set(rel.childId, []);
    }
    parentsByChild.get(rel.childId)!.push(rel);
  }

  // Build sibling relationships
  const siblingsByMember = new Map<string, SiblingRelationship[]>();

  for (const [childId, parentRels] of parentsByChild) {
    const siblings: Map<string, SiblingRelationship> = new Map();
    const parentIds = new Set(parentRels.map((r) => r.parentId));

    for (const parentRel of parentRels) {
      const siblingRels = childrenByParent.get(parentRel.parentId) || [];

      for (const siblingRel of siblingRels) {
        // Skip self
        if (siblingRel.childId === childId) continue;

        const siblingId = siblingRel.childId;

        if (!siblings.has(siblingId)) {
          siblings.set(siblingId, {
            memberId: childId,
            siblingId,
            relationshipType: "half", // Default, will be updated
            sharedParentIds: [],
          });
        }

        const entry = siblings.get(siblingId)!;
        if (!entry.sharedParentIds.includes(parentRel.parentId)) {
          entry.sharedParentIds.push(parentRel.parentId);
        }

        // Update relationship type based on shared parents
        if (entry.sharedParentIds.length >= 2) {
          entry.relationshipType = "full";
        }
      }
    }

    siblingsByMember.set(childId, [...siblings.values()]);
  }

  return siblingsByMember;
}

/**
 * Get a flattened list of all unique sibling pairs in a tree
 */
export async function findUniqueSiblingPairsInTree(
  familyTreeId: string
): Promise<Array<{ member1Id: string; member2Id: string; relationshipType: "full" | "half" | "step" }>> {
  const siblingsByMember = await findAllSiblingRelationshipsInTree(familyTreeId);
  const pairs = new Set<string>();
  const result: Array<{ member1Id: string; member2Id: string; relationshipType: "full" | "half" | "step" }> = [];

  for (const [memberId, siblings] of siblingsByMember) {
    for (const sibling of siblings) {
      // Create a unique key for the pair (sorted to avoid duplicates)
      const key = [memberId, sibling.siblingId].sort().join("-");

      if (!pairs.has(key)) {
        pairs.add(key);
        result.push({
          member1Id: memberId,
          member2Id: sibling.siblingId,
          relationshipType: sibling.relationshipType,
        });
      }
    }
  }

  return result;
}
