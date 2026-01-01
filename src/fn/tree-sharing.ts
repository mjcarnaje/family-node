import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { randomUUID, randomBytes } from "crypto";
import { authenticatedMiddleware } from "./middleware";
import {
  findCollaboratorsByTreeId,
  findCollaboratorByTreeAndUser,
  createCollaborator,
  updateCollaboratorRole,
  removeCollaboratorByTreeAndUser,
  getUserTreeRole,
  userCanManageCollaborators,
  userHasTreeAccess,
  findPendingInvitationsByTreeId,
  findValidInvitationByToken,
  findValidInvitationById,
  findInvitationsByEmail,
  createInvitation,
  acceptInvitation,
  deleteInvitation,
  hasPendingInvitation,
  getUserTreePermissions,
} from "~/data-access/tree-sharing";
import { findFamilyTreeById, isUserFamilyTreeOwner } from "~/data-access/family-trees";
import { findUserById, findUserByEmail } from "~/data-access/users";
import {
  sendEmail,
  generateInvitationEmailHtml,
  generateInvitationEmailText,
} from "~/lib/email";
import {
  ROLE_INFO,
  COLLABORATOR_ROLES,
  getRolePermissions,
  getAssignableRoles,
  PERMISSION_CATEGORIES,
  getPermissionLabel,
  canAssignRole,
  type TreeRole,
} from "~/lib/role-permissions";

// Generate a unique ID
const generateId = () => randomUUID();

// Generate a secure token for invitations
const generateToken = () => randomBytes(24).toString("hex");

// ============================================
// Collaborator Server Functions
// ============================================

// Get all collaborators for a tree
export const getTreeCollaboratorsFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      familyTreeId: z.string().min(1),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { familyTreeId } = data;

    // Check if user has access to view the tree
    const hasAccess = await userHasTreeAccess(userId, familyTreeId);
    if (!hasAccess) {
      throw new Error("You do not have access to this tree");
    }

    const collaborators = await findCollaboratorsByTreeId(familyTreeId);
    return collaborators;
  });

// Get user's role for a tree
export const getUserTreeRoleFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      familyTreeId: z.string().min(1),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { familyTreeId } = data;

    const role = await getUserTreeRole(userId, familyTreeId);
    return { role };
  });

// Add a collaborator to a tree (for existing users)
export const addCollaboratorFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      familyTreeId: z.string().min(1),
      userId: z.string().min(1),
      role: z.enum(["viewer", "editor", "admin"]),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { userId: currentUserId } = context;
    const { familyTreeId, userId: targetUserId, role } = data;

    // Check if current user can manage collaborators
    const canManage = await userCanManageCollaborators(currentUserId, familyTreeId);
    if (!canManage) {
      throw new Error("You do not have permission to manage collaborators for this tree");
    }

    // Check if target user is already a collaborator
    const existingCollaborator = await findCollaboratorByTreeAndUser(familyTreeId, targetUserId);
    if (existingCollaborator) {
      throw new Error("This user is already a collaborator on this tree");
    }

    // Check if target user is the owner
    const isOwner = await isUserFamilyTreeOwner(targetUserId, familyTreeId);
    if (isOwner) {
      throw new Error("Cannot add the tree owner as a collaborator");
    }

    // Create the collaborator
    const collaborator = await createCollaborator({
      id: generateId(),
      familyTreeId,
      userId: targetUserId,
      role,
      acceptedAt: new Date(), // Direct add is auto-accepted
    });

    return collaborator;
  });

// Update a collaborator's role
export const updateCollaboratorRoleFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      familyTreeId: z.string().min(1),
      userId: z.string().min(1),
      role: z.enum(["viewer", "editor", "admin"]),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { userId: currentUserId } = context;
    const { familyTreeId, userId: targetUserId, role } = data;

    // Check if current user can manage collaborators
    const canManage = await userCanManageCollaborators(currentUserId, familyTreeId);
    if (!canManage) {
      throw new Error("You do not have permission to manage collaborators for this tree");
    }

    // Cannot change own role (unless owner)
    if (currentUserId === targetUserId) {
      const isOwner = await isUserFamilyTreeOwner(currentUserId, familyTreeId);
      if (!isOwner) {
        throw new Error("You cannot change your own role");
      }
    }

    // Update the role
    const updatedCollaborator = await updateCollaboratorRole(familyTreeId, targetUserId, role);
    if (!updatedCollaborator) {
      throw new Error("Collaborator not found");
    }

    return updatedCollaborator;
  });

// Remove a collaborator from a tree
export const removeCollaboratorFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      familyTreeId: z.string().min(1),
      userId: z.string().min(1),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { userId: currentUserId } = context;
    const { familyTreeId, userId: targetUserId } = data;

    // Users can always remove themselves
    if (currentUserId !== targetUserId) {
      // Check if current user can manage collaborators
      const canManage = await userCanManageCollaborators(currentUserId, familyTreeId);
      if (!canManage) {
        throw new Error("You do not have permission to remove collaborators from this tree");
      }
    }

    const removed = await removeCollaboratorByTreeAndUser(familyTreeId, targetUserId);
    if (!removed) {
      throw new Error("Collaborator not found");
    }

    return { success: true };
  });

// ============================================
// Invitation Server Functions
// ============================================

// Get pending invitations for a tree
export const getPendingInvitationsFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      familyTreeId: z.string().min(1),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { familyTreeId } = data;

    // Check if user can manage collaborators
    const canManage = await userCanManageCollaborators(userId, familyTreeId);
    if (!canManage) {
      throw new Error("You do not have permission to view invitations for this tree");
    }

    const invitations = await findPendingInvitationsByTreeId(familyTreeId);
    return invitations;
  });

// Get user's pending invitations
export const getMyPendingInvitationsFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const { userId } = context;

    // Get user's email to find invitations
    const userData = await findUserById(userId);
    if (!userData) {
      return [];
    }

    const invitations = await findInvitationsByEmail(userData.email);

    // Enhance with tree info
    const enhancedInvitations = await Promise.all(
      invitations.map(async (invitation) => {
        const tree = await findFamilyTreeById(invitation.familyTreeId);
        return {
          ...invitation,
          treeName: tree?.name || "Unknown Tree",
        };
      })
    );

    return enhancedInvitations;
  });

// Send an invitation to join a tree (legacy - kept for backwards compatibility)
// Note: Only editor and admin roles are available for invitations
export const sendInvitationFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      familyTreeId: z.string().min(1),
      email: z.string().email(),
      role: z.enum(["editor", "admin"]),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { familyTreeId, email, role } = data;

    // Check if user can manage collaborators
    const canManage = await userCanManageCollaborators(userId, familyTreeId);
    if (!canManage) {
      throw new Error("You do not have permission to invite collaborators to this tree");
    }

    // Check if there's already a pending invitation
    const hasPending = await hasPendingInvitation(familyTreeId, email);
    if (hasPending) {
      throw new Error("An invitation has already been sent to this email");
    }

    // Check if user with this email already has access
    const existingUser = await findUserByEmail(email.toLowerCase());
    if (existingUser) {
      const existingCollaborator = await findCollaboratorByTreeAndUser(familyTreeId, existingUser.id);
      if (existingCollaborator) {
        throw new Error("This user is already a collaborator on this tree");
      }

      const isOwner = await isUserFamilyTreeOwner(existingUser.id, familyTreeId);
      if (isOwner) {
        throw new Error("This email belongs to the tree owner");
      }
    }

    // Create the invitation (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await createInvitation({
      id: generateId(),
      familyTreeId,
      inviteeEmail: email,
      role,
      invitedByUserId: userId,
      token: generateToken(),
      expiresAt,
    });

    // Get inviter and tree info for the email
    const inviter = await findUserById(userId);
    const tree = await findFamilyTreeById(familyTreeId);

    if (inviter && tree) {
      // Build the invitation link
      const baseUrl = process.env.VITE_APP_URL || "http://localhost:3000";
      const invitationLink = `${baseUrl}/invitation/${invitation.token}`;

      // Send invitation email
      const emailData = {
        inviterName: inviter.name,
        treeName: tree.name,
        role: invitation.role,
        invitationLink,
        expiresAt: invitation.expiresAt,
      };

      await sendEmail({
        to: email,
        subject: `${inviter.name} invited you to join "${tree.name}" family tree`,
        html: generateInvitationEmailHtml(emailData),
        text: generateInvitationEmailText(emailData),
      });
    }

    return invitation;
  });

// Create an invite link (without sending email)
// Note: Only editor and admin roles are available for invitations
// Viewing is handled via public links (when tree is public)
export const createInviteLinkFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      familyTreeId: z.string().min(1),
      role: z.enum(["editor", "admin"]),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { familyTreeId, role } = data;

    // Check if user can manage collaborators
    const canManage = await userCanManageCollaborators(userId, familyTreeId);
    if (!canManage) {
      throw new Error("You do not have permission to invite collaborators to this tree");
    }

    // Create the invitation (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await createInvitation({
      id: generateId(),
      familyTreeId,
      inviteeEmail: "", // Empty since this is a link-only invitation
      role,
      invitedByUserId: userId,
      token: generateToken(),
      expiresAt,
    });

    // Build the invitation link
    const baseUrl = process.env.VITE_APP_URL || "http://localhost:3000";
    const invitationLink = `${baseUrl}/invitation/${invitation.token}`;

    return {
      invitation,
      invitationLink,
    };
  });

// Accept an invitation
export const acceptInvitationFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      token: z.string().min(1),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { token } = data;

    // Find the invitation
    const invitation = await findValidInvitationByToken(token);
    if (!invitation) {
      throw new Error("Invalid or expired invitation");
    }

    // Get user data
    const userData = await findUserById(userId);
    if (!userData) {
      throw new Error("User not found");
    }

    // If invitation has a specific email, verify it matches the user's email
    // Link-only invitations have empty email and can be accepted by anyone
    if (invitation.inviteeEmail && invitation.inviteeEmail.toLowerCase() !== userData.email.toLowerCase()) {
      throw new Error("This invitation was sent to a different email address");
    }

    // Check if already a collaborator
    const existingCollaborator = await findCollaboratorByTreeAndUser(invitation.familyTreeId, userId);
    if (existingCollaborator) {
      throw new Error("You are already a collaborator on this tree");
    }

    // Mark invitation as accepted
    await acceptInvitation(invitation.id);

    // Create the collaborator
    const collaborator = await createCollaborator({
      id: generateId(),
      familyTreeId: invitation.familyTreeId,
      userId,
      role: invitation.role,
      acceptedAt: new Date(),
    });

    return collaborator;
  });

// Accept an invitation by ID (for when user is already logged in)
export const acceptInvitationByIdFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      invitationId: z.string().min(1),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { invitationId } = data;

    // Find the invitation by ID (not token)
    const invitation = await findValidInvitationById(invitationId);
    if (!invitation) {
      throw new Error("Invalid or expired invitation");
    }

    // Get user data
    const userData = await findUserById(userId);
    if (!userData) {
      throw new Error("User not found");
    }

    // If invitation has a specific email, verify it matches the user's email
    // Link-only invitations have empty email and can be accepted by anyone
    if (invitation.inviteeEmail && invitation.inviteeEmail.toLowerCase() !== userData.email.toLowerCase()) {
      throw new Error("This invitation was sent to a different email address");
    }

    // Check if already a collaborator
    const existingCollaborator = await findCollaboratorByTreeAndUser(invitation.familyTreeId, userId);
    if (existingCollaborator) {
      throw new Error("You are already a collaborator on this tree");
    }

    // Mark invitation as accepted
    await acceptInvitation(invitation.id);

    // Create the collaborator
    const collaborator = await createCollaborator({
      id: generateId(),
      familyTreeId: invitation.familyTreeId,
      userId,
      role: invitation.role,
      acceptedAt: new Date(),
    });

    return collaborator;
  });

// Cancel/delete an invitation by token
export const cancelInvitationFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      token: z.string().min(1),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { token } = data;

    // Find the invitation by token
    const invitation = await findValidInvitationByToken(token);
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    // Check if user can manage collaborators
    const canManage = await userCanManageCollaborators(userId, invitation.familyTreeId);
    if (!canManage) {
      throw new Error("You do not have permission to cancel this invitation");
    }

    const deleted = await deleteInvitation(invitation.id);
    if (!deleted) {
      throw new Error("Failed to cancel invitation");
    }

    return { success: true };
  });

// ============================================
// Permission Check Server Functions
// ============================================

// Check if user has access to a tree (with full permissions info)
export const checkTreeAccessFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      familyTreeId: z.string().min(1),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { familyTreeId } = data;

    const hasAccess = await userHasTreeAccess(userId, familyTreeId);

    if (!hasAccess) {
      return {
        hasAccess: false,
        role: null,
        roleInfo: null,
        canEdit: false,
        canManage: false,
        isOwner: false,
        permissions: null,
      };
    }

    const permissions = await getUserTreePermissions(userId, familyTreeId);
    const roleInfo = permissions.role ? ROLE_INFO[permissions.role] : null;

    return {
      hasAccess: true,
      role: permissions.role,
      roleInfo,
      canEdit: permissions.canEdit,
      canManage: permissions.canManageCollaborators,
      isOwner: permissions.isOwner,
      permissions,
    };
  });

// Get invitation details by token (public - no auth required)
export const getInvitationByTokenFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      token: z.string().min(1),
    })
  )
  .handler(async ({ data }) => {
    const { token } = data;

    // Find the invitation
    const invitation = await findValidInvitationByToken(token);
    if (!invitation) {
      return null;
    }

    // Get tree and inviter info
    const tree = await findFamilyTreeById(invitation.familyTreeId);
    const inviter = await findUserById(invitation.invitedByUserId);

    return {
      id: invitation.id,
      token: invitation.token,
      role: invitation.role,
      inviteeEmail: invitation.inviteeEmail,
      expiresAt: invitation.expiresAt,
      treeName: tree?.name || "Unknown Tree",
      treeDescription: tree?.description || null,
      inviterName: inviter?.name || "Someone",
    };
  });

// ============================================
// Role Permission Server Functions
// ============================================

// Get all role information for display
export const getRoleInfoFn = createServerFn({
  method: "GET",
}).handler(async () => {
  return {
    roles: COLLABORATOR_ROLES.map((role) => ({
      value: role,
      ...ROLE_INFO[role],
      permissions: getRolePermissions(role),
    })),
    ownerInfo: {
      value: "owner" as const,
      ...ROLE_INFO.owner,
      permissions: getRolePermissions("owner"),
    },
    permissionCategories: PERMISSION_CATEGORIES.map((category) => ({
      ...category,
      permissions: category.permissions.map((perm) => ({
        value: perm,
        label: getPermissionLabel(perm),
      })),
    })),
  };
});

// Get user's detailed permissions for a tree
export const getTreePermissionsFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      familyTreeId: z.string().min(1),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { familyTreeId } = data;

    const permissions = await getUserTreePermissions(userId, familyTreeId);

    // Include role info for UI display
    const roleInfo = permissions.role ? ROLE_INFO[permissions.role] : null;

    return {
      ...permissions,
      roleInfo,
      assignableRoles: getAssignableRoles(permissions.role),
    };
  });

// Check if current user can assign a specific role
export const canAssignRoleFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      familyTreeId: z.string().min(1),
      targetRole: z.enum(["viewer", "editor", "admin"]),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { familyTreeId, targetRole } = data;

    const currentRole = await getUserTreeRole(userId, familyTreeId);

    return {
      canAssign: canAssignRole(currentRole, targetRole),
      currentRole,
      targetRole,
    };
  });
