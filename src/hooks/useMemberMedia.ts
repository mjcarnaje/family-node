import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getMemberMediaFn,
  saveMemberMediaFn,
  updateMemberMediaFn,
  deleteMemberMediaFn,
} from "~/fn/member-media";
import { getErrorMessage } from "~/utils/error";

// Query options
export const memberMediaQueryOptions = (familyMemberId: string) => ({
  queryKey: ["member-media", familyMemberId],
  queryFn: () => getMemberMediaFn({ data: { familyMemberId } }),
});

// Query hooks
export function useMemberMedia(familyMemberId: string, enabled = true) {
  return useQuery({
    ...memberMediaQueryOptions(familyMemberId),
    enabled: enabled && !!familyMemberId,
  });
}

// With Cloudinary, URLs are stored directly in the database
// No need for useMemberMediaUrl or useMemberMediaUrls hooks
// Just access media.url directly from the query result

// Mutation hooks
export function useSaveMemberMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      data: Parameters<typeof saveMemberMediaFn>[0]["data"]
    ) => saveMemberMediaFn({ data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["member-media", variables.familyMemberId],
      });
      toast.success("Media uploaded successfully");
    },
    onError: (error) => {
      toast.error("Failed to save media", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useUpdateMemberMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      data: Parameters<typeof updateMemberMediaFn>[0]["data"]
    ) => updateMemberMediaFn({ data }),
    onSuccess: () => {
      // Invalidate all member media queries since we don't know the member ID
      queryClient.invalidateQueries({ queryKey: ["member-media"] });
    },
    onError: (error) => {
      toast.error("Failed to update media", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useDeleteMemberMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteMemberMediaFn({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-media"] });
      toast.success("Media deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete media", {
        description: getErrorMessage(error),
      });
    },
  });
}
