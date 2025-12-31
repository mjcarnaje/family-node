import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  createFamilyMember,
  findFamilyMemberById,
  findFamilyMembersByTreeId,
  updateFamilyMember,
  deleteFamilyMember,
} from "~/data-access/family-members";
import {
  findFamilyTreeById,
  isUserFamilyTreeOwner,
} from "~/data-access/family-trees";
import {
  captureTreeVersion,
  generateChangeDescription,
} from "~/use-cases/tree-versioning";
import {
  validateMemberBirthdateChange,
  BirthdateValidationError,
} from "~/use-cases/birthdate-validation";
import {
  notifyMemberAdded,
  notifyMemberUpdated,
  notifyMemberDeleted,
} from "~/use-cases/tree-notifications";
import type { Gender } from "~/db/schema";

// Validation schemas
const genderSchema = z.enum(["male", "female", "other"]).nullable();

const createFamilyMemberSchema = z.object({
  familyTreeId: z.string().min(1, "Family tree ID is required"),
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(100, "First name must be less than 100 characters"),
  middleName: z
    .string()
    .max(100, "Middle name must be less than 100 characters")
    .nullable()
    .optional(),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(100, "Last name must be less than 100 characters"),
  nickname: z
    .string()
    .max(100, "Nickname must be less than 100 characters")
    .nullable()
    .optional(),
  gender: genderSchema.optional(),
  birthDate: z.string().nullable().optional(),
  birthPlace: z
    .string()
    .max(200, "Birth place must be less than 200 characters")
    .nullable()
    .optional(),
  deathDate: z.string().nullable().optional(),
  deathPlace: z
    .string()
    .max(200, "Death place must be less than 200 characters")
    .nullable()
    .optional(),
  bio: z
    .string()
    .max(5000, "Bio must be less than 5000 characters")
    .nullable()
    .optional(),
  profileImageUrl: z.string().url().nullable().optional(),
  linkedUserId: z.string().nullable().optional(),
});

const updateFamilyMemberSchema = z.object({
  id: z.string().min(1, "Family member ID is required"),
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(100, "First name must be less than 100 characters")
    .optional(),
  middleName: z
    .string()
    .max(100, "Middle name must be less than 100 characters")
    .nullable()
    .optional(),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(100, "Last name must be less than 100 characters")
    .optional(),
  nickname: z
    .string()
    .max(100, "Nickname must be less than 100 characters")
    .nullable()
    .optional(),
  gender: genderSchema.optional(),
  birthDate: z.string().nullable().optional(),
  birthPlace: z
    .string()
    .max(200, "Birth place must be less than 200 characters")
    .nullable()
    .optional(),
  deathDate: z.string().nullable().optional(),
  deathPlace: z
    .string()
    .max(200, "Death place must be less than 200 characters")
    .nullable()
    .optional(),
  bio: z
    .string()
    .max(5000, "Bio must be less than 5000 characters")
    .nullable()
    .optional(),
  profileImageUrl: z.string().url().nullable().optional(),
  linkedUserId: z.string().nullable().optional(),
});

/**
 * Create a new family member
 * Requires authentication and ownership of the family tree
 */
export const createFamilyMemberFn = createServerFn({
  method: "POST",
})
  .inputValidator(createFamilyMemberSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Verify the family tree exists
    const familyTree = await findFamilyTreeById(data.familyTreeId);
    if (!familyTree) {
      throw new Error("Family tree not found");
    }

    // Verify the user owns the family tree
    const isOwner = await isUserFamilyTreeOwner(
      context.userId,
      data.familyTreeId
    );
    if (!isOwner) {
      throw new Error(
        "Unauthorized: You don't have permission to add members to this family tree"
      );
    }

    // Create the family member
    const familyMemberData = {
      id: crypto.randomUUID(),
      familyTreeId: data.familyTreeId,
      firstName: data.firstName,
      middleName: data.middleName || null,
      lastName: data.lastName,
      nickname: data.nickname || null,
      gender: data.gender as Gender | null,
      birthDate: data.birthDate || null,
      birthPlace: data.birthPlace || null,
      deathDate: data.deathDate || null,
      deathPlace: data.deathPlace || null,
      bio: data.bio || null,
      profileImageUrl: data.profileImageUrl || null,
      linkedUserId: data.linkedUserId || null,
    };

    const newFamilyMember = await createFamilyMember(familyMemberData);

    // Capture version after member creation
    try {
      await captureTreeVersion(
        data.familyTreeId,
        context.userId,
        generateChangeDescription(
          "MEMBER_ADDED",
          "MEMBER",
          `${data.firstName} ${data.lastName}`
        ),
        [
          {
            type: "MEMBER_ADDED",
            entityType: "MEMBER",
            entityId: newFamilyMember.id,
            oldData: null,
            newData: newFamilyMember as unknown as Record<string, unknown>,
            description: `Added family member: ${data.firstName} ${data.lastName}`,
          },
        ]
      );
    } catch (versionError) {
      // Log error but don't fail the mutation
      console.error("Failed to capture tree version:", versionError);
    }

    // Send notifications to collaborators about the new member
    try {
      await notifyMemberAdded(
        data.familyTreeId,
        context.userId,
        newFamilyMember
      );
    } catch (notificationError) {
      // Log error but don't fail the mutation
      console.error("Failed to send member added notification:", notificationError);
    }

    return newFamilyMember;
  });

/**
 * Get a single family member by ID
 * Requires authentication and either ownership or public access to the tree
 */
export const getFamilyMemberByIdFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ id: z.string().min(1, "ID is required") }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const familyMember = await findFamilyMemberById(data.id);
    if (!familyMember) {
      throw new Error("Family member not found");
    }

    // Verify access to the family tree (owner or public)
    const familyTree = await findFamilyTreeById(familyMember.familyTreeId);
    if (!familyTree) {
      throw new Error("Family tree not found");
    }

    const isOwner = familyTree.ownerId === context.userId;
    const isPublic = familyTree.isPublic;

    if (!isOwner && !isPublic) {
      throw new Error(
        "Unauthorized: You don't have permission to view this family member"
      );
    }

    return familyMember;
  });

/**
 * Get all family members in a family tree
 * Requires authentication and either ownership or public access to the tree
 */
export const getFamilyMembersByTreeIdFn = createServerFn({
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
        "Unauthorized: You don't have permission to view members of this family tree"
      );
    }

    const members = await findFamilyMembersByTreeId(data.familyTreeId);
    return members;
  });

/**
 * Update a family member
 * Requires authentication and ownership of the family tree
 */
export const updateFamilyMemberFn = createServerFn({
  method: "POST",
})
  .inputValidator(updateFamilyMemberSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { id, ...updateData } = data;

    // Verify the family member exists
    const existingMember = await findFamilyMemberById(id);
    if (!existingMember) {
      throw new Error("Family member not found");
    }

    // Verify the user owns the family tree
    const isOwner = await isUserFamilyTreeOwner(
      context.userId,
      existingMember.familyTreeId
    );
    if (!isOwner) {
      throw new Error(
        "Unauthorized: You don't have permission to update members of this family tree"
      );
    }

    // Validate birthdate if it's being updated
    if (updateData.birthDate !== undefined) {
      try {
        await validateMemberBirthdateChange(id, updateData.birthDate);
      } catch (error) {
        if (error instanceof BirthdateValidationError) {
          throw new Error(error.message);
        }
        throw error;
      }
    }

    // Update the family member
    const updatedMember = await updateFamilyMember(id, {
      firstName: updateData.firstName,
      middleName: updateData.middleName,
      lastName: updateData.lastName,
      nickname: updateData.nickname,
      gender: updateData.gender as Gender | null | undefined,
      birthDate: updateData.birthDate,
      birthPlace: updateData.birthPlace,
      deathDate: updateData.deathDate,
      deathPlace: updateData.deathPlace,
      bio: updateData.bio,
      profileImageUrl: updateData.profileImageUrl,
      linkedUserId: updateData.linkedUserId,
    });

    if (!updatedMember) {
      throw new Error("Failed to update family member");
    }

    // Capture version after member update
    try {
      await captureTreeVersion(
        existingMember.familyTreeId,
        context.userId,
        generateChangeDescription(
          "MEMBER_UPDATED",
          "MEMBER",
          `${updatedMember.firstName} ${updatedMember.lastName}`
        ),
        [
          {
            type: "MEMBER_UPDATED",
            entityType: "MEMBER",
            entityId: updatedMember.id,
            oldData: existingMember as unknown as Record<string, unknown>,
            newData: updatedMember as unknown as Record<string, unknown>,
            description: `Updated family member: ${updatedMember.firstName} ${updatedMember.lastName}`,
          },
        ]
      );
    } catch (versionError) {
      // Log error but don't fail the mutation
      console.error("Failed to capture tree version:", versionError);
    }

    // Send notifications to collaborators about the updated member
    try {
      await notifyMemberUpdated(
        existingMember.familyTreeId,
        context.userId,
        updatedMember
      );
    } catch (notificationError) {
      // Log error but don't fail the mutation
      console.error("Failed to send member updated notification:", notificationError);
    }

    return updatedMember;
  });

/**
 * Delete a family member
 * Requires authentication and ownership of the family tree
 */
export const deleteFamilyMemberFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ id: z.string().min(1, "ID is required") }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { id } = data;

    // Verify the family member exists
    const existingMember = await findFamilyMemberById(id);
    if (!existingMember) {
      throw new Error("Family member not found");
    }

    // Verify the user owns the family tree
    const isOwner = await isUserFamilyTreeOwner(
      context.userId,
      existingMember.familyTreeId
    );
    if (!isOwner) {
      throw new Error(
        "Unauthorized: You don't have permission to delete members from this family tree"
      );
    }

    // Capture version before deletion (to include the deleted member in snapshot)
    const memberName = `${existingMember.firstName} ${existingMember.lastName}`;
    const familyTreeId = existingMember.familyTreeId;
    const memberData = { ...existingMember } as unknown as Record<string, unknown>;

    // Delete the family member
    const deleted = await deleteFamilyMember(id);
    if (!deleted) {
      throw new Error("Failed to delete family member");
    }

    // Capture version after member deletion
    try {
      await captureTreeVersion(
        familyTreeId,
        context.userId,
        generateChangeDescription("MEMBER_DELETED", "MEMBER", memberName),
        [
          {
            type: "MEMBER_DELETED",
            entityType: "MEMBER",
            entityId: id,
            oldData: memberData,
            newData: null,
            description: `Removed family member: ${memberName}`,
          },
        ]
      );
    } catch (versionError) {
      // Log error but don't fail the mutation
      console.error("Failed to capture tree version:", versionError);
    }

    // Send notifications to collaborators about the deleted member
    try {
      await notifyMemberDeleted(
        familyTreeId,
        context.userId,
        id,
        memberName
      );
    } catch (notificationError) {
      // Log error but don't fail the mutation
      console.error("Failed to send member deleted notification:", notificationError);
    }

    return { success: true };
  });

