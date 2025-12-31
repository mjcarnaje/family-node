import { findFamilyMemberById } from "~/data-access/family-members";
import { findFamilyTreeById } from "~/data-access/family-trees";
import {
  inferRelationshipBetween,
  inferAllRelationshipsForMember,
  inferAllRelationshipsForMemberWithDetails,
  findAllCousinsInTree,
  findAllInLawsInTree,
  getRelationshipSummaryForTree,
  suggestRelationshipsForNewMember,
  type InferredRelationship,
  type InferredRelationshipWithDetails,
  type InferredRelationshipType,
} from "~/data-access/relationship-inference";

/**
 * Relationship Inference Use Cases
 *
 * Business logic layer for relationship inference functionality.
 * Handles validation, access control, and orchestration of data access functions.
 */

/**
 * Custom error for relationship inference operations
 */
export class RelationshipInferenceError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "MEMBER_NOT_FOUND"
      | "TREE_NOT_FOUND"
      | "UNAUTHORIZED"
      | "INFERENCE_FAILED"
  ) {
    super(message);
    this.name = "RelationshipInferenceError";
  }
}

/**
 * Result of relationship inference grouped by category
 */
export interface GroupedRelationships {
  immediate: InferredRelationship[]; // Parents, children, spouse, siblings
  extended: InferredRelationship[]; // Grandparents, uncles, cousins, etc.
  inLaws: InferredRelationship[]; // All in-law relationships
}

/**
 * Options for relationship inference
 */
export interface RelationshipInferenceOptions {
  maxGenerations?: number;
  includeInLaws?: boolean;
  groupByCategory?: boolean;
}

/**
 * Infer relationship between two members with access validation
 */
export async function inferRelationshipBetweenMembers(
  memberId1: string,
  memberId2: string,
  userId: string,
  options: RelationshipInferenceOptions = {}
): Promise<InferredRelationship | null> {
  const { maxGenerations = 4 } = options;

  // Fetch both members to verify they exist
  const [member1, member2] = await Promise.all([
    findFamilyMemberById(memberId1),
    findFamilyMemberById(memberId2),
  ]);

  if (!member1) {
    throw new RelationshipInferenceError(
      `Family member with ID ${memberId1} not found`,
      "MEMBER_NOT_FOUND"
    );
  }

  if (!member2) {
    throw new RelationshipInferenceError(
      `Family member with ID ${memberId2} not found`,
      "MEMBER_NOT_FOUND"
    );
  }

  // Verify both members belong to the same tree
  if (member1.familyTreeId !== member2.familyTreeId) {
    throw new RelationshipInferenceError(
      "Members must belong to the same family tree",
      "INFERENCE_FAILED"
    );
  }

  // Verify access to the tree
  const familyTree = await findFamilyTreeById(member1.familyTreeId);
  if (!familyTree) {
    throw new RelationshipInferenceError(
      "Family tree not found",
      "TREE_NOT_FOUND"
    );
  }

  const isOwner = familyTree.ownerId === userId;
  const isPublic = familyTree.isPublic;

  if (!isOwner && !isPublic) {
    throw new RelationshipInferenceError(
      "You don't have permission to view relationships in this tree",
      "UNAUTHORIZED"
    );
  }

  return inferRelationshipBetween(memberId1, memberId2, maxGenerations);
}

/**
 * Infer all relationships for a member with grouped results
 */
export async function inferAllRelationshipsGrouped(
  memberId: string,
  userId: string,
  options: RelationshipInferenceOptions = {}
): Promise<GroupedRelationships> {
  const { maxGenerations = 4 } = options;

  // Fetch member to get tree ID and verify existence
  const member = await findFamilyMemberById(memberId);
  if (!member) {
    throw new RelationshipInferenceError(
      `Family member with ID ${memberId} not found`,
      "MEMBER_NOT_FOUND"
    );
  }

  // Verify access to the tree
  const familyTree = await findFamilyTreeById(member.familyTreeId);
  if (!familyTree) {
    throw new RelationshipInferenceError(
      "Family tree not found",
      "TREE_NOT_FOUND"
    );
  }

  const isOwner = familyTree.ownerId === userId;
  const isPublic = familyTree.isPublic;

  if (!isOwner && !isPublic) {
    throw new RelationshipInferenceError(
      "You don't have permission to view relationships in this tree",
      "UNAUTHORIZED"
    );
  }

  const allRelationships = await inferAllRelationshipsForMember(
    memberId,
    member.familyTreeId,
    maxGenerations
  );

  // Group relationships by category
  const immediateTypes: InferredRelationshipType[] = [
    "parent",
    "child",
    "spouse",
    "sibling",
    "half-sibling",
    "step-sibling",
  ];

  const inLawTypes: InferredRelationshipType[] = [
    "parent-in-law",
    "child-in-law",
    "sibling-in-law",
    "grandparent-in-law",
    "grandchild-in-law",
    "uncle-in-law",
    "aunt-in-law",
    "nephew-in-law",
    "niece-in-law",
    "cousin-in-law",
  ];

  const immediate: InferredRelationship[] = [];
  const extended: InferredRelationship[] = [];
  const inLaws: InferredRelationship[] = [];

  for (const rel of allRelationships) {
    if (immediateTypes.includes(rel.relationshipType)) {
      immediate.push(rel);
    } else if (inLawTypes.includes(rel.relationshipType)) {
      inLaws.push(rel);
    } else {
      extended.push(rel);
    }
  }

  return { immediate, extended, inLaws };
}

/**
 * Infer all relationships for a member with full member details
 */
export async function inferAllRelationshipsWithDetails(
  memberId: string,
  userId: string,
  options: RelationshipInferenceOptions = {}
): Promise<InferredRelationshipWithDetails[]> {
  const { maxGenerations = 4 } = options;

  // Fetch member to get tree ID and verify existence
  const member = await findFamilyMemberById(memberId);
  if (!member) {
    throw new RelationshipInferenceError(
      `Family member with ID ${memberId} not found`,
      "MEMBER_NOT_FOUND"
    );
  }

  // Verify access to the tree
  const familyTree = await findFamilyTreeById(member.familyTreeId);
  if (!familyTree) {
    throw new RelationshipInferenceError(
      "Family tree not found",
      "TREE_NOT_FOUND"
    );
  }

  const isOwner = familyTree.ownerId === userId;
  const isPublic = familyTree.isPublic;

  if (!isOwner && !isPublic) {
    throw new RelationshipInferenceError(
      "You don't have permission to view relationships in this tree",
      "UNAUTHORIZED"
    );
  }

  return inferAllRelationshipsForMemberWithDetails(
    memberId,
    member.familyTreeId,
    maxGenerations
  );
}

/**
 * Get all cousin relationships in a family tree
 */
export async function getAllCousinsInTree(
  familyTreeId: string,
  userId: string
): Promise<
  Array<{
    member1Id: string;
    member2Id: string;
    cousinType: string;
    commonAncestorGeneration: number;
  }>
> {
  // Verify access to the tree
  const familyTree = await findFamilyTreeById(familyTreeId);
  if (!familyTree) {
    throw new RelationshipInferenceError(
      "Family tree not found",
      "TREE_NOT_FOUND"
    );
  }

  const isOwner = familyTree.ownerId === userId;
  const isPublic = familyTree.isPublic;

  if (!isOwner && !isPublic) {
    throw new RelationshipInferenceError(
      "You don't have permission to view this tree",
      "UNAUTHORIZED"
    );
  }

  return findAllCousinsInTree(familyTreeId);
}

/**
 * Get all in-law relationships in a family tree
 */
export async function getAllInLawsInTree(
  familyTreeId: string,
  userId: string
): Promise<InferredRelationship[]> {
  // Verify access to the tree
  const familyTree = await findFamilyTreeById(familyTreeId);
  if (!familyTree) {
    throw new RelationshipInferenceError(
      "Family tree not found",
      "TREE_NOT_FOUND"
    );
  }

  const isOwner = familyTree.ownerId === userId;
  const isPublic = familyTree.isPublic;

  if (!isOwner && !isPublic) {
    throw new RelationshipInferenceError(
      "You don't have permission to view this tree",
      "UNAUTHORIZED"
    );
  }

  return findAllInLawsInTree(familyTreeId);
}

/**
 * Get a summary of all relationships in a family tree
 */
export async function getTreeRelationshipSummary(
  familyTreeId: string,
  userId: string
): Promise<{
  totalMembers: number;
  relationshipCounts: Record<string, number>;
  bloodRelatives: number;
  inLaws: number;
}> {
  // Verify access to the tree
  const familyTree = await findFamilyTreeById(familyTreeId);
  if (!familyTree) {
    throw new RelationshipInferenceError(
      "Family tree not found",
      "TREE_NOT_FOUND"
    );
  }

  const isOwner = familyTree.ownerId === userId;
  const isPublic = familyTree.isPublic;

  if (!isOwner && !isPublic) {
    throw new RelationshipInferenceError(
      "You don't have permission to view this tree",
      "UNAUTHORIZED"
    );
  }

  return getRelationshipSummaryForTree(familyTreeId);
}

/**
 * Suggest relationships when a new member is added
 */
export async function suggestRelationshipsForMember(
  newMemberId: string,
  userId: string,
  knownConnections: {
    parentIds?: string[];
    childIds?: string[];
    spouseIds?: string[];
  }
): Promise<InferredRelationship[]> {
  // Fetch member to get tree ID and verify existence
  const member = await findFamilyMemberById(newMemberId);
  if (!member) {
    throw new RelationshipInferenceError(
      `Family member with ID ${newMemberId} not found`,
      "MEMBER_NOT_FOUND"
    );
  }

  // Verify access to the tree
  const familyTree = await findFamilyTreeById(member.familyTreeId);
  if (!familyTree) {
    throw new RelationshipInferenceError(
      "Family tree not found",
      "TREE_NOT_FOUND"
    );
  }

  const isOwner = familyTree.ownerId === userId;
  const isPublic = familyTree.isPublic;

  // For suggesting relationships, require edit permission (owner only for now)
  if (!isOwner && !isPublic) {
    throw new RelationshipInferenceError(
      "You don't have permission to suggest relationships in this tree",
      "UNAUTHORIZED"
    );
  }

  return suggestRelationshipsForNewMember(
    newMemberId,
    member.familyTreeId,
    knownConnections
  );
}

/**
 * Get a human-readable description of a relationship
 */
export function getRelationshipDescription(
  relationship: InferredRelationship,
  fromMemberName: string,
  toMemberName: string
): string {
  const { relationshipLabel, pathDescription } = relationship;

  return `${fromMemberName} is ${toMemberName}'s ${relationshipLabel.toLowerCase()}. ${pathDescription}`;
}

/**
 * Get relationship category label
 */
export function getRelationshipCategory(
  relationshipType: InferredRelationshipType
): "immediate" | "extended" | "in-law" {
  const immediateTypes: InferredRelationshipType[] = [
    "parent",
    "child",
    "spouse",
    "sibling",
    "half-sibling",
    "step-sibling",
  ];

  const inLawTypes: InferredRelationshipType[] = [
    "parent-in-law",
    "child-in-law",
    "sibling-in-law",
    "grandparent-in-law",
    "grandchild-in-law",
    "uncle-in-law",
    "aunt-in-law",
    "nephew-in-law",
    "niece-in-law",
    "cousin-in-law",
  ];

  if (immediateTypes.includes(relationshipType)) {
    return "immediate";
  }

  if (inLawTypes.includes(relationshipType)) {
    return "in-law";
  }

  return "extended";
}
