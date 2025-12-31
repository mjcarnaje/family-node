/**
 * Hook to get avatar image URL
 * With Cloudinary, the image field stores the URL directly
 * @param imageUrl - The image URL from the user's profile (can be null)
 * @returns Object with avatarUrl
 */
export function useAvatarImage(imageUrl: string | null) {
  return {
    avatarUrl: imageUrl,
    isLoading: false,
    error: null,
    refetch: () => {},
  };
}
