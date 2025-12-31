import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  analyzeMemberMergeFn,
  mergeFamilyMembersFn,
  validateMemberMergeFn,
} from "~/fn/member-merge";
import { getErrorMessage } from "~/utils/error";

interface MergeOptions {
  preferSource?: boolean;
  fieldsFromSource?: string[];
}

/**
 * Hook for analyzing a potential merge between two members
 */
export function useAnalyzeMemberMerge() {
  return useMutation({
    mutationFn: async ({
      sourceMemberId,
      targetMemberId,
    }: {
      sourceMemberId: string;
      targetMemberId: string;
    }) => {
      return analyzeMemberMergeFn({
        data: { sourceMemberId, targetMemberId },
      });
    },
    onError: (error) => {
      toast.error("Failed to analyze merge", {
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Hook for merging two family members
 */
export function useMergeFamilyMembers(familyTreeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sourceMemberId,
      targetMemberId,
      options = {},
    }: {
      sourceMemberId: string;
      targetMemberId: string;
      options?: MergeOptions;
    }) => {
      return mergeFamilyMembersFn({
        data: {
          sourceMemberId,
          targetMemberId,
          preferSource: options.preferSource,
          fieldsFromSource: options.fieldsFromSource,
        },
      });
    },
    onSuccess: (result) => {
      toast.success("Members merged successfully!", {
        description: `All data has been transferred and the duplicate record has been removed.`,
      });

      // Invalidate tree visualization query to refresh the tree
      queryClient.invalidateQueries({
        queryKey: ["tree-visualization", familyTreeId],
      });
      // Also invalidate any family member queries
      queryClient.invalidateQueries({ queryKey: ["family-members"] });
      // Invalidate tree versions to show the new change
      queryClient.invalidateQueries({ queryKey: ["tree-versions", familyTreeId] });
    },
    onError: (error) => {
      toast.error("Failed to merge members", {
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Hook for validating a potential merge
 */
export function useValidateMemberMerge() {
  return useMutation({
    mutationFn: async ({
      sourceMemberId,
      targetMemberId,
    }: {
      sourceMemberId: string;
      targetMemberId: string;
    }) => {
      return validateMemberMergeFn({
        data: { sourceMemberId, targetMemberId },
      });
    },
  });
}
