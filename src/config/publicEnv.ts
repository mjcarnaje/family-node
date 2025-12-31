export const publicEnv = {
  BETTER_AUTH_URL: import.meta.env.VITE_BETTER_AUTH_URL,
  APP_URL: import.meta.env.VITE_APP_URL || "http://localhost:3000",
  // Cloudinary
  CLOUDINARY_CLOUD_NAME: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME!,
  CLOUDINARY_UPLOAD_PRESET: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET!,
};
