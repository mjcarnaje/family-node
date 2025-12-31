import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateUserProfileFn } from "~/fn/storage";
import { uploadToCloudinary } from "~/utils/storage";
import { getErrorMessage } from "~/utils/error";

// With Cloudinary, we no longer need presigned URL hooks
// Uploads happen directly from the client to Cloudinary

// Mutation hook for updating user profile
export function useUpdateUserProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name?: string; image?: string }) =>
      updateUserProfileFn({ data }),
    onSuccess: () => {
      toast.success("Profile updated successfully!", {
        description: "Your profile changes have been saved.",
      });

      // Invalidate user-related queries
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error) => {
      toast.error("Failed to update profile", {
        description: getErrorMessage(error),
      });
    },
  });
}

// Hook for uploading profile images to Cloudinary
export function useUploadProfileImage() {
  return useMutation({
    mutationFn: async (file: File) => {
      const result = await uploadToCloudinary(file, {
        folder: "profile-images",
        resourceType: "image",
      });
      return result.secureUrl;
    },
    onError: (error) => {
      toast.error("Failed to upload image", {
        description: getErrorMessage(error),
      });
    },
  });
}

// Hook for uploading module content to Cloudinary
export function useUploadModuleContent() {
  return useMutation({
    mutationFn: async ({
      file,
      folder = "module-content",
    }: {
      file: File;
      folder?: string;
    }) => {
      const isVideo = file.type.startsWith("video/");
      const result = await uploadToCloudinary(file, {
        folder,
        resourceType: isVideo ? "video" : "image",
      });
      return {
        url: result.secureUrl,
        publicId: result.publicId,
      };
    },
    onError: (error) => {
      toast.error("Failed to upload content", {
        description: getErrorMessage(error),
      });
    },
  });
}

// Combined hook for file upload workflow (simplified for Cloudinary)
export function useFileUpload() {
  const updateProfile = useUpdateUserProfile();
  const uploadProfileImage = useUploadProfileImage();
  const uploadModuleContent = useUploadModuleContent();

  return {
    updateProfile,
    uploadProfileImage,
    uploadModuleContent,
    isLoading:
      updateProfile.isPending ||
      uploadProfileImage.isPending ||
      uploadModuleContent.isPending,
  };
}
