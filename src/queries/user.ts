import { queryOptions } from "@tanstack/react-query";

// With Cloudinary, avatar URLs are stored directly on the user record
// No need to fetch presigned URLs anymore
export const getUserAvatarQuery = (imageUrl: string | null) =>
  queryOptions({
    queryKey: ["avatar-url", imageUrl],
    queryFn: async (): Promise<{ imageUrl: string | null }> => {
      // Just return the URL directly - no fetching needed
      return { imageUrl };
    },
    enabled: !!imageUrl,
    staleTime: Infinity, // URL won't change
  });
