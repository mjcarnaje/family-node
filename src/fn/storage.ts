import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import { database } from "~/db";
import { user } from "~/db/schema";
import { eq } from "drizzle-orm";

export const updateUserProfileFn = createServerFn({ method: "POST" })
  .middleware([authenticatedMiddleware])
  .inputValidator(
    z.object({
      name: z.string().optional(),
      image: z.string().optional(), // Now stores Cloudinary URL directly
    })
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId;

    const updateData: { name?: string; image?: string; updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.image !== undefined) {
      updateData.image = data.image;
    }

    await database.update(user).set(updateData).where(eq(user.id, userId));

    return { success: true };
  });

export const deleteUserAccountFn = createServerFn({ method: "POST" })
  .middleware([authenticatedMiddleware])
  .inputValidator(
    z.object({
      email: z.string().email(),
    })
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId;

    // First, get the user's email to verify it matches
    const [userRecord] = await database
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!userRecord) {
      throw new Error("User not found");
    }

    // Verify the email matches (case insensitive)
    if (userRecord.email.toLowerCase() !== data.email.toLowerCase()) {
      throw new Error("Email does not match your account email");
    }

    // Delete the user - this will cascade delete all related records
    await database.delete(user).where(eq(user.id, userId));

    return { success: true };
  });
