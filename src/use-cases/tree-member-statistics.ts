import {
  getTreeMemberStats,
  getTreeRelationshipStats,
  getTreeAgeStats,
  getTreeGrowthData,
  getGenerationCount,
  type TreeMemberStats,
  type TreeRelationshipStats,
  type TreeAgeStats,
  type TreeGrowthData,
} from "~/data-access/tree-statistics";
import { findFamilyTreeById, isUserFamilyTreeOwner } from "~/data-access/family-trees";
import { userHasTreeAccess } from "~/data-access/tree-sharing";

// ============================================
// Tree Member Statistics Use Cases
// ============================================

export interface TreeStatisticsSummary {
  memberStats: TreeMemberStats;
  relationshipStats: TreeRelationshipStats;
  ageStats: TreeAgeStats;
  generationCount: number;
  growthData: TreeGrowthData[];
}

export class TreeStatisticsAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TreeStatisticsAccessError";
  }
}

export class TreeNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TreeNotFoundError";
  }
}

/**
 * Get comprehensive statistics for a family tree
 * Requires the user to have access to the tree
 */
export async function getTreeStatistics(
  familyTreeId: string,
  userId: string
): Promise<TreeStatisticsSummary> {
  // Verify the tree exists
  const tree = await findFamilyTreeById(familyTreeId);
  if (!tree) {
    throw new TreeNotFoundError("Family tree not found");
  }

  // Check if user has access to this tree
  const isOwner = tree.ownerId === userId;
  const hasAccess = isOwner || tree.isPublic || (await userHasTreeAccess(userId, familyTreeId));

  if (!hasAccess) {
    throw new TreeStatisticsAccessError(
      "You don't have permission to view statistics for this family tree"
    );
  }

  // Gather all statistics in parallel
  const [memberStats, relationshipStats, ageStats, generationCount, growthData] =
    await Promise.all([
      getTreeMemberStats(familyTreeId),
      getTreeRelationshipStats(familyTreeId),
      getTreeAgeStats(familyTreeId),
      getGenerationCount(familyTreeId),
      getTreeGrowthData(familyTreeId),
    ]);

  return {
    memberStats,
    relationshipStats,
    ageStats,
    generationCount,
    growthData,
  };
}

/**
 * Get just the member count statistics (lightweight)
 */
export async function getTreeMemberCountStats(
  familyTreeId: string,
  userId: string
): Promise<TreeMemberStats> {
  // Verify the tree exists
  const tree = await findFamilyTreeById(familyTreeId);
  if (!tree) {
    throw new TreeNotFoundError("Family tree not found");
  }

  // Check if user has access to this tree
  const isOwner = tree.ownerId === userId;
  const hasAccess = isOwner || tree.isPublic || (await userHasTreeAccess(userId, familyTreeId));

  if (!hasAccess) {
    throw new TreeStatisticsAccessError(
      "You don't have permission to view statistics for this family tree"
    );
  }

  return getTreeMemberStats(familyTreeId);
}

/**
 * Get age-related statistics
 */
export async function getTreeAgeStatistics(
  familyTreeId: string,
  userId: string
): Promise<TreeAgeStats & { generationCount: number }> {
  // Verify the tree exists
  const tree = await findFamilyTreeById(familyTreeId);
  if (!tree) {
    throw new TreeNotFoundError("Family tree not found");
  }

  // Check if user has access to this tree
  const isOwner = tree.ownerId === userId;
  const hasAccess = isOwner || tree.isPublic || (await userHasTreeAccess(userId, familyTreeId));

  if (!hasAccess) {
    throw new TreeStatisticsAccessError(
      "You don't have permission to view statistics for this family tree"
    );
  }

  const [ageStats, generationCount] = await Promise.all([
    getTreeAgeStats(familyTreeId),
    getGenerationCount(familyTreeId),
  ]);

  return {
    ...ageStats,
    generationCount,
  };
}

/**
 * Get family growth timeline
 */
export async function getTreeGrowthTimeline(
  familyTreeId: string,
  userId: string
): Promise<TreeGrowthData[]> {
  // Verify the tree exists
  const tree = await findFamilyTreeById(familyTreeId);
  if (!tree) {
    throw new TreeNotFoundError("Family tree not found");
  }

  // Check if user has access to this tree
  const isOwner = tree.ownerId === userId;
  const hasAccess = isOwner || tree.isPublic || (await userHasTreeAccess(userId, familyTreeId));

  if (!hasAccess) {
    throw new TreeStatisticsAccessError(
      "You don't have permission to view statistics for this family tree"
    );
  }

  return getTreeGrowthData(familyTreeId);
}
