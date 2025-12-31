import { eq, count } from "drizzle-orm";
import { database } from "~/db";
import {
  familyMember,
  type FamilyMember,
  type CreateFamilyMemberData,
  type UpdateFamilyMemberData,
} from "~/db/schema";

// Find a family member by ID
export async function findFamilyMemberById(
  id: string
): Promise<FamilyMember | null> {
  const [result] = await database
    .select()
    .from(familyMember)
    .where(eq(familyMember.id, id))
    .limit(1);

  return result || null;
}

// Find all family members in a family tree
export async function findFamilyMembersByTreeId(
  familyTreeId: string
): Promise<FamilyMember[]> {
  return database
    .select()
    .from(familyMember)
    .where(eq(familyMember.familyTreeId, familyTreeId));
}

// Find family members linked to a user
export async function findFamilyMembersByLinkedUserId(
  linkedUserId: string
): Promise<FamilyMember[]> {
  return database
    .select()
    .from(familyMember)
    .where(eq(familyMember.linkedUserId, linkedUserId));
}

// Create a new family member
export async function createFamilyMember(
  data: CreateFamilyMemberData
): Promise<FamilyMember> {
  const [result] = await database
    .insert(familyMember)
    .values(data)
    .returning();

  return result;
}

// Create multiple family members
export async function createFamilyMembers(
  data: CreateFamilyMemberData[]
): Promise<FamilyMember[]> {
  return database.insert(familyMember).values(data).returning();
}

// Update a family member
export async function updateFamilyMember(
  id: string,
  data: UpdateFamilyMemberData
): Promise<FamilyMember | null> {
  const [result] = await database
    .update(familyMember)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(familyMember.id, id))
    .returning();

  return result || null;
}

// Delete a family member
export async function deleteFamilyMember(id: string): Promise<boolean> {
  const result = await database
    .delete(familyMember)
    .where(eq(familyMember.id, id))
    .returning({ id: familyMember.id });

  return result.length > 0;
}

// Delete all family members in a family tree
export async function deleteFamilyMembersByTreeId(
  familyTreeId: string
): Promise<number> {
  const result = await database
    .delete(familyMember)
    .where(eq(familyMember.familyTreeId, familyTreeId))
    .returning({ id: familyMember.id });

  return result.length;
}

// Count family members in a family tree
export async function countFamilyMembersByTreeId(
  familyTreeId: string
): Promise<number> {
  const [result] = await database
    .select({ count: count() })
    .from(familyMember)
    .where(eq(familyMember.familyTreeId, familyTreeId));

  return result?.count ?? 0;
}
