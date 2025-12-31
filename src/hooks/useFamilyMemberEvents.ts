import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createFamilyMemberEventFn,
  getEventsByFamilyMemberIdFn,
  updateFamilyMemberEventFn,
  deleteFamilyMemberEventFn,
} from "~/fn/family-member-events";
import { getErrorMessage } from "~/utils/error";
import type { FamilyMemberEventType } from "~/db/schema";

interface CreateFamilyMemberEventData {
  familyMemberId: string;
  eventType: FamilyMemberEventType;
  title: string;
  description?: string | null;
  eventDate?: string | null;
  eventYear?: number | null;
  location?: string | null;
  relatedMemberId?: string | null;
}

interface UpdateFamilyMemberEventData {
  id: string;
  eventType?: FamilyMemberEventType;
  title?: string;
  description?: string | null;
  eventDate?: string | null;
  eventYear?: number | null;
  location?: string | null;
  relatedMemberId?: string | null;
}

/**
 * Hook for fetching events for a family member
 */
export function useFamilyMemberEvents(familyMemberId: string) {
  return useQuery({
    queryKey: ["family-member-events", familyMemberId],
    queryFn: () => getEventsByFamilyMemberIdFn({ data: { familyMemberId } }),
    enabled: !!familyMemberId,
  });
}

/**
 * Hook for creating a new family member event
 */
export function useCreateFamilyMemberEvent(
  familyMemberId: string,
  familyTreeId: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateFamilyMemberEventData) => {
      return createFamilyMemberEventFn({ data });
    },
    onSuccess: (newEvent) => {
      toast.success("Event added!", {
        description: `"${newEvent.title}" has been added to the timeline.`,
      });

      // Invalidate events query for this member
      queryClient.invalidateQueries({
        queryKey: ["family-member-events", familyMemberId],
      });
      // Invalidate tree versions to show the new change
      queryClient.invalidateQueries({
        queryKey: ["tree-versions", familyTreeId],
      });
    },
    onError: (error) => {
      toast.error("Failed to add event", {
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Hook for updating an existing family member event
 */
export function useUpdateFamilyMemberEvent(
  familyMemberId: string,
  familyTreeId: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateFamilyMemberEventData) => {
      return updateFamilyMemberEventFn({ data });
    },
    onSuccess: (updatedEvent) => {
      toast.success("Event updated!", {
        description: `"${updatedEvent.title}" has been updated.`,
      });

      // Invalidate events query for this member
      queryClient.invalidateQueries({
        queryKey: ["family-member-events", familyMemberId],
      });
      // Invalidate tree versions to show the new change
      queryClient.invalidateQueries({
        queryKey: ["tree-versions", familyTreeId],
      });
    },
    onError: (error) => {
      toast.error("Failed to update event", {
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Hook for deleting a family member event
 */
export function useDeleteFamilyMemberEvent(
  familyMemberId: string,
  familyTreeId: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteFamilyMemberEventFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Event deleted", {
        description: "The event has been removed from the timeline.",
      });

      // Invalidate events query for this member
      queryClient.invalidateQueries({
        queryKey: ["family-member-events", familyMemberId],
      });
      // Invalidate tree versions to show the new change
      queryClient.invalidateQueries({
        queryKey: ["tree-versions", familyTreeId],
      });
    },
    onError: (error) => {
      toast.error("Failed to delete event", {
        description: getErrorMessage(error),
      });
    },
  });
}
