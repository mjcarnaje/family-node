import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createFamilyMemberFn,
  updateFamilyMemberFn,
  deleteFamilyMemberFn,
} from "~/fn/family-members";
import { createParentChildRelationshipFn } from "~/fn/parent-child-relationships";
import { uploadToCloudinary } from "~/utils/storage";
import { broadcastTreeActivityFn } from "~/fn/collaboration";
import { getErrorMessage } from "~/utils/error";
import type { Gender, RelationshipType } from "~/db/schema";

interface CreateFamilyMemberData {
  familyTreeId: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  nickname?: string | null;
  gender?: Gender | null;
  birthDate?: string | null;
  birthPlace?: string | null;
  deathDate?: string | null;
  deathPlace?: string | null;
  bio?: string | null;
  profileImageUrl?: string | null;
  linkedUserId?: string | null;
}

interface UpdateFamilyMemberData {
  id: string;
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
  nickname?: string | null;
  gender?: Gender | null;
  birthDate?: string | null;
  birthPlace?: string | null;
  deathDate?: string | null;
  deathPlace?: string | null;
  bio?: string | null;
  profileImageUrl?: string | null;
  linkedUserId?: string | null;
}

interface UpdateMemberWithImageData extends UpdateFamilyMemberData {
  imageFile?: File;
}

interface CreateMemberWithRelationshipData extends CreateFamilyMemberData {
  relatedMemberId?: string;
  relationshipDirection?: "parent" | "child";
  relationshipType?: RelationshipType;
  imageFile?: File;
}

/**
 * Hook for creating a new family member
 */
export function useCreateFamilyMember(familyTreeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateFamilyMemberData) => {
      return createFamilyMemberFn({ data });
    },
    onSuccess: async (newMember) => {
      toast.success("Family member added!", {
        description: `${newMember.firstName} ${newMember.lastName} has been added to the family tree.`,
      });

      // Broadcast activity for real-time collaboration
      try {
        await broadcastTreeActivityFn({
          data: {
            familyTreeId,
            activityType: "MEMBER_ADDED",
            entityType: "MEMBER",
            entityId: newMember.id,
            entityName: `${newMember.firstName} ${newMember.lastName}`,
            description: `Added ${newMember.firstName} ${newMember.lastName}`,
          },
        });
      } catch (e) {
        console.error("Failed to broadcast activity:", e);
      }

      // Invalidate tree visualization query to refresh the tree
      queryClient.invalidateQueries({
        queryKey: ["tree-visualization", familyTreeId],
      });
      // Also invalidate any family member queries
      queryClient.invalidateQueries({ queryKey: ["family-members"] });
      // Invalidate tree versions to show the new change
      queryClient.invalidateQueries({ queryKey: ["tree-versions", familyTreeId] });
      // Invalidate tree statistics to update the stats
      queryClient.invalidateQueries({ queryKey: ["tree-statistics", familyTreeId] });
      // Invalidate collaboration state
      queryClient.invalidateQueries({ queryKey: ["collaboration-state", familyTreeId] });
    },
    onError: (error) => {
      toast.error("Failed to add family member", {
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Hook for creating a family member with optional relationship and image upload
 */
export function useCreateFamilyMemberWithRelationship(familyTreeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      imageFile,
      relatedMemberId,
      relationshipDirection,
      relationshipType,
      ...memberData
    }: CreateMemberWithRelationshipData) => {
      let profileImageUrl: string | null = null;

      // Upload image if provided (using Cloudinary)
      if (imageFile) {
        try {
          const uploadResult = await uploadToCloudinary(imageFile, {
            folder: "profile-images",
            resourceType: "image",
          });
          profileImageUrl = uploadResult.secureUrl;
        } catch (error) {
          console.error("Failed to upload profile image:", error);
          // Continue without the image
        }
      }

      // Create the family member
      const newMember = await createFamilyMemberFn({
        data: {
          ...memberData,
          profileImageUrl,
        },
      });

      // Create relationship if provided
      if (relatedMemberId && relationshipDirection && relationshipType) {
        try {
          const relationshipData =
            relationshipDirection === "parent"
              ? {
                  familyTreeId,
                  parentId: newMember.id,
                  childId: relatedMemberId,
                  relationshipType,
                }
              : {
                  familyTreeId,
                  parentId: relatedMemberId,
                  childId: newMember.id,
                  relationshipType,
                };

          await createParentChildRelationshipFn({
            data: relationshipData,
          });
        } catch (error) {
          console.error("Failed to create relationship:", error);
          // The member was created, just warn about the relationship
          toast.warning("Member added, but relationship could not be created", {
            description: getErrorMessage(error),
          });
        }
      }

      return newMember;
    },
    onSuccess: (newMember) => {
      toast.success("Family member added!", {
        description: `${newMember.firstName} ${newMember.lastName} has been added to the family tree.`,
      });

      // Invalidate tree visualization query to refresh the tree
      queryClient.invalidateQueries({
        queryKey: ["tree-visualization", familyTreeId],
      });
      // Also invalidate any family member queries
      queryClient.invalidateQueries({ queryKey: ["family-members"] });
      // Invalidate tree versions to show the new change
      queryClient.invalidateQueries({ queryKey: ["tree-versions", familyTreeId] });
      // Invalidate tree statistics to update the stats
      queryClient.invalidateQueries({ queryKey: ["tree-statistics", familyTreeId] });
    },
    onError: (error) => {
      toast.error("Failed to add family member", {
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Hook for updating an existing family member
 */
export function useUpdateFamilyMember(familyTreeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateFamilyMemberData) => {
      return updateFamilyMemberFn({ data });
    },
    onSuccess: async (updatedMember) => {
      toast.success("Family member updated!", {
        description: `${updatedMember.firstName} ${updatedMember.lastName}'s information has been updated.`,
      });

      // Broadcast activity for real-time collaboration
      try {
        await broadcastTreeActivityFn({
          data: {
            familyTreeId,
            activityType: "MEMBER_UPDATED",
            entityType: "MEMBER",
            entityId: updatedMember.id,
            entityName: `${updatedMember.firstName} ${updatedMember.lastName}`,
            description: `Updated ${updatedMember.firstName} ${updatedMember.lastName}`,
          },
        });
      } catch (e) {
        console.error("Failed to broadcast activity:", e);
      }

      // Invalidate tree visualization query to refresh the tree
      queryClient.invalidateQueries({
        queryKey: ["tree-visualization", familyTreeId],
      });
      // Also invalidate any family member queries
      queryClient.invalidateQueries({ queryKey: ["family-members"] });
      // Invalidate tree versions to show the new change
      queryClient.invalidateQueries({ queryKey: ["tree-versions", familyTreeId] });
      // Invalidate tree statistics to update the stats
      queryClient.invalidateQueries({ queryKey: ["tree-statistics", familyTreeId] });
      // Invalidate collaboration state
      queryClient.invalidateQueries({ queryKey: ["collaboration-state", familyTreeId] });
    },
    onError: (error) => {
      toast.error("Failed to update family member", {
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Hook for updating an existing family member with optional image upload
 */
export function useUpdateFamilyMemberWithImage(familyTreeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      imageFile,
      ...memberData
    }: UpdateMemberWithImageData) => {
      let profileImageUrl: string | null | undefined = memberData.profileImageUrl;

      // Upload image if provided (using Cloudinary)
      if (imageFile) {
        try {
          const uploadResult = await uploadToCloudinary(imageFile, {
            folder: "profile-images",
            resourceType: "image",
          });
          profileImageUrl = uploadResult.secureUrl;
        } catch (error) {
          console.error("Failed to upload profile image:", error);
          // Continue without the new image, keep existing
        }
      }

      // Update the family member
      return updateFamilyMemberFn({
        data: {
          ...memberData,
          profileImageUrl,
        },
      });
    },
    onSuccess: (updatedMember) => {
      toast.success("Family member updated!", {
        description: `${updatedMember.firstName} ${updatedMember.lastName}'s information has been updated.`,
      });

      // Invalidate tree visualization query to refresh the tree
      queryClient.invalidateQueries({
        queryKey: ["tree-visualization", familyTreeId],
      });
      // Also invalidate any family member queries
      queryClient.invalidateQueries({ queryKey: ["family-members"] });
      // Invalidate tree versions to show the new change
      queryClient.invalidateQueries({ queryKey: ["tree-versions", familyTreeId] });
      // Invalidate tree statistics to update the stats
      queryClient.invalidateQueries({ queryKey: ["tree-statistics", familyTreeId] });
    },
    onError: (error) => {
      toast.error("Failed to update family member", {
        description: getErrorMessage(error),
      });
    },
  });
}

/**
 * Hook for deleting a family member
 * Handles cache invalidation and notifications
 */
export function useDeleteFamilyMember(familyTreeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, memberName }: { id: string; memberName?: string }) => {
      const result = await deleteFamilyMemberFn({ data: { id } });
      return { ...result, deletedId: id, memberName };
    },
    onSuccess: async (result) => {
      toast.success("Family member deleted", {
        description: "The family member and their relationships have been removed.",
      });

      // Broadcast activity for real-time collaboration
      try {
        await broadcastTreeActivityFn({
          data: {
            familyTreeId,
            activityType: "MEMBER_DELETED",
            entityType: "MEMBER",
            entityId: result.deletedId,
            entityName: result.memberName || "Family member",
            description: `Removed ${result.memberName || "a family member"}`,
          },
        });
      } catch (e) {
        console.error("Failed to broadcast activity:", e);
      }

      // Invalidate tree visualization query to refresh the tree
      queryClient.invalidateQueries({ queryKey: ["tree-visualization", familyTreeId] });
      // Also invalidate any family member queries
      queryClient.invalidateQueries({ queryKey: ["family-members"] });
      // Invalidate tree versions to show the new change
      queryClient.invalidateQueries({ queryKey: ["tree-versions", familyTreeId] });
      // Invalidate tree statistics to update the stats
      queryClient.invalidateQueries({ queryKey: ["tree-statistics", familyTreeId] });
      // Invalidate collaboration state
      queryClient.invalidateQueries({ queryKey: ["collaboration-state", familyTreeId] });
    },
    onError: (error) => {
      toast.error("Failed to delete family member", {
        description: getErrorMessage(error),
      });
    },
  });
}
