import { eq, and, asc, inArray } from "drizzle-orm";
import { database } from "~/db";
import {
  memberMedia,
  type MemberMedia,
  type CreateMemberMediaData,
  type UpdateMemberMediaData,
} from "~/db/schema";

// Find a single media item by ID
export async function findMemberMediaById(
  id: string
): Promise<MemberMedia | null> {
  const [result] = await database
    .select()
    .from(memberMedia)
    .where(eq(memberMedia.id, id))
    .limit(1);

  return result || null;
}

// Find all media for a family member
export async function findMediaByMemberId(
  familyMemberId: string
): Promise<MemberMedia[]> {
  return await database
    .select()
    .from(memberMedia)
    .where(eq(memberMedia.familyMemberId, familyMemberId))
    .orderBy(asc(memberMedia.position), asc(memberMedia.createdAt));
}

// Find all media for a family tree
export async function findMediaByTreeId(
  familyTreeId: string
): Promise<MemberMedia[]> {
  return await database
    .select()
    .from(memberMedia)
    .where(eq(memberMedia.familyTreeId, familyTreeId))
    .orderBy(asc(memberMedia.createdAt));
}

// Find media by multiple member IDs
export async function findMediaByMemberIds(
  memberIds: string[]
): Promise<MemberMedia[]> {
  if (memberIds.length === 0) return [];
  return await database
    .select()
    .from(memberMedia)
    .where(inArray(memberMedia.familyMemberId, memberIds))
    .orderBy(asc(memberMedia.position));
}

// Create a new media record
export async function createMemberMedia(
  data: CreateMemberMediaData
): Promise<MemberMedia> {
  const [result] = await database
    .insert(memberMedia)
    .values(data)
    .returning();

  return result;
}

// Create multiple media records
export async function createMemberMediaBatch(
  data: CreateMemberMediaData[]
): Promise<MemberMedia[]> {
  if (data.length === 0) return [];
  return await database
    .insert(memberMedia)
    .values(data)
    .returning();
}

// Update a media record
export async function updateMemberMedia(
  id: string,
  data: UpdateMemberMediaData
): Promise<MemberMedia | null> {
  const [result] = await database
    .update(memberMedia)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(memberMedia.id, id))
    .returning();

  return result || null;
}

// Delete a media record
export async function deleteMemberMedia(id: string): Promise<boolean> {
  const result = await database
    .delete(memberMedia)
    .where(eq(memberMedia.id, id))
    .returning();

  return result.length > 0;
}

// Delete all media for a family member
export async function deleteMemberMediaByMemberId(
  familyMemberId: string
): Promise<number> {
  const result = await database
    .delete(memberMedia)
    .where(eq(memberMedia.familyMemberId, familyMemberId))
    .returning();

  return result.length;
}

// Delete all media for a family tree
export async function deleteMemberMediaByTreeId(
  familyTreeId: string
): Promise<number> {
  const result = await database
    .delete(memberMedia)
    .where(eq(memberMedia.familyTreeId, familyTreeId))
    .returning();

  return result.length;
}

// Count media for a family member
export async function countMemberMediaByMemberId(
  familyMemberId: string
): Promise<number> {
  const result = await database
    .select()
    .from(memberMedia)
    .where(eq(memberMedia.familyMemberId, familyMemberId));

  return result.length;
}
