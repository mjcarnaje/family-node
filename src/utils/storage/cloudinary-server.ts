import { v2 as cloudinary } from "cloudinary";
import { privateEnv } from "~/config/privateEnv";

// Configure Cloudinary
cloudinary.config({
  cloud_name: privateEnv.CLOUDINARY_CLOUD_NAME,
  api_key: privateEnv.CLOUDINARY_API_KEY,
  api_secret: privateEnv.CLOUDINARY_API_SECRET,
});

export interface CloudinaryUploadResult {
  publicId: string;
  secureUrl: string;
  format: string;
  resourceType: "image" | "video" | "raw";
  bytes: number;
  width?: number;
  height?: number;
  duration?: number;
}

export interface CloudinaryUploadOptions {
  folder?: string;
  resourceType?: "image" | "video" | "raw" | "auto";
}

/**
 * Upload a file to Cloudinary using server-side API
 * @param fileBuffer - File buffer or base64 string
 * @param options - Upload options
 * @returns Upload result with public ID and secure URL
 */
export async function uploadToCloudinaryServer(
  fileBuffer: Buffer | string,
  options: CloudinaryUploadOptions = {}
): Promise<CloudinaryUploadResult> {
  const { folder, resourceType = "auto" } = options;

  const uploadOptions: Record<string, any> = {
    resource_type: resourceType === "auto" ? "auto" : resourceType,
  };

  if (folder) {
    uploadOptions.folder = folder;
  }

  try {
    // Cloudinary upload() expects a string (file path, URL, or base64 data URI)
    // If we have a Buffer, convert it to a base64 data URI
    const fileToUpload = Buffer.isBuffer(fileBuffer)
      ? `data:application/octet-stream;base64,${fileBuffer.toString("base64")}`
      : fileBuffer;

    const result = await cloudinary.uploader.upload(fileToUpload, uploadOptions);

    return {
      publicId: result.public_id,
      secureUrl: result.secure_url,
      format: result.format || "",
      resourceType: result.resource_type as "image" | "video" | "raw",
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      duration: result.duration,
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "Failed to upload file to Cloudinary"
    );
  }
}

/**
 * Delete a file from Cloudinary
 */
export async function deleteFromCloudinary(
  publicId: string,
  resourceType: "image" | "video" | "raw" = "image"
): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "Failed to delete file from Cloudinary"
    );
  }
}

