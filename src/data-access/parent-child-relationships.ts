import { eq, and, or } from "drizzle-orm";
import { database } from "~/db";
import {
  parentChildRelationship,
  type ParentChildRelationship,
  type CreateParentChildRelationshipData,
  type UpdateParentChildRelationshipData,
} from "~/db/schema";

// Find a parent-child relationship by ID
export async function findParentChildRelationshipById(
  id: string
): Promise<ParentChildRelationship | null> {
  const [result] = await database
    .select()
    .from(parentChildRelationship)
    .where(eq(parentChildRelationship.id, id))
    .limit(1);

  return result || null;
}

// Find all parent-child relationships in a family tree
export async function findParentChildRelationshipsByTreeId(
  familyTreeId: string
): Promise<ParentChildRelationship[]> {
  return database
    .select()
    .from(parentChildRelationship)
    .where(eq(parentChildRelationship.familyTreeId, familyTreeId));
}

// Find all children of a parent
export async function findChildrenOfParent(
  parentId: string
): Promise<ParentChildRelationship[]> {
  return database
    .select()
    .from(parentChildRelationship)
    .where(eq(parentChildRelationship.parentId, parentId));
}

// Find all parents of a child
export async function findParentsOfChild(
  childId: string
): Promise<ParentChildRelationship[]> {
  return database
    .select()
    .from(parentChildRelationship)
    .where(eq(parentChildRelationship.childId, childId));
}

// Find all relationships involving a family member (as parent or child)
export async function findRelationshipsForMember(
  memberId: string
): Promise<ParentChildRelationship[]> {
  return database
    .select()
    .from(parentChildRelationship)
    .where(
      or(
        eq(parentChildRelationship.parentId, memberId),
        eq(parentChildRelationship.childId, memberId)
      )
    );
}

// Create a new parent-child relationship
export async function createParentChildRelationship(
  data: CreateParentChildRelationshipData
): Promise<ParentChildRelationship> {
  const [result] = await database
    .insert(parentChildRelationship)
    .values(data)
    .returning();

  return result;
}

// Create multiple parent-child relationships
export async function createParentChildRelationships(
  data: CreateParentChildRelationshipData[]
): Promise<ParentChildRelationship[]> {
  return database.insert(parentChildRelationship).values(data).returning();
}

// Update a parent-child relationship
export async function updateParentChildRelationship(
  id: string,
  data: UpdateParentChildRelationshipData
): Promise<ParentChildRelationship | null> {
  const [result] = await database
    .update(parentChildRelationship)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(parentChildRelationship.id, id))
    .returning();

  return result || null;
}

// Delete a parent-child relationship
export async function deleteParentChildRelationship(
  id: string
): Promise<boolean> {
  const result = await database
    .delete(parentChildRelationship)
    .where(eq(parentChildRelationship.id, id))
    .returning({ id: parentChildRelationship.id });

  return result.length > 0;
}

// Delete all parent-child relationships in a family tree
export async function deleteParentChildRelationshipsByTreeId(
  familyTreeId: string
): Promise<number> {
  const result = await database
    .delete(parentChildRelationship)
    .where(eq(parentChildRelationship.familyTreeId, familyTreeId))
    .returning({ id: parentChildRelationship.id });

  return result.length;
}

// Check if a parent-child relationship already exists
export async function doesParentChildRelationshipExist(
  parentId: string,
  childId: string
): Promise<boolean> {
  const [result] = await database
    .select({ id: parentChildRelationship.id })
    .from(parentChildRelationship)
    .where(
      and(
        eq(parentChildRelationship.parentId, parentId),
        eq(parentChildRelationship.childId, childId)
      )
    )
    .limit(1);

  return !!result;
}
