import { createFileRoute } from "@tanstack/react-router";
import {
  findFamilyTreeById,
  isUserFamilyTreeOwner,
} from "~/data-access/family-trees";
import { findFamilyMembersByTreeId } from "~/data-access/family-members";
import {
  jsonResponse,
  errorResponse,
  getAuthenticatedUserIdFromRequest,
} from "~/utils/api-helpers";

/**
 * GET /api/v1/trees/:id/members
 *
 * Returns all family members in a family tree.
 * - Returns the members if tree is public OR if the user is the owner
 * - Returns 404 if tree doesn't exist
 * - Returns 403 if tree is private and user is not the owner
 */
export const Route = createFileRoute("/api/v1/trees/$id/members")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const { id } = params;

          if (!id) {
            return errorResponse("Tree ID is required", 400);
          }

          const tree = await findFamilyTreeById(id);

          if (!tree) {
            return errorResponse("Family tree not found", 404);
          }

          // Check access permissions
          const userId = await getAuthenticatedUserIdFromRequest(request);

          if (!tree.isPublic) {
            // Private tree - require ownership
            if (!userId) {
              return errorResponse("Authentication required to access this tree", 401);
            }

            const isOwner = await isUserFamilyTreeOwner(userId, id);
            if (!isOwner) {
              return errorResponse("Access denied to this family tree", 403);
            }
          }

          const members = await findFamilyMembersByTreeId(id);

          return jsonResponse({
            success: true,
            data: members,
            count: members.length,
            treeId: id,
          });
        } catch (error) {
          console.error("Error fetching family members:", error);
          return errorResponse("Failed to fetch family members", 500);
        }
      },
    },
  },
});
