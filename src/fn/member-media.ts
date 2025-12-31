import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  createMemberMedia,
  createMemberMediaBatch,
  findMediaByMemberId,
  findMemberMediaById,
  deleteMemberMedia,
  updateMemberMedia,
} from "~/data-access/member-media";
import { findFamilyMemberById } from "~/data-access/family-members";
import type { MemberMediaType } from "~/db/schema";

// With Cloudinary, uploads happen directly from the client
// Server only saves/retrieves metadata and validates ownership

// Save member media after Cloudinary upload
export const saveMemberMediaFn = createServerFn({ method: "POST" })
  .middleware([authenticatedMiddleware])
  .inputValidator(
    z.object({
      familyMemberId: z.string(),
      familyTreeId: z.string(),
      media: z.array(
        z.object({
          id: z.string(),
          publicId: z.string(), // Cloudinary public_id
          url: z.string(), // Cloudinary secure_url
          fileName: z.string(),
          fileSize: z.number(),
          mimeType: z.string(),
          type: z.enum(["image", "video"]),
          caption: z.string().optional(),
          position: z.number(),
        })
      ),
    })
  )
  .handler(async ({ data, context }) => {
    const { familyMemberId, familyTreeId, media } = data;

    // Verify family member exists
    const member = await findFamilyMemberById(familyMemberId);
    if (!member) {
      throw new Error("Family member not found");
    }

    // Verify the member belongs to the specified tree
    if (member.familyTreeId !== familyTreeId) {
      throw new Error("Family member does not belong to this tree");
    }

    const mediaRecords = media.map((m) => ({
      id: m.id,
      familyMemberId,
      familyTreeId,
      type: m.type as MemberMediaType,
      publicId: m.publicId,
      url: m.url,
      fileName: m.fileName,
      fileSize: m.fileSize,
      mimeType: m.mimeType,
      caption: m.caption || null,
      position: m.position,
      uploadedByUserId: context.userId,
    }));

    const created = await createMemberMediaBatch(mediaRecords);
    return created;
  });

// Get all media for a family member
export const getMemberMediaFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ familyMemberId: z.string() }))
  .handler(async ({ data }) => {
    return await findMediaByMemberId(data.familyMemberId);
  });

// Update member media (caption, position)
export const updateMemberMediaFn = createServerFn({ method: "POST" })
  .middleware([authenticatedMiddleware])
  .inputValidator(
    z.object({
      id: z.string(),
      caption: z.string().optional(),
      position: z.number().optional(),
    })
  )
  .handler(async ({ data }) => {
    const { id, ...updateData } = data;

    const media = await findMemberMediaById(id);
    if (!media) {
      throw new Error("Media not found");
    }

    const updated = await updateMemberMedia(id, updateData);
    return updated;
  });

// Delete member media
export const deleteMemberMediaFn = createServerFn({ method: "POST" })
  .middleware([authenticatedMiddleware])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const media = await findMemberMediaById(data.id);
    if (!media) {
      throw new Error("Media not found");
    }

    // Note: Cloudinary file deletion requires server-side API with secret
    // For unsigned uploads, cleanup is done via Cloudinary dashboard or scheduled job
    // We just delete from our database

    await deleteMemberMedia(data.id);
    return { success: true };
  });
