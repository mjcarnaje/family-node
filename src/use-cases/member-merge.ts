import { database } from "~/db";
import { familyMember, type FamilyMember } from "~/db/schema";
import { eq } from "drizzle-orm";
import {
  getMemberWithRelatedData,
  updateParentChildRelationshipsMemberId,
  updateMarriageConnectionsMemberId,
  updateMemberMediaMemberId,
  updateMemberStoriesMemberId,
  updateMemberEventsMemberId,
  deleteDuplicateParentChildRelationships,
  deleteDuplicateMarriageConnections,
  deleteSelfReferentialRelationships,
  type MemberWithRelatedData,
} from "~/data-access/member-merge";
import { findFamilyMemberById, deleteFamilyMember } from "~/data-access/family-members";
import { captureTreeVersion } from "./tree-versioning";

/**
 * Error thrown when merge validation fails
 */
export class MemberMergeError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = "MemberMergeError";
  }
}

/**
 * Field conflict during merge
 */
export interface MergeFieldConflict {
  field: string;
  sourceValue: string | null;
  targetValue: string | null;
}

/**
 * Analysis result for a potential merge
 */
export interface MergeAnalysis {
  sourceMember: FamilyMember;
  targetMember: FamilyMember;
  sourceData: MemberWithRelatedData;
  targetData: MemberWithRelatedData;
  fieldConflicts: MergeFieldConflict[];
  willTransfer: {
    parentRelationships: number;
    childRelationships: number;
    marriages: number;
    media: number;
    stories: number;
    events: number;
  };
  warnings: string[];
}

/**
 * Result of a successful merge operation
 */
export interface MergeResult {
  mergedMemberId: string;
  deletedMemberId: string;
  transferred: {
    parentRelationships: number;
    childRelationships: number;
    marriages: number;
    media: number;
    stories: number;
    events: number;
  };
  cleaned: {
    duplicateRelationships: number;
    duplicateMarriages: number;
    selfReferentialRelationships: number;
    selfReferentialMarriages: number;
  };
  versionId: string;
}

/**
 * Options for merge operation
 */
export interface MergeOptions {
  /** Which member's data to prefer for conflicting fields */
  preferSource?: boolean;
  /** Fields to take from source even if target has data */
  fieldsFromSource?: (keyof FamilyMember)[];
}

/**
 * Analyze a potential merge between two members
 */
export async function analyzeMerge(
  sourceMemberId: string,
  targetMemberId: string
): Promise<MergeAnalysis> {
  // Validate: Can't merge with self
  if (sourceMemberId === targetMemberId) {
    throw new MemberMergeError(
      "Cannot merge a member with themselves",
      "SELF_MERGE"
    );
  }

  // Get both members with related data
  const [sourceData, targetData] = await Promise.all([
    getMemberWithRelatedData(sourceMemberId),
    getMemberWithRelatedData(targetMemberId),
  ]);

  if (!sourceData) {
    throw new MemberMergeError("Source member not found", "SOURCE_NOT_FOUND");
  }

  if (!targetData) {
    throw new MemberMergeError("Target member not found", "TARGET_NOT_FOUND");
  }

  // Verify they belong to the same tree
  if (sourceData.member.familyTreeId !== targetData.member.familyTreeId) {
    throw new MemberMergeError(
      "Members must belong to the same family tree",
      "DIFFERENT_TREES"
    );
  }

  // Analyze field conflicts
  const fieldConflicts = analyzeFieldConflicts(
    sourceData.member,
    targetData.member
  );

  // Analyze warnings
  const warnings: string[] = [];

  // Check if merging would create invalid relationships
  const wouldBeSelfParent =
    sourceData.parentRelationships.some(
      (rel) => rel.childId === targetMemberId
    ) ||
    sourceData.childRelationships.some((rel) => rel.parentId === targetMemberId);

  if (wouldBeSelfParent) {
    warnings.push(
      "This merge will transfer a parent-child relationship where the member would become their own parent or child. This will be automatically removed."
    );
  }

  const wouldBeSelfSpouse =
    sourceData.marriages.some(
      (m) => m.spouse1Id === targetMemberId || m.spouse2Id === targetMemberId
    );

  if (wouldBeSelfSpouse) {
    warnings.push(
      "The source member is married to the target member. This marriage will be automatically removed during merge."
    );
  }

  // Check for linked users
  if (sourceData.member.linkedUserId && targetData.member.linkedUserId) {
    warnings.push(
      "Both members are linked to user accounts. The target member's link will be preserved."
    );
  } else if (sourceData.member.linkedUserId) {
    warnings.push(
      "The source member is linked to a user account. This link will be transferred to the target member."
    );
  }

  return {
    sourceMember: sourceData.member,
    targetMember: targetData.member,
    sourceData,
    targetData,
    fieldConflicts,
    willTransfer: {
      parentRelationships: sourceData.parentRelationships.length,
      childRelationships: sourceData.childRelationships.length,
      marriages: sourceData.marriages.length,
      media: sourceData.media.length,
      stories: sourceData.stories.length,
      events: sourceData.events.length + sourceData.relatedEvents.length,
    },
    warnings,
  };
}

/**
 * Analyze which fields have conflicting values between source and target
 */
function analyzeFieldConflicts(
  source: FamilyMember,
  target: FamilyMember
): MergeFieldConflict[] {
  const conflicts: MergeFieldConflict[] = [];

  const fieldsToCheck: (keyof FamilyMember)[] = [
    "firstName",
    "middleName",
    "lastName",
    "nickname",
    "gender",
    "birthDate",
    "birthPlace",
    "deathDate",
    "deathPlace",
    "bio",
    "profileImageUrl",
  ];

  for (const field of fieldsToCheck) {
    const sourceValue = source[field];
    const targetValue = target[field];

    // Only flag as conflict if both have values and they differ
    if (
      sourceValue !== null &&
      sourceValue !== undefined &&
      targetValue !== null &&
      targetValue !== undefined &&
      sourceValue !== targetValue
    ) {
      conflicts.push({
        field,
        sourceValue: String(sourceValue),
        targetValue: String(targetValue),
      });
    }
  }

  return conflicts;
}

/**
 * Merge two family members
 * @param sourceMemberId The member to merge FROM (will be deleted)
 * @param targetMemberId The member to merge INTO (will be kept)
 * @param userId The user performing the merge
 * @param options Merge options
 */
export async function performMemberMerge(
  sourceMemberId: string,
  targetMemberId: string,
  userId: string,
  options: MergeOptions = {}
): Promise<MergeResult> {
  // First, analyze the merge to validate it
  const analysis = await analyzeMerge(sourceMemberId, targetMemberId);
  const { sourceMember, targetMember, sourceData } = analysis;

  const familyTreeId = sourceMember.familyTreeId;

  // Build the merged member data
  const mergedData = buildMergedMemberData(
    sourceMember,
    targetMember,
    options
  );

  // Update target member with merged data
  await database
    .update(familyMember)
    .set({ ...mergedData, updatedAt: new Date() })
    .where(eq(familyMember.id, targetMemberId));

  // Transfer all relationships and data
  const [
    parentRelTransferred,
    childRelTransferred,
    marriagesTransferred,
    mediaTransferred,
    storiesTransferred,
    eventsTransferred,
  ] = await Promise.all([
    updateParentChildRelationshipsMemberId(
      sourceMemberId,
      targetMemberId,
      familyTreeId
    ),
    // childRelationships are already handled by the updateParentChildRelationshipsMemberId function
    Promise.resolve(0),
    updateMarriageConnectionsMemberId(
      sourceMemberId,
      targetMemberId,
      familyTreeId
    ),
    updateMemberMediaMemberId(sourceMemberId, targetMemberId),
    updateMemberStoriesMemberId(sourceMemberId, targetMemberId),
    updateMemberEventsMemberId(sourceMemberId, targetMemberId),
  ]);

  // Delete the source member
  await deleteFamilyMember(sourceMemberId);

  // Clean up any duplicates or invalid relationships created by the merge
  const [dupRelationships, dupMarriages, selfRef] = await Promise.all([
    deleteDuplicateParentChildRelationships(familyTreeId),
    deleteDuplicateMarriageConnections(familyTreeId),
    deleteSelfReferentialRelationships(familyTreeId),
  ]);

  // Capture version for audit trail
  const sourceFullName = `${sourceMember.firstName} ${sourceMember.lastName}`;
  const targetFullName = `${targetMember.firstName} ${targetMember.lastName}`;

  const versionResult = await captureTreeVersion(
    familyTreeId,
    userId,
    `Merged ${sourceFullName} into ${targetFullName}`,
    [
      {
        type: "MEMBER_DELETED",
        entityType: "MEMBER",
        entityId: sourceMemberId,
        oldData: sourceMember as unknown as Record<string, unknown>,
        newData: null,
        description: `Merged member "${sourceFullName}" into "${targetFullName}"`,
      },
      {
        type: "MEMBER_UPDATED",
        entityType: "MEMBER",
        entityId: targetMemberId,
        oldData: targetMember as unknown as Record<string, unknown>,
        newData: mergedData as unknown as Record<string, unknown>,
        description: `Updated "${targetFullName}" with merged data`,
      },
    ]
  );

  return {
    mergedMemberId: targetMemberId,
    deletedMemberId: sourceMemberId,
    transferred: {
      parentRelationships: parentRelTransferred,
      childRelationships: childRelTransferred,
      marriages: marriagesTransferred,
      media: mediaTransferred,
      stories: storiesTransferred,
      events: eventsTransferred,
    },
    cleaned: {
      duplicateRelationships: dupRelationships,
      duplicateMarriages: dupMarriages,
      selfReferentialRelationships: selfRef.parentChild,
      selfReferentialMarriages: selfRef.marriages,
    },
    versionId: versionResult.versionId,
  };
}

/**
 * Build merged member data from source and target
 */
function buildMergedMemberData(
  source: FamilyMember,
  target: FamilyMember,
  options: MergeOptions
): Partial<FamilyMember> {
  const { preferSource = false, fieldsFromSource = [] } = options;

  // Start with target's data
  const merged: Partial<FamilyMember> = {};

  // Fields that can be merged
  const mergeableFields: (keyof FamilyMember)[] = [
    "firstName",
    "middleName",
    "lastName",
    "nickname",
    "gender",
    "birthDate",
    "birthPlace",
    "deathDate",
    "deathPlace",
    "bio",
    "profileImageUrl",
    "linkedUserId",
  ];

  for (const field of mergeableFields) {
    const sourceValue = source[field];
    const targetValue = target[field];

    // Explicit field preference from source
    if (fieldsFromSource.includes(field) && sourceValue !== null && sourceValue !== undefined) {
      merged[field] = sourceValue as never;
      continue;
    }

    // If preferSource is true, take source value if it exists
    if (preferSource && sourceValue !== null && sourceValue !== undefined) {
      merged[field] = sourceValue as never;
      continue;
    }

    // Default: prefer non-null values, target takes precedence
    if (targetValue !== null && targetValue !== undefined) {
      merged[field] = targetValue as never;
    } else if (sourceValue !== null && sourceValue !== undefined) {
      merged[field] = sourceValue as never;
    }
  }

  // Special handling for bio - concatenate if both exist
  if (source.bio && target.bio && source.bio !== target.bio) {
    merged.bio = `${target.bio}\n\n---\n\nMerged from ${source.firstName} ${source.lastName}:\n${source.bio}`;
  }

  // Special handling for linkedUserId - keep target's if both exist
  if (source.linkedUserId && !target.linkedUserId) {
    merged.linkedUserId = source.linkedUserId;
  }

  return merged;
}

/**
 * Validate that a merge can be performed
 */
export async function validateMerge(
  sourceMemberId: string,
  targetMemberId: string,
  userId: string
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Basic validation
  if (!sourceMemberId || !targetMemberId) {
    errors.push("Both source and target member IDs are required");
    return { valid: false, errors };
  }

  if (sourceMemberId === targetMemberId) {
    errors.push("Cannot merge a member with themselves");
    return { valid: false, errors };
  }

  // Check if members exist
  const [source, target] = await Promise.all([
    findFamilyMemberById(sourceMemberId),
    findFamilyMemberById(targetMemberId),
  ]);

  if (!source) {
    errors.push("Source member not found");
  }

  if (!target) {
    errors.push("Target member not found");
  }

  if (source && target && source.familyTreeId !== target.familyTreeId) {
    errors.push("Members must belong to the same family tree");
  }

  return { valid: errors.length === 0, errors };
}
