# File Upload System with Cloudinary

This document explains how the application handles file uploads using Cloudinary with unsigned uploads for a simple, client-side upload experience.

## Architecture Overview

The file upload system uses a direct client-to-Cloudinary approach:

1. **Client-Side Upload**: Files are uploaded directly to Cloudinary from the browser
2. **No Server Processing**: Upload happens entirely client-side using unsigned uploads
3. **Stored URLs**: Cloudinary URLs are stored directly in the database

This approach provides several benefits:

- Zero server bandwidth for file uploads
- Built-in CDN delivery via Cloudinary
- Automatic image/video optimization and transformations
- Progress tracking on the client
- No presigned URLs or server coordination needed

## Key Components

### 1. Cloudinary Upload Utility (`src/utils/storage/cloudinary.ts`)

The main upload function handles all file types:

```typescript
export async function uploadToCloudinary(
  file: File,
  options?: CloudinaryUploadOptions
): Promise<CloudinaryUploadResult>;
```

**Options:**
- `folder`: Organize uploads (e.g., `posts/images`, `members/media`)
- `resourceType`: `image`, `video`, or `raw` (for PDFs, documents)
- `onProgress`: Callback for upload progress updates

**Result:**
- `publicId`: Cloudinary public ID for the asset
- `url`: HTTP URL
- `secureUrl`: HTTPS URL (use this one)
- `width`, `height`: Dimensions (for images/videos)
- `format`: File format
- `resourceType`: Type of resource

### 2. Media Upload Helpers (`src/utils/storage/media-helpers.ts`)

Higher-level functions for common upload scenarios:

```typescript
// Upload image with progress tracking
export async function uploadImage(
  file: File,
  folder: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<MediaUploadResult>;

// Upload video with progress tracking
export async function uploadVideo(
  file: File,
  folder: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<MediaUploadResult>;
```

**MediaUploadResult includes:**
- `id`: Unique identifier
- `publicId`: Cloudinary public ID
- `url`: HTTPS URL to the asset
- `fileName`, `fileSize`, `mimeType`: File metadata
- `type`: `image` or `video`

### 3. UI Components

#### MediaDropzone (`src/components/MediaDropzone.tsx`)

Drag-and-drop upload component with:

- File type validation (images and videos)
- Size limits (configurable)
- Progress indication per file
- Preview for uploaded files
- Error handling

#### ContentForm (`src/components/ContentForm.tsx`)

Module content upload form supporting:

- Videos, images, PDFs, and text content
- Progress bar during upload
- Cloudinary folder organization

## Storage Structure

Files are organized in Cloudinary with folder structure:

```
cloudinary/
├── posts/
│   ├── images/      # Post image attachments
│   └── videos/      # Post video attachments
├── comments/
│   ├── images/      # Comment image attachments
│   └── videos/      # Comment video attachments
├── members/
│   └── media/       # Family member photos/videos
├── modules/
│   ├── video/       # Educational video content
│   ├── image/       # Educational images
│   └── pdf/         # PDF documents
└── profile-images/  # User profile pictures
```

## Database Storage

With Cloudinary, we store URLs directly in the database:

**Attachment tables include:**
- `publicId`: Cloudinary public ID (for transformations/deletion)
- `url`: Direct HTTPS URL to the asset

No presigned URL generation needed - URLs are permanent and publicly accessible via Cloudinary CDN.

## How It Works: Upload Flow

1. **User selects file** in upload UI component
2. **Client uploads directly to Cloudinary** using unsigned upload preset
3. **Progress is tracked** via XMLHttpRequest progress events
4. **Cloudinary returns metadata** including URLs and dimensions
5. **Client saves URL to database** via server function

Example upload:

```typescript
const handleUpload = async (file: File) => {
  const result = await uploadToCloudinary(file, {
    folder: "posts/images",
    resourceType: "image",
    onProgress: (progress) => {
      setUploadProgress(progress.percentage);
    },
  });

  // Save to database
  await saveAttachment({
    publicId: result.publicId,
    url: result.secureUrl,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
  });
};
```

## How It Works: Display Flow

1. **Fetch attachment from database** (includes URL directly)
2. **Render with URL** - no additional API calls needed

```typescript
// URL is stored directly on the attachment
<img src={attachment.url} alt={attachment.fileName} />
```

## Configuration

Required environment variables:

```bash
# Cloudinary Configuration
VITE_CLOUDINARY_CLOUD_NAME="your-cloud-name"
VITE_CLOUDINARY_UPLOAD_PRESET="your-unsigned-preset"
```

### Setting Up Cloudinary

1. Create a Cloudinary account
2. Go to Settings > Upload > Upload Presets
3. Create an unsigned upload preset:
   - Signing Mode: Unsigned
   - Folder: (optional, can be set per-upload)
   - Enable auto-tagging and moderation as needed
4. Copy the preset name to your environment variables

## Unsigned vs Signed Uploads

This application uses **unsigned uploads** for simplicity:

**Pros:**
- No server-side Cloudinary SDK needed
- Direct browser-to-Cloudinary uploads
- Simpler architecture

**Cons:**
- Anyone with the cloud name and preset can upload
- Less control over upload parameters

For production with stricter security, consider:
- Rate limiting on your upload preset
- Enabling moderation in Cloudinary
- Using signed uploads with server-side signature generation

## Transformations

Cloudinary URLs support on-the-fly transformations:

```typescript
// Get a thumbnail version
const thumbnailUrl = attachment.url.replace(
  "/upload/",
  "/upload/w_200,h_200,c_fill/"
);

// Get optimized format
const optimizedUrl = attachment.url.replace(
  "/upload/",
  "/upload/f_auto,q_auto/"
);
```

Common transformations:
- `w_X,h_Y`: Resize to dimensions
- `c_fill`: Crop to fill dimensions
- `f_auto`: Automatic format (WebP, AVIF)
- `q_auto`: Automatic quality optimization

## Error Handling

The upload utilities include comprehensive error handling:

- Network errors during upload
- Invalid file types (checked client-side)
- Cloudinary API errors
- Progress events for user feedback

```typescript
try {
  const result = await uploadToCloudinary(file, options);
  // Success
} catch (error) {
  // Handle error - show toast, retry, etc.
  console.error("Upload failed:", error);
}
```
