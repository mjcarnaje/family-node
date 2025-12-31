import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  storyQueryOptions,
  storiesByMemberQueryOptions,
} from "~/queries/stories";
import {
  createStoryFn,
  updateStoryFn,
  deleteStoryFn,
} from "~/fn/stories";
import { getErrorMessage } from "~/utils/error";
import type { StoryType } from "~/db/schema";

// Query hooks
export function useStory(storyId: string, enabled = true) {
  return useQuery({
    ...storyQueryOptions(storyId),
    enabled: enabled && !!storyId,
  });
}

export function useStoriesByMember(familyMemberId: string, enabled = true) {
  return useQuery({
    ...storiesByMemberQueryOptions(familyMemberId),
    enabled: enabled && !!familyMemberId,
  });
}

// Mutation hooks
interface CreateStoryData {
  familyMemberId: string;
  familyTreeId: string;
  title: string;
  content: string;
  storyType?: StoryType;
  eventDate?: string | null;
}

export function useCreateStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateStoryData) => createStoryFn({ data }),
    onSuccess: (_data, variables) => {
      toast.success("Story created successfully!", {
        description: "The story has been added to this family member.",
      });
      // Invalidate stories queries for this member
      queryClient.invalidateQueries({
        queryKey: ["stories", "member", variables.familyMemberId],
      });
    },
    onError: (error) => {
      toast.error("Failed to create story", {
        description: getErrorMessage(error),
      });
    },
  });
}

interface UpdateStoryData {
  id: string;
  title?: string;
  content?: string;
  storyType?: StoryType;
  eventDate?: string | null;
}

export function useUpdateStory(familyMemberId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateStoryData) => updateStoryFn({ data }),
    onSuccess: (updatedStory) => {
      toast.success("Story updated successfully!", {
        description: "Your changes have been saved.",
      });
      // Invalidate the specific story query
      queryClient.invalidateQueries({
        queryKey: ["story", updatedStory.id],
      });
      // Invalidate stories list for the member if provided
      if (familyMemberId) {
        queryClient.invalidateQueries({
          queryKey: ["stories", "member", familyMemberId],
        });
      }
      // Also invalidate all stories queries to be safe
      queryClient.invalidateQueries({
        queryKey: ["stories"],
      });
    },
    onError: (error) => {
      toast.error("Failed to update story", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useDeleteStory(familyMemberId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (storyId: string) => deleteStoryFn({ data: { id: storyId } }),
    onSuccess: () => {
      toast.success("Story deleted successfully!", {
        description: "The story has been removed.",
      });
      // Invalidate stories queries
      if (familyMemberId) {
        queryClient.invalidateQueries({
          queryKey: ["stories", "member", familyMemberId],
        });
      }
      queryClient.invalidateQueries({
        queryKey: ["stories"],
      });
      queryClient.invalidateQueries({
        queryKey: ["story"],
      });
    },
    onError: (error) => {
      toast.error("Failed to delete story", {
        description: getErrorMessage(error),
      });
    },
  });
}
