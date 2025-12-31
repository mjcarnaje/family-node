import { eq, desc, count, and } from "drizzle-orm";
import { database } from "~/db";
import {
  familyMemberStory,
  type FamilyMemberStory,
  type CreateFamilyMemberStoryData,
  type UpdateFamilyMemberStoryData,
} from "~/db/schema";

// Find a story by ID
export async function findStoryById(
  id: string
): Promise<FamilyMemberStory | null> {
  const [result] = await database
    .select()
    .from(familyMemberStory)
    .where(eq(familyMemberStory.id, id))
    .limit(1);

  return result || null;
}

// Find all stories for a family member
export async function findStoriesByMemberId(
  familyMemberId: string
): Promise<FamilyMemberStory[]> {
  return database
    .select()
    .from(familyMemberStory)
    .where(eq(familyMemberStory.familyMemberId, familyMemberId))
    .orderBy(desc(familyMemberStory.createdAt));
}

// Find all stories in a family tree
export async function findStoriesByTreeId(
  familyTreeId: string
): Promise<FamilyMemberStory[]> {
  return database
    .select()
    .from(familyMemberStory)
    .where(eq(familyMemberStory.familyTreeId, familyTreeId))
    .orderBy(desc(familyMemberStory.createdAt));
}

// Create a new story
export async function createStory(
  data: CreateFamilyMemberStoryData
): Promise<FamilyMemberStory> {
  const [result] = await database
    .insert(familyMemberStory)
    .values(data)
    .returning();

  return result;
}

// Update a story
export async function updateStory(
  id: string,
  data: UpdateFamilyMemberStoryData
): Promise<FamilyMemberStory | null> {
  const [result] = await database
    .update(familyMemberStory)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(familyMemberStory.id, id))
    .returning();

  return result || null;
}

// Delete a story
export async function deleteStory(id: string): Promise<boolean> {
  const result = await database
    .delete(familyMemberStory)
    .where(eq(familyMemberStory.id, id))
    .returning({ id: familyMemberStory.id });

  return result.length > 0;
}

// Delete all stories for a family member
export async function deleteStoriesByMemberId(
  familyMemberId: string
): Promise<number> {
  const result = await database
    .delete(familyMemberStory)
    .where(eq(familyMemberStory.familyMemberId, familyMemberId))
    .returning({ id: familyMemberStory.id });

  return result.length;
}

// Count stories for a family member
export async function countStoriesByMemberId(
  familyMemberId: string
): Promise<number> {
  const [result] = await database
    .select({ count: count() })
    .from(familyMemberStory)
    .where(eq(familyMemberStory.familyMemberId, familyMemberId));

  return result?.count ?? 0;
}

// Count stories in a family tree
export async function countStoriesByTreeId(
  familyTreeId: string
): Promise<number> {
  const [result] = await database
    .select({ count: count() })
    .from(familyMemberStory)
    .where(eq(familyMemberStory.familyTreeId, familyTreeId));

  return result?.count ?? 0;
}

// Check if a story belongs to a specific family tree
export async function isStoryInTree(
  storyId: string,
  familyTreeId: string
): Promise<boolean> {
  const [result] = await database
    .select({ id: familyMemberStory.id })
    .from(familyMemberStory)
    .where(
      and(
        eq(familyMemberStory.id, storyId),
        eq(familyMemberStory.familyTreeId, familyTreeId)
      )
    )
    .limit(1);

  return !!result;
}
