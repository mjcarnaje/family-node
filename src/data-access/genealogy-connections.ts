import { eq, and } from "drizzle-orm";
import { database } from "~/db";
import {
  genealogyServiceConnection,
  type GenealogyServiceConnection,
  type CreateGenealogyServiceConnectionData,
  type UpdateGenealogyServiceConnectionData,
  type GenealogyService,
} from "~/db/schema";

/**
 * Find a genealogy service connection by ID
 */
export async function findGenealogyConnectionById(
  id: string
): Promise<GenealogyServiceConnection | null> {
  const [result] = await database
    .select()
    .from(genealogyServiceConnection)
    .where(eq(genealogyServiceConnection.id, id))
    .limit(1);

  return result || null;
}

/**
 * Find all genealogy service connections for a user
 */
export async function findGenealogyConnectionsByUserId(
  userId: string
): Promise<GenealogyServiceConnection[]> {
  return database
    .select()
    .from(genealogyServiceConnection)
    .where(eq(genealogyServiceConnection.userId, userId));
}

/**
 * Find a specific service connection for a user
 */
export async function findGenealogyConnectionByUserAndService(
  userId: string,
  service: GenealogyService
): Promise<GenealogyServiceConnection | null> {
  const [result] = await database
    .select()
    .from(genealogyServiceConnection)
    .where(
      and(
        eq(genealogyServiceConnection.userId, userId),
        eq(genealogyServiceConnection.service, service)
      )
    )
    .limit(1);

  return result || null;
}

/**
 * Find active genealogy service connections for a user
 */
export async function findActiveGenealogyConnectionsByUserId(
  userId: string
): Promise<GenealogyServiceConnection[]> {
  return database
    .select()
    .from(genealogyServiceConnection)
    .where(
      and(
        eq(genealogyServiceConnection.userId, userId),
        eq(genealogyServiceConnection.isActive, true)
      )
    );
}

/**
 * Create a new genealogy service connection
 */
export async function createGenealogyConnection(
  data: CreateGenealogyServiceConnectionData
): Promise<GenealogyServiceConnection> {
  const [result] = await database
    .insert(genealogyServiceConnection)
    .values(data)
    .returning();

  return result;
}

/**
 * Update a genealogy service connection
 */
export async function updateGenealogyConnection(
  id: string,
  data: UpdateGenealogyServiceConnectionData
): Promise<GenealogyServiceConnection | null> {
  const [result] = await database
    .update(genealogyServiceConnection)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(genealogyServiceConnection.id, id))
    .returning();

  return result || null;
}

/**
 * Delete a genealogy service connection
 */
export async function deleteGenealogyConnection(id: string): Promise<boolean> {
  const result = await database
    .delete(genealogyServiceConnection)
    .where(eq(genealogyServiceConnection.id, id));

  return (result.rowCount ?? 0) > 0;
}

/**
 * Deactivate a genealogy service connection (soft delete)
 */
export async function deactivateGenealogyConnection(
  id: string
): Promise<GenealogyServiceConnection | null> {
  return updateGenealogyConnection(id, { isActive: false });
}

/**
 * Update last sync timestamp for a connection
 */
export async function updateGenealogyConnectionLastSync(
  id: string
): Promise<GenealogyServiceConnection | null> {
  return updateGenealogyConnection(id, { lastSyncAt: new Date() });
}
