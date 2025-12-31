import { eq, inArray } from "drizzle-orm";
import { database } from "~/db";
import {
  parentChildRelationship,
  marriageConnection,
  familyMember,
  type FamilyMember,
  type MarriageConnection,
} from "~/db/schema";
import {
  findAllAncestors,
  findAllDescendants,
  type AncestorInfo,
  type DescendantInfo,
} from "./genetic-relationships";
import { findSiblingsOfMember, type SiblingRelationship } from "./sibling-relationships";

/**
 * Relationship Inference Data Access
 *
 * Provides functions to automatically detect and suggest relationships
 * like cousins, in-laws, and extended family based on existing connections.
 */

/**
 * Types of inferred relationships
 */
export type InferredRelationshipType =
  // Blood relatives
  | "parent"
  | "child"
  | "sibling"
  | "half-sibling"
  | "step-sibling"
  | "grandparent"
  | "grandchild"
  | "great-grandparent"
  | "great-grandchild"
  | "uncle"
  | "aunt"
  | "nephew"
  | "niece"
  | "first-cousin"
  | "second-cousin"
  | "third-cousin"
  | "first-cousin-once-removed"
  | "first-cousin-twice-removed"
  | "second-cousin-once-removed"
  // In-laws
  | "spouse"
  | "parent-in-law"
  | "child-in-law"
  | "sibling-in-law"
  | "grandparent-in-law"
  | "grandchild-in-law"
  // Extended in-laws
  | "uncle-in-law"
  | "aunt-in-law"
  | "nephew-in-law"
  | "niece-in-law"
  | "cousin-in-law";

/**
 * Inferred relationship between two family members
 */
export interface InferredRelationship {
  fromMemberId: string;
  toMemberId: string;
  relationshipType: InferredRelationshipType;
  relationshipLabel: string; // Human-readable label
  isBloodRelative: boolean;
  isInLaw: boolean;
  generationalDistance: number; // 0 = same generation, positive = older, negative = younger
  degreeOfSeparation: number; // How many "steps" apart (1 = direct, 2 = through one person, etc.)
  confidence: number; // 0-1 confidence score
  pathDescription: string; // How the relationship is traced
}

/**
 * Extended relationship info with member details
 */
export interface InferredRelationshipWithDetails extends InferredRelationship {
  fromMember: FamilyMember;
  toMember: FamilyMember;
}

/**
 * Result of relationship inference for a family tree
 */
export interface RelationshipInferenceResult {
  memberId: string;
  memberName: string;
  inferredRelationships: InferredRelationship[];
  totalRelationshipsFound: number;
}

/**
 * Pre-computed relationship context for efficient lookups
 */
interface RelationshipContext {
  memberId: string;
  ancestors: Map<string, AncestorInfo>;
  descendants: Map<string, DescendantInfo>;
  siblings: SiblingRelationship[];
  spouses: string[];
  children: string[];
  parents: string[];
}

/**
 * Build relationship context for a member (caches ancestor/descendant lookups)
 */
async function buildRelationshipContext(
  memberId: string,
  maxGenerations: number = 4
): Promise<RelationshipContext> {
  const [ancestors, descendants, siblings, marriages, parentRels, childRels] =
    await Promise.all([
      findAllAncestors(memberId, maxGenerations),
      findAllDescendants(memberId, maxGenerations),
      findSiblingsOfMember(memberId),
      database
        .select()
        .from(marriageConnection)
        .where(eq(marriageConnection.spouse1Id, memberId)),
      database
        .select({ parentId: parentChildRelationship.parentId })
        .from(parentChildRelationship)
        .where(eq(parentChildRelationship.childId, memberId)),
      database
        .select({ childId: parentChildRelationship.childId })
        .from(parentChildRelationship)
        .where(eq(parentChildRelationship.parentId, memberId)),
    ]);

  // Also get marriages where this member is spouse2
  const marriages2 = await database
    .select()
    .from(marriageConnection)
    .where(eq(marriageConnection.spouse2Id, memberId));

  const allMarriages = [...marriages, ...marriages2];
  const spouses = allMarriages.map((m) =>
    m.spouse1Id === memberId ? m.spouse2Id : m.spouse1Id
  );

  return {
    memberId,
    ancestors,
    descendants,
    siblings,
    spouses,
    parents: parentRels.map((r) => r.parentId),
    children: childRels.map((r) => r.childId),
  };
}

/**
 * Determine the relationship type based on generational distances from common ancestor
 */
function determineCousinRelationship(
  genFromPerson1: number,
  genFromPerson2: number
): { type: InferredRelationshipType; label: string } {
  // Both at same generation from common ancestor
  if (genFromPerson1 === genFromPerson2) {
    const cousinDegree = genFromPerson1 - 1;
    if (cousinDegree === 1) return { type: "first-cousin", label: "First Cousin" };
    if (cousinDegree === 2) return { type: "second-cousin", label: "Second Cousin" };
    if (cousinDegree === 3) return { type: "third-cousin", label: "Third Cousin" };
    return { type: "first-cousin", label: `${cousinDegree}th Cousin` };
  }

  // Different generations - "removed" cousins
  const minGen = Math.min(genFromPerson1, genFromPerson2);
  const removed = Math.abs(genFromPerson1 - genFromPerson2);
  const cousinDegree = minGen - 1;

  if (cousinDegree === 1 && removed === 1) {
    return { type: "first-cousin-once-removed", label: "First Cousin Once Removed" };
  }
  if (cousinDegree === 1 && removed === 2) {
    return { type: "first-cousin-twice-removed", label: "First Cousin Twice Removed" };
  }
  if (cousinDegree === 2 && removed === 1) {
    return { type: "second-cousin-once-removed", label: "Second Cousin Once Removed" };
  }

  const removedText =
    removed === 1 ? "Once" : removed === 2 ? "Twice" : `${removed} Times`;
  return {
    type: "first-cousin-once-removed",
    label: `${cousinDegree === 1 ? "First" : cousinDegree === 2 ? "Second" : `${cousinDegree}th`} Cousin ${removedText} Removed`,
  };
}

/**
 * Infer the relationship between two family members
 */
export async function inferRelationshipBetween(
  memberId1: string,
  memberId2: string,
  maxGenerations: number = 4
): Promise<InferredRelationship | null> {
  if (memberId1 === memberId2) {
    return null; // Same person
  }

  const [context1, context2] = await Promise.all([
    buildRelationshipContext(memberId1, maxGenerations),
    buildRelationshipContext(memberId2, maxGenerations),
  ]);

  // Check for spouse relationship
  if (context1.spouses.includes(memberId2)) {
    return {
      fromMemberId: memberId1,
      toMemberId: memberId2,
      relationshipType: "spouse",
      relationshipLabel: "Spouse",
      isBloodRelative: false,
      isInLaw: false,
      generationalDistance: 0,
      degreeOfSeparation: 1,
      confidence: 1.0,
      pathDescription: "Directly married",
    };
  }

  // Check for parent relationship
  if (context1.parents.includes(memberId2)) {
    return {
      fromMemberId: memberId1,
      toMemberId: memberId2,
      relationshipType: "parent",
      relationshipLabel: "Parent",
      isBloodRelative: true,
      isInLaw: false,
      generationalDistance: 1,
      degreeOfSeparation: 1,
      confidence: 1.0,
      pathDescription: "Direct parent",
    };
  }

  // Check for child relationship
  if (context1.children.includes(memberId2)) {
    return {
      fromMemberId: memberId1,
      toMemberId: memberId2,
      relationshipType: "child",
      relationshipLabel: "Child",
      isBloodRelative: true,
      isInLaw: false,
      generationalDistance: -1,
      degreeOfSeparation: 1,
      confidence: 1.0,
      pathDescription: "Direct child",
    };
  }

  // Check for sibling relationship
  const sibling = context1.siblings.find((s) => s.siblingId === memberId2);
  if (sibling) {
    const type: InferredRelationshipType =
      sibling.relationshipType === "full"
        ? "sibling"
        : sibling.relationshipType === "half"
          ? "half-sibling"
          : "step-sibling";
    const label =
      sibling.relationshipType === "full"
        ? "Sibling"
        : sibling.relationshipType === "half"
          ? "Half-Sibling"
          : "Step-Sibling";

    return {
      fromMemberId: memberId1,
      toMemberId: memberId2,
      relationshipType: type,
      relationshipLabel: label,
      isBloodRelative: sibling.relationshipType !== "step",
      isInLaw: false,
      generationalDistance: 0,
      degreeOfSeparation: 1,
      confidence: 1.0,
      pathDescription: `${label} (shares ${sibling.sharedParentIds.length} parent(s))`,
    };
  }

  // Check for grandparent/grandchild
  if (context1.ancestors.has(memberId2)) {
    const ancestorInfo = context1.ancestors.get(memberId2)!;
    if (ancestorInfo.generation === 2) {
      return {
        fromMemberId: memberId1,
        toMemberId: memberId2,
        relationshipType: "grandparent",
        relationshipLabel: "Grandparent",
        isBloodRelative: true,
        isInLaw: false,
        generationalDistance: 2,
        degreeOfSeparation: 2,
        confidence: 1.0,
        pathDescription: "Parent's parent",
      };
    }
    if (ancestorInfo.generation === 3) {
      return {
        fromMemberId: memberId1,
        toMemberId: memberId2,
        relationshipType: "great-grandparent",
        relationshipLabel: "Great-Grandparent",
        isBloodRelative: true,
        isInLaw: false,
        generationalDistance: 3,
        degreeOfSeparation: 3,
        confidence: 1.0,
        pathDescription: "Grandparent's parent",
      };
    }
  }

  if (context1.descendants.has(memberId2)) {
    const descendantInfo = context1.descendants.get(memberId2)!;
    if (descendantInfo.generation === 2) {
      return {
        fromMemberId: memberId1,
        toMemberId: memberId2,
        relationshipType: "grandchild",
        relationshipLabel: "Grandchild",
        isBloodRelative: true,
        isInLaw: false,
        generationalDistance: -2,
        degreeOfSeparation: 2,
        confidence: 1.0,
        pathDescription: "Child's child",
      };
    }
    if (descendantInfo.generation === 3) {
      return {
        fromMemberId: memberId1,
        toMemberId: memberId2,
        relationshipType: "great-grandchild",
        relationshipLabel: "Great-Grandchild",
        isBloodRelative: true,
        isInLaw: false,
        generationalDistance: -3,
        degreeOfSeparation: 3,
        confidence: 1.0,
        pathDescription: "Grandchild's child",
      };
    }
  }

  // Check for uncle/aunt and nephew/niece relationships
  // Uncle/Aunt: person2 is a sibling of person1's parent
  for (const parentId of context1.parents) {
    const parentSiblings = await findSiblingsOfMember(parentId);
    const isAuntUncle = parentSiblings.find((s) => s.siblingId === memberId2);
    if (isAuntUncle) {
      return {
        fromMemberId: memberId1,
        toMemberId: memberId2,
        relationshipType: "uncle", // Could refine based on gender
        relationshipLabel: "Uncle/Aunt",
        isBloodRelative: isAuntUncle.relationshipType !== "step",
        isInLaw: false,
        generationalDistance: 1,
        degreeOfSeparation: 2,
        confidence: 1.0,
        pathDescription: "Parent's sibling",
      };
    }
  }

  // Nephew/Niece: person2 is a child of person1's sibling
  for (const sibling of context1.siblings) {
    const siblingContext = await buildRelationshipContext(sibling.siblingId, 1);
    if (siblingContext.children.includes(memberId2)) {
      return {
        fromMemberId: memberId1,
        toMemberId: memberId2,
        relationshipType: "nephew", // Could refine based on gender
        relationshipLabel: "Nephew/Niece",
        isBloodRelative: sibling.relationshipType !== "step",
        isInLaw: false,
        generationalDistance: -1,
        degreeOfSeparation: 2,
        confidence: 1.0,
        pathDescription: "Sibling's child",
      };
    }
  }

  // Check for cousins - find common ancestors
  const commonAncestors: Array<{
    ancestorId: string;
    gen1: number;
    gen2: number;
  }> = [];

  for (const [ancestorId, info1] of context1.ancestors) {
    const info2 = context2.ancestors.get(ancestorId);
    if (info2) {
      commonAncestors.push({
        ancestorId,
        gen1: info1.generation,
        gen2: info2.generation,
      });
    }
  }

  if (commonAncestors.length > 0) {
    // Find the closest common ancestor (minimum total generations)
    const closest = commonAncestors.reduce((min, curr) =>
      curr.gen1 + curr.gen2 < min.gen1 + min.gen2 ? curr : min
    );

    // Skip if this is a sibling relationship (both gen 1)
    if (closest.gen1 === 1 && closest.gen2 === 1) {
      // Already handled above
      return null;
    }

    // Determine the cousin relationship
    const cousinInfo = determineCousinRelationship(closest.gen1, closest.gen2);

    return {
      fromMemberId: memberId1,
      toMemberId: memberId2,
      relationshipType: cousinInfo.type,
      relationshipLabel: cousinInfo.label,
      isBloodRelative: true,
      isInLaw: false,
      generationalDistance: closest.gen2 - closest.gen1,
      degreeOfSeparation: closest.gen1 + closest.gen2,
      confidence: 0.95,
      pathDescription: `Through common ancestor ${closest.gen1} and ${closest.gen2} generations back`,
    };
  }

  // Check for in-law relationships
  // Parent-in-law: person2 is a parent of person1's spouse
  for (const spouseId of context1.spouses) {
    const spouseContext = await buildRelationshipContext(spouseId, 2);

    if (spouseContext.parents.includes(memberId2)) {
      return {
        fromMemberId: memberId1,
        toMemberId: memberId2,
        relationshipType: "parent-in-law",
        relationshipLabel: "Parent-in-Law",
        isBloodRelative: false,
        isInLaw: true,
        generationalDistance: 1,
        degreeOfSeparation: 2,
        confidence: 1.0,
        pathDescription: "Spouse's parent",
      };
    }

    // Sibling-in-law: person2 is a sibling of person1's spouse
    const spouseSibling = spouseContext.siblings.find(
      (s) => s.siblingId === memberId2
    );
    if (spouseSibling) {
      return {
        fromMemberId: memberId1,
        toMemberId: memberId2,
        relationshipType: "sibling-in-law",
        relationshipLabel: "Sibling-in-Law",
        isBloodRelative: false,
        isInLaw: true,
        generationalDistance: 0,
        degreeOfSeparation: 2,
        confidence: 1.0,
        pathDescription: "Spouse's sibling",
      };
    }

    // Grandparent-in-law
    if (spouseContext.ancestors.has(memberId2)) {
      const ancestorInfo = spouseContext.ancestors.get(memberId2)!;
      if (ancestorInfo.generation === 2) {
        return {
          fromMemberId: memberId1,
          toMemberId: memberId2,
          relationshipType: "grandparent-in-law",
          relationshipLabel: "Grandparent-in-Law",
          isBloodRelative: false,
          isInLaw: true,
          generationalDistance: 2,
          degreeOfSeparation: 3,
          confidence: 1.0,
          pathDescription: "Spouse's grandparent",
        };
      }
    }
  }

  // Child-in-law: person2 is a spouse of person1's child
  for (const childId of context1.children) {
    const childContext = await buildRelationshipContext(childId, 1);
    if (childContext.spouses.includes(memberId2)) {
      return {
        fromMemberId: memberId1,
        toMemberId: memberId2,
        relationshipType: "child-in-law",
        relationshipLabel: "Child-in-Law",
        isBloodRelative: false,
        isInLaw: true,
        generationalDistance: -1,
        degreeOfSeparation: 2,
        confidence: 1.0,
        pathDescription: "Child's spouse",
      };
    }
  }

  // Sibling-in-law variant: person2 is a spouse of person1's sibling
  for (const sibling of context1.siblings) {
    const siblingContext = await buildRelationshipContext(sibling.siblingId, 1);
    if (siblingContext.spouses.includes(memberId2)) {
      return {
        fromMemberId: memberId1,
        toMemberId: memberId2,
        relationshipType: "sibling-in-law",
        relationshipLabel: "Sibling-in-Law",
        isBloodRelative: false,
        isInLaw: true,
        generationalDistance: 0,
        degreeOfSeparation: 2,
        confidence: 1.0,
        pathDescription: "Sibling's spouse",
      };
    }
  }

  // No relationship found
  return null;
}

/**
 * Infer all relationships for a single family member
 */
export async function inferAllRelationshipsForMember(
  memberId: string,
  familyTreeId: string,
  maxGenerations: number = 4
): Promise<InferredRelationship[]> {
  // Get all members in the family tree
  const allMembers = await database
    .select()
    .from(familyMember)
    .where(eq(familyMember.familyTreeId, familyTreeId));

  const relationships: InferredRelationship[] = [];

  for (const member of allMembers) {
    if (member.id === memberId) continue;

    const relationship = await inferRelationshipBetween(
      memberId,
      member.id,
      maxGenerations
    );

    if (relationship) {
      relationships.push(relationship);
    }
  }

  // Sort by degree of separation, then by type
  relationships.sort((a, b) => {
    if (a.degreeOfSeparation !== b.degreeOfSeparation) {
      return a.degreeOfSeparation - b.degreeOfSeparation;
    }
    return a.relationshipLabel.localeCompare(b.relationshipLabel);
  });

  return relationships;
}

/**
 * Infer all relationships for a single family member with full details
 */
export async function inferAllRelationshipsForMemberWithDetails(
  memberId: string,
  familyTreeId: string,
  maxGenerations: number = 4
): Promise<InferredRelationshipWithDetails[]> {
  const relationships = await inferAllRelationshipsForMember(
    memberId,
    familyTreeId,
    maxGenerations
  );

  if (relationships.length === 0) {
    return [];
  }

  // Fetch all member details
  const memberIds = [
    memberId,
    ...new Set(relationships.map((r) => r.toMemberId)),
  ];

  const members = await database
    .select()
    .from(familyMember)
    .where(inArray(familyMember.id, memberIds));

  const memberMap = new Map(members.map((m) => [m.id, m]));
  const fromMember = memberMap.get(memberId);

  if (!fromMember) {
    return [];
  }

  return relationships
    .map((rel) => ({
      ...rel,
      fromMember,
      toMember: memberMap.get(rel.toMemberId)!,
    }))
    .filter((rel) => rel.toMember);
}

/**
 * Find all cousins in a family tree
 */
export async function findAllCousinsInTree(
  familyTreeId: string
): Promise<
  Array<{
    member1Id: string;
    member2Id: string;
    cousinType: string;
    commonAncestorGeneration: number;
  }>
> {
  const members = await database
    .select()
    .from(familyMember)
    .where(eq(familyMember.familyTreeId, familyTreeId));

  const cousins: Array<{
    member1Id: string;
    member2Id: string;
    cousinType: string;
    commonAncestorGeneration: number;
  }> = [];

  const processedPairs = new Set<string>();

  for (const member1 of members) {
    for (const member2 of members) {
      if (member1.id >= member2.id) continue; // Skip self and already processed

      const pairKey = `${member1.id}-${member2.id}`;
      if (processedPairs.has(pairKey)) continue;
      processedPairs.add(pairKey);

      const relationship = await inferRelationshipBetween(member1.id, member2.id, 4);

      if (
        relationship &&
        [
          "first-cousin",
          "second-cousin",
          "third-cousin",
          "first-cousin-once-removed",
          "first-cousin-twice-removed",
          "second-cousin-once-removed",
        ].includes(relationship.relationshipType)
      ) {
        cousins.push({
          member1Id: member1.id,
          member2Id: member2.id,
          cousinType: relationship.relationshipLabel,
          commonAncestorGeneration: relationship.degreeOfSeparation,
        });
      }
    }
  }

  return cousins;
}

/**
 * Find all in-law relationships in a family tree
 */
export async function findAllInLawsInTree(
  familyTreeId: string
): Promise<InferredRelationship[]> {
  const members = await database
    .select()
    .from(familyMember)
    .where(eq(familyMember.familyTreeId, familyTreeId));

  const inLaws: InferredRelationship[] = [];
  const processedPairs = new Set<string>();

  for (const member1 of members) {
    for (const member2 of members) {
      if (member1.id >= member2.id) continue;

      const pairKey = `${member1.id}-${member2.id}`;
      if (processedPairs.has(pairKey)) continue;
      processedPairs.add(pairKey);

      const relationship = await inferRelationshipBetween(member1.id, member2.id, 4);

      if (relationship && relationship.isInLaw) {
        inLaws.push(relationship);
      }
    }
  }

  return inLaws;
}

/**
 * Get a summary of all relationships in a family tree
 */
export async function getRelationshipSummaryForTree(
  familyTreeId: string
): Promise<{
  totalMembers: number;
  relationshipCounts: Record<string, number>;
  bloodRelatives: number;
  inLaws: number;
}> {
  const members = await database
    .select()
    .from(familyMember)
    .where(eq(familyMember.familyTreeId, familyTreeId));

  const relationshipCounts: Record<string, number> = {};
  let bloodRelatives = 0;
  let inLaws = 0;

  const processedPairs = new Set<string>();

  for (const member1 of members) {
    for (const member2 of members) {
      if (member1.id >= member2.id) continue;

      const pairKey = `${member1.id}-${member2.id}`;
      if (processedPairs.has(pairKey)) continue;
      processedPairs.add(pairKey);

      const relationship = await inferRelationshipBetween(member1.id, member2.id, 4);

      if (relationship) {
        const type = relationship.relationshipType;
        relationshipCounts[type] = (relationshipCounts[type] || 0) + 1;

        if (relationship.isBloodRelative) {
          bloodRelatives++;
        }
        if (relationship.isInLaw) {
          inLaws++;
        }
      }
    }
  }

  return {
    totalMembers: members.length,
    relationshipCounts,
    bloodRelatives,
    inLaws,
  };
}

/**
 * Suggest potential relationships for a new member based on their connections
 */
export async function suggestRelationshipsForNewMember(
  newMemberId: string,
  familyTreeId: string,
  knownConnections: {
    parentIds?: string[];
    childIds?: string[];
    spouseIds?: string[];
  }
): Promise<InferredRelationship[]> {
  // Get all other members in the tree
  const allMembers = await database
    .select()
    .from(familyMember)
    .where(eq(familyMember.familyTreeId, familyTreeId));

  const suggestions: InferredRelationship[] = [];
  const knownMemberIds = new Set([
    ...(knownConnections.parentIds || []),
    ...(knownConnections.childIds || []),
    ...(knownConnections.spouseIds || []),
  ]);

  // Find relationships through known connections
  for (const member of allMembers) {
    if (member.id === newMemberId || knownMemberIds.has(member.id)) continue;

    const relationship = await inferRelationshipBetween(newMemberId, member.id, 4);

    if (relationship && relationship.confidence >= 0.8) {
      suggestions.push(relationship);
    }
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence);
}
