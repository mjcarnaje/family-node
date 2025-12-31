import { createFileRoute } from "@tanstack/react-router";
import {
  findFamilyTreeById,
  isUserFamilyTreeOwner,
} from "~/data-access/family-trees";
import {
  jsonResponse,
  errorResponse,
  getAuthenticatedUserIdFromRequest,
} from "~/utils/api-helpers";

/**
 * GET /api/v1/trees/:id
 *
 * Returns a single family tree by ID.
 * - Returns the tree if it's public OR if the user is the owner
 * - Returns 404 if tree doesn't exist
 * - Returns 403 if tree is private and user is not the owner
 */
export const Route = createFileRoute("/api/v1/trees/$id")({
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

          return jsonResponse({
            success: true,
            data: tree,
          });
        } catch (error) {
          console.error("Error fetching family tree:", error);
          return errorResponse("Failed to fetch family tree", 500);
        }
      },
    },
  },
});
