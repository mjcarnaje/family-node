import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import { uploadToCloudinaryServer } from "~/utils/storage/cloudinary-server";

const uploadSchema = z.object({
  file: z.string(), // Base64 encoded file
  fileName: z.string(),
  folder: z.string().optional(),
  resourceType: z.enum(["image", "video", "raw", "auto"]).optional(),
});

/**
 * Server function to upload files to Cloudinary
 */
export const uploadFileFn = createServerFn({
  method: "POST",
})
  .inputValidator(uploadSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Convert base64 to buffer
    const base64Data = data.file.replace(/^data:.*,/, "");
    const fileBuffer = Buffer.from(base64Data, "base64");

    // Upload to Cloudinary
    const result = await uploadToCloudinaryServer(fileBuffer, {
      folder: data.folder,
      resourceType: data.resourceType,
    });

    return {
      publicId: result.publicId,
      secureUrl: result.secureUrl,
      format: result.format,
      resourceType: result.resourceType,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      duration: result.duration,
    };
  });

