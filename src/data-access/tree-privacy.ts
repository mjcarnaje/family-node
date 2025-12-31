import { eq, and, or } from "drizzle-orm";
import { database } from "~/db";
import {
  familyTree,
  treeCollaborator,
  user,
  type FamilyTree,
  type TreeCollaborator,
  type CreateTreeCollaboratorData,
  type UpdateTreeCollaboratorData,
  type TreePrivacyLevel,
  type TreeCollaboratorRole,
} from "~/db/schema";

// ============================================
// Tree Privacy Level Operations
// ============================================

// Update tree privacy level
export async function updateTreePrivacyLevel(
  treeId: string,
  privacyLevel: TreePrivacyLevel
): Promise<FamilyTree | null> {
  const [result] = await database
    .update(familyTree)
    .set({
      privacyLevel,
      // Also update isPublic for backwards compatibility
      isPublic: privacyLevel === "public",
      updatedAt: new Date(),
    })
    .where(eq(familyTree.id, treeId))
    .returning();

  return result || null;
}

// Get tree privacy settings
export async function getTreePrivacySettings(
  treeId: string
): Promise<{ privacyLevel: TreePrivacyLevel; isPublic: boolean } | null> {
  const [result] = await database
    .select({
      privacyLevel: familyTree.privacyLevel,
      isPublic: familyTree.isPublic,
    })
    .from(familyTree)
    .where(eq(familyTree.id, treeId))
    .limit(1);

  return result || null;
}

// ============================================
// Tree Collaborator Operations
// ============================================

// Find a collaborator by ID
export async function findTreeCollaboratorById(
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
export async function findTreeCollaboratorByUserAndTree(
  userId: string,
  familyTreeId: string
): Promise<TreeCollaborator | null> {
  const [result] = await database
    .select()
    .from(treeCollaborator)
    .where(
      and(
        eq(treeCollaborator.userId, userId),
        eq(treeCollaborator.familyTreeId, familyTreeId)
      )
    )
    .limit(1);

  return result || null;
}

// Get all collaborators for a tree with user information
export async function getTreeCollaborators(familyTreeId: string): Promise<
  Array<{
    id: string;
    userId: string;
    role: TreeCollaboratorRole;
    canViewSensitiveInfo: boolean;
    canViewContactInfo: boolean;
    invitedAt: Date;
    acceptedAt: Date | null;
    user: {
      id: string;
      name: string;
      email: string;
      image: string | null;
    };
  }>
> {
  const results = await database
    .select({
      id: treeCollaborator.id,
      userId: treeCollaborator.userId,
      role: treeCollaborator.role,
      canViewSensitiveInfo: treeCollaborator.canViewSensitiveInfo,
      canViewContactInfo: treeCollaborator.canViewContactInfo,
      invitedAt: treeCollaborator.invitedAt,
      acceptedAt: treeCollaborator.acceptedAt,
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

// Add a collaborator to a tree
export async function addTreeCollaborator(
  data: CreateTreeCollaboratorData
): Promise<TreeCollaborator> {
  const [result] = await database
    .insert(treeCollaborator)
    .values(data)
    .returning();

  return result;
}

// Update a collaborator's role and permissions
export async function updateTreeCollaborator(
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

// Remove a collaborator from a tree
export async function removeTreeCollaborator(id: string): Promise<boolean> {
  const result = await database
    .delete(treeCollaborator)
    .where(eq(treeCollaborator.id, id))
    .returning({ id: treeCollaborator.id });

  return result.length > 0;
}

// Accept a collaboration invitation
export async function acceptCollaboratorInvitation(
  id: string
): Promise<TreeCollaborator | null> {
  const [result] = await database
    .update(treeCollaborator)
    .set({
      acceptedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(treeCollaborator.id, id))
    .returning();

  return result || null;
}

// ============================================
// Access Control Checks
// ============================================

// Check if a user can view a tree
export async function canUserViewTree(
  userId: string | null,
  treeId: string
): Promise<boolean> {
  const [tree] = await database
    .select({
      ownerId: familyTree.ownerId,
      privacyLevel: familyTree.privacyLevel,
    })
    .from(familyTree)
    .where(eq(familyTree.id, treeId))
    .limit(1);

  if (!tree) return false;

  // Public trees can be viewed by anyone
  if (tree.privacyLevel === "public") return true;

  // If no user is logged in, only public trees are viewable
  if (!userId) return false;

  // Owner can always view
  if (tree.ownerId === userId) return true;

  // For family privacy, check if user is a collaborator
  if (tree.privacyLevel === "family") {
    const collaborator = await findTreeCollaboratorByUserAndTree(userId, treeId);
    return collaborator !== null && collaborator.acceptedAt !== null;
  }

  // Private trees only viewable by owner
  return false;
}

// Check if a user can edit a tree (add/modify members)
export async function canUserEditTree(
  userId: string,
  treeId: string
): Promise<boolean> {
  const [tree] = await database
    .select({
      ownerId: familyTree.ownerId,
    })
    .from(familyTree)
    .where(eq(familyTree.id, treeId))
    .limit(1);

  if (!tree) return false;

  // Owner can always edit
  if (tree.ownerId === userId) return true;

  // Check if user is a collaborator with edit permissions
  const collaborator = await findTreeCollaboratorByUserAndTree(userId, treeId);
  if (!collaborator || collaborator.acceptedAt === null) return false;

  return collaborator.role === "editor" || collaborator.role === "admin";
}

// Check if a user can manage collaborators (add/remove other collaborators)
export async function canUserManageCollaborators(
  userId: string,
  treeId: string
): Promise<boolean> {
  const [tree] = await database
    .select({
      ownerId: familyTree.ownerId,
    })
    .from(familyTree)
    .where(eq(familyTree.id, treeId))
    .limit(1);

  if (!tree) return false;

  // Owner can always manage collaborators
  if (tree.ownerId === userId) return true;

  // Check if user is an admin collaborator
  const collaborator = await findTreeCollaboratorByUserAndTree(userId, treeId);
  if (!collaborator || collaborator.acceptedAt === null) return false;

  return collaborator.role === "admin";
}

// Get user's access level for a tree
export async function getUserTreeAccessLevel(
  userId: string | null,
  treeId: string
): Promise<{
  canView: boolean;
  canEdit: boolean;
  canManageCollaborators: boolean;
  isOwner: boolean;
  role: TreeCollaboratorRole | "owner" | "public" | null;
  canViewSensitiveInfo: boolean;
  canViewContactInfo: boolean;
}> {
  const defaultAccess = {
    canView: false,
    canEdit: false,
    canManageCollaborators: false,
    isOwner: false,
    role: null as TreeCollaboratorRole | "owner" | "public" | null,
    canViewSensitiveInfo: false,
    canViewContactInfo: false,
  };

  const [tree] = await database
    .select({
      ownerId: familyTree.ownerId,
      privacyLevel: familyTree.privacyLevel,
    })
    .from(familyTree)
    .where(eq(familyTree.id, treeId))
    .limit(1);

  if (!tree) return defaultAccess;

  // Public trees: anyone can view
  if (tree.privacyLevel === "public") {
    if (!userId) {
      return {
        ...defaultAccess,
        canView: true,
        role: "public",
      };
    }
  }

  // If no user, only public view is available
  if (!userId) return defaultAccess;

  // Owner has full access
  if (tree.ownerId === userId) {
    return {
      canView: true,
      canEdit: true,
      canManageCollaborators: true,
      isOwner: true,
      role: "owner",
      canViewSensitiveInfo: true,
      canViewContactInfo: true,
    };
  }

  // Check collaborator access
  const collaborator = await findTreeCollaboratorByUserAndTree(userId, treeId);

  if (collaborator && collaborator.acceptedAt !== null) {
    return {
      canView: true,
      canEdit: collaborator.role === "editor" || collaborator.role === "admin",
      canManageCollaborators: collaborator.role === "admin",
      isOwner: false,
      role: collaborator.role,
      canViewSensitiveInfo: collaborator.canViewSensitiveInfo,
      canViewContactInfo: collaborator.canViewContactInfo,
    };
  }

  // For public trees, non-collaborators can only view
  if (tree.privacyLevel === "public") {
    return {
      ...defaultAccess,
      canView: true,
      role: "public",
    };
  }

  return defaultAccess;
}

// Get all trees a user has access to (owned + collaborated)
export async function getAccessibleTrees(userId: string): Promise<
  Array<{
    tree: FamilyTree;
    accessLevel: "owner" | TreeCollaboratorRole;
  }>
> {
  // Get owned trees
  const ownedTrees = await database
    .select()
    .from(familyTree)
    .where(eq(familyTree.ownerId, userId));

  // Get collaborated trees
  const collaborations = await database
    .select({
      tree: familyTree,
      role: treeCollaborator.role,
    })
    .from(treeCollaborator)
    .innerJoin(familyTree, eq(treeCollaborator.familyTreeId, familyTree.id))
    .where(
      and(
        eq(treeCollaborator.userId, userId),
        // Only include accepted invitations
        // Note: acceptedAt is not null check
      )
    );

  const result: Array<{
    tree: FamilyTree;
    accessLevel: "owner" | TreeCollaboratorRole;
  }> = [];

  // Add owned trees
  for (const tree of ownedTrees) {
    result.push({ tree, accessLevel: "owner" });
  }

  // Add collaborated trees (filter out any that might already be in owned)
  const ownedTreeIds = new Set(ownedTrees.map((t) => t.id));
  for (const collab of collaborations) {
    if (!ownedTreeIds.has(collab.tree.id)) {
      result.push({ tree: collab.tree, accessLevel: collab.role });
    }
  }

  return result;
}

// Get pending invitations for a user
export async function getPendingInvitations(userId: string): Promise<
  Array<{
    invitation: TreeCollaborator;
    tree: {
      id: string;
      name: string;
      description: string | null;
    };
    invitedBy: {
      id: string;
      name: string;
      email: string;
    };
  }>
> {
  const results = await database
    .select({
      invitation: treeCollaborator,
      tree: {
        id: familyTree.id,
        name: familyTree.name,
        description: familyTree.description,
      },
      invitedBy: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    })
    .from(treeCollaborator)
    .innerJoin(familyTree, eq(treeCollaborator.familyTreeId, familyTree.id))
    .innerJoin(user, eq(familyTree.ownerId, user.id))
    .where(
      and(
        eq(treeCollaborator.userId, userId),
        // acceptedAt is null means pending
      )
    );

  // Filter to only pending (acceptedAt is null)
  return results.filter((r) => r.invitation.acceptedAt === null);
}

// Find user by email (for inviting collaborators)
export async function findUserByEmail(
  email: string
): Promise<{ id: string; name: string; email: string; image: string | null } | null> {
  const [result] = await database
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  return result || null;
}
