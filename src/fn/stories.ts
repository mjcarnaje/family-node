import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  createStory,
  findStoryById,
  findStoriesByMemberId,
  updateStory,
  deleteStory,
} from "~/data-access/stories";
import {
  findFamilyTreeById,
  isUserFamilyTreeOwner,
} from "~/data-access/family-trees";
import { findFamilyMemberById } from "~/data-access/family-members";
import type { StoryType } from "~/db/schema";

// Validation schemas
const storyTypeSchema = z.enum([
  "biography",
  "memory",
  "story",
  "document",
  "milestone",
]);

const createStorySchema = z.object({
  familyMemberId: z.string().min(1, "Family member ID is required"),
  familyTreeId: z.string().min(1, "Family tree ID is required"),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters"),
  content: z
    .string()
    .min(1, "Content is required")
    .max(50000, "Content must be less than 50000 characters"),
  storyType: storyTypeSchema.optional().default("story"),
  eventDate: z.string().nullable().optional(),
});

const updateStorySchema = z.object({
  id: z.string().min(1, "Story ID is required"),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters")
    .optional(),
  content: z
    .string()
    .min(1, "Content is required")
    .max(50000, "Content must be less than 50000 characters")
    .optional(),
  storyType: storyTypeSchema.optional(),
  eventDate: z.string().nullable().optional(),
});

/**
 * Create a new story for a family member
 * Requires authentication and ownership of the family tree
 */
export const createStoryFn = createServerFn({
  method: "POST",
})
  .inputValidator(createStorySchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Verify the family tree exists
    const familyTree = await findFamilyTreeById(data.familyTreeId);
    if (!familyTree) {
      throw new Error("Family tree not found");
    }

    // Verify the user owns the family tree
    const isOwner = await isUserFamilyTreeOwner(
      context.userId,
      data.familyTreeId
    );
    if (!isOwner) {
      throw new Error(
        "Unauthorized: You don't have permission to add stories to this family tree"
      );
    }

    // Verify the family member exists and belongs to this tree
    const familyMember = await findFamilyMemberById(data.familyMemberId);
    if (!familyMember) {
      throw new Error("Family member not found");
    }
    if (familyMember.familyTreeId !== data.familyTreeId) {
      throw new Error("Family member does not belong to this family tree");
    }

    // Create the story
    const storyData = {
      id: crypto.randomUUID(),
      familyMemberId: data.familyMemberId,
      familyTreeId: data.familyTreeId,
      title: data.title,
      content: data.content,
      storyType: (data.storyType || "story") as StoryType,
      eventDate: data.eventDate || null,
      createdByUserId: context.userId,
    };

    const newStory = await createStory(storyData);

    return newStory;
  });

/**
 * Get a single story by ID
 * Requires authentication and access to the family tree
 */
export const getStoryByIdFn = createServerFn({
  method: "GET",
})
  .inputValidator(z.object({ id: z.string().min(1, "ID is required") }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const story = await findStoryById(data.id);
    if (!story) {
      throw new Error("Story not found");
    }

    // Verify access to the family tree (owner or public)
    const familyTree = await findFamilyTreeById(story.familyTreeId);
    if (!familyTree) {
      throw new Error("Family tree not found");
    }

    const isOwner = familyTree.ownerId === context.userId;
    const isPublic = familyTree.isPublic;

    if (!isOwner && !isPublic) {
      throw new Error(
        "Unauthorized: You don't have permission to view this story"
      );
    }

    return story;
  });

/**
 * Get all stories for a family member
 * Requires authentication and access to the family tree
 */
export const getStoriesByMemberIdFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      familyMemberId: z.string().min(1, "Family member ID is required"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Verify the family member exists
    const familyMember = await findFamilyMemberById(data.familyMemberId);
    if (!familyMember) {
      throw new Error("Family member not found");
    }

    // Verify access to the family tree
    const familyTree = await findFamilyTreeById(familyMember.familyTreeId);
    if (!familyTree) {
      throw new Error("Family tree not found");
    }

    const isOwner = familyTree.ownerId === context.userId;
    const isPublic = familyTree.isPublic;

    if (!isOwner && !isPublic) {
      throw new Error(
        "Unauthorized: You don't have permission to view stories for this family member"
      );
    }

    const stories = await findStoriesByMemberId(data.familyMemberId);
    return stories;
  });

/**
 * Update a story
 * Requires authentication and ownership of the family tree
 */
export const updateStoryFn = createServerFn({
  method: "POST",
})
  .inputValidator(updateStorySchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { id, ...updateData } = data;

    // Verify the story exists
    const existingStory = await findStoryById(id);
    if (!existingStory) {
      throw new Error("Story not found");
    }

    // Verify the user owns the family tree
    const isOwner = await isUserFamilyTreeOwner(
      context.userId,
      existingStory.familyTreeId
    );
    if (!isOwner) {
      throw new Error(
        "Unauthorized: You don't have permission to update this story"
      );
    }

    // Update the story
    const updatedStory = await updateStory(id, {
      title: updateData.title,
      content: updateData.content,
      storyType: updateData.storyType as StoryType | undefined,
      eventDate: updateData.eventDate,
    });

    if (!updatedStory) {
      throw new Error("Failed to update story");
    }

    return updatedStory;
  });

/**
 * Delete a story
 * Requires authentication and ownership of the family tree
 */
export const deleteStoryFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ id: z.string().min(1, "ID is required") }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const { id } = data;

    // Verify the story exists
    const existingStory = await findStoryById(id);
    if (!existingStory) {
      throw new Error("Story not found");
    }

    // Verify the user owns the family tree
    const isOwner = await isUserFamilyTreeOwner(
      context.userId,
      existingStory.familyTreeId
    );
    if (!isOwner) {
      throw new Error(
        "Unauthorized: You don't have permission to delete this story"
      );
    }

    // Delete the story
    const deleted = await deleteStory(id);
    if (!deleted) {
      throw new Error("Failed to delete story");
    }

    return { success: true };
  });
