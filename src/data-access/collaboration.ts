import { eq, and, lt, ne, desc, sql } from "drizzle-orm";
import { database } from "~/db";
import {
  collaborationSession,
  treeActivity,
  editLock,
  user,
  type CreateCollaborationSessionData,
  type UpdateCollaborationSessionData,
  type CreateTreeActivityData,
  type CreateEditLockData,
  type CollaborationSessionStatus,
  type TreeEntityType,
} from "~/db/schema";

// ============================================
// Collaboration Session Operations
// ============================================

/**
 * Create or update a collaboration session for a user on a tree
 */
export async function upsertCollaborationSession(
  familyTreeId: string,
  userId: string,
  status: CollaborationSessionStatus = "active"
) {
  // Check if session exists
  const existing = await database
    .select()
    .from(collaborationSession)
    .where(
      and(
        eq(collaborationSession.familyTreeId, familyTreeId),
        eq(collaborationSession.userId, userId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Update existing session
    const [updated] = await database
      .update(collaborationSession)
      .set({
        status,
        lastHeartbeat: new Date(),
        disconnectedAt: null,
      })
      .where(eq(collaborationSession.id, existing[0].id))
      .returning();
    return updated;
  }

  // Create new session
  const [session] = await database
    .insert(collaborationSession)
    .values({
      id: crypto.randomUUID(),
      familyTreeId,
      userId,
      status,
      lastHeartbeat: new Date(),
      connectedAt: new Date(),
    })
    .returning();

  return session;
}

/**
 * Update collaboration session heartbeat
 */
export async function updateSessionHeartbeat(sessionId: string) {
  const [updated] = await database
    .update(collaborationSession)
    .set({
      lastHeartbeat: new Date(),
    })
    .where(eq(collaborationSession.id, sessionId))
    .returning();

  return updated;
}

/**
 * Update collaboration session status and editing info
 */
export async function updateCollaborationSession(
  sessionId: string,
  data: UpdateCollaborationSessionData
) {
  const [updated] = await database
    .update(collaborationSession)
    .set({
      ...data,
      lastHeartbeat: new Date(),
    })
    .where(eq(collaborationSession.id, sessionId))
    .returning();

  return updated;
}

/**
 * Mark session as disconnected
 */
export async function disconnectSession(sessionId: string) {
  const [updated] = await database
    .update(collaborationSession)
    .set({
      status: "disconnected",
      disconnectedAt: new Date(),
      editingEntityId: null,
      editingEntityType: null,
    })
    .where(eq(collaborationSession.id, sessionId))
    .returning();

  return updated;
}

/**
 * Get active collaborators for a tree (excluding current user)
 */
export async function getActiveCollaborators(
  familyTreeId: string,
  excludeUserId?: string
) {
  // Consider sessions active if heartbeat within last 30 seconds
  const heartbeatThreshold = new Date(Date.now() - 30000);

  const query = database
    .select({
      session: collaborationSession,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
    })
    .from(collaborationSession)
    .innerJoin(user, eq(collaborationSession.userId, user.id))
    .where(
      and(
        eq(collaborationSession.familyTreeId, familyTreeId),
        ne(collaborationSession.status, "disconnected"),
        sql`${collaborationSession.lastHeartbeat} > ${heartbeatThreshold}`
      )
    );

  const results = await query;

  // Filter out excluded user if provided
  if (excludeUserId) {
    return results.filter((r: { user: { id: string } }) => r.user.id !== excludeUserId);
  }

  return results;
}

/**
 * Get session for a user on a tree
 */
export async function getUserSession(familyTreeId: string, userId: string) {
  const [session] = await database
    .select()
    .from(collaborationSession)
    .where(
      and(
        eq(collaborationSession.familyTreeId, familyTreeId),
        eq(collaborationSession.userId, userId)
      )
    )
    .limit(1);

  return session || null;
}

/**
 * Cleanup stale sessions (older than specified threshold)
 */
export async function cleanupStaleSessions(thresholdMs: number = 60000) {
  const threshold = new Date(Date.now() - thresholdMs);

  await database
    .update(collaborationSession)
    .set({
      status: "disconnected",
      disconnectedAt: new Date(),
    })
    .where(
      and(
        lt(collaborationSession.lastHeartbeat, threshold),
        ne(collaborationSession.status, "disconnected")
      )
    );
}

// ============================================
// Tree Activity Operations
// ============================================

/**
 * Create a tree activity record
 */
export async function createTreeActivity(data: CreateTreeActivityData) {
  const [activity] = await database
    .insert(treeActivity)
    .values({
      ...data,
      id: data.id || crypto.randomUUID(),
      createdAt: new Date(),
    })
    .returning();

  return activity;
}

/**
 * Get recent activities for a tree
 */
export async function getRecentTreeActivities(
  familyTreeId: string,
  limit: number = 50,
  afterTimestamp?: Date
) {
  let query = database
    .select({
      activity: treeActivity,
      user: {
        id: user.id,
        name: user.name,
        image: user.image,
      },
    })
    .from(treeActivity)
    .innerJoin(user, eq(treeActivity.userId, user.id))
    .where(eq(treeActivity.familyTreeId, familyTreeId))
    .orderBy(desc(treeActivity.createdAt))
    .limit(limit);

  if (afterTimestamp) {
    query = database
      .select({
        activity: treeActivity,
        user: {
          id: user.id,
          name: user.name,
          image: user.image,
        },
      })
      .from(treeActivity)
      .innerJoin(user, eq(treeActivity.userId, user.id))
      .where(
        and(
          eq(treeActivity.familyTreeId, familyTreeId),
          sql`${treeActivity.createdAt} > ${afterTimestamp}`
        )
      )
      .orderBy(desc(treeActivity.createdAt))
      .limit(limit);
  }

  return query;
}

// ============================================
// Edit Lock Operations
// ============================================

/**
 * Acquire a lock on an entity
 * Returns the lock if acquired, null if already locked by another user
 */
export async function acquireEditLock(
  familyTreeId: string,
  entityId: string,
  entityType: TreeEntityType,
  userId: string,
  lockDurationMs: number = 30000 // Default 30 second lock
): Promise<{ lock: typeof editLock.$inferSelect | null; lockedBy?: { id: string; name: string } }> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + lockDurationMs);

  // Check for existing non-expired lock
  const [existingLock] = await database
    .select({
      lock: editLock,
      user: {
        id: user.id,
        name: user.name,
      },
    })
    .from(editLock)
    .innerJoin(user, eq(editLock.lockedByUserId, user.id))
    .where(
      and(
        eq(editLock.familyTreeId, familyTreeId),
        eq(editLock.entityId, entityId),
        eq(editLock.entityType, entityType),
        sql`${editLock.expiresAt} > ${now}`
      )
    )
    .limit(1);

  // If locked by another user, return info about who has the lock
  if (existingLock && existingLock.lock.lockedByUserId !== userId) {
    return {
      lock: null,
      lockedBy: existingLock.user,
    };
  }

  // If same user has the lock, extend it
  if (existingLock && existingLock.lock.lockedByUserId === userId) {
    const [updated] = await database
      .update(editLock)
      .set({
        expiresAt,
      })
      .where(eq(editLock.id, existingLock.lock.id))
      .returning();
    return { lock: updated };
  }

  // Create new lock
  const [newLock] = await database
    .insert(editLock)
    .values({
      id: crypto.randomUUID(),
      familyTreeId,
      entityId,
      entityType,
      lockedByUserId: userId,
      lockedAt: now,
      expiresAt,
      version: 1,
    })
    .returning();

  return { lock: newLock };
}

/**
 * Release a lock on an entity
 */
export async function releaseEditLock(
  entityId: string,
  entityType: TreeEntityType,
  userId: string
) {
  const result = await database
    .delete(editLock)
    .where(
      and(
        eq(editLock.entityId, entityId),
        eq(editLock.entityType, entityType),
        eq(editLock.lockedByUserId, userId)
      )
    )
    .returning();

  return result.length > 0;
}

/**
 * Get all active locks for a tree
 */
export async function getTreeLocks(familyTreeId: string) {
  const now = new Date();

  return database
    .select({
      lock: editLock,
      user: {
        id: user.id,
        name: user.name,
        image: user.image,
      },
    })
    .from(editLock)
    .innerJoin(user, eq(editLock.lockedByUserId, user.id))
    .where(
      and(
        eq(editLock.familyTreeId, familyTreeId),
        sql`${editLock.expiresAt} > ${now}`
      )
    );
}

/**
 * Cleanup expired locks
 */
export async function cleanupExpiredLocks() {
  const now = new Date();

  await database.delete(editLock).where(lt(editLock.expiresAt, now));
}

/**
 * Check if an entity is locked by another user
 */
export async function isEntityLocked(
  entityId: string,
  entityType: TreeEntityType,
  userId: string
): Promise<{ isLocked: boolean; lockedBy?: { id: string; name: string } }> {
  const now = new Date();

  const [existingLock] = await database
    .select({
      lock: editLock,
      user: {
        id: user.id,
        name: user.name,
      },
    })
    .from(editLock)
    .innerJoin(user, eq(editLock.lockedByUserId, user.id))
    .where(
      and(
        eq(editLock.entityId, entityId),
        eq(editLock.entityType, entityType),
        sql`${editLock.expiresAt} > ${now}`,
        ne(editLock.lockedByUserId, userId)
      )
    )
    .limit(1);

  if (existingLock) {
    return {
      isLocked: true,
      lockedBy: existingLock.user,
    };
  }

  return { isLocked: false };
}
