import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  createMarriageConnection,
  findMarriageConnectionById,
  findMarriageConnectionsByTreeId,
  findMarriagesForMember,
  updateMarriageConnection,
  deleteMarriageConnection,
  doesMarriageConnectionExist,
} from "~/data-access/marriage-connections";
import { findFamilyMemberById } from "~/data-access/family-members";
import {
  findFamilyTreeById,
  isUserFamilyTreeOwner,
} from "~/data-access/family-trees";
import {
  captureTreeVersion,
  generateChangeDescription,
} from "~/use-cases/tree-versioning";
import { validateAndThrowIfInvalidMarriage } from "~/use-cases/relationship-validation";
import {
  notifyMarriageAdded,
  notifyMarriageUpdated,
  notifyMarriageDeleted,
} from "~/use-cases/tree-notifications";
import type { MarriageStatus } from "~/db/schema";

// Validation schemas
const marriageStatusSchema = z.enum([
  "married",
  "divorced",
  "widowed",
  "separated",
  "annulled",
]);

const createMarriageConnectionSchema = z.object({
  familyTreeId: z.string().min(1, "Family tree ID is required"),
  spouse1Id: z.string().min(1, "First spouse ID is required"),
  spouse2Id: z.string().min(1, "Second spouse ID is required"),
  marriageDate: z.string().nullable().optional(),
  marriagePlace: z.string().nullable().optional(),
  divorceDate: z.string().nullable().optional(),
  status: marriageStatusSchema.optional().default("married"),
});

const updateMarriageConnectionSchema = z.object({
  id: z.string().min(1, "Marriage connection ID is required"),
  marriageDate: z.string().nullable().optional(),
  marriagePlace: z.string().nullable().optional(),
  divorceDate: z.string().nullable().optional(),
  status: marriageStatusSchema.optional(),
});

/**
 * Validate marriage dates consistency
 */
function validateMarriageDates(
  marriageDate: string | null | undefined,
  divorceDate: string | null | undefined,
  status: MarriageStatus
): void {
  // If divorced, must have divorce date
  if (status === "divorced" && !divorceDate) {
    throw new Error(
      "Divorce date is required when status is 'divorced'"
    );
  }

  // Divorce date must be after marriage date
  if (marriageDate && divorceDate) {
    const marriage = new Date(marriageDate);
    const divorce = new Date(divorceDate);
    if (divorce < marriage) {
      throw new Error("Divorce date cannot be before marriage date");
    }
  }

  // If annulled, marriage date should exist
  if (status === "annulled" && !marriageDate) {
    throw new Error(
      "Marriage date is required when status is 'annulled'"
    );
  }
}

/**
 * Create a new marriage connection between two family members
 */
export const createMarriageConnectionFn = createServerFn({
  method: "POST",
})
  .inputValidator(createMarriageConnectionSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const {
      familyTreeId,
      spouse1Id,
      spouse2Id,
      marriageDate,
      marriagePlace,
      divorceDate,
      status,
    } = data;

    // Verify the family tree exists
    const familyTree = await findFamilyTreeById(familyTreeId);
    if (!familyTree) {
      throw new Error("Family tree not found");
    }

    // Verify the user owns the family tree
    const isOwner = await isUserFamilyTreeOwner(context.userId, familyTreeId);
    if (!isOwner) {
      throw new Error(
        "Unauthorized: You don't have permission to add marriage connections to this family tree"
      );
    }

    // Verify both family members exist and belong to the same tree
    const [spouse1, spouse2] = await Promise.all([
      findFamilyMemberById(spouse1Id),
      findFamilyMemberById(spouse2Id),
    ]);

    if (!spouse1) {
      throw new Error("First spouse not found");
    }

    if (!spouse2) {
      throw new Error("Second spouse not found");
    }

    if (spouse1.familyTreeId !== familyTreeId) {
      throw new Error("First spouse does not belong to this family tree");
    }

    if (spouse2.familyTreeId !== familyTreeId) {
      throw new Error("Second spouse does not belong to this family tree");
    }

    // Check for self-marriage
    if (spouse1Id === spouse2Id) {
      throw new Error("A person cannot marry themselves");
    }

    // Check if marriage connection already exists
    const exists = await doesMarriageConnectionExist(spouse1Id, spouse2Id);
    if (exists) {
      throw new Error(
        "A marriage connection between these two people already exists"
      );
    }

    // Validate marriage dates
    validateMarriageDates(marriageDate, divorceDate, status as MarriageStatus);

    // Validate relationship - prevent impossible/incestuous marriages
    // This checks for sibling marriages, parent-child marriages, etc.
    await validateAndThrowIfInvalidMarriage(spouse1Id, spouse2Id);

    // Create the marriage connection
    const marriageConnectionData = {
      id: crypto.randomUUID(),
      familyTreeId,
      spouse1Id,
      spouse2Id,
      marriageDate: marriageDate || null,
      marriagePlace: marriagePlace || null,
      divorceDate: divorceDate || null,
      status: status as MarriageStatus,
    };

    const newConnection = await createMarriageConnection(marriageConnectionData);

    // Capture version after marriage creation
    try {
      await captureTreeVersion(
        familyTreeId,
        context.userId,
        generateChangeDescription(
          "MARRIAGE_ADDED",
          "MARRIAGE",
          `${spouse1.firstName} ${spouse1.lastName} & ${spouse2.firstName} ${spouse2.lastName}`
        ),
        [
          {
            type: "MARRIAGE_ADDED",
            entityType: "MARRIAGE",
            entityId: newConnection.id,
            oldData: null,
            newData: newConnection as unknown as Record<string, unknown>,
            description: `Added marriage connection: ${spouse1.firstName} ${spouse1.lastName} & ${spouse2.firstName} ${spouse2.lastName}`,
          },
        ]
      );
    } catch (versionError) {
      // Log error but don't fail the mutation
      console.error("Failed to capture tree version:", versionError);
    }

    // Send notifications to collaborators about the new marriage
    try {
      await notifyMarriageAdded(
        familyTreeId,
        context.userId,
        newConnection,
        `${spouse1.firstName} ${spouse1.lastName}`,
        `${spouse2.firstName} ${spouse2.lastName}`
      );
    } catch (notificationError) {
      // Log error but don't fail the mutation
      console.error("Failed to send marriage added notification:", notificationError);
    }

    return newConnection;
  });

/**
 * Get all marriage connections in a family tree
 */
export const getMarriageConnectionsByTreeIdFn = createServerFn({
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
        "Unauthorized: You don't have permission to view marriage connections in this family tree"
      );
    }

    const connections = await findMarriageConnectionsByTreeId(data.familyTreeId);
    return connections;
  });

/**
 * Get a single marriage connection by ID
 */
export const getMarriageConnectionByIdFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ id: z.string().min(1, "ID is required") }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const connection = await findMarriageConnectionById(data.id);
    if (!connection) {
      throw new Error("Marriage connection not found");
    }

    // Verify access to the family tree
    const familyTree = await findFamilyTreeById(connection.familyTreeId);
    if (!familyTree) {
      throw new Error("Family tree not found");
    }

    const isOwner = familyTree.ownerId === context.userId;
    const isPublic = familyTree.isPublic;

    if (!isOwner && !isPublic) {
      throw new Error(
        "Unauthorized: You don't have permission to view this marriage connection"
      );
    }

    return connection;
  });

/**
 * Get all marriages for a specific family member
 */
export const getMarriagesForMemberFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({ memberId: z.string().min(1, "Member ID is required") })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // First get the member to find their tree
    const member = await findFamilyMemberById(data.memberId);
    if (!member) {
      throw new Error("Family member not found");
    }

    // Verify access to the family tree
    const familyTree = await findFamilyTreeById(member.familyTreeId);
    if (!familyTree) {
      throw new Error("Family tree not found");
    }

    const isOwner = familyTree.ownerId === context.userId;
    const isPublic = familyTree.isPublic;

    if (!isOwner && !isPublic) {
      throw new Error(
        "Unauthorized: You don't have permission to view marriages for this member"
      );
    }

    const marriages = await findMarriagesForMember(data.memberId);
    return marriages;
  });

/**
 * Update a marriage connection
 */
export const updateMarriageConnectionFn = createServerFn({
  method: "POST",
})
  .inputValidator(updateMarriageConnectionSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { id, ...updateData } = data;

    // Verify the marriage connection exists
    const existingConnection = await findMarriageConnectionById(id);
    if (!existingConnection) {
      throw new Error("Marriage connection not found");
    }

    // Verify the user owns the family tree
    const isOwner = await isUserFamilyTreeOwner(
      context.userId,
      existingConnection.familyTreeId
    );
    if (!isOwner) {
      throw new Error(
        "Unauthorized: You don't have permission to update marriage connections in this family tree"
      );
    }

    // Determine the effective values for validation
    const effectiveMarriageDate = updateData.marriageDate !== undefined
      ? updateData.marriageDate
      : existingConnection.marriageDate;
    const effectiveDivorceDate = updateData.divorceDate !== undefined
      ? updateData.divorceDate
      : existingConnection.divorceDate;
    const effectiveStatus = (updateData.status || existingConnection.status) as MarriageStatus;

    // Validate marriage dates
    validateMarriageDates(
      effectiveMarriageDate,
      effectiveDivorceDate,
      effectiveStatus
    );

    // Update the marriage connection
    const updatedConnection = await updateMarriageConnection(id, {
      marriageDate: updateData.marriageDate,
      marriagePlace: updateData.marriagePlace,
      divorceDate: updateData.divorceDate,
      status: updateData.status as MarriageStatus | undefined,
    });

    if (!updatedConnection) {
      throw new Error("Failed to update marriage connection");
    }

    // Get spouse names for version capture
    const [spouse1, spouse2] = await Promise.all([
      findFamilyMemberById(existingConnection.spouse1Id),
      findFamilyMemberById(existingConnection.spouse2Id),
    ]);

    // Capture version after marriage update
    try {
      await captureTreeVersion(
        existingConnection.familyTreeId,
        context.userId,
        generateChangeDescription(
          "MARRIAGE_UPDATED",
          "MARRIAGE",
          `${spouse1?.firstName || "Unknown"} ${spouse1?.lastName || ""} & ${spouse2?.firstName || "Unknown"} ${spouse2?.lastName || ""}`
        ),
        [
          {
            type: "MARRIAGE_UPDATED",
            entityType: "MARRIAGE",
            entityId: updatedConnection.id,
            oldData: existingConnection as unknown as Record<string, unknown>,
            newData: updatedConnection as unknown as Record<string, unknown>,
            description: `Updated marriage connection`,
          },
        ]
      );
    } catch (versionError) {
      // Log error but don't fail the mutation
      console.error("Failed to capture tree version:", versionError);
    }

    // Send notifications to collaborators about the updated marriage
    try {
      await notifyMarriageUpdated(
        existingConnection.familyTreeId,
        context.userId,
        updatedConnection,
        `${spouse1?.firstName || "Unknown"} ${spouse1?.lastName || ""}`,
        `${spouse2?.firstName || "Unknown"} ${spouse2?.lastName || ""}`
      );
    } catch (notificationError) {
      // Log error but don't fail the mutation
      console.error("Failed to send marriage updated notification:", notificationError);
    }

    return updatedConnection;
  });

/**
 * Delete a marriage connection
 */
export const deleteMarriageConnectionFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ id: z.string().min(1, "ID is required") }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { id } = data;

    // Verify the marriage connection exists
    const existingConnection = await findMarriageConnectionById(id);
    if (!existingConnection) {
      throw new Error("Marriage connection not found");
    }

    // Verify the user owns the family tree
    const isOwner = await isUserFamilyTreeOwner(
      context.userId,
      existingConnection.familyTreeId
    );
    if (!isOwner) {
      throw new Error(
        "Unauthorized: You don't have permission to delete marriage connections from this family tree"
      );
    }

    // Get spouse names for version capture
    const [spouse1, spouse2] = await Promise.all([
      findFamilyMemberById(existingConnection.spouse1Id),
      findFamilyMemberById(existingConnection.spouse2Id),
    ]);

    const familyTreeId = existingConnection.familyTreeId;
    const connectionData = {
      ...existingConnection,
    } as unknown as Record<string, unknown>;

    // Delete the marriage connection
    const deleted = await deleteMarriageConnection(id);
    if (!deleted) {
      throw new Error("Failed to delete marriage connection");
    }

    // Capture version after marriage deletion
    try {
      await captureTreeVersion(
        familyTreeId,
        context.userId,
        generateChangeDescription(
          "MARRIAGE_DELETED",
          "MARRIAGE",
          `${spouse1?.firstName || "Unknown"} ${spouse1?.lastName || ""} & ${spouse2?.firstName || "Unknown"} ${spouse2?.lastName || ""}`
        ),
        [
          {
            type: "MARRIAGE_DELETED",
            entityType: "MARRIAGE",
            entityId: id,
            oldData: connectionData,
            newData: null,
            description: `Removed marriage connection`,
          },
        ]
      );
    } catch (versionError) {
      // Log error but don't fail the mutation
      console.error("Failed to capture tree version:", versionError);
    }

    // Send notifications to collaborators about the deleted marriage
    try {
      await notifyMarriageDeleted(
        familyTreeId,
        context.userId,
        id,
        `${spouse1?.firstName || "Unknown"} ${spouse1?.lastName || ""}`,
        `${spouse2?.firstName || "Unknown"} ${spouse2?.lastName || ""}`
      );
    } catch (notificationError) {
      // Log error but don't fail the mutation
      console.error("Failed to send marriage deleted notification:", notificationError);
    }

    return { success: true };
  });
