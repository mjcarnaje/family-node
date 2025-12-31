import { createFileRoute } from "@tanstack/react-router";
import {
  findFamilyTreesByOwnerId,
  findPublicFamilyTrees,
} from "~/data-access/family-trees";
import {
  jsonResponse,
  errorResponse,
  getAuthenticatedUserIdFromRequest,
} from "~/utils/api-helpers";

/**
 * GET /api/v1/trees
 *
 * Returns a list of family trees accessible to the authenticated user.
 * - If authenticated: returns user's owned trees + public trees
 * - If not authenticated: returns only public trees
 *
 * Query parameters:
 * - filter: "owned" | "public" | "all" (default: "all")
 */
export const Route = createFileRoute("/api/v1/trees/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const filter = url.searchParams.get("filter") || "all";

          const userId = await getAuthenticatedUserIdFromRequest(request);

          let trees;

          if (filter === "public") {
            // Return only public trees
            trees = await findPublicFamilyTrees();
          } else if (filter === "owned" && userId) {
            // Return only owned trees (requires auth)
            trees = await findFamilyTreesByOwnerId(userId);
          } else if (filter === "owned" && !userId) {
            return errorResponse("Authentication required to view owned trees", 401);
          } else {
            // Return all accessible trees
            const publicTrees = await findPublicFamilyTrees();

            if (userId) {
              const ownedTrees = await findFamilyTreesByOwnerId(userId);
              // Combine and deduplicate (owned trees might be public too)
              const treeMap = new Map();
              for (const tree of [...ownedTrees, ...publicTrees]) {
                treeMap.set(tree.id, tree);
              }
              trees = Array.from(treeMap.values());
            } else {
              trees = publicTrees;
            }
          }

          return jsonResponse({
            success: true,
            data: trees,
            count: trees.length,
          });
        } catch (error) {
          console.error("Error fetching family trees:", error);
          return errorResponse("Failed to fetch family trees", 500);
        }
      },
    },
  },
});
