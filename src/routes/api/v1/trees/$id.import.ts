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
import {
  parseCSV,
  parseJSON,
  validateImportData,
  type BulkImportData,
  type BulkImportResult,
} from "~/fn/bulk-import";
import {
  createFamilyMembers,
  findFamilyMembersByTreeId,
} from "~/data-access/family-members";
import { createParentChildRelationships } from "~/data-access/parent-child-relationships";
import { createMarriageConnections } from "~/data-access/marriage-connections";
import {
  checkCanAddFamilyMembers,
  FamilyTreeLimitError,
} from "~/use-cases/family-tree-limits";
import { captureTreeVersion } from "~/use-cases/tree-versioning";
import type {
  Gender,
  RelationshipType,
  MarriageStatus,
} from "~/db/schema";

/**
 * POST /api/v1/trees/:id/import
 *
 * Imports family members from CSV or JSON data
 *
 * Request body can be:
 * - JSON with { format: "csv" | "json", content: string }
 * - Directly JSON import data { members: [...], relationships?: [...], marriages?: [...] }
 */
export const Route = createFileRoute("/api/v1/trees/$id/import")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const { id: familyTreeId } = params;

          if (!familyTreeId) {
            return errorResponse("Tree ID is required", 400);
          }

          // Check authentication
          const userId = await getAuthenticatedUserIdFromRequest(request);
          if (!userId) {
            return errorResponse("Authentication required", 401);
          }

          // Verify tree exists
          const tree = await findFamilyTreeById(familyTreeId);
          if (!tree) {
            return errorResponse("Family tree not found", 404);
          }

          // Verify ownership
          const isOwner = await isUserFamilyTreeOwner(userId, familyTreeId);
          if (!isOwner) {
            return errorResponse("Access denied to this family tree", 403);
          }

          // Parse request body
          const body = await request.json();
          let importData: BulkImportData | null = null;
          const parseErrors: string[] = [];

          // Handle different request formats
          if (body.format && body.content) {
            // Explicit format specification
            if (body.format === "csv") {
              const csvResult = parseCSV(body.content);
              if (csvResult.errors.length > 0) {
                parseErrors.push(...csvResult.errors);
              }
              if (csvResult.members.length > 0) {
                importData = {
                  familyTreeId,
                  members: csvResult.members,
                  relationships: [],
                  marriages: [],
                };
              }
            } else if (body.format === "json") {
              const jsonResult = parseJSON(body.content);
              if (jsonResult.errors.length > 0) {
                parseErrors.push(...jsonResult.errors);
              }
              if (jsonResult.data) {
                importData = {
                  ...jsonResult.data,
                  familyTreeId,
                };
              }
            } else {
              return errorResponse("Invalid format. Use 'csv' or 'json'", 400);
            }
          } else if (body.members) {
            // Direct JSON import data
            importData = {
              familyTreeId,
              members: body.members,
              relationships: body.relationships || [],
              marriages: body.marriages || [],
            };
          } else {
            return errorResponse(
              "Invalid request body. Provide either { format, content } or { members }",
              400
            );
          }

          if (!importData || importData.members.length === 0) {
            return errorResponse(
              parseErrors.length > 0
                ? `Parse errors: ${parseErrors.join(", ")}`
                : "No members to import",
              400
            );
          }

          // Validate import data
          const validation = validateImportData(importData);
          if (!validation.valid) {
            return errorResponse(
              `Validation errors: ${validation.errors.join(", ")}`,
              400
            );
          }

          // Check subscription limits
          try {
            await checkCanAddFamilyMembers(
              userId,
              familyTreeId,
              importData.members.length
            );
          } catch (error) {
            if (error instanceof FamilyTreeLimitError) {
              return errorResponse(error.message, 403);
            }
            throw error;
          }

          // Perform the import
          const result = await performBulkImport(
            importData,
            familyTreeId,
            userId
          );

          return jsonResponse({
            success: result.success,
            data: {
              membersCreated: result.membersCreated,
              relationshipsCreated: result.relationshipsCreated,
              marriagesCreated: result.marriagesCreated,
            },
            warnings: result.warnings,
            errors: result.errors,
          });
        } catch (error) {
          console.error("Error importing family members:", error);
          return errorResponse(
            error instanceof Error ? error.message : "Failed to import family members",
            500
          );
        }
      },
    },
  },
});

// Helper to find member by tempId or name
function findMemberInMap(
  tempIdMap: Map<string, string>,
  nameMap: Map<string, string>,
  tempId?: string,
  firstName?: string,
  lastName?: string
): string | null {
  if (tempId && tempIdMap.has(tempId)) {
    return tempIdMap.get(tempId)!;
  }
  if (firstName && lastName) {
    const nameKey = `${firstName.toLowerCase()}|${lastName.toLowerCase()}`;
    if (nameMap.has(nameKey)) {
      return nameMap.get(nameKey)!;
    }
  }
  return null;
}

async function performBulkImport(
  data: BulkImportData,
  familyTreeId: string,
  userId: string
): Promise<BulkImportResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Get existing members for duplicate checking
  const existingMembers = await findFamilyMembersByTreeId(familyTreeId);
  const existingNameSet = new Set(
    existingMembers.map(
      (m) => `${m.firstName.toLowerCase()}|${m.lastName.toLowerCase()}`
    )
  );

  // Filter and prepare members
  const membersToCreate = data.members
    .filter((m) => {
      const nameKey = `${m.firstName.toLowerCase()}|${m.lastName.toLowerCase()}`;
      if (existingNameSet.has(nameKey)) {
        warnings.push(`Skipped duplicate member: ${m.firstName} ${m.lastName}`);
        return false;
      }
      return true;
    })
    .map((m) => ({
      id: crypto.randomUUID(),
      familyTreeId,
      firstName: m.firstName,
      middleName: m.middleName || null,
      lastName: m.lastName,
      nickname: m.nickname || null,
      gender: m.gender as Gender | null,
      birthDate: m.birthDate || null,
      birthPlace: m.birthPlace || null,
      deathDate: m.deathDate || null,
      deathPlace: m.deathPlace || null,
      bio: m.bio || null,
      profileImageUrl: null,
      linkedUserId: null,
      _tempId: m.tempId,
    }));

  if (membersToCreate.length === 0) {
    return {
      success: false,
      membersCreated: 0,
      relationshipsCreated: 0,
      marriagesCreated: 0,
      errors: ["No valid members to import (all may be duplicates)"],
      warnings,
    };
  }

  // Create members
  const createdMembers = await createFamilyMembers(
    membersToCreate.map(({ _tempId, ...m }) => m)
  );

  // Build maps for relationship linking
  const tempIdMap = new Map<string, string>();
  const nameMap = new Map<string, string>();

  membersToCreate.forEach((m, i) => {
    const createdMember = createdMembers[i];
    if (m._tempId) {
      tempIdMap.set(m._tempId, createdMember.id);
    }
    const nameKey = `${m.firstName.toLowerCase()}|${m.lastName.toLowerCase()}`;
    nameMap.set(nameKey, createdMember.id);
  });

  // Add existing members to name map
  existingMembers.forEach((m) => {
    const nameKey = `${m.firstName.toLowerCase()}|${m.lastName.toLowerCase()}`;
    nameMap.set(nameKey, m.id);
  });

  // Create relationships
  let relationshipsCreated = 0;
  if (data.relationships && data.relationships.length > 0) {
    const relationshipsToCreate = data.relationships
      .map((r) => {
        const parentId = findMemberInMap(
          tempIdMap,
          nameMap,
          r.parentTempId,
          r.parentFirstName,
          r.parentLastName
        );
        const childId = findMemberInMap(
          tempIdMap,
          nameMap,
          r.childTempId,
          r.childFirstName,
          r.childLastName
        );

        if (!parentId || !childId) {
          warnings.push(
            `Could not link relationship: parent=${r.parentFirstName} ${r.parentLastName}, child=${r.childFirstName} ${r.childLastName}`
          );
          return null;
        }

        return {
          id: crypto.randomUUID(),
          familyTreeId,
          parentId,
          childId,
          relationshipType: r.relationshipType as RelationshipType,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (relationshipsToCreate.length > 0) {
      await createParentChildRelationships(relationshipsToCreate);
      relationshipsCreated = relationshipsToCreate.length;
    }
  }

  // Create marriages
  let marriagesCreated = 0;
  if (data.marriages && data.marriages.length > 0) {
    const marriagesToCreate = data.marriages
      .map((m) => {
        const spouse1Id = findMemberInMap(
          tempIdMap,
          nameMap,
          m.spouse1TempId,
          m.spouse1FirstName,
          m.spouse1LastName
        );
        const spouse2Id = findMemberInMap(
          tempIdMap,
          nameMap,
          m.spouse2TempId,
          m.spouse2FirstName,
          m.spouse2LastName
        );

        if (!spouse1Id || !spouse2Id) {
          warnings.push(
            `Could not link marriage: ${m.spouse1FirstName} ${m.spouse1LastName} - ${m.spouse2FirstName} ${m.spouse2LastName}`
          );
          return null;
        }

        return {
          id: crypto.randomUUID(),
          familyTreeId,
          spouse1Id,
          spouse2Id,
          marriageDate: m.marriageDate || null,
          marriagePlace: m.marriagePlace || null,
          divorceDate: m.divorceDate || null,
          status: m.status as MarriageStatus,
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);

    if (marriagesToCreate.length > 0) {
      await createMarriageConnections(marriagesToCreate);
      marriagesCreated = marriagesToCreate.length;
    }
  }

  // Capture version
  try {
    await captureTreeVersion(
      familyTreeId,
      userId,
      `Bulk imported ${createdMembers.length} member(s), ${relationshipsCreated} relationship(s), ${marriagesCreated} marriage(s)`,
      [
        {
          type: "BULK_IMPORT",
          entityType: "TREE",
          entityId: familyTreeId,
          oldData: null,
          newData: {
            membersImported: createdMembers.length,
            relationshipsImported: relationshipsCreated,
            marriagesImported: marriagesCreated,
          },
          description: `Bulk import: ${createdMembers.length} members, ${relationshipsCreated} relationships, ${marriagesCreated} marriages`,
        },
      ]
    );
  } catch (versionError) {
    console.error("Failed to capture tree version:", versionError);
    warnings.push("Failed to record import in version history");
  }

  return {
    success: true,
    membersCreated: createdMembers.length,
    relationshipsCreated,
    marriagesCreated,
    errors,
    warnings,
  };
}
