import { createFileRoute } from "@tanstack/react-router";
import {
  findFamilyTreeById,
  isUserFamilyTreeOwner,
} from "~/data-access/family-trees";
import { findFamilyMembersByTreeId } from "~/data-access/family-members";
import { findParentChildRelationshipsByTreeId } from "~/data-access/parent-child-relationships";
import { findMarriageConnectionsByTreeId } from "~/data-access/marriage-connections";
import {
  jsonResponse,
  errorResponse,
  getAuthenticatedUserIdFromRequest,
} from "~/utils/api-helpers";

/**
 * GET /api/v1/trees/:id/export
 *
 * Exports complete family tree data including:
 * - Tree metadata
 * - All family members
 * - All parent-child relationships
 * - All marriage connections
 *
 * This is useful for third-party integrations that need the complete tree data
 * in a single API call.
 */
export const Route = createFileRoute("/api/v1/trees/$id/export")({
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

          // Fetch all data in parallel for better performance
          const [members, relationships, marriages] = await Promise.all([
            findFamilyMembersByTreeId(id),
            findParentChildRelationshipsByTreeId(id),
            findMarriageConnectionsByTreeId(id),
          ]);

          return jsonResponse({
            success: true,
            data: {
              tree: {
                id: tree.id,
                name: tree.name,
                description: tree.description,
                isPublic: tree.isPublic,
                createdAt: tree.createdAt,
                updatedAt: tree.updatedAt,
              },
              members,
              relationships,
              marriages,
            },
            meta: {
              membersCount: members.length,
              relationshipsCount: relationships.length,
              marriagesCount: marriages.length,
              exportedAt: new Date().toISOString(),
            },
          });
        } catch (error) {
          console.error("Error exporting family tree:", error);
          return errorResponse("Failed to export family tree", 500);
        }
      },
    },
  },
});
