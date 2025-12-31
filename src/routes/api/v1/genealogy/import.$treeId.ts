import { createFileRoute } from "@tanstack/react-router";
import {
  getAuthenticatedUserIdFromRequest,
  jsonResponse,
  errorResponse,
} from "~/utils/api-helpers";
import { findFamilyTreeById, isUserFamilyTreeOwner } from "~/data-access/family-trees";
import { findGenealogyImportsByTreeId } from "~/data-access/genealogy-imports";

export const Route = createFileRoute("/api/v1/genealogy/import/$treeId")({
  server: {
    handlers: {
      /**
       * GET /api/v1/genealogy/import/:treeId
       * Get import history for a family tree
       */
      GET: async ({ request, params }) => {
        try {
          const userId = await getAuthenticatedUserIdFromRequest(request);
          if (!userId) {
            return errorResponse("Authentication required", 401);
          }

          const { treeId } = params;
          if (!treeId) {
            return errorResponse("Tree ID is required", 400);
          }

          // Verify tree exists
          const tree = await findFamilyTreeById(treeId);
          if (!tree) {
            return errorResponse("Family tree not found", 404);
          }

          // Verify user has access
          const isOwner = await isUserFamilyTreeOwner(userId, treeId);
          if (!isOwner) {
            return errorResponse("You don't have permission to view this tree", 403);
          }

          // Get import history
          const imports = await findGenealogyImportsByTreeId(treeId);

          return jsonResponse({
            success: true,
            data: imports,
            meta: {
              count: imports.length,
              treeId,
            },
          });
        } catch (error) {
          console.error("Error fetching import history:", error);
          return errorResponse("Failed to fetch import history", 500);
        }
      },
    },
  },
});
