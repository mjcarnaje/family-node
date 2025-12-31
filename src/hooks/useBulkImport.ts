import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  bulkImportMembersFn,
  validateBulkImportFn,
  type BulkImportResult,
  type ImportMember,
} from "~/fn/bulk-import";

export interface ValidateImportParams {
  familyTreeId: string;
  content: string;
  format: "csv" | "json";
}

export interface ImportPreview {
  membersCount: number;
  relationshipsCount: number;
  marriagesCount: number;
  duplicatesCount: number;
  members: ImportMember[];
}

export interface ValidateImportResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  preview: ImportPreview | null;
}

/**
 * Hook to validate import data before performing the actual import
 */
export function useValidateBulkImport(familyTreeId: string) {
  return useMutation({
    mutationFn: async (params: { content: string; format: "csv" | "json" }) => {
      const result = await validateBulkImportFn({
        data: {
          familyTreeId,
          content: params.content,
          format: params.format,
        },
      });
      return result as ValidateImportResult;
    },
  });
}

/**
 * Hook to perform bulk import of family members
 */
export function useBulkImport(familyTreeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      members: ImportMember[];
      relationships?: Array<{
        parentTempId?: string;
        parentFirstName?: string;
        parentLastName?: string;
        childTempId?: string;
        childFirstName?: string;
        childLastName?: string;
        relationshipType?: "biological" | "adopted" | "step" | "foster";
      }>;
      marriages?: Array<{
        spouse1TempId?: string;
        spouse1FirstName?: string;
        spouse1LastName?: string;
        spouse2TempId?: string;
        spouse2FirstName?: string;
        spouse2LastName?: string;
        marriageDate?: string | null;
        marriagePlace?: string | null;
        divorceDate?: string | null;
        status?: "married" | "divorced" | "widowed" | "separated" | "annulled";
      }>;
    }): Promise<BulkImportResult> => {
      const result = await bulkImportMembersFn({
        data: {
          familyTreeId,
          members: params.members,
          relationships: params.relationships || [],
          marriages: params.marriages || [],
        },
      });
      return result;
    },
    onSuccess: () => {
      // Invalidate all tree-related queries to refresh the view
      queryClient.invalidateQueries({
        queryKey: ["family-members", familyTreeId],
      });
      queryClient.invalidateQueries({
        queryKey: ["parent-child-relationships", familyTreeId],
      });
      queryClient.invalidateQueries({
        queryKey: ["marriage-connections", familyTreeId],
      });
      queryClient.invalidateQueries({
        queryKey: ["tree-versions", familyTreeId],
      });
      // Also invalidate the member limits query
      queryClient.invalidateQueries({
        queryKey: ["member-limits", familyTreeId],
      });
    },
  });
}

export type { BulkImportResult, ImportMember };
