import { createFileRoute } from "@tanstack/react-router";
import {
  createFamilyMember,
} from "~/data-access/family-members";
import {
  findFamilyTreeById,
  isUserFamilyTreeOwner,
} from "~/data-access/family-trees";
import {
  checkCanAddFamilyMember,
  FamilyTreeLimitError,
} from "~/use-cases/family-tree-limits";
import {
  jsonResponse,
  errorResponse,
  requireAuth,
} from "~/utils/api-helpers";
import type { Gender } from "~/db/schema";

/**
 * POST /api/v1/family-members
 *
 * Creates a new family member in a family tree.
 * Requires authentication and tree ownership.
 */
export const Route = createFileRoute("/api/v1/family-members/")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const userId = await requireAuth(request);
          const body = await request.json();

          const {
            familyTreeId,
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

          // Validate required fields
          if (!familyTreeId) {
            return errorResponse("Family tree ID is required", 400);
          }

          if (!firstName || !lastName) {
            return errorResponse("First name and last name are required", 400);
          }

          // Check tree exists
          const tree = await findFamilyTreeById(familyTreeId);
          if (!tree) {
            return errorResponse("Family tree not found", 404);
          }

          // Check ownership
          const isOwner = await isUserFamilyTreeOwner(userId, familyTreeId);
          if (!isOwner) {
            return errorResponse(
              "Access denied: You don't own this family tree",
              403
            );
          }

          // Check subscription limits
          try {
            await checkCanAddFamilyMember(userId, familyTreeId);
          } catch (error) {
            if (error instanceof FamilyTreeLimitError) {
              return errorResponse(error.message, 403);
            }
            throw error;
          }

          // Create the family member
          const familyMemberData = {
            id: crypto.randomUUID(),
            familyTreeId,
            firstName,
            middleName: middleName || null,
            lastName,
            nickname: nickname || null,
            gender: (gender as Gender) || null,
            birthDate: birthDate || null,
            birthPlace: birthPlace || null,
            deathDate: deathDate || null,
            deathPlace: deathPlace || null,
            bio: bio || null,
            profileImageUrl: profileImageUrl || null,
            linkedUserId: linkedUserId || null,
          };

          const newMember = await createFamilyMember(familyMemberData);

          return jsonResponse(
            {
              success: true,
              data: newMember,
              message: "Family member created successfully",
            },
            201
          );
        } catch (error) {
          if (error instanceof Error && error.message === "Unauthorized") {
            return errorResponse("Authentication required", 401);
          }
          console.error("Error creating family member:", error);
          return errorResponse("Failed to create family member", 500);
        }
      },
    },
  },
});
