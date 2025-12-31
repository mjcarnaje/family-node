import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createParentChildRelationshipFn,
  deleteParentChildRelationshipFn,
} from "~/fn/parent-child-relationships";
import { broadcastTreeActivityFn } from "~/fn/collaboration";
import { getErrorMessage } from "~/utils/error";
import type { RelationshipType } from "~/db/schema";

interface CreateParentChildRelationshipData {
  familyTreeId: string;
  parentId: string;
  childId: string;
  relationshipType?: RelationshipType;
}

/**
 * Hook for creating a new parent-child relationship
 */
export function useCreateParentChildRelationship(familyTreeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateParentChildRelationshipData) => {
      return createParentChildRelationshipFn({ data });
    },
    onSuccess: async (newRelationship) => {
      toast.success("Relationship added!", {
        description: "The parent-child relationship has been created.",
      });

      // Broadcast activity for real-time collaboration
      try {
        await broadcastTreeActivityFn({
          data: {
            familyTreeId,
            activityType: "RELATIONSHIP_ADDED",
            entityType: "RELATIONSHIP",
            entityId: newRelationship.id,
            entityName: "Parent-child relationship",
            description: "Added a parent-child relationship",
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
      // Invalidate tree statistics
      queryClient.invalidateQueries({
        queryKey: ["tree-statistics", familyTreeId],
      });
    },
    onError: (error) => {
      toast.error("Failed to add relationship", {
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Hook for deleting a parent-child relationship
 */
export function useDeleteParentChildRelationship(familyTreeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return deleteParentChildRelationshipFn({ data: { id } });
    },
    onSuccess: async () => {
      toast.success("Relationship removed", {
        description: "The parent-child relationship has been removed.",
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
      toast.error("Failed to remove relationship", {
        description: getErrorMessage(error),
      });
    },
  });
}
