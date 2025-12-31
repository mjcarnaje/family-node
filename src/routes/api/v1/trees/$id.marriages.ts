import { createFileRoute } from "@tanstack/react-router";
import {
  findFamilyTreeById,
  isUserFamilyTreeOwner,
} from "~/data-access/family-trees";
import { findMarriageConnectionsByTreeId } from "~/data-access/marriage-connections";
import {
  jsonResponse,
  errorResponse,
  getAuthenticatedUserIdFromRequest,
} from "~/utils/api-helpers";

/**
 * GET /api/v1/trees/:id/marriages
 *
 * Returns all marriage connections in a family tree.
 * - Returns the marriages if tree is public OR if the user is the owner
 * - Returns 404 if tree doesn't exist
 * - Returns 403 if tree is private and user is not the owner
 */
export const Route = createFileRoute("/api/v1/trees/$id/marriages")({
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

          const marriages = await findMarriageConnectionsByTreeId(id);

          return jsonResponse({
            success: true,
            data: marriages,
            count: marriages.length,
            treeId: id,
          });
        } catch (error) {
          console.error("Error fetching marriages:", error);
          return errorResponse("Failed to fetch marriages", 500);
        }
      },
    },
  },
});
