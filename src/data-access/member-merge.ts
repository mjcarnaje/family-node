import { eq, and, or } from "drizzle-orm";
import { database } from "~/db";
import {
  familyMember,
  parentChildRelationship,
  marriageConnection,
  memberMedia,
  familyMemberStory,
  familyMemberEvent,
  type FamilyMember,
  type ParentChildRelationship,
  type MarriageConnection,
  type MemberMedia,
  type FamilyMemberStory,
  type FamilyMemberEvent,
} from "~/db/schema";

/**
 * Represents all data associated with a family member
 */
export interface MemberWithRelatedData {
  member: FamilyMember;
  parentRelationships: ParentChildRelationship[]; // Where member is parent
  childRelationships: ParentChildRelationship[]; // Where member is child
  marriages: MarriageConnection[];
  media: MemberMedia[];
  stories: FamilyMemberStory[];
  events: FamilyMemberEvent[];
  relatedEvents: FamilyMemberEvent[]; // Events where member is relatedMemberId
}

/**
 * Fetch all data associated with a family member for merge analysis
 */
export async function getMemberWithRelatedData(
  memberId: string
): Promise<MemberWithRelatedData | null> {
  const [member] = await database
    .select()
    .from(familyMember)
    .where(eq(familyMember.id, memberId))
    .limit(1);

  if (!member) {
    return null;
  }

  const [
    parentRelationships,
    childRelationships,
    marriages,
    media,
    stories,
    events,
    relatedEvents,
  ] = await Promise.all([
    // Relationships where this member is the parent
    database
      .select()
      .from(parentChildRelationship)
      .where(eq(parentChildRelationship.parentId, memberId)),
    // Relationships where this member is the child
    database
      .select()
      .from(parentChildRelationship)
      .where(eq(parentChildRelationship.childId, memberId)),
    // All marriages involving this member
    database
      .select()
      .from(marriageConnection)
      .where(
        or(
          eq(marriageConnection.spouse1Id, memberId),
          eq(marriageConnection.spouse2Id, memberId)
        )
      ),
    // All media for this member
    database
      .select()
      .from(memberMedia)
      .where(eq(memberMedia.familyMemberId, memberId)),
    // All stories for this member
    database
      .select()
      .from(familyMemberStory)
      .where(eq(familyMemberStory.familyMemberId, memberId)),
    // All events for this member
    database
      .select()
      .from(familyMemberEvent)
      .where(eq(familyMemberEvent.familyMemberId, memberId)),
    // All events where this member is a related member
    database
      .select()
      .from(familyMemberEvent)
      .where(eq(familyMemberEvent.relatedMemberId, memberId)),
  ]);

  return {
    member,
    parentRelationships,
    childRelationships,
    marriages,
    media,
    stories,
    events,
    relatedEvents,
  };
}

/**
 * Update parent-child relationships to point to new member ID
 */
export async function updateParentChildRelationshipsMemberId(
  oldMemberId: string,
  newMemberId: string,
  familyTreeId: string
): Promise<number> {
  // Update where old member is parent
  const parentUpdates = await database
    .update(parentChildRelationship)
    .set({ parentId: newMemberId, updatedAt: new Date() })
    .where(
      and(
        eq(parentChildRelationship.parentId, oldMemberId),
        eq(parentChildRelationship.familyTreeId, familyTreeId)
      )
    )
    .returning({ id: parentChildRelationship.id });

  // Update where old member is child
  const childUpdates = await database
    .update(parentChildRelationship)
    .set({ childId: newMemberId, updatedAt: new Date() })
    .where(
      and(
        eq(parentChildRelationship.childId, oldMemberId),
        eq(parentChildRelationship.familyTreeId, familyTreeId)
      )
    )
    .returning({ id: parentChildRelationship.id });

  return parentUpdates.length + childUpdates.length;
}

/**
 * Update marriage connections to point to new member ID
 */
export async function updateMarriageConnectionsMemberId(
  oldMemberId: string,
  newMemberId: string,
  familyTreeId: string
): Promise<number> {
  // Update where old member is spouse1
  const spouse1Updates = await database
    .update(marriageConnection)
    .set({ spouse1Id: newMemberId, updatedAt: new Date() })
    .where(
      and(
        eq(marriageConnection.spouse1Id, oldMemberId),
        eq(marriageConnection.familyTreeId, familyTreeId)
      )
    )
    .returning({ id: marriageConnection.id });

  // Update where old member is spouse2
  const spouse2Updates = await database
    .update(marriageConnection)
    .set({ spouse2Id: newMemberId, updatedAt: new Date() })
    .where(
      and(
        eq(marriageConnection.spouse2Id, oldMemberId),
        eq(marriageConnection.familyTreeId, familyTreeId)
      )
    )
    .returning({ id: marriageConnection.id });

  return spouse1Updates.length + spouse2Updates.length;
}

/**
 * Update media to point to new member ID
 */
export async function updateMemberMediaMemberId(
  oldMemberId: string,
  newMemberId: string
): Promise<number> {
  const updates = await database
    .update(memberMedia)
    .set({ familyMemberId: newMemberId, updatedAt: new Date() })
    .where(eq(memberMedia.familyMemberId, oldMemberId))
    .returning({ id: memberMedia.id });

  return updates.length;
}

/**
 * Update stories to point to new member ID
 */
export async function updateMemberStoriesMemberId(
  oldMemberId: string,
  newMemberId: string
): Promise<number> {
  const updates = await database
    .update(familyMemberStory)
    .set({ familyMemberId: newMemberId, updatedAt: new Date() })
    .where(eq(familyMemberStory.familyMemberId, oldMemberId))
    .returning({ id: familyMemberStory.id });

  return updates.length;
}

/**
 * Update events to point to new member ID (both primary and related member)
 */
export async function updateMemberEventsMemberId(
  oldMemberId: string,
  newMemberId: string
): Promise<number> {
  // Update where old member is primary member
  const primaryUpdates = await database
    .update(familyMemberEvent)
    .set({ familyMemberId: newMemberId, updatedAt: new Date() })
    .where(eq(familyMemberEvent.familyMemberId, oldMemberId))
    .returning({ id: familyMemberEvent.id });

  // Update where old member is related member
  const relatedUpdates = await database
    .update(familyMemberEvent)
    .set({ relatedMemberId: newMemberId, updatedAt: new Date() })
    .where(eq(familyMemberEvent.relatedMemberId, oldMemberId))
    .returning({ id: familyMemberEvent.id });

  return primaryUpdates.length + relatedUpdates.length;
}

/**
 * Delete duplicate parent-child relationships after merge
 * (Same parent-child pair that might exist due to merge)
 */
export async function deleteDuplicateParentChildRelationships(
  familyTreeId: string
): Promise<number> {
  // Find all relationships
  const allRelationships = await database
    .select()
    .from(parentChildRelationship)
    .where(eq(parentChildRelationship.familyTreeId, familyTreeId));

  // Find duplicates (same parentId and childId)
  const seen = new Set<string>();
  const duplicateIds: string[] = [];

  for (const rel of allRelationships) {
    const key = `${rel.parentId}-${rel.childId}`;
    if (seen.has(key)) {
      duplicateIds.push(rel.id);
    } else {
      seen.add(key);
    }
  }

  if (duplicateIds.length === 0) {
    return 0;
  }

  // Delete duplicates
  let deletedCount = 0;
  for (const id of duplicateIds) {
    const result = await database
      .delete(parentChildRelationship)
      .where(eq(parentChildRelationship.id, id))
      .returning({ id: parentChildRelationship.id });
    deletedCount += result.length;
  }

  return deletedCount;
}

/**
 * Delete duplicate marriage connections after merge
 * (Same spouse pair that might exist due to merge)
 */
export async function deleteDuplicateMarriageConnections(
  familyTreeId: string
): Promise<number> {
  // Find all marriages
  const allMarriages = await database
    .select()
    .from(marriageConnection)
    .where(eq(marriageConnection.familyTreeId, familyTreeId));

  // Find duplicates (same spouse pair, considering both directions)
  const seen = new Set<string>();
  const duplicateIds: string[] = [];

  for (const marriage of allMarriages) {
    // Create a normalized key (smaller ID first)
    const spouses = [marriage.spouse1Id, marriage.spouse2Id].sort();
    const key = `${spouses[0]}-${spouses[1]}`;

    if (seen.has(key)) {
      duplicateIds.push(marriage.id);
    } else {
      seen.add(key);
    }
  }

  if (duplicateIds.length === 0) {
    return 0;
  }

  // Delete duplicates
  let deletedCount = 0;
  for (const id of duplicateIds) {
    const result = await database
      .delete(marriageConnection)
      .where(eq(marriageConnection.id, id))
      .returning({ id: marriageConnection.id });
    deletedCount += result.length;
  }

  return deletedCount;
}

/**
 * Delete self-referential relationships that might occur after merge
 * (e.g., member being their own parent or married to themselves)
 */
export async function deleteSelfReferentialRelationships(
  familyTreeId: string
): Promise<{ parentChild: number; marriages: number }> {
  // Find and delete self-referential parent-child relationships
  const allRelationships = await database
    .select()
    .from(parentChildRelationship)
    .where(eq(parentChildRelationship.familyTreeId, familyTreeId));

  const selfRefRelIds = allRelationships
    .filter((rel) => rel.parentId === rel.childId)
    .map((rel) => rel.id);

  let parentChildDeleted = 0;
  for (const id of selfRefRelIds) {
    const result = await database
      .delete(parentChildRelationship)
      .where(eq(parentChildRelationship.id, id))
      .returning({ id: parentChildRelationship.id });
    parentChildDeleted += result.length;
  }

  // Find and delete self-referential marriages
  const allMarriages = await database
    .select()
    .from(marriageConnection)
    .where(eq(marriageConnection.familyTreeId, familyTreeId));

  const selfRefMarriageIds = allMarriages
    .filter((m) => m.spouse1Id === m.spouse2Id)
    .map((m) => m.id);

  let marriagesDeleted = 0;
  for (const id of selfRefMarriageIds) {
    const result = await database
      .delete(marriageConnection)
      .where(eq(marriageConnection.id, id))
      .returning({ id: marriageConnection.id });
    marriagesDeleted += result.length;
  }

  return {
    parentChild: parentChildDeleted,
    marriages: marriagesDeleted,
  };
}
