import { uploadToCloudinary, type CloudinaryUploadProgress } from "./cloudinary";
import { getVideoDuration, formatDuration } from "../video-duration";

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  publicId: string;
  url: string;
  duration: string; // formatted duration like "2:34"
  durationSeconds: number; // raw duration in seconds
}

export interface ImageUploadResult {
  publicId: string;
  url: string;
}

export async function uploadVideoToCloudinary(
  file: File,
  onProgress?: (progress: UploadProgress) => void,
  folder?: string
): Promise<UploadResult> {
  // Calculate video duration first
  const durationSeconds = await getVideoDuration(file);
  const duration = formatDuration(durationSeconds);

  const result = await uploadToCloudinary(file, {
    folder: folder || "videos",
    resourceType: "video",
    onProgress: onProgress
      ? (progress: CloudinaryUploadProgress) => {
          onProgress({
            loaded: progress.loaded,
            total: progress.total,
            percentage: progress.percentage,
          });
        }
      : undefined,
  });

  return {
    publicId: result.publicId,
    url: result.secureUrl,
    duration,
    durationSeconds,
  };
}

export async function uploadImageToCloudinary(
  file: File,
  onProgress?: (progress: UploadProgress) => void,
  folder?: string
): Promise<ImageUploadResult> {
  const result = await uploadToCloudinary(file, {
    folder: folder || "images",
    resourceType: "image",
    onProgress: onProgress
      ? (progress: CloudinaryUploadProgress) => {
          onProgress({
            loaded: progress.loaded,
            total: progress.total,
            percentage: progress.percentage,
          });
        }
      : undefined,
  });

  return {
    publicId: result.publicId,
    url: result.secureUrl,
  };
}
