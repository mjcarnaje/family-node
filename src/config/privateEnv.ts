export const privateEnv = {
  // Database
  DATABASE_URL: process.env.DATABASE_URL!,

  // Better Auth
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET!,

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!,

  // Email (Resend)
  RESEND_API_KEY: process.env.RESEND_API_KEY || "",
  EMAIL_FROM: process.env.EMAIL_FROM || "Family Tree <noreply@example.com>",

  // Cloudinary (server-side uploads)
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME!,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY!,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET!,
} as const;
