import { eq, and, count, sql } from "drizzle-orm";
import { database } from "~/db";
import {
  familyTree,
  familyMember,
  type FamilyTree,
  type CreateFamilyTreeData,
  type UpdateFamilyTreeData,
} from "~/db/schema";

// Family tree with member count
export interface FamilyTreeWithMemberCount extends FamilyTree {
  memberCount: number;
}

// Find a family tree by ID
export async function findFamilyTreeById(
  id: string
): Promise<FamilyTree | null> {
  const [result] = await database
    .select()
    .from(familyTree)
    .where(eq(familyTree.id, id))
    .limit(1);

  return result || null;
}

// Find all family trees owned by a user
export async function findFamilyTreesByOwnerId(
  ownerId: string
): Promise<FamilyTree[]> {
  return database
    .select()
    .from(familyTree)
    .where(eq(familyTree.ownerId, ownerId));
}

// Find all public family trees
export async function findPublicFamilyTrees(): Promise<FamilyTree[]> {
  return database
    .select()
    .from(familyTree)
    .where(eq(familyTree.isPublic, true));
}

// Create a new family tree
export async function createFamilyTree(
  data: CreateFamilyTreeData
): Promise<FamilyTree> {
  const [result] = await database.insert(familyTree).values(data).returning();

  return result;
}

// Update a family tree
export async function updateFamilyTree(
  id: string,
  data: UpdateFamilyTreeData
): Promise<FamilyTree | null> {
  const [result] = await database
    .update(familyTree)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(familyTree.id, id))
    .returning();

  return result || null;
}

// Delete a family tree
export async function deleteFamilyTree(id: string): Promise<boolean> {
  const result = await database
    .delete(familyTree)
    .where(eq(familyTree.id, id))
    .returning({ id: familyTree.id });

  return result.length > 0;
}

// Check if user is the owner of a family tree
export async function isUserFamilyTreeOwner(
  userId: string,
  familyTreeId: string
): Promise<boolean> {
  const [result] = await database
    .select({ id: familyTree.id })
    .from(familyTree)
    .where(
      and(eq(familyTree.id, familyTreeId), eq(familyTree.ownerId, userId))
    )
    .limit(1);

  return !!result;
}

// Count family trees owned by a user
export async function countFamilyTreesByOwnerId(
  ownerId: string
): Promise<number> {
  const [result] = await database
    .select({ count: count() })
    .from(familyTree)
    .where(eq(familyTree.ownerId, ownerId));

  return result?.count ?? 0;
}

// Find all family trees owned by a user with member counts
export async function findFamilyTreesByOwnerIdWithMemberCount(
  ownerId: string
): Promise<FamilyTreeWithMemberCount[]> {
  const trees = await database
    .select({
      id: familyTree.id,
      name: familyTree.name,
      description: familyTree.description,
      ownerId: familyTree.ownerId,
      isPublic: familyTree.isPublic,
      privacyLevel: familyTree.privacyLevel,
      createdAt: familyTree.createdAt,
      updatedAt: familyTree.updatedAt,
      memberCount: sql<number>`cast(count(${familyMember.id}) as integer)`,
    })
    .from(familyTree)
    .leftJoin(familyMember, eq(familyTree.id, familyMember.familyTreeId))
    .where(eq(familyTree.ownerId, ownerId))
    .groupBy(familyTree.id)
    .orderBy(familyTree.updatedAt);

  return trees;
}
