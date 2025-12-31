import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  updateTreePrivacyLevel,
  getTreePrivacySettings,
  getTreeCollaborators,
  addTreeCollaborator,
  updateTreeCollaborator,
  removeTreeCollaborator,
  acceptCollaboratorInvitation,
  canUserManageCollaborators,
  getUserTreeAccessLevel,
  getAccessibleTrees,
  getPendingInvitations,
  findUserByEmail,
  findTreeCollaboratorByUserAndTree,
  findTreeCollaboratorById,
} from "~/data-access/tree-privacy";
import { findFamilyTreeById, isUserFamilyTreeOwner } from "~/data-access/family-trees";

// Privacy level options
export const TREE_PRIVACY_LEVELS = ["private", "family", "public"] as const;
export const COLLABORATOR_ROLES = ["viewer", "editor", "admin"] as const;

// ============================================
// Tree Privacy Level Functions
// ============================================

// Update tree privacy level (owner only)
export const updateTreePrivacyLevelFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      treeId: z.string(),
      privacyLevel: z.enum(TREE_PRIVACY_LEVELS),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { treeId, privacyLevel } = data;

    // Verify user is the owner
    const isOwner = await isUserFamilyTreeOwner(context.userId, treeId);
    if (!isOwner) {
      throw new Error("Unauthorized: Only the tree owner can change privacy settings");
    }

    const updatedTree = await updateTreePrivacyLevel(treeId, privacyLevel);
    if (!updatedTree) {
      throw new Error("Failed to update tree privacy level");
    }

    return updatedTree;
  });

// Get tree privacy settings
export const getTreePrivacySettingsFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ treeId: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { treeId } = data;

    // Check if user has at least view access
    const accessLevel = await getUserTreeAccessLevel(context.userId, treeId);
    if (!accessLevel.canView) {
      throw new Error("Unauthorized: You don't have access to this tree");
    }

    const settings = await getTreePrivacySettings(treeId);
    if (!settings) {
      throw new Error("Tree not found");
    }

    return settings;
  });

// Get user's access level for a tree
export const getUserTreeAccessLevelFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ treeId: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const accessLevel = await getUserTreeAccessLevel(context.userId, data.treeId);
    return accessLevel;
  });

// ============================================
// Tree Collaborator Functions
// ============================================

// Get all collaborators for a tree
export const getTreeCollaboratorsFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ treeId: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { treeId } = data;

    // Check if user can manage collaborators or is a collaborator themselves
    const accessLevel = await getUserTreeAccessLevel(context.userId, treeId);
    if (!accessLevel.canView) {
      throw new Error("Unauthorized: You don't have access to this tree");
    }

    const collaborators = await getTreeCollaborators(treeId);
    return collaborators;
  });

// Add a collaborator by email
export const addTreeCollaboratorFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      treeId: z.string(),
      email: z.string().email("Please enter a valid email address"),
      role: z.enum(COLLABORATOR_ROLES),
      canViewSensitiveInfo: z.boolean().optional().default(true),
      canViewContactInfo: z.boolean().optional().default(false),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { treeId, email, role, canViewSensitiveInfo, canViewContactInfo } = data;

    // Check if user can manage collaborators
    const canManage = await canUserManageCollaborators(context.userId, treeId);
    if (!canManage) {
      throw new Error("Unauthorized: You don't have permission to add collaborators");
    }

    // Find the user by email
    const userToAdd = await findUserByEmail(email);
    if (!userToAdd) {
      throw new Error("User not found. The email address must belong to a registered user.");
    }

    // Check if user is the owner (can't add owner as collaborator)
    const tree = await findFamilyTreeById(treeId);
    if (tree && tree.ownerId === userToAdd.id) {
      throw new Error("Cannot add the tree owner as a collaborator");
    }

    // Check if user is already a collaborator
    const existingCollaborator = await findTreeCollaboratorByUserAndTree(
      userToAdd.id,
      treeId
    );
    if (existingCollaborator) {
      throw new Error("This user is already a collaborator on this tree");
    }

    // Add the collaborator
    const collaborator = await addTreeCollaborator({
      id: crypto.randomUUID(),
      familyTreeId: treeId,
      userId: userToAdd.id,
      role,
      canViewSensitiveInfo,
      canViewContactInfo,
    });

    return {
      collaborator,
      user: userToAdd,
    };
  });

// Update a collaborator's role and permissions
export const updateTreeCollaboratorFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      collaboratorId: z.string(),
      role: z.enum(COLLABORATOR_ROLES).optional(),
      canViewSensitiveInfo: z.boolean().optional(),
      canViewContactInfo: z.boolean().optional(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { collaboratorId, ...updateData } = data;

    // Get the collaborator to find the tree
    const collaborator = await findTreeCollaboratorById(collaboratorId);
    if (!collaborator) {
      throw new Error("Collaborator not found");
    }

    // Check if user can manage collaborators
    const canManage = await canUserManageCollaborators(
      context.userId,
      collaborator.familyTreeId
    );
    if (!canManage) {
      throw new Error("Unauthorized: You don't have permission to update collaborators");
    }

    // Prevent self-demotion from admin
    if (collaborator.userId === context.userId && updateData.role !== "admin") {
      throw new Error("You cannot change your own role");
    }

    const updated = await updateTreeCollaborator(collaboratorId, updateData);
    if (!updated) {
      throw new Error("Failed to update collaborator");
    }

    return updated;
  });

// Remove a collaborator
export const removeTreeCollaboratorFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ collaboratorId: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { collaboratorId } = data;

    // Get the collaborator to find the tree
    const collaborator = await findTreeCollaboratorById(collaboratorId);
    if (!collaborator) {
      throw new Error("Collaborator not found");
    }

    // Allow self-removal or admin removal
    const isSelf = collaborator.userId === context.userId;
    const canManage = await canUserManageCollaborators(
      context.userId,
      collaborator.familyTreeId
    );

    if (!isSelf && !canManage) {
      throw new Error("Unauthorized: You don't have permission to remove collaborators");
    }

    const removed = await removeTreeCollaborator(collaboratorId);
    if (!removed) {
      throw new Error("Failed to remove collaborator");
    }

    return { success: true };
  });

// Accept a collaboration invitation
export const acceptCollaboratorInvitationFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ collaboratorId: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { collaboratorId } = data;

    // Get the collaborator
    const collaborator = await findTreeCollaboratorById(collaboratorId);
    if (!collaborator) {
      throw new Error("Invitation not found");
    }

    // Verify this invitation is for the current user
    if (collaborator.userId !== context.userId) {
      throw new Error("This invitation is not for you");
    }

    // Check if already accepted
    if (collaborator.acceptedAt) {
      throw new Error("This invitation has already been accepted");
    }

    const accepted = await acceptCollaboratorInvitation(collaboratorId);
    if (!accepted) {
      throw new Error("Failed to accept invitation");
    }

    return accepted;
  });

// Decline a collaboration invitation (same as remove)
export const declineCollaboratorInvitationFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ collaboratorId: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { collaboratorId } = data;

    // Get the collaborator
    const collaborator = await findTreeCollaboratorById(collaboratorId);
    if (!collaborator) {
      throw new Error("Invitation not found");
    }

    // Verify this invitation is for the current user
    if (collaborator.userId !== context.userId) {
      throw new Error("This invitation is not for you");
    }

    const removed = await removeTreeCollaborator(collaboratorId);
    if (!removed) {
      throw new Error("Failed to decline invitation");
    }

    return { success: true };
  });

// ============================================
// User Tree Access Functions
// ============================================

// Get all trees user has access to
export const getAccessibleTreesFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const trees = await getAccessibleTrees(context.userId);
    return trees;
  });

// Get pending invitations for current user
export const getPendingInvitationsFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const invitations = await getPendingInvitations(context.userId);
    return invitations;
  });
