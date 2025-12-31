import { eq, desc, and, sql } from "drizzle-orm";
import { database } from "~/db";
import {
  treeVersion,
  treeChangeLog,
  user,
  type TreeVersion,
  type CreateTreeVersionData,
  type TreeChangeLog,
  type CreateTreeChangeLogData,
} from "~/db/schema";

// ============================================
// Tree Version CRUD Operations
// ============================================

/**
 * Find a tree version by ID
 */
export async function findTreeVersionById(
  id: string
): Promise<TreeVersion | null> {
  const [result] = await database
    .select()
    .from(treeVersion)
    .where(eq(treeVersion.id, id))
    .limit(1);

  return result || null;
}

/**
 * Find all versions for a family tree (ordered by version number descending)
 */
export async function findTreeVersionsByTreeId(
  familyTreeId: string,
  limit?: number,
  offset?: number
): Promise<TreeVersion[]> {
  let query = database
    .select()
    .from(treeVersion)
    .where(eq(treeVersion.familyTreeId, familyTreeId))
    .orderBy(desc(treeVersion.versionNumber));

  if (limit !== undefined) {
    query = query.limit(limit) as typeof query;
  }
  if (offset !== undefined) {
    query = query.offset(offset) as typeof query;
  }

  return query;
}

/**
 * Get the latest version number for a family tree
 */
export async function getLatestVersionNumber(
  familyTreeId: string
): Promise<number> {
  const [result] = await database
    .select({ maxVersion: sql<number>`COALESCE(MAX(${treeVersion.versionNumber}), 0)` })
    .from(treeVersion)
    .where(eq(treeVersion.familyTreeId, familyTreeId));

  return result?.maxVersion || 0;
}

/**
 * Find a specific version by tree ID and version number
 */
export async function findTreeVersionByNumber(
  familyTreeId: string,
  versionNumber: number
): Promise<TreeVersion | null> {
  const [result] = await database
    .select()
    .from(treeVersion)
    .where(
      and(
        eq(treeVersion.familyTreeId, familyTreeId),
        eq(treeVersion.versionNumber, versionNumber)
      )
    )
    .limit(1);

  return result || null;
}

/**
 * Create a new tree version
 */
export async function createTreeVersion(
  data: CreateTreeVersionData
): Promise<TreeVersion> {
  const [result] = await database.insert(treeVersion).values(data).returning();

  return result;
}

/**
 * Delete a tree version
 */
export async function deleteTreeVersion(id: string): Promise<boolean> {
  const result = await database
    .delete(treeVersion)
    .where(eq(treeVersion.id, id))
    .returning({ id: treeVersion.id });

  return result.length > 0;
}

/**
 * Delete old versions keeping only the most recent N versions
 */
export async function deleteOldVersions(
  familyTreeId: string,
  keepCount: number
): Promise<number> {
  // Get all versions ordered by version number descending
  const versionsToKeep = await database
    .select({ id: treeVersion.id })
    .from(treeVersion)
    .where(eq(treeVersion.familyTreeId, familyTreeId))
    .orderBy(desc(treeVersion.versionNumber))
    .limit(keepCount);

  const keepIds = versionsToKeep.map((v) => v.id);

  if (keepIds.length === 0) {
    return 0;
  }

  // Delete all versions not in the keep list
  const result = await database
    .delete(treeVersion)
    .where(
      and(
        eq(treeVersion.familyTreeId, familyTreeId),
        sql`${treeVersion.id} NOT IN (${sql.join(keepIds.map(id => sql`${id}`), sql`, `)})`
      )
    )
    .returning({ id: treeVersion.id });

  return result.length;
}

/**
 * Count versions for a family tree
 */
export async function countTreeVersions(familyTreeId: string): Promise<number> {
  const [result] = await database
    .select({ count: sql<number>`COUNT(*)` })
    .from(treeVersion)
    .where(eq(treeVersion.familyTreeId, familyTreeId));

  return Number(result?.count) || 0;
}

// ============================================
// Tree Change Log CRUD Operations
// ============================================

/**
 * Find a change log entry by ID
 */
export async function findTreeChangeLogById(
  id: string
): Promise<TreeChangeLog | null> {
  const [result] = await database
    .select()
    .from(treeChangeLog)
    .where(eq(treeChangeLog.id, id))
    .limit(1);

  return result || null;
}

/**
 * Find all change logs for a tree version
 */
export async function findChangeLogsByVersionId(
  versionId: string
): Promise<TreeChangeLog[]> {
  return database
    .select()
    .from(treeChangeLog)
    .where(eq(treeChangeLog.versionId, versionId))
    .orderBy(desc(treeChangeLog.createdAt));
}

/**
 * Find all change logs for a family tree (ordered by created at descending)
 */
export async function findChangeLogsByTreeId(
  familyTreeId: string,
  limit?: number,
  offset?: number
): Promise<TreeChangeLog[]> {
  let query = database
    .select()
    .from(treeChangeLog)
    .where(eq(treeChangeLog.familyTreeId, familyTreeId))
    .orderBy(desc(treeChangeLog.createdAt));

  if (limit !== undefined) {
    query = query.limit(limit) as typeof query;
  }
  if (offset !== undefined) {
    query = query.offset(offset) as typeof query;
  }

  return query;
}

/**
 * Create a new change log entry
 */
export async function createTreeChangeLog(
  data: CreateTreeChangeLogData
): Promise<TreeChangeLog> {
  const [result] = await database.insert(treeChangeLog).values(data).returning();

  return result;
}

/**
 * Create multiple change log entries
 */
export async function createTreeChangeLogs(
  data: CreateTreeChangeLogData[]
): Promise<TreeChangeLog[]> {
  if (data.length === 0) {
    return [];
  }
  return database.insert(treeChangeLog).values(data).returning();
}

/**
 * Delete all change logs for a version (used when deleting a version)
 */
export async function deleteChangeLogsByVersionId(
  versionId: string
): Promise<number> {
  const result = await database
    .delete(treeChangeLog)
    .where(eq(treeChangeLog.versionId, versionId))
    .returning({ id: treeChangeLog.id });

  return result.length;
}

/**
 * Activity log entry with user information
 */
export type ActivityLogEntry = TreeChangeLog & {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  } | null;
};

/**
 * Find all change logs for a family tree with user information (for activity log display)
 */
export async function findActivityLogsByTreeId(
  familyTreeId: string,
  limit?: number,
  offset?: number
): Promise<ActivityLogEntry[]> {
  let query = database
    .select({
      id: treeChangeLog.id,
      familyTreeId: treeChangeLog.familyTreeId,
      versionId: treeChangeLog.versionId,
      changeType: treeChangeLog.changeType,
      entityType: treeChangeLog.entityType,
      entityId: treeChangeLog.entityId,
      oldData: treeChangeLog.oldData,
      newData: treeChangeLog.newData,
      description: treeChangeLog.description,
      createdByUserId: treeChangeLog.createdByUserId,
      createdAt: treeChangeLog.createdAt,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
    })
    .from(treeChangeLog)
    .leftJoin(user, eq(treeChangeLog.createdByUserId, user.id))
    .where(eq(treeChangeLog.familyTreeId, familyTreeId))
    .orderBy(desc(treeChangeLog.createdAt));

  if (limit !== undefined) {
    query = query.limit(limit) as typeof query;
  }
  if (offset !== undefined) {
    query = query.offset(offset) as typeof query;
  }

  return query;
}

/**
 * Count activity logs for a family tree
 */
export async function countActivityLogsByTreeId(
  familyTreeId: string
): Promise<number> {
  const [result] = await database
    .select({ count: sql<number>`COUNT(*)` })
    .from(treeChangeLog)
    .where(eq(treeChangeLog.familyTreeId, familyTreeId));

  return Number(result?.count) || 0;
}
