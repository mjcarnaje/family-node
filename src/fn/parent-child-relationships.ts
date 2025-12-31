import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  createParentChildRelationship,
  findParentChildRelationshipById,
  findParentChildRelationshipsByTreeId,
  updateParentChildRelationship,
  deleteParentChildRelationship,
  doesParentChildRelationshipExist,
} from "~/data-access/parent-child-relationships";
import { findFamilyMemberById } from "~/data-access/family-members";
import {
  findFamilyTreeById,
  isUserFamilyTreeOwner,
} from "~/data-access/family-trees";
import {
  captureTreeVersion,
  generateChangeDescription,
} from "~/use-cases/tree-versioning";
import {
  validateParentChildRelationship,
  BirthdateValidationError,
} from "~/use-cases/birthdate-validation";
import {
  notifyRelationshipAdded,
  notifyRelationshipUpdated,
  notifyRelationshipDeleted,
} from "~/use-cases/tree-notifications";
import type { RelationshipType } from "~/db/schema";

// Validation schemas
const relationshipTypeSchema = z.enum(["biological", "adopted", "step", "foster"]);

const createParentChildRelationshipSchema = z.object({
  familyTreeId: z.string().min(1, "Family tree ID is required"),
  parentId: z.string().min(1, "Parent ID is required"),
  childId: z.string().min(1, "Child ID is required"),
  relationshipType: relationshipTypeSchema.optional().default("biological"),
});

const updateParentChildRelationshipSchema = z.object({
  id: z.string().min(1, "Relationship ID is required"),
  relationshipType: relationshipTypeSchema.optional(),
});

/**
 * Create a new parent-child relationship
 * Validates that birthdates are logically consistent
 */
export const createParentChildRelationshipFn = createServerFn({
  method: "POST",
})
  .inputValidator(createParentChildRelationshipSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { familyTreeId, parentId, childId, relationshipType } = data;

    // Verify the family tree exists
    const familyTree = await findFamilyTreeById(familyTreeId);
    if (!familyTree) {
      throw new Error("Family tree not found");
    }

    // Verify the user owns the family tree
    const isOwner = await isUserFamilyTreeOwner(context.userId, familyTreeId);
    if (!isOwner) {
      throw new Error(
        "Unauthorized: You don't have permission to add relationships to this family tree"
      );
    }

    // Verify both family members exist and belong to the same tree
    const [parent, child] = await Promise.all([
      findFamilyMemberById(parentId),
      findFamilyMemberById(childId),
    ]);

    if (!parent) {
      throw new Error("Parent member not found");
    }

    if (!child) {
      throw new Error("Child member not found");
    }

    if (parent.familyTreeId !== familyTreeId) {
      throw new Error("Parent member does not belong to this family tree");
    }

    if (child.familyTreeId !== familyTreeId) {
      throw new Error("Child member does not belong to this family tree");
    }

    // Check for self-relationship
    if (parentId === childId) {
      throw new Error("A person cannot be their own parent");
    }

    // Check if relationship already exists
    const exists = await doesParentChildRelationshipExist(parentId, childId);
    if (exists) {
      throw new Error("This parent-child relationship already exists");
    }

    // Validate birthdate consistency
    try {
      await validateParentChildRelationship(parentId, childId);
    } catch (error) {
      if (error instanceof BirthdateValidationError) {
        throw new Error(error.message);
      }
      throw error;
    }

    // Create the relationship
    const relationshipData = {
      id: crypto.randomUUID(),
      familyTreeId,
      parentId,
      childId,
      relationshipType: relationshipType as RelationshipType,
    };

    const newRelationship = await createParentChildRelationship(relationshipData);

    // Capture version after relationship creation
    try {
      await captureTreeVersion(
        familyTreeId,
        context.userId,
        generateChangeDescription(
          "RELATIONSHIP_ADDED",
          "RELATIONSHIP",
          `${parent.firstName} ${parent.lastName} -> ${child.firstName} ${child.lastName}`
        ),
        [
          {
            type: "RELATIONSHIP_ADDED",
            entityType: "RELATIONSHIP",
            entityId: newRelationship.id,
            oldData: null,
            newData: newRelationship as unknown as Record<string, unknown>,
            description: `Added parent-child relationship: ${parent.firstName} ${parent.lastName} is parent of ${child.firstName} ${child.lastName}`,
          },
        ]
      );
    } catch (versionError) {
      // Log error but don't fail the mutation
      console.error("Failed to capture tree version:", versionError);
    }

    // Send notifications to collaborators about the new relationship
    try {
      await notifyRelationshipAdded(
        familyTreeId,
        context.userId,
        newRelationship,
        `${parent.firstName} ${parent.lastName}`,
        `${child.firstName} ${child.lastName}`
      );
    } catch (notificationError) {
      // Log error but don't fail the mutation
      console.error("Failed to send relationship added notification:", notificationError);
    }

    return newRelationship;
  });

/**
 * Get all parent-child relationships in a family tree
 */
export const getParentChildRelationshipsByTreeIdFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({ familyTreeId: z.string().min(1, "Family tree ID is required") })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Verify access to the family tree
    const familyTree = await findFamilyTreeById(data.familyTreeId);
    if (!familyTree) {
      throw new Error("Family tree not found");
    }

    const isOwner = familyTree.ownerId === context.userId;
    const isPublic = familyTree.isPublic;

    if (!isOwner && !isPublic) {
      throw new Error(
        "Unauthorized: You don't have permission to view relationships in this family tree"
      );
    }

    const relationships = await findParentChildRelationshipsByTreeId(
      data.familyTreeId
    );
    return relationships;
  });

/**
 * Get a single parent-child relationship by ID
 */
export const getParentChildRelationshipByIdFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ id: z.string().min(1, "ID is required") }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const relationship = await findParentChildRelationshipById(data.id);
    if (!relationship) {
      throw new Error("Relationship not found");
    }

    // Verify access to the family tree
    const familyTree = await findFamilyTreeById(relationship.familyTreeId);
    if (!familyTree) {
      throw new Error("Family tree not found");
    }

    const isOwner = familyTree.ownerId === context.userId;
    const isPublic = familyTree.isPublic;

    if (!isOwner && !isPublic) {
      throw new Error(
        "Unauthorized: You don't have permission to view this relationship"
      );
    }

    return relationship;
  });

/**
 * Update a parent-child relationship
 */
export const updateParentChildRelationshipFn = createServerFn({
  method: "POST",
})
  .inputValidator(updateParentChildRelationshipSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { id, ...updateData } = data;

    // Verify the relationship exists
    const existingRelationship = await findParentChildRelationshipById(id);
    if (!existingRelationship) {
      throw new Error("Relationship not found");
    }

    // Verify the user owns the family tree
    const isOwner = await isUserFamilyTreeOwner(
      context.userId,
      existingRelationship.familyTreeId
    );
    if (!isOwner) {
      throw new Error(
        "Unauthorized: You don't have permission to update relationships in this family tree"
      );
    }

    // Update the relationship
    const updatedRelationship = await updateParentChildRelationship(id, {
      relationshipType: updateData.relationshipType as RelationshipType | undefined,
    });

    if (!updatedRelationship) {
      throw new Error("Failed to update relationship");
    }

    // Get parent and child names for version capture
    const [parent, child] = await Promise.all([
      findFamilyMemberById(existingRelationship.parentId),
      findFamilyMemberById(existingRelationship.childId),
    ]);

    // Capture version after relationship update
    try {
      await captureTreeVersion(
        existingRelationship.familyTreeId,
        context.userId,
        generateChangeDescription(
          "RELATIONSHIP_UPDATED",
          "RELATIONSHIP",
          `${parent?.firstName || "Unknown"} ${parent?.lastName || ""} -> ${child?.firstName || "Unknown"} ${child?.lastName || ""}`
        ),
        [
          {
            type: "RELATIONSHIP_UPDATED",
            entityType: "RELATIONSHIP",
            entityId: updatedRelationship.id,
            oldData: existingRelationship as unknown as Record<string, unknown>,
            newData: updatedRelationship as unknown as Record<string, unknown>,
            description: `Updated parent-child relationship type`,
          },
        ]
      );
    } catch (versionError) {
      // Log error but don't fail the mutation
      console.error("Failed to capture tree version:", versionError);
    }

    // Send notifications to collaborators about the updated relationship
    try {
      await notifyRelationshipUpdated(
        existingRelationship.familyTreeId,
        context.userId,
        updatedRelationship,
        `${parent?.firstName || "Unknown"} ${parent?.lastName || ""}`,
        `${child?.firstName || "Unknown"} ${child?.lastName || ""}`
      );
    } catch (notificationError) {
      // Log error but don't fail the mutation
      console.error("Failed to send relationship updated notification:", notificationError);
    }

    return updatedRelationship;
  });

/**
 * Delete a parent-child relationship
 */
export const deleteParentChildRelationshipFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ id: z.string().min(1, "ID is required") }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { id } = data;

    // Verify the relationship exists
    const existingRelationship = await findParentChildRelationshipById(id);
    if (!existingRelationship) {
      throw new Error("Relationship not found");
    }

    // Verify the user owns the family tree
    const isOwner = await isUserFamilyTreeOwner(
      context.userId,
      existingRelationship.familyTreeId
    );
    if (!isOwner) {
      throw new Error(
        "Unauthorized: You don't have permission to delete relationships from this family tree"
      );
    }

    // Get parent and child names for version capture
    const [parent, child] = await Promise.all([
      findFamilyMemberById(existingRelationship.parentId),
      findFamilyMemberById(existingRelationship.childId),
    ]);

    const familyTreeId = existingRelationship.familyTreeId;
    const relationshipData = {
      ...existingRelationship,
    } as unknown as Record<string, unknown>;

    // Delete the relationship
    const deleted = await deleteParentChildRelationship(id);
    if (!deleted) {
      throw new Error("Failed to delete relationship");
    }

    // Capture version after relationship deletion
    try {
      await captureTreeVersion(
        familyTreeId,
        context.userId,
        generateChangeDescription(
          "RELATIONSHIP_DELETED",
          "RELATIONSHIP",
          `${parent?.firstName || "Unknown"} ${parent?.lastName || ""} -> ${child?.firstName || "Unknown"} ${child?.lastName || ""}`
        ),
        [
          {
            type: "RELATIONSHIP_DELETED",
            entityType: "RELATIONSHIP",
            entityId: id,
            oldData: relationshipData,
            newData: null,
            description: `Removed parent-child relationship`,
          },
        ]
      );
    } catch (versionError) {
      // Log error but don't fail the mutation
      console.error("Failed to capture tree version:", versionError);
    }

    // Send notifications to collaborators about the deleted relationship
    try {
      await notifyRelationshipDeleted(
        familyTreeId,
        context.userId,
        id,
        `${parent?.firstName || "Unknown"} ${parent?.lastName || ""}`,
        `${child?.firstName || "Unknown"} ${child?.lastName || ""}`
      );
    } catch (notificationError) {
      // Log error but don't fail the mutation
      console.error("Failed to send relationship deleted notification:", notificationError);
    }

    return { success: true };
  });
