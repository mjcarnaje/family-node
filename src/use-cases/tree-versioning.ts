import { database } from "~/db";
import {
  familyMember,
  parentChildRelationship,
  marriageConnection,
  type FamilyMember,
  type ParentChildRelationship,
  type MarriageConnection,
  type TreeChangeType,
  type TreeEntityType,
} from "~/db/schema";
import { eq } from "drizzle-orm";
import {
  createTreeVersion,
  createTreeChangeLogs,
  findTreeVersionById,
  findTreeVersionsByTreeId,
  getLatestVersionNumber,
  countTreeVersions,
  deleteOldVersions,
  findChangeLogsByVersionId,
} from "~/data-access/tree-versions";
import {
  findFamilyMembersByTreeId,
  createFamilyMembers,
  deleteFamilyMembersByTreeId,
} from "~/data-access/family-members";
import {
  findParentChildRelationshipsByTreeId,
  createParentChildRelationships,
  deleteParentChildRelationshipsByTreeId,
} from "~/data-access/parent-child-relationships";
import {
  findMarriageConnectionsByTreeId,
  createMarriageConnections,
  deleteMarriageConnectionsByTreeId,
} from "~/data-access/marriage-connections";

// Maximum number of versions to keep per tree
const MAX_VERSIONS_PER_TREE = 50;

/**
 * Capture current state of a family tree as a new version
 */
export async function captureTreeVersion(
  familyTreeId: string,
  userId: string,
  changeDescription: string,
  changes?: {
    type: TreeChangeType;
    entityType: TreeEntityType;
    entityId: string;
    oldData?: Record<string, unknown> | null;
    newData?: Record<string, unknown> | null;
    description?: string;
  }[]
): Promise<{
  versionId: string;
  versionNumber: number;
}> {
  // Get current tree data
  const [members, relationships, marriages] = await Promise.all([
    findFamilyMembersByTreeId(familyTreeId),
    findParentChildRelationshipsByTreeId(familyTreeId),
    findMarriageConnectionsByTreeId(familyTreeId),
  ]);

  // Get next version number
  const currentLatestVersion = await getLatestVersionNumber(familyTreeId);
  const newVersionNumber = currentLatestVersion + 1;

  // Create the version snapshot
  const versionId = crypto.randomUUID();
  const version = await createTreeVersion({
    id: versionId,
    familyTreeId,
    versionNumber: newVersionNumber,
    changeDescription,
    membersSnapshot: members as unknown as Record<string, unknown>[],
    relationshipsSnapshot: relationships as unknown as Record<string, unknown>[],
    marriagesSnapshot: marriages as unknown as Record<string, unknown>[],
    createdByUserId: userId,
  });

  // Create change log entries if provided
  if (changes && changes.length > 0) {
    await createTreeChangeLogs(
      changes.map((change) => ({
        id: crypto.randomUUID(),
        familyTreeId,
        versionId: version.id,
        changeType: change.type,
        entityType: change.entityType,
        entityId: change.entityId,
        oldData: change.oldData ?? null,
        newData: change.newData ?? null,
        description: change.description ?? null,
        createdByUserId: userId,
      }))
    );
  }

  // Clean up old versions if we exceed the limit
  const versionCount = await countTreeVersions(familyTreeId);
  if (versionCount > MAX_VERSIONS_PER_TREE) {
    await deleteOldVersions(familyTreeId, MAX_VERSIONS_PER_TREE);
  }

  return {
    versionId: version.id,
    versionNumber: newVersionNumber,
  };
}

/**
 * Revert a family tree to a specific version
 */
export async function revertToVersion(
  familyTreeId: string,
  versionId: string,
  userId: string
): Promise<{
  newVersionId: string;
  newVersionNumber: number;
  membersRestored: number;
  relationshipsRestored: number;
  marriagesRestored: number;
}> {
  // Get the version to revert to
  const targetVersion = await findTreeVersionById(versionId);
  if (!targetVersion) {
    throw new Error("Version not found");
  }

  if (targetVersion.familyTreeId !== familyTreeId) {
    throw new Error("Version does not belong to this family tree");
  }

  // Get current state for change log
  const [currentMembers, currentRelationships, currentMarriages] = await Promise.all([
    findFamilyMembersByTreeId(familyTreeId),
    findParentChildRelationshipsByTreeId(familyTreeId),
    findMarriageConnectionsByTreeId(familyTreeId),
  ]);

  // Parse snapshot data
  const membersToRestore = targetVersion.membersSnapshot as unknown as FamilyMember[];
  const relationshipsToRestore = targetVersion.relationshipsSnapshot as unknown as ParentChildRelationship[];
  const marriagesToRestore = targetVersion.marriagesSnapshot as unknown as MarriageConnection[];

  // Use a transaction to ensure atomicity
  // First, delete all current data
  await Promise.all([
    deleteParentChildRelationshipsByTreeId(familyTreeId),
    deleteMarriageConnectionsByTreeId(familyTreeId),
  ]);

  // Need to delete members after relationships due to foreign key constraints
  await deleteFamilyMembersByTreeId(familyTreeId);

  // Restore members first (other entities depend on them)
  if (membersToRestore.length > 0) {
    await createFamilyMembers(
      membersToRestore.map((member) => ({
        id: member.id,
        familyTreeId: member.familyTreeId,
        firstName: member.firstName,
        middleName: member.middleName,
        lastName: member.lastName,
        nickname: member.nickname,
        gender: member.gender,
        birthDate: member.birthDate,
        birthPlace: member.birthPlace,
        deathDate: member.deathDate,
        deathPlace: member.deathPlace,
        bio: member.bio,
        profileImageUrl: member.profileImageUrl,
        linkedUserId: member.linkedUserId,
      }))
    );
  }

  // Restore relationships
  if (relationshipsToRestore.length > 0) {
    await createParentChildRelationships(
      relationshipsToRestore.map((rel) => ({
        id: rel.id,
        familyTreeId: rel.familyTreeId,
        parentId: rel.parentId,
        childId: rel.childId,
        relationshipType: rel.relationshipType,
      }))
    );
  }

  // Restore marriages
  if (marriagesToRestore.length > 0) {
    await createMarriageConnections(
      marriagesToRestore.map((marriage) => ({
        id: marriage.id,
        familyTreeId: marriage.familyTreeId,
        spouse1Id: marriage.spouse1Id,
        spouse2Id: marriage.spouse2Id,
        marriageDate: marriage.marriageDate,
        marriagePlace: marriage.marriagePlace,
        divorceDate: marriage.divorceDate,
        status: marriage.status,
      }))
    );
  }

  // Create a new version capturing the reverted state
  const result = await captureTreeVersion(
    familyTreeId,
    userId,
    `Reverted to version ${targetVersion.versionNumber}`,
    [
      {
        type: "REVERT",
        entityType: "TREE",
        entityId: familyTreeId,
        oldData: {
          membersCount: currentMembers.length,
          relationshipsCount: currentRelationships.length,
          marriagesCount: currentMarriages.length,
        },
        newData: {
          membersCount: membersToRestore.length,
          relationshipsCount: relationshipsToRestore.length,
          marriagesCount: marriagesToRestore.length,
          revertedToVersion: targetVersion.versionNumber,
        },
        description: `Reverted to version ${targetVersion.versionNumber}`,
      },
    ]
  );

  return {
    newVersionId: result.versionId,
    newVersionNumber: result.versionNumber,
    membersRestored: membersToRestore.length,
    relationshipsRestored: relationshipsToRestore.length,
    marriagesRestored: marriagesToRestore.length,
  };
}

/**
 * Get version history for a family tree with pagination
 */
export async function getTreeVersionHistory(
  familyTreeId: string,
  limit: number = 20,
  offset: number = 0
) {
  const [versions, totalCount] = await Promise.all([
    findTreeVersionsByTreeId(familyTreeId, limit, offset),
    countTreeVersions(familyTreeId),
  ]);

  return {
    versions,
    totalCount,
    hasMore: offset + versions.length < totalCount,
  };
}

/**
 * Get detailed changes for a specific version
 */
export async function getVersionDetails(versionId: string) {
  const [version, changeLogs] = await Promise.all([
    findTreeVersionById(versionId),
    findChangeLogsByVersionId(versionId),
  ]);

  if (!version) {
    throw new Error("Version not found");
  }

  return {
    version,
    changeLogs,
  };
}

/**
 * Compare two versions and return the differences
 */
export async function compareVersions(
  versionId1: string,
  versionId2: string
): Promise<{
  version1: { versionNumber: number; createdAt: Date };
  version2: { versionNumber: number; createdAt: Date };
  membersAdded: FamilyMember[];
  membersRemoved: FamilyMember[];
  membersModified: { before: FamilyMember; after: FamilyMember }[];
  relationshipsAdded: ParentChildRelationship[];
  relationshipsRemoved: ParentChildRelationship[];
  marriagesAdded: MarriageConnection[];
  marriagesRemoved: MarriageConnection[];
}> {
  const [version1, version2] = await Promise.all([
    findTreeVersionById(versionId1),
    findTreeVersionById(versionId2),
  ]);

  if (!version1 || !version2) {
    throw new Error("One or both versions not found");
  }

  if (version1.familyTreeId !== version2.familyTreeId) {
    throw new Error("Versions must belong to the same family tree");
  }

  // Parse snapshots
  const members1 = version1.membersSnapshot as unknown as FamilyMember[];
  const members2 = version2.membersSnapshot as unknown as FamilyMember[];
  const relationships1 = version1.relationshipsSnapshot as unknown as ParentChildRelationship[];
  const relationships2 = version2.relationshipsSnapshot as unknown as ParentChildRelationship[];
  const marriages1 = version1.marriagesSnapshot as unknown as MarriageConnection[];
  const marriages2 = version2.marriagesSnapshot as unknown as MarriageConnection[];

  // Create ID maps for efficient lookup
  const members1Map = new Map(members1.map((m) => [m.id, m]));
  const members2Map = new Map(members2.map((m) => [m.id, m]));
  const relationships1Set = new Set(relationships1.map((r) => r.id));
  const relationships2Set = new Set(relationships2.map((r) => r.id));
  const marriages1Set = new Set(marriages1.map((m) => m.id));
  const marriages2Set = new Set(marriages2.map((m) => m.id));

  // Find member differences
  const membersAdded = members2.filter((m) => !members1Map.has(m.id));
  const membersRemoved = members1.filter((m) => !members2Map.has(m.id));
  const membersModified: { before: FamilyMember; after: FamilyMember }[] = [];

  members1.forEach((m1) => {
    const m2 = members2Map.get(m1.id);
    if (m2 && JSON.stringify(m1) !== JSON.stringify(m2)) {
      membersModified.push({ before: m1, after: m2 });
    }
  });

  // Find relationship differences
  const relationshipsAdded = relationships2.filter((r) => !relationships1Set.has(r.id));
  const relationshipsRemoved = relationships1.filter((r) => !relationships2Set.has(r.id));

  // Find marriage differences
  const marriagesAdded = marriages2.filter((m) => !marriages1Set.has(m.id));
  const marriagesRemoved = marriages1.filter((m) => !marriages2Set.has(m.id));

  return {
    version1: { versionNumber: version1.versionNumber, createdAt: version1.createdAt },
    version2: { versionNumber: version2.versionNumber, createdAt: version2.createdAt },
    membersAdded,
    membersRemoved,
    membersModified,
    relationshipsAdded,
    relationshipsRemoved,
    marriagesAdded,
    marriagesRemoved,
  };
}

/**
 * Helper to generate a human-readable change description
 */
export function generateChangeDescription(
  changeType: TreeChangeType,
  entityType: TreeEntityType,
  entityName?: string
): string {
  const entityLabel = entityName || entityType.toLowerCase();

  switch (changeType) {
    case "MEMBER_ADDED":
      return `Added family member: ${entityLabel}`;
    case "MEMBER_UPDATED":
      return `Updated family member: ${entityLabel}`;
    case "MEMBER_DELETED":
      return `Removed family member: ${entityLabel}`;
    case "RELATIONSHIP_ADDED":
      return `Added parent-child relationship`;
    case "RELATIONSHIP_UPDATED":
      return `Updated parent-child relationship`;
    case "RELATIONSHIP_DELETED":
      return `Removed parent-child relationship`;
    case "MARRIAGE_ADDED":
      return `Added marriage connection`;
    case "MARRIAGE_UPDATED":
      return `Updated marriage connection`;
    case "MARRIAGE_DELETED":
      return `Removed marriage connection`;
    case "TREE_UPDATED":
      return `Updated family tree`;
    case "BULK_IMPORT":
      return `Bulk imported data`;
    case "REVERT":
      return `Reverted to previous version`;
    default:
      return `Made changes to the tree`;
  }
}
