import { eq, and, or } from "drizzle-orm";
import { database } from "~/db";
import {
  marriageConnection,
  type MarriageConnection,
  type CreateMarriageConnectionData,
  type UpdateMarriageConnectionData,
} from "~/db/schema";

// Find a marriage connection by ID
export async function findMarriageConnectionById(
  id: string
): Promise<MarriageConnection | null> {
  const [result] = await database
    .select()
    .from(marriageConnection)
    .where(eq(marriageConnection.id, id))
    .limit(1);

  return result || null;
}

// Find all marriage connections in a family tree
export async function findMarriageConnectionsByTreeId(
  familyTreeId: string
): Promise<MarriageConnection[]> {
  return database
    .select()
    .from(marriageConnection)
    .where(eq(marriageConnection.familyTreeId, familyTreeId));
}

// Find all marriages involving a family member
export async function findMarriagesForMember(
  memberId: string
): Promise<MarriageConnection[]> {
  return database
    .select()
    .from(marriageConnection)
    .where(
      or(
        eq(marriageConnection.spouse1Id, memberId),
        eq(marriageConnection.spouse2Id, memberId)
      )
    );
}

// Create a new marriage connection
export async function createMarriageConnection(
  data: CreateMarriageConnectionData
): Promise<MarriageConnection> {
  const [result] = await database
    .insert(marriageConnection)
    .values(data)
    .returning();

  return result;
}

// Create multiple marriage connections
export async function createMarriageConnections(
  data: CreateMarriageConnectionData[]
): Promise<MarriageConnection[]> {
  return database.insert(marriageConnection).values(data).returning();
}

// Update a marriage connection
export async function updateMarriageConnection(
  id: string,
  data: UpdateMarriageConnectionData
): Promise<MarriageConnection | null> {
  const [result] = await database
    .update(marriageConnection)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(marriageConnection.id, id))
    .returning();

  return result || null;
}

// Delete a marriage connection
export async function deleteMarriageConnection(id: string): Promise<boolean> {
  const result = await database
    .delete(marriageConnection)
    .where(eq(marriageConnection.id, id))
    .returning({ id: marriageConnection.id });

  return result.length > 0;
}

// Delete all marriage connections in a family tree
export async function deleteMarriageConnectionsByTreeId(
  familyTreeId: string
): Promise<number> {
  const result = await database
    .delete(marriageConnection)
    .where(eq(marriageConnection.familyTreeId, familyTreeId))
    .returning({ id: marriageConnection.id });

  return result.length;
}

// Check if a marriage connection already exists between two members
export async function doesMarriageConnectionExist(
  spouse1Id: string,
  spouse2Id: string
): Promise<boolean> {
  const [result] = await database
    .select({ id: marriageConnection.id })
    .from(marriageConnection)
    .where(
      or(
        and(
          eq(marriageConnection.spouse1Id, spouse1Id),
          eq(marriageConnection.spouse2Id, spouse2Id)
        ),
        and(
          eq(marriageConnection.spouse1Id, spouse2Id),
          eq(marriageConnection.spouse2Id, spouse1Id)
        )
      )
    )
    .limit(1);

  return !!result;
}
