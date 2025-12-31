import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware, treeViewAccessMiddleware } from "./middleware";
import {
  upsertCollaborationSession,
  updateCollaborationSession,
  disconnectSession,
  getActiveCollaborators,
  getUserSession,
  createTreeActivity,
  getRecentTreeActivities,
  acquireEditLock,
  releaseEditLock,
  getTreeLocks,
  isEntityLocked,
} from "~/data-access/collaboration";
import { findFamilyTreeById } from "~/data-access/family-trees";
import type { TreeEntityType, TreeChangeType, CollaborationSessionStatus } from "~/db/schema";

// Validation schemas
const treeIdSchema = z.object({
  familyTreeId: z.string().min(1, "Family tree ID is required"),
});

const sessionStatusSchema = z.enum(["active", "idle", "editing", "disconnected"]);

const entityTypeSchema = z.enum(["MEMBER", "RELATIONSHIP", "MARRIAGE", "TREE"]);

const activityTypeSchema = z.enum([
  "MEMBER_ADDED",
  "MEMBER_UPDATED",
  "MEMBER_DELETED",
  "RELATIONSHIP_ADDED",
  "RELATIONSHIP_UPDATED",
  "RELATIONSHIP_DELETED",
  "MARRIAGE_ADDED",
  "MARRIAGE_UPDATED",
  "MARRIAGE_DELETED",
  "TREE_UPDATED",
  "BULK_IMPORT",
  "REVERT",
]);

// ============================================
// Collaboration Session Functions
// ============================================

/**
 * Join a collaboration session for a tree
 */
export const joinCollaborationSessionFn = createServerFn({
  method: "POST",
})
  .inputValidator(treeIdSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Verify tree exists and user has access
    const tree = await findFamilyTreeById(data.familyTreeId);
    if (!tree) {
      throw new Error("Family tree not found");
    }

    // Create or update session
    const session = await upsertCollaborationSession(
      data.familyTreeId,
      context.userId,
      "active"
    );

    // Get other active collaborators
    const collaborators = await getActiveCollaborators(
      data.familyTreeId,
      context.userId
    );

    return {
      session,
      collaborators: collaborators.map((c: { user: { id: string; name: string; email: string; image: string | null }; session: { status: string; editingEntityId: string | null; editingEntityType: string | null } }) => ({
        user: c.user,
        status: c.session.status,
        editingEntityId: c.session.editingEntityId,
        editingEntityType: c.session.editingEntityType,
      })),
    };
  });

/**
 * Update collaboration session status
 */
export const updateCollaborationSessionFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      familyTreeId: z.string().min(1),
      status: sessionStatusSchema.optional(),
      editingEntityId: z.string().nullable().optional(),
      editingEntityType: entityTypeSchema.nullable().optional(),
      cursorX: z.number().optional(),
      cursorY: z.number().optional(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const existingSession = await getUserSession(data.familyTreeId, context.userId);

    if (!existingSession) {
      throw new Error("Session not found. Please join the collaboration first.");
    }

    const updated = await updateCollaborationSession(existingSession.id, {
      status: data.status as CollaborationSessionStatus | undefined,
      editingEntityId: data.editingEntityId,
      editingEntityType: data.editingEntityType as TreeEntityType | null | undefined,
      cursorX: data.cursorX,
      cursorY: data.cursorY,
    });

    return updated;
  });

/**
 * Send heartbeat to keep session alive
 */
export const sendHeartbeatFn = createServerFn({
  method: "POST",
})
  .inputValidator(treeIdSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const session = await getUserSession(data.familyTreeId, context.userId);

    if (!session) {
      // Re-create session if it doesn't exist
      return upsertCollaborationSession(data.familyTreeId, context.userId, "active");
    }

    return updateCollaborationSession(session.id, {});
  });

/**
 * Leave collaboration session
 */
export const leaveCollaborationSessionFn = createServerFn({
  method: "POST",
})
  .inputValidator(treeIdSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const session = await getUserSession(data.familyTreeId, context.userId);

    if (session) {
      await disconnectSession(session.id);
    }

    return { success: true };
  });

/**
 * Get active collaborators for a tree
 */
export const getActiveCollaboratorsFn = createServerFn({
  method: "GET",
})
  .inputValidator(treeIdSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const collaborators = await getActiveCollaborators(
      data.familyTreeId,
      context.userId
    );

    return collaborators.map((c: { user: { id: string; name: string; email: string; image: string | null }; session: { status: string; editingEntityId: string | null; editingEntityType: string | null; lastHeartbeat: Date } }) => ({
      user: c.user,
      status: c.session.status,
      editingEntityId: c.session.editingEntityId,
      editingEntityType: c.session.editingEntityType,
      lastHeartbeat: c.session.lastHeartbeat,
    }));
  });

// ============================================
// Tree Activity Functions
// ============================================

/**
 * Broadcast a tree activity (called internally when changes occur)
 */
export const broadcastTreeActivityFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      familyTreeId: z.string().min(1),
      activityType: activityTypeSchema,
      entityType: entityTypeSchema,
      entityId: z.string().min(1),
      entityName: z.string().optional(),
      description: z.string().optional(),
      metadata: z.any().optional(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const activity = await createTreeActivity({
      id: crypto.randomUUID(),
      familyTreeId: data.familyTreeId,
      userId: context.userId,
      activityType: data.activityType as TreeChangeType,
      entityType: data.entityType as TreeEntityType,
      entityId: data.entityId,
      entityName: data.entityName || null,
      description: data.description || null,
      metadata: data.metadata || null,
    });

    return activity;
  });

/**
 * Get recent tree activities
 */
export const getRecentTreeActivitiesFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      familyTreeId: z.string().min(1),
      limit: z.number().min(1).max(100).optional(),
      afterTimestamp: z.string().datetime().optional(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const activities = await getRecentTreeActivities(
      data.familyTreeId,
      data.limit || 50,
      data.afterTimestamp ? new Date(data.afterTimestamp) : undefined
    );

    return activities;
  });

// ============================================
// Edit Lock Functions
// ============================================

/**
 * Acquire a lock on an entity for editing
 */
export const acquireEditLockFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      familyTreeId: z.string().min(1),
      entityId: z.string().min(1),
      entityType: entityTypeSchema,
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const result = await acquireEditLock(
      data.familyTreeId,
      data.entityId,
      data.entityType as TreeEntityType,
      context.userId
    );

    if (!result.lock) {
      return {
        success: false,
        lockedBy: result.lockedBy,
        message: `This ${data.entityType.toLowerCase()} is being edited by ${result.lockedBy?.name || "another user"}`,
      };
    }

    return {
      success: true,
      lock: result.lock,
    };
  });

/**
 * Release a lock on an entity
 */
export const releaseEditLockFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      entityId: z.string().min(1),
      entityType: entityTypeSchema,
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const released = await releaseEditLock(
      data.entityId,
      data.entityType as TreeEntityType,
      context.userId
    );

    return { success: released };
  });

/**
 * Get all active locks for a tree
 */
export const getTreeLocksFn = createServerFn({
  method: "GET",
})
  .inputValidator(treeIdSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    const locks = await getTreeLocks(data.familyTreeId);

    return locks.map((l: { lock: { entityId: string; entityType: string; expiresAt: Date }; user: { id: string; name: string; image: string | null } }) => ({
      entityId: l.lock.entityId,
      entityType: l.lock.entityType,
      lockedBy: l.user,
      expiresAt: l.lock.expiresAt,
    }));
  });

/**
 * Check if an entity is locked
 */
export const checkEntityLockFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      entityId: z.string().min(1),
      entityType: entityTypeSchema,
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    return isEntityLocked(
      data.entityId,
      data.entityType as TreeEntityType,
      context.userId
    );
  });

// ============================================
// Real-time Collaboration State Query
// ============================================

/**
 * Get full collaboration state for a tree
 * Returns collaborators, locks, and recent activities
 */
export const getCollaborationStateFn = createServerFn({
  method: "GET",
})
  .inputValidator(treeIdSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const [collaborators, locks, activities] = await Promise.all([
      getActiveCollaborators(data.familyTreeId, context.userId),
      getTreeLocks(data.familyTreeId),
      getRecentTreeActivities(data.familyTreeId, 20),
    ]);

    return {
      collaborators: collaborators.map((c: { user: { id: string; name: string; email: string; image: string | null }; session: { status: string; editingEntityId: string | null; editingEntityType: string | null } }) => ({
        user: c.user,
        status: c.session.status,
        editingEntityId: c.session.editingEntityId,
        editingEntityType: c.session.editingEntityType,
      })),
      locks: locks.map((l: { lock: { entityId: string; entityType: string; expiresAt: Date }; user: { id: string; name: string; image: string | null } }) => ({
        entityId: l.lock.entityId,
        entityType: l.lock.entityType,
        lockedBy: l.user,
        expiresAt: l.lock.expiresAt,
      })),
      recentActivities: activities,
    };
  });
