import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getGenealogyServicesFn,
  getConnectedGenealogyServicesFn,
  connectGenealogyServiceFn,
  disconnectGenealogyServiceFn,
  getGenealogyImportHistoryFn,
  importFromGenealogyServiceFn,
  parseGedcomFileFn,
  type GenealogyTreeData,
  type GenealogyPerson,
  type GenealogyRelationship,
  type GenealogyMarriage,
} from "~/fn/genealogy-import";
import type { GenealogyService } from "~/db/schema";

// ============================================
// Query Hooks
// ============================================

/**
 * Hook to get available genealogy services
 */
export function useGenealogyServices() {
  return useQuery({
    queryKey: ["genealogy-services"],
    queryFn: () => getGenealogyServicesFn(),
    staleTime: 1000 * 60 * 60, // 1 hour - services don't change often
  });
}

/**
 * Hook to get user's connected genealogy services
 */
export function useConnectedGenealogyServices() {
  return useQuery({
    queryKey: ["genealogy-connections"],
    queryFn: () => getConnectedGenealogyServicesFn(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to get import history for a family tree
 */
export function useGenealogyImportHistory(familyTreeId: string) {
  return useQuery({
    queryKey: ["genealogy-import-history", familyTreeId],
    queryFn: () => getGenealogyImportHistoryFn({ data: { familyTreeId } }),
    enabled: !!familyTreeId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// ============================================
// Mutation Hooks
// ============================================

/**
 * Hook to connect a genealogy service
 */
export function useConnectGenealogyService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      service: GenealogyService;
      accessToken?: string;
      refreshToken?: string;
      tokenExpiresAt?: string;
      externalUserId?: string;
      externalUsername?: string;
    }) => {
      return connectGenealogyServiceFn({ data: params });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["genealogy-connections"] });
    },
  });
}

/**
 * Hook to disconnect a genealogy service
 */
export function useDisconnectGenealogyService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (service: GenealogyService) => {
      return disconnectGenealogyServiceFn({ data: { service } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["genealogy-connections"] });
    },
  });
}

/**
 * Hook to parse a GEDCOM file
 */
export function useParseGedcomFile() {
  return useMutation({
    mutationFn: async (params: { content: string; service?: GenealogyService }) => {
      return parseGedcomFileFn({
        data: {
          content: params.content,
          service: params.service || "familysearch",
        },
      });
    },
  });
}

/**
 * Hook to import data from a genealogy service
 */
export function useGenealogyImport(familyTreeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      service: GenealogyService;
      sourceTreeId?: string;
      sourceTreeName?: string;
      persons: GenealogyPerson[];
      relationships?: GenealogyRelationship[];
      marriages?: GenealogyMarriage[];
      options?: {
        importRelationships?: boolean;
        importEvents?: boolean;
        skipDuplicates?: boolean;
      };
    }) => {
      return importFromGenealogyServiceFn({
        data: {
          familyTreeId,
          service: params.service,
          sourceTreeId: params.sourceTreeId,
          sourceTreeName: params.sourceTreeName,
          persons: params.persons,
          relationships: params.relationships || [],
          marriages: params.marriages || [],
          options: params.options || {},
        },
      });
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
      queryClient.invalidateQueries({
        queryKey: ["tree-visualization", familyTreeId],
      });
      queryClient.invalidateQueries({
        queryKey: ["genealogy-import-history", familyTreeId],
      });
      // Also invalidate the member limits query
      queryClient.invalidateQueries({
        queryKey: ["member-limits", familyTreeId],
      });
    },
  });
}

// ============================================
// Export Types
// ============================================

export type {
  GenealogyTreeData,
  GenealogyPerson,
  GenealogyRelationship,
  GenealogyMarriage,
};
