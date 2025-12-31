import { createFileRoute } from "@tanstack/react-router";
import {
  getAuthenticatedUserIdFromRequest,
  jsonResponse,
  errorResponse,
} from "~/utils/api-helpers";
import { findGenealogyConnectionsByUserId } from "~/data-access/genealogy-connections";

// Service information
const GENEALOGY_SERVICES = {
  familysearch: {
    id: "familysearch",
    name: "FamilySearch",
    description: "Free genealogy service by The Church of Jesus Christ of Latter-day Saints",
    website: "https://www.familysearch.org",
    supportsOAuth: true,
    supportedFormats: ["gedcom", "json"],
  },
  ancestry: {
    id: "ancestry",
    name: "Ancestry",
    description: "World's largest online family history resource",
    website: "https://www.ancestry.com",
    supportsOAuth: true,
    supportedFormats: ["gedcom", "json"],
  },
  myheritage: {
    id: "myheritage",
    name: "MyHeritage",
    description: "Global platform for discovering family history",
    website: "https://www.myheritage.com",
    supportsOAuth: true,
    supportedFormats: ["gedcom", "json"],
  },
  findmypast: {
    id: "findmypast",
    name: "Findmypast",
    description: "British and Irish family history service",
    website: "https://www.findmypast.com",
    supportsOAuth: true,
    supportedFormats: ["gedcom"],
  },
  gedmatch: {
    id: "gedmatch",
    name: "GEDmatch",
    description: "DNA and genealogy comparison site",
    website: "https://www.gedmatch.com",
    supportsOAuth: false,
    supportedFormats: ["gedcom"],
  },
};

export const Route = createFileRoute("/api/v1/genealogy/services")({
  server: {
    handlers: {
      /**
       * GET /api/v1/genealogy/services
       * Get available genealogy services and user's connection status
       */
      GET: async ({ request }) => {
        try {
          const userId = await getAuthenticatedUserIdFromRequest(request);
          if (!userId) {
            return errorResponse("Authentication required", 401);
          }

          // Get user's connected services
          const connections = await findGenealogyConnectionsByUserId(userId);
          const connectedServiceIds = new Set(connections.map((c) => c.service));

          // Combine service info with connection status
          const services = Object.values(GENEALOGY_SERVICES).map((service) => ({
            ...service,
            isConnected: connectedServiceIds.has(service.id as keyof typeof GENEALOGY_SERVICES),
          }));

          return jsonResponse({
            success: true,
            data: services,
          });
        } catch (error) {
          console.error("Error fetching genealogy services:", error);
          return errorResponse("Failed to fetch genealogy services", 500);
        }
      },
    },
  },
});
