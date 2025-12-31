import { createFileRoute } from "@tanstack/react-router";
import {
  findFamilyMemberById,
  updateFamilyMember,
  deleteFamilyMember,
} from "~/data-access/family-members";
import {
  findFamilyTreeById,
  isUserFamilyTreeOwner,
} from "~/data-access/family-trees";
import {
  jsonResponse,
  errorResponse,
  getAuthenticatedUserIdFromRequest,
  requireAuth,
} from "~/utils/api-helpers";
import type { Gender } from "~/db/schema";

/**
 * API routes for a specific family member
 *
 * GET /api/v1/family-members/:id - Get a family member by ID
 * PUT /api/v1/family-members/:id - Update a family member
 * DELETE /api/v1/family-members/:id - Delete a family member
 */
export const Route = createFileRoute("/api/v1/family-members/$id")({
  server: {
    handlers: {
      /**
       * GET /api/v1/family-members/:id
       * Returns a family member by ID.
       * Accessible if tree is public or user is the owner.
       */
      GET: async ({ request, params }) => {
        try {
          const { id } = params;

          if (!id) {
            return errorResponse("Family member ID is required", 400);
          }

          const member = await findFamilyMemberById(id);
          if (!member) {
            return errorResponse("Family member not found", 404);
          }

          // Check access to the tree
          const tree = await findFamilyTreeById(member.familyTreeId);
          if (!tree) {
            return errorResponse("Family tree not found", 404);
          }

          const userId = await getAuthenticatedUserIdFromRequest(request);

          if (!tree.isPublic) {
            if (!userId) {
              return errorResponse(
                "Authentication required to access this member",
                401
              );
            }

            const isOwner = await isUserFamilyTreeOwner(
              userId,
              member.familyTreeId
            );
            if (!isOwner) {
              return errorResponse("Access denied to this family member", 403);
            }
          }

          return jsonResponse({
            success: true,
            data: member,
          });
        } catch (error) {
          console.error("Error fetching family member:", error);
          return errorResponse("Failed to fetch family member", 500);
        }
      },

      /**
       * PUT /api/v1/family-members/:id
       * Updates a family member.
       * Requires authentication and tree ownership.
       */
      PUT: async ({ request, params }) => {
        try {
          const userId = await requireAuth(request);
          const { id } = params;

          if (!id) {
            return errorResponse("Family member ID is required", 400);
          }

          const member = await findFamilyMemberById(id);
          if (!member) {
            return errorResponse("Family member not found", 404);
          }

          // Check ownership
          const isOwner = await isUserFamilyTreeOwner(
            userId,
            member.familyTreeId
          );
          if (!isOwner) {
            return errorResponse(
              "Access denied: You don't own this family tree",
              403
            );
          }

          const body = await request.json();
          const {
            firstName,
            middleName,
            lastName,
            nickname,
            gender,
            birthDate,
            birthPlace,
            deathDate,
            deathPlace,
            bio,
            profileImageUrl,
            linkedUserId,
          } = body;

          const updateData: Record<string, unknown> = {};

          if (firstName !== undefined) updateData.firstName = firstName;
          if (middleName !== undefined)
            updateData.middleName = middleName || null;
          if (lastName !== undefined) updateData.lastName = lastName;
          if (nickname !== undefined) updateData.nickname = nickname || null;
          if (gender !== undefined)
            updateData.gender = (gender as Gender) || null;
          if (birthDate !== undefined)
            updateData.birthDate = birthDate || null;
          if (birthPlace !== undefined)
            updateData.birthPlace = birthPlace || null;
          if (deathDate !== undefined)
            updateData.deathDate = deathDate || null;
          if (deathPlace !== undefined)
            updateData.deathPlace = deathPlace || null;
          if (bio !== undefined) updateData.bio = bio || null;
          if (profileImageUrl !== undefined)
            updateData.profileImageUrl = profileImageUrl || null;
          if (linkedUserId !== undefined)
            updateData.linkedUserId = linkedUserId || null;

          const updatedMember = await updateFamilyMember(id, updateData);

          if (!updatedMember) {
            return errorResponse("Failed to update family member", 500);
          }

          return jsonResponse({
            success: true,
            data: updatedMember,
            message: "Family member updated successfully",
          });
        } catch (error) {
          if (error instanceof Error && error.message === "Unauthorized") {
            return errorResponse("Authentication required", 401);
          }
          console.error("Error updating family member:", error);
          return errorResponse("Failed to update family member", 500);
        }
      },

      /**
       * DELETE /api/v1/family-members/:id
       * Deletes a family member.
       * Requires authentication and tree ownership.
       */
      DELETE: async ({ request, params }) => {
        try {
          const userId = await requireAuth(request);
          const { id } = params;

          if (!id) {
            return errorResponse("Family member ID is required", 400);
          }

          const member = await findFamilyMemberById(id);
          if (!member) {
            return errorResponse("Family member not found", 404);
          }

          // Check ownership
          const isOwner = await isUserFamilyTreeOwner(
            userId,
            member.familyTreeId
          );
          if (!isOwner) {
            return errorResponse(
              "Access denied: You don't own this family tree",
              403
            );
          }

          const deleted = await deleteFamilyMember(id);

          if (!deleted) {
            return errorResponse("Failed to delete family member", 500);
          }

          return jsonResponse({
            success: true,
            message: "Family member deleted successfully",
          });
        } catch (error) {
          if (error instanceof Error && error.message === "Unauthorized") {
            return errorResponse("Authentication required", 401);
          }
          console.error("Error deleting family member:", error);
          return errorResponse("Failed to delete family member", 500);
        }
      },
    },
  },
});
