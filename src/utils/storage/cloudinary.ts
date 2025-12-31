import { uploadFileFn } from "~/fn/cloudinary-upload";

export interface CloudinaryUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

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
  resourceType?: "image" | "video" | "auto";
  onProgress?: (progress: CloudinaryUploadProgress) => void;
}

/**
 * Upload a file to Cloudinary using server-side API
 * Converts file to base64 and sends to server function
 */
export async function uploadToCloudinary(
  file: File,
  options: CloudinaryUploadOptions = {}
): Promise<CloudinaryUploadResult> {
  const { folder, resourceType = "auto", onProgress } = options;

  // Convert file to base64
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

  // Simulate progress for compatibility
  if (onProgress) {
    // Simulate progress since we can't track server-side upload progress easily
    onProgress({ loaded: file.size * 0.5, total: file.size, percentage: 50 });
  }

  // Upload via server function
  const result = await uploadFileFn({
    data: {
      file: base64,
      fileName: file.name,
      folder,
      resourceType: resourceType === "auto" ? undefined : resourceType,
    },
  });

  if (onProgress) {
    onProgress({ loaded: file.size, total: file.size, percentage: 100 });
  }

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
}

/**
 * Generate a Cloudinary URL with optional transformations
 * Note: Cloud name is extracted from the publicId or secureUrl
 */
export function getCloudinaryUrl(
  publicId: string,
  options: {
    resourceType?: "image" | "video";
    transformation?: string;
    cloudName?: string;
  } = {}
): string {
  const { resourceType = "image", transformation, cloudName } = options;
  
  // If cloudName is provided, use it; otherwise extract from publicId if it's a full URL
  let baseUrl = `https://res.cloudinary.com`;
  if (cloudName) {
    baseUrl = `https://res.cloudinary.com/${cloudName}`;
  } else if (publicId.startsWith("http")) {
    // Extract cloud name from URL
    const match = publicId.match(/res\.cloudinary\.com\/([^/]+)/);
    if (match) {
      baseUrl = `https://res.cloudinary.com/${match[1]}`;
    }
  }

  const transformPart = transformation ? `${transformation}/` : "";

  return `${baseUrl}/${resourceType}/upload/${transformPart}${publicId}`;
}

/**
 * Get optimized image URL with auto format and quality
 */
export function getOptimizedImageUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    crop?: "fill" | "fit" | "scale" | "thumb";
    cloudName?: string;
  } = {}
): string {
  const { width, height, crop = "fill", cloudName } = options;

  const transforms: string[] = ["f_auto", "q_auto"];

  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  if (width || height) transforms.push(`c_${crop}`);

  const transformPart = transforms.join(",");

  return getCloudinaryUrl(publicId, {
    resourceType: "image",
    transformation: transformPart,
    cloudName,
  });
}
