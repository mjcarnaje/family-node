import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import { isUserFamilyTreeOwner } from "~/data-access/family-trees";
import {
  getTreeVersionHistory,
  getVersionDetails,
  revertToVersion,
  compareVersions,
  captureTreeVersion,
} from "~/use-cases/tree-versioning";
import {
  findTreeVersionById,
  findActivityLogsByTreeId,
  countActivityLogsByTreeId,
} from "~/data-access/tree-versions";

/**
 * Get version history for a family tree
 */
export const getTreeVersionHistoryFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      familyTreeId: z.string().min(1, "Family tree ID is required"),
      limit: z.number().min(1).max(100).optional().default(20),
      offset: z.number().min(0).optional().default(0),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Verify user has access to the family tree (owner for now)
    const isOwner = await isUserFamilyTreeOwner(
      context.userId,
      data.familyTreeId
    );
    if (!isOwner) {
      throw new Error(
        "Unauthorized: You don't have permission to view version history for this family tree"
      );
    }

    return getTreeVersionHistory(data.familyTreeId, data.limit, data.offset);
  });

/**
 * Get detailed information about a specific version
 */
export const getVersionDetailsFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      versionId: z.string().min(1, "Version ID is required"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Get the version to check ownership
    const version = await findTreeVersionById(data.versionId);
    if (!version) {
      throw new Error("Version not found");
    }

    // Verify user has access to the family tree
    const isOwner = await isUserFamilyTreeOwner(
      context.userId,
      version.familyTreeId
    );
    if (!isOwner) {
      throw new Error(
        "Unauthorized: You don't have permission to view this version"
      );
    }

    return getVersionDetails(data.versionId);
  });

/**
 * Revert a family tree to a specific version
 */
export const revertToVersionFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      familyTreeId: z.string().min(1, "Family tree ID is required"),
      versionId: z.string().min(1, "Version ID is required"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Verify user owns the family tree
    const isOwner = await isUserFamilyTreeOwner(
      context.userId,
      data.familyTreeId
    );
    if (!isOwner) {
      throw new Error(
        "Unauthorized: You don't have permission to revert this family tree"
      );
    }

    return revertToVersion(data.familyTreeId, data.versionId, context.userId);
  });

/**
 * Compare two versions of a family tree
 */
export const compareVersionsFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      versionId1: z.string().min(1, "First version ID is required"),
      versionId2: z.string().min(1, "Second version ID is required"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Get the first version to check ownership
    const version = await findTreeVersionById(data.versionId1);
    if (!version) {
      throw new Error("Version not found");
    }

    // Verify user has access to the family tree
    const isOwner = await isUserFamilyTreeOwner(
      context.userId,
      version.familyTreeId
    );
    if (!isOwner) {
      throw new Error(
        "Unauthorized: You don't have permission to compare these versions"
      );
    }

    return compareVersions(data.versionId1, data.versionId2);
  });

/**
 * Create a manual snapshot/version of the current tree state
 */
export const createManualVersionFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      familyTreeId: z.string().min(1, "Family tree ID is required"),
      description: z
        .string()
        .max(500, "Description must be less than 500 characters")
        .optional()
        .default("Manual snapshot"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Verify user owns the family tree
    const isOwner = await isUserFamilyTreeOwner(
      context.userId,
      data.familyTreeId
    );
    if (!isOwner) {
      throw new Error(
        "Unauthorized: You don't have permission to create a version for this family tree"
      );
    }

    return captureTreeVersion(
      data.familyTreeId,
      context.userId,
      data.description
    );
  });

/**
 * Get activity log for a family tree (with user information)
 */
export const getTreeActivityLogFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      familyTreeId: z.string().min(1, "Family tree ID is required"),
      limit: z.number().min(1).max(100).optional().default(50),
      offset: z.number().min(0).optional().default(0),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Verify user has access to the family tree
    const isOwner = await isUserFamilyTreeOwner(
      context.userId,
      data.familyTreeId
    );
    if (!isOwner) {
      throw new Error(
        "Unauthorized: You don't have permission to view activity log for this family tree"
      );
    }

    const [activityLogs, totalCount] = await Promise.all([
      findActivityLogsByTreeId(data.familyTreeId, data.limit, data.offset),
      countActivityLogsByTreeId(data.familyTreeId),
    ]);

    return {
      activityLogs,
      totalCount,
      hasMore: data.offset + activityLogs.length < totalCount,
    };
  });
