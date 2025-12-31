import { auth } from "~/utils/auth";
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { isUserAdmin } from "~/data-access/users";
import {
  userHasTreeAccess,
  userCanEditTree,
  userCanManageCollaborators,
  getUserTreeRole,
  userHasPermission,
} from "~/data-access/tree-sharing";
import { isUserFamilyTreeOwner } from "~/data-access/family-trees";
import {
  type Permission,
  type TreeRole,
  PERMISSIONS,
  CAN,
} from "~/lib/role-permissions";

async function getAuthenticatedUserId(): Promise<string> {
  const request = getRequest();

  if (!request?.headers) {
    throw new Error("No headers");
  }
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    throw new Error("No session");
  }

  return session.user.id;
}

export const authenticatedMiddleware = createMiddleware({
  type: "function",
}).server(async ({ next }) => {
  const userId = await getAuthenticatedUserId();

  return next({
    context: { userId },
  });
});

export const assertAdminMiddleware = createMiddleware({
  type: "function",
}).server(async ({ next }) => {
  const userId = await getAuthenticatedUserId();

  const adminCheck = await isUserAdmin(userId);
  if (!adminCheck) {
    throw new Error("Unauthorized: Only admins can perform this action");
  }

  return next({
    context: { userId },
  });
});

// ============================================
// Tree Permission Middleware
// ============================================

// Helper to get tree ID from request data
function getTreeIdFromData(data: unknown): string | null {
  if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>;
    if (typeof obj.familyTreeId === "string") return obj.familyTreeId;
    if (typeof obj.treeId === "string") return obj.treeId;
  }
  return null;
}

// Middleware that checks if user has view access to a tree
export const treeViewAccessMiddleware = createMiddleware({
  type: "function",
}).server(async ({ next, data }) => {
  const userId = await getAuthenticatedUserId();
  const treeId = getTreeIdFromData(data);

  if (!treeId) {
    throw new Error("Tree ID is required");
  }

  const hasAccess = await userHasTreeAccess(userId, treeId);
  if (!hasAccess) {
    throw new Error("You do not have access to this tree");
  }

  const role = await getUserTreeRole(userId, treeId);

  return next({
    context: { userId, treeId, role },
  });
});

// Middleware that checks if user can edit a tree
export const treeEditAccessMiddleware = createMiddleware({
  type: "function",
}).server(async ({ next, data }) => {
  const userId = await getAuthenticatedUserId();
  const treeId = getTreeIdFromData(data);

  if (!treeId) {
    throw new Error("Tree ID is required");
  }

  const canEdit = await userCanEditTree(userId, treeId);
  if (!canEdit) {
    throw new Error("You do not have permission to edit this tree");
  }

  const role = await getUserTreeRole(userId, treeId);

  return next({
    context: { userId, treeId, role },
  });
});

// Middleware that checks if user can manage collaborators
export const treeManageAccessMiddleware = createMiddleware({
  type: "function",
}).server(async ({ next, data }) => {
  const userId = await getAuthenticatedUserId();
  const treeId = getTreeIdFromData(data);

  if (!treeId) {
    throw new Error("Tree ID is required");
  }

  const canManage = await userCanManageCollaborators(userId, treeId);
  if (!canManage) {
    throw new Error("You do not have permission to manage this tree");
  }

  const role = await getUserTreeRole(userId, treeId);

  return next({
    context: { userId, treeId, role },
  });
});

// Middleware that checks if user is the tree owner
export const treeOwnerMiddleware = createMiddleware({
  type: "function",
}).server(async ({ next, data }) => {
  const userId = await getAuthenticatedUserId();
  const treeId = getTreeIdFromData(data);

  if (!treeId) {
    throw new Error("Tree ID is required");
  }

  const isOwner = await isUserFamilyTreeOwner(userId, treeId);
  if (!isOwner) {
    throw new Error("Only the tree owner can perform this action");
  }

  return next({
    context: { userId, treeId, role: "owner" as const },
  });
});

// ============================================
// Permission-Based Middleware Factory
// ============================================

/**
 * Create a middleware that checks if the user has a specific permission
 * @param permission - The permission to check
 * @param errorMessage - Custom error message (optional)
 */
export function createPermissionMiddleware(
  permission: Permission,
  errorMessage?: string
) {
  return createMiddleware({
    type: "function",
  }).server(async ({ next, data }) => {
    const userId = await getAuthenticatedUserId();
    const treeId = getTreeIdFromData(data);

    if (!treeId) {
      throw new Error("Tree ID is required");
    }

    const hasPermissionResult = await userHasPermission(userId, treeId, permission);
    if (!hasPermissionResult) {
      throw new Error(
        errorMessage || `You do not have permission to perform this action (requires: ${permission})`
      );
    }

    const role = await getUserTreeRole(userId, treeId);

    return next({
      context: { userId, treeId, role },
    });
  });
}

// Pre-built permission middlewares for common operations
export const treeMemberCreateMiddleware = createPermissionMiddleware(
  PERMISSIONS.CREATE_MEMBER,
  "You do not have permission to create members in this tree"
);

export const treeMemberEditMiddleware = createPermissionMiddleware(
  PERMISSIONS.EDIT_MEMBER,
  "You do not have permission to edit members in this tree"
);

export const treeMemberDeleteMiddleware = createPermissionMiddleware(
  PERMISSIONS.DELETE_MEMBER,
  "You do not have permission to delete members in this tree"
);

export const treeRelationshipCreateMiddleware = createPermissionMiddleware(
  PERMISSIONS.CREATE_RELATIONSHIP,
  "You do not have permission to create relationships in this tree"
);

export const treeRelationshipEditMiddleware = createPermissionMiddleware(
  PERMISSIONS.EDIT_RELATIONSHIP,
  "You do not have permission to edit relationships in this tree"
);

export const treeRelationshipDeleteMiddleware = createPermissionMiddleware(
  PERMISSIONS.DELETE_RELATIONSHIP,
  "You do not have permission to delete relationships in this tree"
);

export const treeMediaUploadMiddleware = createPermissionMiddleware(
  PERMISSIONS.UPLOAD_MEDIA,
  "You do not have permission to upload media in this tree"
);

export const treeMediaDeleteMiddleware = createPermissionMiddleware(
  PERMISSIONS.DELETE_MEDIA,
  "You do not have permission to delete media in this tree"
);

export const treeStoryCreateMiddleware = createPermissionMiddleware(
  PERMISSIONS.CREATE_STORY,
  "You do not have permission to create stories in this tree"
);

export const treeStoryEditMiddleware = createPermissionMiddleware(
  PERMISSIONS.EDIT_STORY,
  "You do not have permission to edit stories in this tree"
);

export const treeStoryDeleteMiddleware = createPermissionMiddleware(
  PERMISSIONS.DELETE_STORY,
  "You do not have permission to delete stories in this tree"
);

export const treeBulkImportMiddleware = createPermissionMiddleware(
  PERMISSIONS.BULK_IMPORT,
  "You do not have permission to bulk import in this tree"
);

export const treeExportMiddleware = createPermissionMiddleware(
  PERMISSIONS.EXPORT_TREE,
  "You do not have permission to export this tree"
);

export const treeRevertVersionMiddleware = createPermissionMiddleware(
  PERMISSIONS.REVERT_TO_VERSION,
  "You do not have permission to revert this tree to a previous version"
);

export const treeSettingsMiddleware = createPermissionMiddleware(
  PERMISSIONS.EDIT_TREE_SETTINGS,
  "You do not have permission to edit this tree's settings"
);

export const treeDeleteMiddleware = createPermissionMiddleware(
  PERMISSIONS.DELETE_TREE,
  "You do not have permission to delete this tree"
);
