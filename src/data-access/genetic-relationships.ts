import { eq, inArray } from "drizzle-orm";
import { database } from "~/db";
import {
  parentChildRelationship,
  familyMember,
  type FamilyMember,
} from "~/db/schema";

/**
 * Genetic Relationship Data Access
 *
 * Provides functions to traverse family trees and determine genetic relationships
 * between family members for validation purposes.
 */

/**
 * Ancestor information with generation tracking
 */
export interface AncestorInfo {
  memberId: string;
  generation: number;
  path: string[]; // Path from the original person to this ancestor
}

/**
 * Descendant information with generation tracking
 */
export interface DescendantInfo {
  memberId: string;
  generation: number;
  path: string[]; // Path from the original person to this descendant
}

/**
 * Find all ancestors of a family member up to a maximum generation
 * Uses breadth-first search to traverse the family tree upwards
 *
 * @param memberId - The ID of the family member to find ancestors for
 * @param maxGenerations - Maximum number of generations to search (default: 4)
 * @returns A Map of ancestor IDs to their info (generation and path)
 */
export async function findAllAncestors(
  memberId: string,
  maxGenerations: number = 4
): Promise<Map<string, AncestorInfo>> {
  const ancestors = new Map<string, AncestorInfo>();
  const queue: Array<{ memberId: string; generation: number; path: string[] }> = [
    { memberId, generation: 0, path: [memberId] },
  ];

  const visited = new Set<string>([memberId]);

  while (queue.length > 0) {
    const current = queue.shift()!;

    // Don't search beyond max generations
    if (current.generation >= maxGenerations) {
      continue;
    }

    // Find parents of current member
    const parentRelationships = await database
      .select({
        parentId: parentChildRelationship.parentId,
      })
      .from(parentChildRelationship)
      .where(eq(parentChildRelationship.childId, current.memberId));

    for (const rel of parentRelationships) {
      // Skip if already visited (handles loops in data)
      if (visited.has(rel.parentId)) {
        continue;
      }

      visited.add(rel.parentId);

      const parentInfo: AncestorInfo = {
        memberId: rel.parentId,
        generation: current.generation + 1,
        path: [...current.path, rel.parentId],
      };

      ancestors.set(rel.parentId, parentInfo);

      // Add to queue for further traversal
      queue.push({
        memberId: rel.parentId,
        generation: current.generation + 1,
        path: parentInfo.path,
      });
    }
  }

  return ancestors;
}

/**
 * Find all descendants of a family member up to a maximum generation
 * Uses breadth-first search to traverse the family tree downwards
 *
 * @param memberId - The ID of the family member to find descendants for
 * @param maxGenerations - Maximum number of generations to search (default: 4)
 * @returns A Map of descendant IDs to their info (generation and path)
 */
export async function findAllDescendants(
  memberId: string,
  maxGenerations: number = 4
): Promise<Map<string, DescendantInfo>> {
  const descendants = new Map<string, DescendantInfo>();
  const queue: Array<{ memberId: string; generation: number; path: string[] }> = [
    { memberId, generation: 0, path: [memberId] },
  ];

  const visited = new Set<string>([memberId]);

  while (queue.length > 0) {
    const current = queue.shift()!;

    // Don't search beyond max generations
    if (current.generation >= maxGenerations) {
      continue;
    }

    // Find children of current member
    const childRelationships = await database
      .select({
        childId: parentChildRelationship.childId,
      })
      .from(parentChildRelationship)
      .where(eq(parentChildRelationship.parentId, current.memberId));

    for (const rel of childRelationships) {
      // Skip if already visited (handles loops in data)
      if (visited.has(rel.childId)) {
        continue;
      }

      visited.add(rel.childId);

      const childInfo: DescendantInfo = {
        memberId: rel.childId,
        generation: current.generation + 1,
        path: [...current.path, rel.childId],
      };

      descendants.set(rel.childId, childInfo);

      // Add to queue for further traversal
      queue.push({
        memberId: rel.childId,
        generation: current.generation + 1,
        path: childInfo.path,
      });
    }
  }

  return descendants;
}

/**
 * Get the genetic relationship between two family members
 * Returns information about their common ancestors and relationship type
 */
export async function getGeneticRelationship(
  memberId1: string,
  memberId2: string,
  maxGenerations: number = 4
): Promise<{
  areRelated: boolean;
  commonAncestors: Array<{
    ancestorId: string;
    generationFromMember1: number;
    generationFromMember2: number;
  }>;
  isAncestorDescendant: boolean;
  generations?: number;
}> {
  // Get ancestors for both members
  const [ancestors1, ancestors2] = await Promise.all([
    findAllAncestors(memberId1, maxGenerations),
    findAllAncestors(memberId2, maxGenerations),
  ]);

  // Check if one is an ancestor of the other
  if (ancestors1.has(memberId2)) {
    return {
      areRelated: true,
      commonAncestors: [],
      isAncestorDescendant: true,
      generations: ancestors1.get(memberId2)!.generation,
    };
  }

  if (ancestors2.has(memberId1)) {
    return {
      areRelated: true,
      commonAncestors: [],
      isAncestorDescendant: true,
      generations: ancestors2.get(memberId1)!.generation,
    };
  }

  // Find common ancestors
  const commonAncestors: Array<{
    ancestorId: string;
    generationFromMember1: number;
    generationFromMember2: number;
  }> = [];

  for (const [ancestorId, info1] of ancestors1) {
    const info2 = ancestors2.get(ancestorId);
    if (info2) {
      commonAncestors.push({
        ancestorId,
        generationFromMember1: info1.generation,
        generationFromMember2: info2.generation,
      });
    }
  }

  return {
    areRelated: commonAncestors.length > 0,
    commonAncestors,
    isAncestorDescendant: false,
  };
}

/**
 * Get member details by IDs
 */
export async function getMembersByIds(
  memberIds: string[]
): Promise<Map<string, FamilyMember>> {
  if (memberIds.length === 0) {
    return new Map();
  }

  const members = await database
    .select()
    .from(familyMember)
    .where(inArray(familyMember.id, memberIds));

  return new Map(members.map((m) => [m.id, m]));
}

/**
 * Check if two people are in a direct parent-child relationship
 */
export async function areParentAndChild(
  memberId1: string,
  memberId2: string
): Promise<boolean> {
  const ancestors1 = await findAllAncestors(memberId1, 1);
  const ancestors2 = await findAllAncestors(memberId2, 1);

  // Check if member1 is the parent of member2
  if (ancestors2.has(memberId1)) {
    return true;
  }

  // Check if member2 is the parent of member1
  if (ancestors1.has(memberId2)) {
    return true;
  }

  return false;
}

/**
 * Check if two people share the same parents (are siblings)
 * This is a more efficient check than full ancestor traversal
 */
export async function getSharedParents(
  memberId1: string,
  memberId2: string
): Promise<string[]> {
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
  const sharedParents = parents2.filter((p) => parentIds1.has(p.parentId));

  return sharedParents.map((p) => p.parentId);
}
