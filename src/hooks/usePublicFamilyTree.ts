import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  publicTreeInfoBySlugQueryOptions,
  publicAccessSettingsQueryOptions,
} from "~/queries/public-family-tree";
import {
  getPublicTreeBySlugFn,
  enablePublicAccessFn,
  disablePublicAccessFn,
  updatePublicPinFn,
  regeneratePublicSlugFn,
} from "~/fn/public-family-tree";

// ============================================
// Query Hooks
// ============================================

/**
 * Hook to get public tree info by slug (no auth required)
 * Returns whether tree exists and if PIN is required
 */
export function usePublicTreeInfoBySlug(slug: string) {
  return useQuery(publicTreeInfoBySlugQueryOptions(slug));
}

/**
 * Hook to get public access settings for a tree (owner only)
 */
export function usePublicAccessSettings(familyTreeId: string) {
  return useQuery(publicAccessSettingsQueryOptions(familyTreeId));
}

// ============================================
// Mutation Hooks
// ============================================

/**
 * Hook to fetch public tree data with optional PIN
 * Returns full tree data for visualization
 */
export function useGetPublicTreeBySlug() {
  return useMutation({
    mutationFn: (data: { slug: string; pin?: string }) =>
      getPublicTreeBySlugFn({ data }),
    onError: (error) => {
      // Don't toast for PIN errors - let the UI handle it
      if (!error.message.includes("PIN")) {
        toast.error(error.message || "Failed to load family tree");
      }
    },
  });
}

/**
 * Hook to enable public access for a tree (owner only)
 */
export function useEnablePublicAccess(familyTreeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pin?: string) =>
      enablePublicAccessFn({
        data: { familyTreeId, pin },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["public-access-settings", familyTreeId],
      });
      queryClient.invalidateQueries({
        queryKey: ["family-trees"],
      });
      toast.success("Public access enabled!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to enable public access");
    },
  });
}

/**
 * Hook to disable public access for a tree (owner only)
 */
export function useDisablePublicAccess(familyTreeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      disablePublicAccessFn({
        data: { familyTreeId },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["public-access-settings", familyTreeId],
      });
      queryClient.invalidateQueries({
        queryKey: ["family-trees"],
      });
      toast.success("Public access disabled");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to disable public access");
    },
  });
}

/**
 * Hook to update public access PIN (owner only)
 */
export function useUpdatePublicPin(familyTreeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pin: string | null) =>
      updatePublicPinFn({
        data: { familyTreeId, pin },
      }),
    onSuccess: (_, pin) => {
      queryClient.invalidateQueries({
        queryKey: ["public-access-settings", familyTreeId],
      });
      toast.success(pin ? "PIN updated" : "PIN removed");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update PIN");
    },
  });
}

/**
 * Hook to regenerate public slug (owner only)
 * This invalidates all existing public links
 */
export function useRegeneratePublicSlug(familyTreeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      regeneratePublicSlugFn({
        data: { familyTreeId },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["public-access-settings", familyTreeId],
      });
      toast.success("Public link regenerated");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to regenerate link");
    },
  });
}
