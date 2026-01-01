/**
 * Role-Based Access Control (RBAC) System for Family Tree
 *
 * This module defines the roles and their specific permissions/capabilities
 * for tree members. Each role has a defined set of actions they can perform.
 */

import type { TreeCollaboratorRole } from "~/db/schema";

/**
 * All possible permissions/capabilities in the system
 */
export const PERMISSIONS = {
  // Tree viewing permissions
  VIEW_TREE: "view_tree",
  VIEW_MEMBERS: "view_members",
  VIEW_RELATIONSHIPS: "view_relationships",
  VIEW_MEDIA: "view_media",
  VIEW_STORIES: "view_stories",
  VIEW_TIMELINE: "view_timeline",
  VIEW_COLLABORATORS: "view_collaborators",
  VIEW_CHANGE_HISTORY: "view_change_history",

  // Tree editing permissions
  EDIT_TREE_SETTINGS: "edit_tree_settings",
  DELETE_TREE: "delete_tree",

  // Member permissions
  CREATE_MEMBER: "create_member",
  EDIT_MEMBER: "edit_member",
  DELETE_MEMBER: "delete_member",

  // Relationship permissions
  CREATE_RELATIONSHIP: "create_relationship",
  EDIT_RELATIONSHIP: "edit_relationship",
  DELETE_RELATIONSHIP: "delete_relationship",

  // Marriage connection permissions
  CREATE_MARRIAGE: "create_marriage",
  EDIT_MARRIAGE: "edit_marriage",
  DELETE_MARRIAGE: "delete_marriage",

  // Media permissions
  UPLOAD_MEDIA: "upload_media",
  DELETE_MEDIA: "delete_media",
  EDIT_MEDIA: "edit_media",

  // Story permissions
  CREATE_STORY: "create_story",
  EDIT_STORY: "edit_story",
  DELETE_STORY: "delete_story",

  // Timeline event permissions
  CREATE_TIMELINE_EVENT: "create_timeline_event",
  EDIT_TIMELINE_EVENT: "edit_timeline_event",
  DELETE_TIMELINE_EVENT: "delete_timeline_event",

  // Collaborator management permissions
  INVITE_COLLABORATORS: "invite_collaborators",
  REMOVE_COLLABORATORS: "remove_collaborators",
  UPDATE_COLLABORATOR_ROLES: "update_collaborator_roles",
  CANCEL_INVITATIONS: "cancel_invitations",

  // Import/Export permissions
  BULK_IMPORT: "bulk_import",
  EXPORT_TREE: "export_tree",

  // Version history permissions
  REVERT_TO_VERSION: "revert_to_version",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Extended role type that includes "owner"
 */
export type TreeRole = "owner" | TreeCollaboratorRole;

/**
 * Role hierarchy - higher number means more permissions
 */
export const ROLE_HIERARCHY: Record<TreeRole, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
  owner: 4,
};

/**
 * Role display information
 */
export interface RoleInfo {
  label: string;
  description: string;
  shortDescription: string;
  color: string;
  iconName: "Eye" | "Pencil" | "Shield" | "Crown";
}

export const ROLE_INFO: Record<TreeRole, RoleInfo> = {
  viewer: {
    label: "Viewer",
    description:
      "Can view the family tree, members, relationships, and all content. Cannot make any changes.",
    shortDescription: "View-only access",
    color: "gray",
    iconName: "Eye",
  },
  editor: {
    label: "Editor",
    description:
      "Can view and edit family members, relationships, media, stories, and timeline events. Cannot manage collaborators or tree settings.",
    shortDescription: "Can view and edit content",
    color: "green",
    iconName: "Pencil",
  },
  admin: {
    label: "Admin",
    description:
      "Can view, edit, and manage collaborators. Can invite new members and change their roles. Cannot delete the tree.",
    shortDescription: "Full access except deletion",
    color: "blue",
    iconName: "Shield",
  },
  owner: {
    label: "Owner",
    description:
      "Full control over the family tree including the ability to delete it and transfer ownership.",
    shortDescription: "Full control",
    color: "yellow",
    iconName: "Crown",
  },
};

/**
 * Permissions granted to each role
 */
const ROLE_PERMISSIONS: Record<TreeRole, Permission[]> = {
  viewer: [
    PERMISSIONS.VIEW_TREE,
    PERMISSIONS.VIEW_MEMBERS,
    PERMISSIONS.VIEW_RELATIONSHIPS,
    PERMISSIONS.VIEW_MEDIA,
    PERMISSIONS.VIEW_STORIES,
    PERMISSIONS.VIEW_TIMELINE,
    PERMISSIONS.VIEW_COLLABORATORS,
    PERMISSIONS.VIEW_CHANGE_HISTORY,
    PERMISSIONS.EXPORT_TREE,
  ],
  editor: [
    // All viewer permissions
    PERMISSIONS.VIEW_TREE,
    PERMISSIONS.VIEW_MEMBERS,
    PERMISSIONS.VIEW_RELATIONSHIPS,
    PERMISSIONS.VIEW_MEDIA,
    PERMISSIONS.VIEW_STORIES,
    PERMISSIONS.VIEW_TIMELINE,
    PERMISSIONS.VIEW_COLLABORATORS,
    PERMISSIONS.VIEW_CHANGE_HISTORY,
    PERMISSIONS.EXPORT_TREE,
    // Editor-specific permissions
    PERMISSIONS.CREATE_MEMBER,
    PERMISSIONS.EDIT_MEMBER,
    PERMISSIONS.DELETE_MEMBER,
    PERMISSIONS.CREATE_RELATIONSHIP,
    PERMISSIONS.EDIT_RELATIONSHIP,
    PERMISSIONS.DELETE_RELATIONSHIP,
    PERMISSIONS.CREATE_MARRIAGE,
    PERMISSIONS.EDIT_MARRIAGE,
    PERMISSIONS.DELETE_MARRIAGE,
    PERMISSIONS.UPLOAD_MEDIA,
    PERMISSIONS.DELETE_MEDIA,
    PERMISSIONS.EDIT_MEDIA,
    PERMISSIONS.CREATE_STORY,
    PERMISSIONS.EDIT_STORY,
    PERMISSIONS.DELETE_STORY,
    PERMISSIONS.CREATE_TIMELINE_EVENT,
    PERMISSIONS.EDIT_TIMELINE_EVENT,
    PERMISSIONS.DELETE_TIMELINE_EVENT,
    PERMISSIONS.BULK_IMPORT,
  ],
  admin: [
    // All editor permissions
    PERMISSIONS.VIEW_TREE,
    PERMISSIONS.VIEW_MEMBERS,
    PERMISSIONS.VIEW_RELATIONSHIPS,
    PERMISSIONS.VIEW_MEDIA,
    PERMISSIONS.VIEW_STORIES,
    PERMISSIONS.VIEW_TIMELINE,
    PERMISSIONS.VIEW_COLLABORATORS,
    PERMISSIONS.VIEW_CHANGE_HISTORY,
    PERMISSIONS.EXPORT_TREE,
    PERMISSIONS.CREATE_MEMBER,
    PERMISSIONS.EDIT_MEMBER,
    PERMISSIONS.DELETE_MEMBER,
    PERMISSIONS.CREATE_RELATIONSHIP,
    PERMISSIONS.EDIT_RELATIONSHIP,
    PERMISSIONS.DELETE_RELATIONSHIP,
    PERMISSIONS.CREATE_MARRIAGE,
    PERMISSIONS.EDIT_MARRIAGE,
    PERMISSIONS.DELETE_MARRIAGE,
    PERMISSIONS.UPLOAD_MEDIA,
    PERMISSIONS.DELETE_MEDIA,
    PERMISSIONS.EDIT_MEDIA,
    PERMISSIONS.CREATE_STORY,
    PERMISSIONS.EDIT_STORY,
    PERMISSIONS.DELETE_STORY,
    PERMISSIONS.CREATE_TIMELINE_EVENT,
    PERMISSIONS.EDIT_TIMELINE_EVENT,
    PERMISSIONS.DELETE_TIMELINE_EVENT,
    PERMISSIONS.BULK_IMPORT,
    // Admin-specific permissions
    PERMISSIONS.INVITE_COLLABORATORS,
    PERMISSIONS.REMOVE_COLLABORATORS,
    PERMISSIONS.UPDATE_COLLABORATOR_ROLES,
    PERMISSIONS.CANCEL_INVITATIONS,
    PERMISSIONS.EDIT_TREE_SETTINGS,
    PERMISSIONS.REVERT_TO_VERSION,
  ],
  owner: [
    // All permissions
    PERMISSIONS.VIEW_TREE,
    PERMISSIONS.VIEW_MEMBERS,
    PERMISSIONS.VIEW_RELATIONSHIPS,
    PERMISSIONS.VIEW_MEDIA,
    PERMISSIONS.VIEW_STORIES,
    PERMISSIONS.VIEW_TIMELINE,
    PERMISSIONS.VIEW_COLLABORATORS,
    PERMISSIONS.VIEW_CHANGE_HISTORY,
    PERMISSIONS.EDIT_TREE_SETTINGS,
    PERMISSIONS.DELETE_TREE,
    PERMISSIONS.CREATE_MEMBER,
    PERMISSIONS.EDIT_MEMBER,
    PERMISSIONS.DELETE_MEMBER,
    PERMISSIONS.CREATE_RELATIONSHIP,
    PERMISSIONS.EDIT_RELATIONSHIP,
    PERMISSIONS.DELETE_RELATIONSHIP,
    PERMISSIONS.CREATE_MARRIAGE,
    PERMISSIONS.EDIT_MARRIAGE,
    PERMISSIONS.DELETE_MARRIAGE,
    PERMISSIONS.UPLOAD_MEDIA,
    PERMISSIONS.DELETE_MEDIA,
    PERMISSIONS.EDIT_MEDIA,
    PERMISSIONS.CREATE_STORY,
    PERMISSIONS.EDIT_STORY,
    PERMISSIONS.DELETE_STORY,
    PERMISSIONS.CREATE_TIMELINE_EVENT,
    PERMISSIONS.EDIT_TIMELINE_EVENT,
    PERMISSIONS.DELETE_TIMELINE_EVENT,
    PERMISSIONS.INVITE_COLLABORATORS,
    PERMISSIONS.REMOVE_COLLABORATORS,
    PERMISSIONS.UPDATE_COLLABORATOR_ROLES,
    PERMISSIONS.CANCEL_INVITATIONS,
    PERMISSIONS.BULK_IMPORT,
    PERMISSIONS.EXPORT_TREE,
    PERMISSIONS.REVERT_TO_VERSION,
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: TreeRole | null, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: TreeRole | null, permissions: Permission[]): boolean {
  if (!role) return false;
  return permissions.every((permission) => hasPermission(role, permission));
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: TreeRole | null, permissions: Permission[]): boolean {
  if (!role) return false;
  return permissions.some((permission) => hasPermission(role, permission));
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: TreeRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Get role info
 */
export function getRoleInfo(role: TreeRole): RoleInfo {
  return ROLE_INFO[role];
}

/**
 * Check if a role can assign another role
 * Rules:
 * - Owner can assign any role (viewer, editor, admin)
 * - Admin can only assign viewer and editor roles (not admin)
 * - Editor and Viewer cannot assign roles
 */
export function canAssignRole(
  currentRole: TreeRole | null,
  targetRole: TreeCollaboratorRole
): boolean {
  if (!currentRole) return false;

  // Only owner and admin can assign roles
  if (currentRole !== "owner" && currentRole !== "admin") return false;

  // Owner can assign any role
  if (currentRole === "owner") return true;

  // Admin can only assign viewer and editor, not admin
  if (currentRole === "admin") {
    return targetRole === "viewer" || targetRole === "editor";
  }

  return false;
}

/**
 * Get the roles that a given role can assign
 */
export function getAssignableRoles(currentRole: TreeRole | null): TreeCollaboratorRole[] {
  if (!currentRole) return [];

  if (currentRole === "owner") {
    return ["viewer", "editor", "admin"];
  }

  if (currentRole === "admin") {
    return ["viewer", "editor"];
  }

  return [];
}

/**
 * Check if one role has equal or higher privileges than another
 */
export function hasEqualOrHigherPrivilege(role1: TreeRole | null, role2: TreeRole | null): boolean {
  if (!role1 || !role2) return false;
  return ROLE_HIERARCHY[role1] >= ROLE_HIERARCHY[role2];
}

/**
 * Compare two roles and return which has higher privilege
 * Returns: positive if role1 > role2, negative if role1 < role2, 0 if equal
 */
export function compareRoles(role1: TreeRole | null, role2: TreeRole | null): number {
  const hierarchy1 = role1 ? ROLE_HIERARCHY[role1] : 0;
  const hierarchy2 = role2 ? ROLE_HIERARCHY[role2] : 0;
  return hierarchy1 - hierarchy2;
}

/**
 * Group permissions by category for display
 */
export interface PermissionCategory {
  name: string;
  description: string;
  permissions: Permission[];
}

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    name: "Viewing",
    description: "Permissions related to viewing content",
    permissions: [
      PERMISSIONS.VIEW_TREE,
      PERMISSIONS.VIEW_MEMBERS,
      PERMISSIONS.VIEW_RELATIONSHIPS,
      PERMISSIONS.VIEW_MEDIA,
      PERMISSIONS.VIEW_STORIES,
      PERMISSIONS.VIEW_TIMELINE,
      PERMISSIONS.VIEW_COLLABORATORS,
      PERMISSIONS.VIEW_CHANGE_HISTORY,
    ],
  },
  {
    name: "Members",
    description: "Permissions related to managing family members",
    permissions: [
      PERMISSIONS.CREATE_MEMBER,
      PERMISSIONS.EDIT_MEMBER,
      PERMISSIONS.DELETE_MEMBER,
    ],
  },
  {
    name: "Relationships",
    description: "Permissions related to family relationships",
    permissions: [
      PERMISSIONS.CREATE_RELATIONSHIP,
      PERMISSIONS.EDIT_RELATIONSHIP,
      PERMISSIONS.DELETE_RELATIONSHIP,
      PERMISSIONS.CREATE_MARRIAGE,
      PERMISSIONS.EDIT_MARRIAGE,
      PERMISSIONS.DELETE_MARRIAGE,
    ],
  },
  {
    name: "Media & Stories",
    description: "Permissions related to media and stories",
    permissions: [
      PERMISSIONS.UPLOAD_MEDIA,
      PERMISSIONS.EDIT_MEDIA,
      PERMISSIONS.DELETE_MEDIA,
      PERMISSIONS.CREATE_STORY,
      PERMISSIONS.EDIT_STORY,
      PERMISSIONS.DELETE_STORY,
      PERMISSIONS.CREATE_TIMELINE_EVENT,
      PERMISSIONS.EDIT_TIMELINE_EVENT,
      PERMISSIONS.DELETE_TIMELINE_EVENT,
    ],
  },
  {
    name: "Collaboration",
    description: "Permissions related to managing collaborators",
    permissions: [
      PERMISSIONS.INVITE_COLLABORATORS,
      PERMISSIONS.REMOVE_COLLABORATORS,
      PERMISSIONS.UPDATE_COLLABORATOR_ROLES,
      PERMISSIONS.CANCEL_INVITATIONS,
    ],
  },
  {
    name: "Tree Management",
    description: "Permissions related to tree settings and management",
    permissions: [
      PERMISSIONS.EDIT_TREE_SETTINGS,
      PERMISSIONS.DELETE_TREE,
      PERMISSIONS.BULK_IMPORT,
      PERMISSIONS.EXPORT_TREE,
      PERMISSIONS.REVERT_TO_VERSION,
    ],
  },
];

/**
 * Get human-readable label for a permission
 */
export function getPermissionLabel(permission: Permission): string {
  const labels: Record<Permission, string> = {
    [PERMISSIONS.VIEW_TREE]: "View tree",
    [PERMISSIONS.VIEW_MEMBERS]: "View members",
    [PERMISSIONS.VIEW_RELATIONSHIPS]: "View relationships",
    [PERMISSIONS.VIEW_MEDIA]: "View media",
    [PERMISSIONS.VIEW_STORIES]: "View stories",
    [PERMISSIONS.VIEW_TIMELINE]: "View timeline",
    [PERMISSIONS.VIEW_COLLABORATORS]: "View collaborators",
    [PERMISSIONS.VIEW_CHANGE_HISTORY]: "View change history",
    [PERMISSIONS.EDIT_TREE_SETTINGS]: "Edit tree settings",
    [PERMISSIONS.DELETE_TREE]: "Delete tree",
    [PERMISSIONS.CREATE_MEMBER]: "Create members",
    [PERMISSIONS.EDIT_MEMBER]: "Edit members",
    [PERMISSIONS.DELETE_MEMBER]: "Delete members",
    [PERMISSIONS.CREATE_RELATIONSHIP]: "Create relationships",
    [PERMISSIONS.EDIT_RELATIONSHIP]: "Edit relationships",
    [PERMISSIONS.DELETE_RELATIONSHIP]: "Delete relationships",
    [PERMISSIONS.CREATE_MARRIAGE]: "Create marriages",
    [PERMISSIONS.EDIT_MARRIAGE]: "Edit marriages",
    [PERMISSIONS.DELETE_MARRIAGE]: "Delete marriages",
    [PERMISSIONS.UPLOAD_MEDIA]: "Upload media",
    [PERMISSIONS.DELETE_MEDIA]: "Delete media",
    [PERMISSIONS.EDIT_MEDIA]: "Edit media",
    [PERMISSIONS.CREATE_STORY]: "Create stories",
    [PERMISSIONS.EDIT_STORY]: "Edit stories",
    [PERMISSIONS.DELETE_STORY]: "Delete stories",
    [PERMISSIONS.CREATE_TIMELINE_EVENT]: "Create timeline events",
    [PERMISSIONS.EDIT_TIMELINE_EVENT]: "Edit timeline events",
    [PERMISSIONS.DELETE_TIMELINE_EVENT]: "Delete timeline events",
    [PERMISSIONS.INVITE_COLLABORATORS]: "Invite collaborators",
    [PERMISSIONS.REMOVE_COLLABORATORS]: "Remove collaborators",
    [PERMISSIONS.UPDATE_COLLABORATOR_ROLES]: "Update collaborator roles",
    [PERMISSIONS.CANCEL_INVITATIONS]: "Cancel invitations",
    [PERMISSIONS.BULK_IMPORT]: "Bulk import",
    [PERMISSIONS.EXPORT_TREE]: "Export tree",
    [PERMISSIONS.REVERT_TO_VERSION]: "Revert to previous version",
  };
  return labels[permission] ?? permission;
}

/**
 * Get all available collaborator roles (excludes "owner" since it's not assignable)
 */
export const COLLABORATOR_ROLES: TreeCollaboratorRole[] = ["viewer", "editor", "admin"];

/**
 * Roles available for invitations (excludes "viewer" - public viewing is via public link)
 */
export const INVITE_ROLES: TreeCollaboratorRole[] = ["editor", "admin"];

/**
 * Type for invite roles (editor or admin only)
 */
export type InviteRole = "editor" | "admin";

/**
 * Utility object with common permission checks for convenience
 */
export const CAN = {
  // Viewing
  viewTree: (role: TreeRole | null) => hasPermission(role, PERMISSIONS.VIEW_TREE),
  viewMembers: (role: TreeRole | null) => hasPermission(role, PERMISSIONS.VIEW_MEMBERS),
  viewRelationships: (role: TreeRole | null) => hasPermission(role, PERMISSIONS.VIEW_RELATIONSHIPS),
  viewMedia: (role: TreeRole | null) => hasPermission(role, PERMISSIONS.VIEW_MEDIA),
  viewStories: (role: TreeRole | null) => hasPermission(role, PERMISSIONS.VIEW_STORIES),
  viewTimeline: (role: TreeRole | null) => hasPermission(role, PERMISSIONS.VIEW_TIMELINE),
  viewCollaborators: (role: TreeRole | null) => hasPermission(role, PERMISSIONS.VIEW_COLLABORATORS),
  viewChangeHistory: (role: TreeRole | null) => hasPermission(role, PERMISSIONS.VIEW_CHANGE_HISTORY),

  // Tree management
  editTreeSettings: (role: TreeRole | null) => hasPermission(role, PERMISSIONS.EDIT_TREE_SETTINGS),
  deleteTree: (role: TreeRole | null) => hasPermission(role, PERMISSIONS.DELETE_TREE),

  // Members
  createMember: (role: TreeRole | null) => hasPermission(role, PERMISSIONS.CREATE_MEMBER),
  editMember: (role: TreeRole | null) => hasPermission(role, PERMISSIONS.EDIT_MEMBER),
  deleteMember: (role: TreeRole | null) => hasPermission(role, PERMISSIONS.DELETE_MEMBER),

  // Relationships
  createRelationship: (role: TreeRole | null) => hasPermission(role, PERMISSIONS.CREATE_RELATIONSHIP),
  editRelationship: (role: TreeRole | null) => hasPermission(role, PERMISSIONS.EDIT_RELATIONSHIP),
  deleteRelationship: (role: TreeRole | null) => hasPermission(role, PERMISSIONS.DELETE_RELATIONSHIP),

  // Marriages
  createMarriage: (role: TreeRole | null) => hasPermission(role, PERMISSIONS.CREATE_MARRIAGE),
  editMarriage: (role: TreeRole | null) => hasPermission(role, PERMISSIONS.EDIT_MARRIAGE),
  deleteMarriage: (role: TreeRole | null) => hasPermission(role, PERMISSIONS.DELETE_MARRIAGE),

  // Media
  uploadMedia: (role: TreeRole | null) => hasPermission(role, PERMISSIONS.UPLOAD_MEDIA),
  editMedia: (role: TreeRole | null) => hasPermission(role, PERMISSIONS.EDIT_MEDIA),
  deleteMedia: (role: TreeRole | null) => hasPermission(role, PERMISSIONS.DELETE_MEDIA),

  // Stories
  createStory: (role: TreeRole | null) => hasPermission(role, PERMISSIONS.CREATE_STORY),
  editStory: (role: TreeRole | null) => hasPermission(role, PERMISSIONS.EDIT_STORY),
  deleteStory: (role: TreeRole | null) => hasPermission(role, PERMISSIONS.DELETE_STORY),

  // Timeline events
  createTimelineEvent: (role: TreeRole | null) => hasPermission(role, PERMISSIONS.CREATE_TIMELINE_EVENT),
  editTimelineEvent: (role: TreeRole | null) => hasPermission(role, PERMISSIONS.EDIT_TIMELINE_EVENT),
  deleteTimelineEvent: (role: TreeRole | null) => hasPermission(role, PERMISSIONS.DELETE_TIMELINE_EVENT),

  // Collaborators
  inviteCollaborators: (role: TreeRole | null) => hasPermission(role, PERMISSIONS.INVITE_COLLABORATORS),
  removeCollaborators: (role: TreeRole | null) => hasPermission(role, PERMISSIONS.REMOVE_COLLABORATORS),
  updateCollaboratorRoles: (role: TreeRole | null) => hasPermission(role, PERMISSIONS.UPDATE_COLLABORATOR_ROLES),
  cancelInvitations: (role: TreeRole | null) => hasPermission(role, PERMISSIONS.CANCEL_INVITATIONS),

  // Import/Export
  bulkImport: (role: TreeRole | null) => hasPermission(role, PERMISSIONS.BULK_IMPORT),
  exportTree: (role: TreeRole | null) => hasPermission(role, PERMISSIONS.EXPORT_TREE),
  revertToVersion: (role: TreeRole | null) => hasPermission(role, PERMISSIONS.REVERT_TO_VERSION),

  // Combined checks for common operations
  edit: (role: TreeRole | null) =>
    hasAnyPermission(role, [
      PERMISSIONS.EDIT_MEMBER,
      PERMISSIONS.CREATE_MEMBER,
      PERMISSIONS.CREATE_RELATIONSHIP,
    ]),
  manageCollaborators: (role: TreeRole | null) =>
    hasAnyPermission(role, [
      PERMISSIONS.INVITE_COLLABORATORS,
      PERMISSIONS.REMOVE_COLLABORATORS,
      PERMISSIONS.UPDATE_COLLABORATOR_ROLES,
    ]),
};
