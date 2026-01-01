import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { randomBytes, createHash } from "crypto";
import { findFamilyTreeById, findFamilyTreeByPublicSlug, updateFamilyTree } from "~/data-access/family-trees";
import { findFamilyMembersByTreeId } from "~/data-access/family-members";
import { findParentChildRelationshipsByTreeId } from "~/data-access/parent-child-relationships";
import { findMarriageConnectionsByTreeId } from "~/data-access/marriage-connections";
import { authenticatedMiddleware } from "./middleware";
import { isUserFamilyTreeOwner } from "~/data-access/family-trees";
import type {
  FamilyMember,
  FamilyTree,
  ParentChildRelationship,
  MarriageConnection,
} from "~/db/schema";

// Generate a unique public slug
const generatePublicSlug = () => randomBytes(8).toString("hex");

// Hash a PIN for secure storage
const hashPin = (pin: string) => createHash("sha256").update(pin).digest("hex");

// Verify a PIN against the stored hash
const verifyPin = (pin: string, hashedPin: string) => hashPin(pin) === hashedPin;

// Types for public tree visualization data
export interface PublicTreeVisualizationData {
  tree: FamilyTree;
  members: FamilyMember[];
  relationships: ParentChildRelationship[];
  marriages: MarriageConnection[];
  treeName: string;
  treeDescription: string | null;
  ownerName: string | null;
}

/**
 * Get public family tree data - no authentication required
 * Only returns data if the tree's privacy level is "public"
 */
export const getPublicFamilyTreeFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({ familyTreeId: z.string().min(1, "Family tree ID is required") })
  )
  .handler(async ({ data }): Promise<PublicTreeVisualizationData> => {
    // Fetch the family tree
    const familyTree = await findFamilyTreeById(data.familyTreeId);

    if (!familyTree) {
      throw new Error("Family tree not found");
    }

    // Check if tree is public
    if (familyTree.privacyLevel !== "public") {
      throw new Error("This family tree is private");
    }

    // Fetch all data needed for visualization in parallel
    const [members, relationships, marriages] = await Promise.all([
      findFamilyMembersByTreeId(data.familyTreeId),
      findParentChildRelationshipsByTreeId(data.familyTreeId),
      findMarriageConnectionsByTreeId(data.familyTreeId),
    ]);

    // Get owner name from tree (if available in the joined data)
    // For now we return null, but this could be extended to fetch owner info
    const ownerName = null;

    return {
      tree: familyTree,
      members,
      relationships,
      marriages,
      treeName: familyTree.name,
      treeDescription: familyTree.description,
      ownerName,
    };
  });

/**
 * Check if a family tree is public - no authentication required
 * Used for lightweight checks before loading full data
 */
export const isTreePublicFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({ familyTreeId: z.string().min(1, "Family tree ID is required") })
  )
  .handler(async ({ data }): Promise<{ isPublic: boolean; treeName: string | null }> => {
    const familyTree = await findFamilyTreeById(data.familyTreeId);

    if (!familyTree) {
      return { isPublic: false, treeName: null };
    }

    return {
      isPublic: familyTree.privacyLevel === "public",
      treeName: familyTree.name,
    };
  });

/**
 * Get public tree info by slug - returns basic info and whether PIN is required
 * No authentication required
 */
export const getPublicTreeInfoBySlugFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({ slug: z.string().min(1, "Slug is required") })
  )
  .handler(async ({ data }): Promise<{
    found: boolean;
    treeName: string | null;
    treeDescription: string | null;
    requiresPin: boolean;
    treeId: string | null;
  }> => {
    const tree = await findFamilyTreeByPublicSlug(data.slug);

    if (!tree) {
      return {
        found: false,
        treeName: null,
        treeDescription: null,
        requiresPin: false,
        treeId: null,
      };
    }

    // Check if tree is actually public
    if (tree.privacyLevel !== "public") {
      return {
        found: false,
        treeName: null,
        treeDescription: null,
        requiresPin: false,
        treeId: null,
      };
    }

    return {
      found: true,
      treeName: tree.name,
      treeDescription: tree.description,
      requiresPin: !!tree.publicPin,
      treeId: tree.id,
    };
  });

/**
 * Get public tree data by slug with optional PIN verification
 * No authentication required
 */
export const getPublicTreeBySlugFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      slug: z.string().min(1, "Slug is required"),
      pin: z.string().optional(),
    })
  )
  .handler(async ({ data }): Promise<PublicTreeVisualizationData> => {
    const tree = await findFamilyTreeByPublicSlug(data.slug);

    if (!tree) {
      throw new Error("Family tree not found");
    }

    // Check if tree is actually public
    if (tree.privacyLevel !== "public") {
      throw new Error("This family tree is private");
    }

    // Check PIN if required
    if (tree.publicPin) {
      if (!data.pin) {
        throw new Error("PIN is required to view this tree");
      }
      if (!verifyPin(data.pin, tree.publicPin)) {
        throw new Error("Invalid PIN");
      }
    }

    // Fetch all data needed for visualization in parallel
    const [members, relationships, marriages] = await Promise.all([
      findFamilyMembersByTreeId(tree.id),
      findParentChildRelationshipsByTreeId(tree.id),
      findMarriageConnectionsByTreeId(tree.id),
    ]);

    return {
      tree,
      members,
      relationships,
      marriages,
      treeName: tree.name,
      treeDescription: tree.description,
      ownerName: null,
    };
  });

/**
 * Get public access settings for a tree (owner only)
 */
export const getPublicAccessSettingsFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({ familyTreeId: z.string().min(1) })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }): Promise<{
    isPublic: boolean;
    publicSlug: string | null;
    hasPin: boolean;
    publicUrl: string | null;
  }> => {
    const { userId } = context;
    const { familyTreeId } = data;

    // Check if user is owner
    const isOwner = await isUserFamilyTreeOwner(userId, familyTreeId);
    if (!isOwner) {
      throw new Error("Only the tree owner can view public access settings");
    }

    const tree = await findFamilyTreeById(familyTreeId);
    if (!tree) {
      throw new Error("Family tree not found");
    }

    const baseUrl = process.env.VITE_APP_URL || "http://localhost:3000";
    const publicUrl = tree.publicSlug ? `${baseUrl}/tree/public/${tree.publicSlug}` : null;

    return {
      isPublic: tree.privacyLevel === "public",
      publicSlug: tree.publicSlug,
      hasPin: !!tree.publicPin,
      publicUrl,
    };
  });

/**
 * Enable public access for a tree (owner only)
 * Generates a public slug if not already set
 */
export const enablePublicAccessFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      familyTreeId: z.string().min(1),
      pin: z.string().min(4).max(8).optional(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }): Promise<{
    publicSlug: string;
    publicUrl: string;
  }> => {
    const { userId } = context;
    const { familyTreeId, pin } = data;

    // Check if user is owner
    const isOwner = await isUserFamilyTreeOwner(userId, familyTreeId);
    if (!isOwner) {
      throw new Error("Only the tree owner can enable public access");
    }

    const tree = await findFamilyTreeById(familyTreeId);
    if (!tree) {
      throw new Error("Family tree not found");
    }

    // Generate slug if not already set
    const publicSlug = tree.publicSlug || generatePublicSlug();

    // Update tree
    await updateFamilyTree(familyTreeId, {
      privacyLevel: "public",
      publicSlug,
      publicPin: pin ? hashPin(pin) : null,
    });

    const baseUrl = process.env.VITE_APP_URL || "http://localhost:3000";
    const publicUrl = `${baseUrl}/tree/public/${publicSlug}`;

    return { publicSlug, publicUrl };
  });

/**
 * Disable public access for a tree (owner only)
 */
export const disablePublicAccessFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({ familyTreeId: z.string().min(1) })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }): Promise<{ success: boolean }> => {
    const { userId } = context;
    const { familyTreeId } = data;

    // Check if user is owner
    const isOwner = await isUserFamilyTreeOwner(userId, familyTreeId);
    if (!isOwner) {
      throw new Error("Only the tree owner can disable public access");
    }

    // Update tree - keep the slug for if they re-enable
    await updateFamilyTree(familyTreeId, {
      privacyLevel: "private",
      publicPin: null,
    });

    return { success: true };
  });

/**
 * Update public access PIN (owner only)
 */
export const updatePublicPinFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      familyTreeId: z.string().min(1),
      pin: z.string().min(4).max(8).nullable(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }): Promise<{ success: boolean }> => {
    const { userId } = context;
    const { familyTreeId, pin } = data;

    // Check if user is owner
    const isOwner = await isUserFamilyTreeOwner(userId, familyTreeId);
    if (!isOwner) {
      throw new Error("Only the tree owner can update the PIN");
    }

    // Update tree
    await updateFamilyTree(familyTreeId, {
      publicPin: pin ? hashPin(pin) : null,
    });

    return { success: true };
  });

/**
 * Regenerate public slug (owner only)
 * This invalidates any existing public links
 */
export const regeneratePublicSlugFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({ familyTreeId: z.string().min(1) })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }): Promise<{
    publicSlug: string;
    publicUrl: string;
  }> => {
    const { userId } = context;
    const { familyTreeId } = data;

    // Check if user is owner
    const isOwner = await isUserFamilyTreeOwner(userId, familyTreeId);
    if (!isOwner) {
      throw new Error("Only the tree owner can regenerate the public link");
    }

    const publicSlug = generatePublicSlug();

    // Update tree
    await updateFamilyTree(familyTreeId, { publicSlug });

    const baseUrl = process.env.VITE_APP_URL || "http://localhost:3000";
    const publicUrl = `${baseUrl}/tree/public/${publicSlug}`;

    return { publicSlug, publicUrl };
  });
