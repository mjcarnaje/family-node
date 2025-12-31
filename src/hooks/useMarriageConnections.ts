import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createMarriageConnectionFn,
  updateMarriageConnectionFn,
  deleteMarriageConnectionFn,
} from "~/fn/marriage-connections";
import { broadcastTreeActivityFn } from "~/fn/collaboration";
import { getErrorMessage } from "~/utils/error";
import type { MarriageStatus } from "~/db/schema";

interface CreateMarriageConnectionData {
  familyTreeId: string;
  spouse1Id: string;
  spouse2Id: string;
  marriageDate?: string | null;
  marriagePlace?: string | null;
  divorceDate?: string | null;
  status?: MarriageStatus;
}

interface UpdateMarriageConnectionData {
  id: string;
  marriageDate?: string | null;
  marriagePlace?: string | null;
  divorceDate?: string | null;
  status?: MarriageStatus;
}

/**
 * Hook for creating a new marriage connection
 */
export function useCreateMarriageConnection(familyTreeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateMarriageConnectionData) => {
      return createMarriageConnectionFn({ data });
    },
    onSuccess: async (newConnection) => {
      toast.success("Marriage connection added!", {
        description: "The marriage has been recorded in the family tree.",
      });

      // Broadcast activity for real-time collaboration
      try {
        await broadcastTreeActivityFn({
          data: {
            familyTreeId,
            activityType: "MARRIAGE_ADDED",
            entityType: "MARRIAGE",
            entityId: newConnection.id,
            entityName: "Marriage connection",
            description: "Added a marriage connection",
          },
        });
      } catch (e) {
        console.error("Failed to broadcast activity:", e);
      }

      // Invalidate tree visualization query to refresh the tree
      queryClient.invalidateQueries({
        queryKey: ["tree-visualization", familyTreeId],
      });
      // Invalidate tree versions to show the new change
      queryClient.invalidateQueries({
        queryKey: ["tree-versions", familyTreeId],
      });
      // Invalidate tree statistics to update the stats
      queryClient.invalidateQueries({
        queryKey: ["tree-statistics", familyTreeId],
      });
      // Invalidate collaboration state
      queryClient.invalidateQueries({
        queryKey: ["collaboration-state", familyTreeId],
      });
    },
    onError: (error) => {
      toast.error("Failed to add marriage", {
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Hook for updating a marriage connection
 */
export function useUpdateMarriageConnection(familyTreeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateMarriageConnectionData) => {
      return updateMarriageConnectionFn({ data });
    },
    onSuccess: async (updatedConnection) => {
      toast.success("Marriage updated!", {
        description: "The marriage details have been updated.",
      });

      // Broadcast activity for real-time collaboration
      try {
        await broadcastTreeActivityFn({
          data: {
            familyTreeId,
            activityType: "MARRIAGE_UPDATED",
            entityType: "MARRIAGE",
            entityId: updatedConnection.id,
            entityName: "Marriage connection",
            description: "Updated a marriage connection",
          },
        });
      } catch (e) {
        console.error("Failed to broadcast activity:", e);
      }

      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ["tree-visualization", familyTreeId],
      });
      queryClient.invalidateQueries({
        queryKey: ["tree-versions", familyTreeId],
      });
    },
    onError: (error) => {
      toast.error("Failed to update marriage", {
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Hook for deleting a marriage connection
 */
export function useDeleteMarriageConnection(familyTreeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return deleteMarriageConnectionFn({ data: { id } });
    },
    onSuccess: async () => {
      toast.success("Marriage removed", {
        description: "The marriage connection has been removed.",
      });

      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ["tree-visualization", familyTreeId],
      });
      queryClient.invalidateQueries({
        queryKey: ["tree-versions", familyTreeId],
      });
      queryClient.invalidateQueries({
        queryKey: ["tree-statistics", familyTreeId],
      });
    },
    onError: (error) => {
      toast.error("Failed to remove marriage", {
        description: getErrorMessage(error),
      });
    },
  });
}
