import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import { findFamilyMembersByTreeId } from "~/data-access/family-members";
import { findFamilyTreeById, isUserFamilyTreeOwner } from "~/data-access/family-trees";
import {
  detectMemberDuplicates,
  type DuplicateDetectionResult,
  type DuplicateDetectionOptions,
} from "~/utils/member-duplicate-detection";

// Validation schema for checking duplicates
const checkDuplicatesSchema = z.object({
  familyTreeId: z.string().min(1, "Family tree ID is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  middleName: z.string().nullable().optional(),
  birthDate: z.string().nullable().optional(),
  /** Optional: exclude this member ID from results (useful when editing) */
  excludeMemberId: z.string().optional(),
});

export type CheckDuplicatesInput = z.infer<typeof checkDuplicatesSchema>;

/**
 * Check for potential duplicate members in a family tree
 *
 * This function checks if a new or updated member might be a duplicate
 * of an existing member in the family tree using fuzzy name matching
 * and date proximity algorithms.
 *
 * Requires authentication and access to the family tree.
 */
export const checkMemberDuplicatesFn = createServerFn({
  method: "POST",
})
  .inputValidator(checkDuplicatesSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }): Promise<DuplicateDetectionResult> => {
    // Verify the family tree exists
    const familyTree = await findFamilyTreeById(data.familyTreeId);
    if (!familyTree) {
      throw new Error("Family tree not found");
    }

    // Verify access to the family tree (owner or public)
    const isOwner = await isUserFamilyTreeOwner(context.userId, data.familyTreeId);
    const isPublic = familyTree.isPublic;

    if (!isOwner && !isPublic) {
      throw new Error(
        "Unauthorized: You don't have permission to access this family tree"
      );
    }

    // Get all existing members in the tree
    const existingMembers = await findFamilyMembersByTreeId(data.familyTreeId);

    // Prepare options
    const options: DuplicateDetectionOptions = {
      maxCandidates: 5,
    };

    // Exclude the member being edited (if provided)
    if (data.excludeMemberId) {
      options.excludeMemberIds = [data.excludeMemberId];
    }

    // Detect duplicates
    const result = detectMemberDuplicates(
      {
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName,
        birthDate: data.birthDate,
      },
      existingMembers.map((m) => ({
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        middleName: m.middleName,
        birthDate: m.birthDate,
      })),
      options
    );

    return result;
  });
