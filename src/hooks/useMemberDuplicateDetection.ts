import { useMutation } from "@tanstack/react-query";
import { checkMemberDuplicatesFn, type CheckDuplicatesInput } from "~/fn/member-duplicate-check";
import type { DuplicateDetectionResult } from "~/utils/member-duplicate-detection";

/**
 * Hook for checking potential duplicate members in a family tree.
 *
 * This hook provides a mutation function that checks if a new or updated
 * member might be a duplicate of an existing member in the family tree.
 *
 * @param familyTreeId - The ID of the family tree to check against
 * @returns A mutation hook with the check function and state
 *
 * @example
 * ```tsx
 * const { mutateAsync: checkDuplicates, isPending } = useMemberDuplicateDetection(familyTreeId);
 *
 * const handleSubmit = async (formData) => {
 *   const result = await checkDuplicates({
 *     firstName: formData.firstName,
 *     lastName: formData.lastName,
 *     birthDate: formData.birthDate,
 *   });
 *
 *   if (result.hasPotentialDuplicates) {
 *     // Show warning to user
 *     setDuplicateWarning(result);
 *   } else {
 *     // Proceed with creation
 *     await createMember(formData);
 *   }
 * };
 * ```
 */
export function useMemberDuplicateDetection(familyTreeId: string) {
  return useMutation<
    DuplicateDetectionResult,
    Error,
    Omit<CheckDuplicatesInput, "familyTreeId">
  >({
    mutationFn: async (data) => {
      return checkMemberDuplicatesFn({
        data: {
          familyTreeId,
          ...data,
        },
      });
    },
  });
}

/**
 * Hook options for duplicate detection with editing support
 */
interface UseMemberDuplicateDetectionOptions {
  /** The family tree ID to check against */
  familyTreeId: string;
  /** Optional: exclude this member ID from results (for editing) */
  excludeMemberId?: string;
}

/**
 * Hook for checking potential duplicate members with support for editing.
 *
 * Similar to useMemberDuplicateDetection but allows excluding a specific
 * member from results, useful when editing an existing member.
 *
 * @param options - Hook options including familyTreeId and optional excludeMemberId
 * @returns A mutation hook with the check function and state
 *
 * @example
 * ```tsx
 * // When editing an existing member
 * const { mutateAsync: checkDuplicates } = useMemberDuplicateDetectionForEdit({
 *   familyTreeId,
 *   excludeMemberId: existingMember.id, // Don't flag the member being edited
 * });
 * ```
 */
export function useMemberDuplicateDetectionForEdit(
  options: UseMemberDuplicateDetectionOptions
) {
  const { familyTreeId, excludeMemberId } = options;

  return useMutation<
    DuplicateDetectionResult,
    Error,
    Omit<CheckDuplicatesInput, "familyTreeId" | "excludeMemberId">
  >({
    mutationFn: async (data) => {
      return checkMemberDuplicatesFn({
        data: {
          familyTreeId,
          excludeMemberId,
          ...data,
        },
      });
    },
  });
}
