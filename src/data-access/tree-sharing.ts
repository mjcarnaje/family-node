import { eq, and, or, isNull, gt, lt } from "drizzle-orm";
import { database } from "~/db";
import {
  treeCollaborator,
  treeAccessInvitation,
  familyTree,
  user,
  type TreeCollaborator,
  type CreateTreeCollaboratorData,
  type UpdateTreeCollaboratorData,
  type TreeAccessInvitation,
  type CreateTreeAccessInvitationData,
  type TreeCollaboratorRole,
} from "~/db/schema";
import {
  type TreeRole,
  type Permission,
  hasPermission,
  PERMISSIONS,
  CAN,
} from "~/lib/role-permissions";

// ============================================
// Tree Collaborator Operations
// ============================================

// Find a collaborator by ID
export async function findCollaboratorById(
  id: string
): Promise<TreeCollaborator | null> {
  const [result] = await database
    .select()
    .from(treeCollaborator)
    .where(eq(treeCollaborator.id, id))
    .limit(1);

  return result || null;
}

// Find a collaborator by tree and user
export async function findCollaboratorByTreeAndUser(
  familyTreeId: string,
  userId: string
): Promise<TreeCollaborator | null> {
  const [result] = await database
    .select()
    .from(treeCollaborator)
    .where(
      and(
        eq(treeCollaborator.familyTreeId, familyTreeId),
        eq(treeCollaborator.userId, userId)
      )
    )
    .limit(1);

  return result || null;
}

// Find all collaborators for a tree
export async function findCollaboratorsByTreeId(
  familyTreeId: string
): Promise<(TreeCollaborator & { user: { id: string; name: string; email: string; image: string | null } })[]> {
  const results = await database
    .select({
      id: treeCollaborator.id,
      familyTreeId: treeCollaborator.familyTreeId,
      userId: treeCollaborator.userId,
      role: treeCollaborator.role,
      canViewSensitiveInfo: treeCollaborator.canViewSensitiveInfo,
      canViewContactInfo: treeCollaborator.canViewContactInfo,
      invitedAt: treeCollaborator.invitedAt,
      acceptedAt: treeCollaborator.acceptedAt,
      createdAt: treeCollaborator.createdAt,
      updatedAt: treeCollaborator.updatedAt,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
    })
    .from(treeCollaborator)
    .innerJoin(user, eq(treeCollaborator.userId, user.id))
    .where(eq(treeCollaborator.familyTreeId, familyTreeId));

  return results;
}

// Find all trees a user has access to (as collaborator)
export async function findTreesUserCanAccess(
  userId: string
): Promise<TreeCollaborator[]> {
  return database
    .select()
    .from(treeCollaborator)
    .where(eq(treeCollaborator.userId, userId));
}

// Create a new collaborator
export async function createCollaborator(
  data: CreateTreeCollaboratorData
): Promise<TreeCollaborator> {
  const [result] = await database
    .insert(treeCollaborator)
    .values(data)
    .returning();

  return result;
}

// Update a collaborator
export async function updateCollaborator(
  id: string,
  data: UpdateTreeCollaboratorData
): Promise<TreeCollaborator | null> {
  const [result] = await database
    .update(treeCollaborator)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(treeCollaborator.id, id))
    .returning();

  return result || null;
}

// Update collaborator role
export async function updateCollaboratorRole(
  familyTreeId: string,
  userId: string,
  role: TreeCollaboratorRole
): Promise<TreeCollaborator | null> {
  const [result] = await database
    .update(treeCollaborator)
    .set({ role, updatedAt: new Date() })
    .where(
      and(
        eq(treeCollaborator.familyTreeId, familyTreeId),
        eq(treeCollaborator.userId, userId)
      )
    )
    .returning();

  return result || null;
}

// Delete a collaborator
export async function deleteCollaborator(id: string): Promise<boolean> {
  const result = await database
    .delete(treeCollaborator)
    .where(eq(treeCollaborator.id, id))
    .returning({ id: treeCollaborator.id });

  return result.length > 0;
}

// Remove a collaborator by tree and user
export async function removeCollaboratorByTreeAndUser(
  familyTreeId: string,
  userId: string
): Promise<boolean> {
  const result = await database
    .delete(treeCollaborator)
    .where(
      and(
        eq(treeCollaborator.familyTreeId, familyTreeId),
        eq(treeCollaborator.userId, userId)
      )
    )
    .returning({ id: treeCollaborator.id });

  return result.length > 0;
}

// Check if a user has access to a tree (owner or collaborator)
export async function userHasTreeAccess(
  userId: string,
  familyTreeId: string
): Promise<boolean> {
  // Check if user is owner
  const [ownerResult] = await database
    .select({ id: familyTree.id })
    .from(familyTree)
    .where(
      and(eq(familyTree.id, familyTreeId), eq(familyTree.ownerId, userId))
    )
    .limit(1);

  if (ownerResult) return true;

  // Check if user is collaborator
  const [collaboratorResult] = await database
    .select({ id: treeCollaborator.id })
    .from(treeCollaborator)
    .where(
      and(
        eq(treeCollaborator.familyTreeId, familyTreeId),
        eq(treeCollaborator.userId, userId)
      )
    )
    .limit(1);

  return !!collaboratorResult;
}

// Get user's role for a tree (returns 'owner', a role, or null)
export async function getUserTreeRole(
  userId: string,
  familyTreeId: string
): Promise<"owner" | TreeCollaboratorRole | null> {
  // Check if user is owner
  const [ownerResult] = await database
    .select({ id: familyTree.id })
    .from(familyTree)
    .where(
      and(eq(familyTree.id, familyTreeId), eq(familyTree.ownerId, userId))
    )
    .limit(1);

  if (ownerResult) return "owner";

  // Check collaborator role
  const [collaboratorResult] = await database
    .select({ role: treeCollaborator.role })
    .from(treeCollaborator)
    .where(
      and(
        eq(treeCollaborator.familyTreeId, familyTreeId),
        eq(treeCollaborator.userId, userId)
      )
    )
    .limit(1);

  return collaboratorResult?.role || null;
}

// Check if user can edit a tree
export async function userCanEditTree(
  userId: string,
  familyTreeId: string
): Promise<boolean> {
  const role = await getUserTreeRole(userId, familyTreeId);
  return CAN.edit(role);
}

// Check if user can manage collaborators (owner or admin)
export async function userCanManageCollaborators(
  userId: string,
  familyTreeId: string
): Promise<boolean> {
  const role = await getUserTreeRole(userId, familyTreeId);
  return CAN.manageCollaborators(role);
}

// ============================================
// Permission-Based Access Checks
// ============================================

/**
 * Check if a user has a specific permission for a tree
 */
export async function userHasPermission(
  userId: string,
  familyTreeId: string,
  permission: Permission
): Promise<boolean> {
  const role = await getUserTreeRole(userId, familyTreeId);
  return hasPermission(role, permission);
}

/**
 * Get all permissions a user has for a tree
 */
export async function getUserTreePermissions(
  userId: string,
  familyTreeId: string
): Promise<{
  role: TreeRole | null;
  canView: boolean;
  canEdit: boolean;
  canManageCollaborators: boolean;
  canDeleteTree: boolean;
  canEditTreeSettings: boolean;
  canCreateMember: boolean;
  canEditMember: boolean;
  canDeleteMember: boolean;
  canCreateRelationship: boolean;
  canEditRelationship: boolean;
  canDeleteRelationship: boolean;
  canUploadMedia: boolean;
  canDeleteMedia: boolean;
  canCreateStory: boolean;
  canEditStory: boolean;
  canDeleteStory: boolean;
  canInviteCollaborators: boolean;
  canRemoveCollaborators: boolean;
  canUpdateCollaboratorRoles: boolean;
  canBulkImport: boolean;
  canExportTree: boolean;
  canRevertToVersion: boolean;
  isOwner: boolean;
}> {
  const role = await getUserTreeRole(userId, familyTreeId);

  return {
    role,
    canView: CAN.viewTree(role),
    canEdit: CAN.edit(role),
    canManageCollaborators: CAN.manageCollaborators(role),
    canDeleteTree: CAN.deleteTree(role),
    canEditTreeSettings: CAN.editTreeSettings(role),
    canCreateMember: CAN.createMember(role),
    canEditMember: CAN.editMember(role),
    canDeleteMember: CAN.deleteMember(role),
    canCreateRelationship: CAN.createRelationship(role),
    canEditRelationship: CAN.editRelationship(role),
    canDeleteRelationship: CAN.deleteRelationship(role),
    canUploadMedia: CAN.uploadMedia(role),
    canDeleteMedia: CAN.deleteMedia(role),
    canCreateStory: CAN.createStory(role),
    canEditStory: CAN.editStory(role),
    canDeleteStory: CAN.deleteStory(role),
    canInviteCollaborators: CAN.inviteCollaborators(role),
    canRemoveCollaborators: CAN.removeCollaborators(role),
    canUpdateCollaboratorRoles: CAN.updateCollaboratorRoles(role),
    canBulkImport: CAN.bulkImport(role),
    canExportTree: CAN.exportTree(role),
    canRevertToVersion: CAN.revertToVersion(role),
    isOwner: role === "owner",
  };
}

// ============================================
// Tree Access Invitation Operations
// ============================================

// Find an invitation by ID
export async function findInvitationById(
  id: string
): Promise<TreeAccessInvitation | null> {
  const [result] = await database
    .select()
    .from(treeAccessInvitation)
    .where(eq(treeAccessInvitation.id, id))
    .limit(1);

  return result || null;
}

// Find valid (not expired, not accepted) invitation by ID
export async function findValidInvitationById(
  id: string
): Promise<TreeAccessInvitation | null> {
  const [result] = await database
    .select()
    .from(treeAccessInvitation)
    .where(
      and(
        eq(treeAccessInvitation.id, id),
        isNull(treeAccessInvitation.acceptedAt),
        gt(treeAccessInvitation.expiresAt, new Date())
      )
    )
    .limit(1);

  return result || null;
}

// Find an invitation by token
export async function findInvitationByToken(
  token: string
): Promise<TreeAccessInvitation | null> {
  const [result] = await database
    .select()
    .from(treeAccessInvitation)
    .where(eq(treeAccessInvitation.token, token))
    .limit(1);

  return result || null;
}

// Find valid (not expired, not accepted) invitation by token
export async function findValidInvitationByToken(
  token: string
): Promise<TreeAccessInvitation | null> {
  const [result] = await database
    .select()
    .from(treeAccessInvitation)
    .where(
      and(
        eq(treeAccessInvitation.token, token),
        isNull(treeAccessInvitation.acceptedAt),
        gt(treeAccessInvitation.expiresAt, new Date())
      )
    )
    .limit(1);

  return result || null;
}

// Find all pending invitations for a tree
export async function findPendingInvitationsByTreeId(
  familyTreeId: string
): Promise<TreeAccessInvitation[]> {
  return database
    .select()
    .from(treeAccessInvitation)
    .where(
      and(
        eq(treeAccessInvitation.familyTreeId, familyTreeId),
        isNull(treeAccessInvitation.acceptedAt),
        gt(treeAccessInvitation.expiresAt, new Date())
      )
    );
}

// Find all invitations for an email
export async function findInvitationsByEmail(
  email: string
): Promise<TreeAccessInvitation[]> {
  return database
    .select()
    .from(treeAccessInvitation)
    .where(
      and(
        eq(treeAccessInvitation.inviteeEmail, email.toLowerCase()),
        isNull(treeAccessInvitation.acceptedAt),
        gt(treeAccessInvitation.expiresAt, new Date())
      )
    );
}

// Create a new invitation
export async function createInvitation(
  data: CreateTreeAccessInvitationData
): Promise<TreeAccessInvitation> {
  const [result] = await database
    .insert(treeAccessInvitation)
    .values({
      ...data,
      inviteeEmail: data.inviteeEmail.toLowerCase(),
    })
    .returning();

  return result;
}

// Mark an invitation as accepted
export async function acceptInvitation(
  id: string
): Promise<TreeAccessInvitation | null> {
  const [result] = await database
    .update(treeAccessInvitation)
    .set({ acceptedAt: new Date() })
    .where(eq(treeAccessInvitation.id, id))
    .returning();

  return result || null;
}

// Delete an invitation
export async function deleteInvitation(id: string): Promise<boolean> {
  const result = await database
    .delete(treeAccessInvitation)
    .where(eq(treeAccessInvitation.id, id))
    .returning({ id: treeAccessInvitation.id });

  return result.length > 0;
}

// Delete expired invitations (cleanup)
export async function deleteExpiredInvitations(): Promise<number> {
  const result = await database
    .delete(treeAccessInvitation)
    .where(
      or(
        // Expired
        and(
          isNull(treeAccessInvitation.acceptedAt),
          lt(treeAccessInvitation.expiresAt, new Date())
        )
      )
    )
    .returning({ id: treeAccessInvitation.id });

  return result.length;
}

// Check if an email already has a pending invitation for a tree
export async function hasPendingInvitation(
  familyTreeId: string,
  email: string
): Promise<boolean> {
  const [result] = await database
    .select({ id: treeAccessInvitation.id })
    .from(treeAccessInvitation)
    .where(
      and(
        eq(treeAccessInvitation.familyTreeId, familyTreeId),
        eq(treeAccessInvitation.inviteeEmail, email.toLowerCase()),
        isNull(treeAccessInvitation.acceptedAt),
        gt(treeAccessInvitation.expiresAt, new Date())
      )
    )
    .limit(1);

  return !!result;
}
