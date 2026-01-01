import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  createFamilyTree,
  findFamilyTreeById,
  findFamilyTreesByOwnerIdWithMemberCount,
  updateFamilyTree,
  deleteFamilyTree,
  isUserFamilyTreeOwner,
} from "~/data-access/family-trees";

// Validation schemas
const createFamilyTreeSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(200, "Name must be less than 200 characters"),
  description: z
    .string()
    .max(2000, "Description must be less than 2000 characters")
    .nullable()
    .optional(),
  coverImageUrl: z.string().url().nullable().optional(),
  isPublic: z.boolean().optional().default(false),
});

const updateFamilyTreeSchema = z.object({
  id: z.string().min(1, "Family tree ID is required"),
  name: z
    .string()
    .min(1, "Name is required")
    .max(200, "Name must be less than 200 characters")
    .optional(),
  description: z
    .string()
    .max(2000, "Description must be less than 2000 characters")
    .nullable()
    .optional(),
  coverImageUrl: z.string().url().nullable().optional(),
  isPublic: z.boolean().optional(),
});

/**
 * Create a new family tree
 * Requires authentication
 */
export const createFamilyTreeFn = createServerFn({
  method: "POST",
})
  .inputValidator(createFamilyTreeSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Create the family tree
    const familyTreeData = {
      id: crypto.randomUUID(),
      name: data.name,
      description: data.description || null,
      coverImageUrl: data.coverImageUrl || null,
      ownerId: context.userId,
      isPublic: data.isPublic ?? false,
    };

    const newFamilyTree = await createFamilyTree(familyTreeData);
    return newFamilyTree;
  });

/**
 * Get a single family tree by ID
 * Requires authentication and either ownership or public access
 */
export const getFamilyTreeByIdFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ id: z.string().min(1, "ID is required") }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const familyTree = await findFamilyTreeById(data.id);
    if (!familyTree) {
      throw new Error("Family tree not found");
    }

    const isOwner = familyTree.ownerId === context.userId;
    const isPublic = familyTree.isPublic;

    if (!isOwner && !isPublic) {
      throw new Error(
        "Unauthorized: You don't have permission to view this family tree"
      );
    }

    return familyTree;
  });

/**
 * Get all family trees owned by the current user with member counts
 * Requires authentication
 */
export const getMyFamilyTreesFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const trees = await findFamilyTreesByOwnerIdWithMemberCount(context.userId);
    return trees;
  });


/**
 * Update a family tree
 * Requires authentication and ownership
 */
export const updateFamilyTreeFn = createServerFn({
  method: "POST",
})
  .inputValidator(updateFamilyTreeSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { id, ...updateData } = data;

    // Verify the family tree exists
    const existingTree = await findFamilyTreeById(id);
    if (!existingTree) {
      throw new Error("Family tree not found");
    }

    // Verify the user owns the family tree
    const isOwner = await isUserFamilyTreeOwner(context.userId, id);
    if (!isOwner) {
      throw new Error(
        "Unauthorized: You don't have permission to update this family tree"
      );
    }

    // Update the family tree
    const updatedTree = await updateFamilyTree(id, {
      name: updateData.name,
      description: updateData.description,
      coverImageUrl: updateData.coverImageUrl,
      isPublic: updateData.isPublic,
    });

    if (!updatedTree) {
      throw new Error("Failed to update family tree");
    }

    return updatedTree;
  });

/**
 * Delete a family tree
 * Requires authentication and ownership
 */
export const deleteFamilyTreeFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ id: z.string().min(1, "ID is required") }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { id } = data;

    // Verify the family tree exists
    const existingTree = await findFamilyTreeById(id);
    if (!existingTree) {
      throw new Error("Family tree not found");
    }

    // Verify the user owns the family tree
    const isOwner = await isUserFamilyTreeOwner(context.userId, id);
    if (!isOwner) {
      throw new Error(
        "Unauthorized: You don't have permission to delete this family tree"
      );
    }

    // Delete the family tree (cascades to members and relationships)
    const deleted = await deleteFamilyTree(id);
    if (!deleted) {
      throw new Error("Failed to delete family tree");
    }

    return { success: true };
  });
