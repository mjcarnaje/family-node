import { publicEnv } from "~/config/publicEnv";

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
 * Upload a file to Cloudinary using unsigned upload
 */
export async function uploadToCloudinary(
  file: File,
  options: CloudinaryUploadOptions = {}
): Promise<CloudinaryUploadResult> {
  const { folder, resourceType = "auto", onProgress } = options;

  const cloudName = publicEnv.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = publicEnv.CLOUDINARY_UPLOAD_PRESET;

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  if (folder) {
    formData.append("folder", folder);
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percentage: Math.round((event.loaded / event.total) * 100),
        });
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve({
            publicId: response.public_id,
            secureUrl: response.secure_url,
            format: response.format,
            resourceType: response.resource_type,
            bytes: response.bytes,
            width: response.width,
            height: response.height,
            duration: response.duration,
          });
        } catch {
          reject(new Error("Failed to parse Cloudinary response"));
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(
            new Error(error.error?.message || `Upload failed: ${xhr.statusText}`)
          );
        } catch {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error("Upload failed: Network error"));
    };

    xhr.open("POST", url);
    xhr.send(formData);
  });
}

/**
 * Generate a Cloudinary URL with optional transformations
 */
export function getCloudinaryUrl(
  publicId: string,
  options: {
    resourceType?: "image" | "video";
    transformation?: string;
  } = {}
): string {
  const { resourceType = "image", transformation } = options;
  const cloudName = publicEnv.CLOUDINARY_CLOUD_NAME;

  const transformPart = transformation ? `${transformation}/` : "";

  return `https://res.cloudinary.com/${cloudName}/${resourceType}/upload/${transformPart}${publicId}`;
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
  } = {}
): string {
  const { width, height, crop = "fill" } = options;
  const cloudName = publicEnv.CLOUDINARY_CLOUD_NAME;

  const transforms: string[] = ["f_auto", "q_auto"];

  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  if (width || height) transforms.push(`c_${crop}`);

  const transformPart = transforms.join(",");

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformPart}/${publicId}`;
}
