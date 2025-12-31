import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import { isUserFamilyTreeOwner } from "~/data-access/family-trees";
import { findFamilyMemberById } from "~/data-access/family-members";
import {
  analyzeMerge,
  performMemberMerge,
  validateMerge,
  type MergeOptions,
} from "~/use-cases/member-merge";

// Schema for analyzing a potential merge
const analyzeMergeSchema = z.object({
  sourceMemberId: z.string().min(1, "Source member ID is required"),
  targetMemberId: z.string().min(1, "Target member ID is required"),
});

// Schema for performing a merge
const performMergeSchema = z.object({
  sourceMemberId: z.string().min(1, "Source member ID is required"),
  targetMemberId: z.string().min(1, "Target member ID is required"),
  preferSource: z.boolean().optional().default(false),
  fieldsFromSource: z
    .array(z.string())
    .optional()
    .default([]),
});

/**
 * Analyze a potential merge between two members
 * Returns information about what will happen, conflicts, and warnings
 */
export const analyzeMemberMergeFn = createServerFn({
  method: "POST",
})
  .inputValidator(analyzeMergeSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { sourceMemberId, targetMemberId } = data;

    // Get source member to verify tree ownership
    const sourceMember = await findFamilyMemberById(sourceMemberId);
    if (!sourceMember) {
      throw new Error("Source member not found");
    }

    // Verify the user owns the family tree
    const isOwner = await isUserFamilyTreeOwner(
      context.userId,
      sourceMember.familyTreeId
    );
    if (!isOwner) {
      throw new Error(
        "Unauthorized: You don't have permission to merge members in this family tree"
      );
    }

    // Perform the analysis
    const analysis = await analyzeMerge(sourceMemberId, targetMemberId);

    return {
      sourceMember: {
        id: analysis.sourceMember.id,
        firstName: analysis.sourceMember.firstName,
        lastName: analysis.sourceMember.lastName,
        fullName: `${analysis.sourceMember.firstName} ${analysis.sourceMember.lastName}`,
      },
      targetMember: {
        id: analysis.targetMember.id,
        firstName: analysis.targetMember.firstName,
        lastName: analysis.targetMember.lastName,
        fullName: `${analysis.targetMember.firstName} ${analysis.targetMember.lastName}`,
      },
      fieldConflicts: analysis.fieldConflicts,
      willTransfer: analysis.willTransfer,
      warnings: analysis.warnings,
    };
  });

/**
 * Perform a merge between two members
 * The source member will be deleted and all their data transferred to target
 */
export const mergeFamilyMembersFn = createServerFn({
  method: "POST",
})
  .inputValidator(performMergeSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { sourceMemberId, targetMemberId, preferSource, fieldsFromSource } = data;

    // Get source member to verify tree ownership
    const sourceMember = await findFamilyMemberById(sourceMemberId);
    if (!sourceMember) {
      throw new Error("Source member not found");
    }

    // Verify the user owns the family tree
    const isOwner = await isUserFamilyTreeOwner(
      context.userId,
      sourceMember.familyTreeId
    );
    if (!isOwner) {
      throw new Error(
        "Unauthorized: You don't have permission to merge members in this family tree"
      );
    }

    // Validate the merge
    const validation = await validateMerge(
      sourceMemberId,
      targetMemberId,
      context.userId
    );

    if (!validation.valid) {
      throw new Error(validation.errors.join("; "));
    }

    // Perform the merge
    const options: MergeOptions = {
      preferSource,
      fieldsFromSource: fieldsFromSource as (keyof import("~/db/schema").FamilyMember)[],
    };

    const result = await performMemberMerge(
      sourceMemberId,
      targetMemberId,
      context.userId,
      options
    );

    return {
      success: true,
      mergedMemberId: result.mergedMemberId,
      deletedMemberId: result.deletedMemberId,
      transferred: result.transferred,
      cleaned: result.cleaned,
    };
  });

/**
 * Validate that a merge can be performed
 */
export const validateMemberMergeFn = createServerFn({
  method: "POST",
})
  .inputValidator(analyzeMergeSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { sourceMemberId, targetMemberId } = data;

    // Get source member to verify tree ownership
    const sourceMember = await findFamilyMemberById(sourceMemberId);
    if (!sourceMember) {
      return { valid: false, errors: ["Source member not found"] };
    }

    // Verify the user owns the family tree
    const isOwner = await isUserFamilyTreeOwner(
      context.userId,
      sourceMember.familyTreeId
    );
    if (!isOwner) {
      return {
        valid: false,
        errors: ["You don't have permission to merge members in this family tree"],
      };
    }

    return validateMerge(sourceMemberId, targetMemberId, context.userId);
  });
