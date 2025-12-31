import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  createFamilyMembers,
  findFamilyMembersByTreeId,
} from "~/data-access/family-members";
import { createParentChildRelationships } from "~/data-access/parent-child-relationships";
import { createMarriageConnections } from "~/data-access/marriage-connections";
import {
  findFamilyTreeById,
  isUserFamilyTreeOwner,
} from "~/data-access/family-trees";
import {
  findGenealogyConnectionsByUserId,
  findGenealogyConnectionByUserAndService,
  createGenealogyConnection,
  updateGenealogyConnection,
  deleteGenealogyConnection,
} from "~/data-access/genealogy-connections";
import {
  createGenealogyImport,
  updateGenealogyImportStatus,
  findGenealogyImportsByTreeId,
  createExternalMemberReferences,
  findExternalReferenceByExternalId,
} from "~/data-access/genealogy-imports";
import { captureTreeVersion } from "~/use-cases/tree-versioning";
import type {
  Gender,
  RelationshipType,
  MarriageStatus,
  GenealogyService,
} from "~/db/schema";

// ============================================
// Types for Genealogy Data
// ============================================

// GEDCOM-style person data from genealogy services
export interface GenealogyPerson {
  id: string; // External ID from the service
  firstName: string;
  middleName?: string | null;
  lastName: string;
  nickname?: string | null;
  gender?: "male" | "female" | "other" | null;
  birthDate?: string | null;
  birthPlace?: string | null;
  deathDate?: string | null;
  deathPlace?: string | null;
  bio?: string | null;
  externalUrl?: string | null;
}

export interface GenealogyRelationship {
  parentId: string; // External parent ID
  childId: string; // External child ID
  type?: "biological" | "adopted" | "step" | "foster";
}

export interface GenealogyMarriage {
  spouse1Id: string; // External spouse 1 ID
  spouse2Id: string; // External spouse 2 ID
  marriageDate?: string | null;
  marriagePlace?: string | null;
  divorceDate?: string | null;
  status?: "married" | "divorced" | "widowed" | "separated" | "annulled";
}

export interface GenealogyTreeData {
  service: GenealogyService;
  sourceTreeId?: string;
  sourceTreeName?: string;
  persons: GenealogyPerson[];
  relationships: GenealogyRelationship[];
  marriages: GenealogyMarriage[];
}

// Service configuration
const GENEALOGY_SERVICES = {
  familysearch: {
    name: "FamilySearch",
    description: "Free genealogy service by The Church of Jesus Christ of Latter-day Saints",
    website: "https://www.familysearch.org",
    supportsOAuth: true,
    supportedFormats: ["gedcom", "json"],
  },
  ancestry: {
    name: "Ancestry",
    description: "World's largest online family history resource",
    website: "https://www.ancestry.com",
    supportsOAuth: true,
    supportedFormats: ["gedcom", "json"],
  },
  myheritage: {
    name: "MyHeritage",
    description: "Global platform for discovering family history",
    website: "https://www.myheritage.com",
    supportsOAuth: true,
    supportedFormats: ["gedcom", "json"],
  },
  findmypast: {
    name: "Findmypast",
    description: "British and Irish family history service",
    website: "https://www.findmypast.com",
    supportsOAuth: true,
    supportedFormats: ["gedcom"],
  },
  gedmatch: {
    name: "GEDmatch",
    description: "DNA and genealogy comparison site",
    website: "https://www.gedmatch.com",
    supportsOAuth: false,
    supportedFormats: ["gedcom"],
  },
} as const;

// Validation schemas
const genealogyServiceSchema = z.enum([
  "familysearch",
  "ancestry",
  "myheritage",
  "findmypast",
  "gedmatch",
]);

const genealogyPersonSchema = z.object({
  id: z.string().min(1),
  firstName: z.string().min(1),
  middleName: z.string().nullable().optional(),
  lastName: z.string().min(1),
  nickname: z.string().nullable().optional(),
  gender: z.enum(["male", "female", "other"]).nullable().optional(),
  birthDate: z.string().nullable().optional(),
  birthPlace: z.string().nullable().optional(),
  deathDate: z.string().nullable().optional(),
  deathPlace: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  externalUrl: z.string().nullable().optional(),
});

const genealogyRelationshipSchema = z.object({
  parentId: z.string().min(1),
  childId: z.string().min(1),
  type: z.enum(["biological", "adopted", "step", "foster"]).optional().default("biological"),
});

const genealogyMarriageSchema = z.object({
  spouse1Id: z.string().min(1),
  spouse2Id: z.string().min(1),
  marriageDate: z.string().nullable().optional(),
  marriagePlace: z.string().nullable().optional(),
  divorceDate: z.string().nullable().optional(),
  status: z.enum(["married", "divorced", "widowed", "separated", "annulled"]).optional().default("married"),
});

const genealogyImportSchema = z.object({
  familyTreeId: z.string().min(1),
  service: genealogyServiceSchema,
  sourceTreeId: z.string().optional(),
  sourceTreeName: z.string().optional(),
  persons: z.array(genealogyPersonSchema).min(1),
  relationships: z.array(genealogyRelationshipSchema).optional().default([]),
  marriages: z.array(genealogyMarriageSchema).optional().default([]),
  options: z.object({
    importRelationships: z.boolean().optional(),
    importEvents: z.boolean().optional(),
    skipDuplicates: z.boolean().optional(),
  }).optional(),
});

// ============================================
// Server Functions
// ============================================

/**
 * Get available genealogy services
 */
export const getGenealogyServicesFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async () => {
    return Object.entries(GENEALOGY_SERVICES).map(([key, value]) => ({
      id: key as GenealogyService,
      ...value,
    }));
  });

/**
 * Get user's connected genealogy services
 */
export const getConnectedGenealogyServicesFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const connections = await findGenealogyConnectionsByUserId(context.userId);
    return connections.map((conn) => ({
      ...conn,
      serviceInfo: GENEALOGY_SERVICES[conn.service],
    }));
  });

/**
 * Connect a genealogy service (save connection details)
 */
export const connectGenealogyServiceFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      service: genealogyServiceSchema,
      accessToken: z.string().optional(),
      refreshToken: z.string().optional(),
      tokenExpiresAt: z.string().optional(),
      externalUserId: z.string().optional(),
      externalUsername: z.string().optional(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Check if connection already exists
    const existing = await findGenealogyConnectionByUserAndService(
      context.userId,
      data.service
    );

    if (existing) {
      // Update existing connection
      const updated = await updateGenealogyConnection(existing.id, {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenExpiresAt: data.tokenExpiresAt ? new Date(data.tokenExpiresAt) : null,
        externalUserId: data.externalUserId,
        externalUsername: data.externalUsername,
        isActive: true,
      });
      return { success: true, connection: updated, isNew: false };
    }

    // Create new connection
    const connection = await createGenealogyConnection({
      id: crypto.randomUUID(),
      userId: context.userId,
      service: data.service,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      tokenExpiresAt: data.tokenExpiresAt ? new Date(data.tokenExpiresAt) : null,
      externalUserId: data.externalUserId,
      externalUsername: data.externalUsername,
      isActive: true,
    });

    return { success: true, connection, isNew: true };
  });

/**
 * Disconnect a genealogy service
 */
export const disconnectGenealogyServiceFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      service: genealogyServiceSchema,
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const connection = await findGenealogyConnectionByUserAndService(
      context.userId,
      data.service
    );

    if (!connection) {
      return { success: false, error: "Connection not found" };
    }

    await deleteGenealogyConnection(connection.id);
    return { success: true };
  });

/**
 * Get import history for a family tree
 */
export const getGenealogyImportHistoryFn = createServerFn({
  method: "GET",
})
  .inputValidator(
    z.object({
      familyTreeId: z.string().min(1),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    // Verify tree access
    const isOwner = await isUserFamilyTreeOwner(context.userId, data.familyTreeId);
    if (!isOwner) {
      throw new Error("You don't have permission to view import history for this tree");
    }

    const imports = await findGenealogyImportsByTreeId(data.familyTreeId);
    return imports.map((imp) => ({
      ...imp,
      serviceInfo: GENEALOGY_SERVICES[imp.service],
    }));
  });

/**
 * Import data from a genealogy service
 */
export const importFromGenealogyServiceFn = createServerFn({
  method: "POST",
})
  .inputValidator(genealogyImportSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Verify the family tree exists
    const familyTree = await findFamilyTreeById(data.familyTreeId);
    if (!familyTree) {
      return {
        success: false,
        importId: null,
        membersCreated: 0,
        relationshipsCreated: 0,
        marriagesCreated: 0,
        duplicatesSkipped: 0,
        errors: ["Family tree not found"],
        warnings: [],
      };
    }

    // Verify the user owns the family tree
    const isOwner = await isUserFamilyTreeOwner(context.userId, data.familyTreeId);
    if (!isOwner) {
      return {
        success: false,
        importId: null,
        membersCreated: 0,
        relationshipsCreated: 0,
        marriagesCreated: 0,
        duplicatesSkipped: 0,
        errors: ["Unauthorized: You don't have permission to import members to this family tree"],
        warnings: [],
      };
    }

    // Create import session record
    const importSession = await createGenealogyImport({
      id: crypto.randomUUID(),
      familyTreeId: data.familyTreeId,
      userId: context.userId,
      service: data.service,
      sourceTreeId: data.sourceTreeId,
      sourceTreeName: data.sourceTreeName,
      importRelationships: data.options?.importRelationships ?? true,
      importEvents: data.options?.importEvents ?? true,
      skipDuplicates: data.options?.skipDuplicates ?? true,
      status: "in_progress",
      startedAt: new Date(),
    });

    try {
      // Get existing members for duplicate checking
      const existingMembers = await findFamilyMembersByTreeId(data.familyTreeId);
      const existingNameSet = new Set(
        existingMembers.map((m) => `${m.firstName.toLowerCase()}|${m.lastName.toLowerCase()}`)
      );

      // Check for existing external references to avoid re-importing
      const externalIdToMemberMap = new Map<string, string>();
      let duplicatesSkipped = 0;

      // Filter and prepare members for import
      const membersToCreate = data.persons
        .filter((p) => {
          // Check if already imported via external reference
          if (data.options?.skipDuplicates) {
            const nameKey = `${p.firstName.toLowerCase()}|${p.lastName.toLowerCase()}`;
            if (existingNameSet.has(nameKey)) {
              warnings.push(`Skipped duplicate member: ${p.firstName} ${p.lastName}`);
              duplicatesSkipped++;
              return false;
            }
          }
          return true;
        })
        .map((p) => ({
          id: crypto.randomUUID(),
          familyTreeId: data.familyTreeId,
          firstName: p.firstName,
          middleName: p.middleName || null,
          lastName: p.lastName,
          nickname: p.nickname || null,
          gender: p.gender as Gender | null,
          birthDate: p.birthDate || null,
          birthPlace: p.birthPlace || null,
          deathDate: p.deathDate || null,
          deathPlace: p.deathPlace || null,
          bio: p.bio || null,
          profileImageUrl: null,
          linkedUserId: null,
          _externalId: p.id,
          _externalUrl: p.externalUrl,
        }));

      if (membersToCreate.length === 0) {
        await updateGenealogyImportStatus(importSession.id, "completed", {
          membersImported: 0,
          relationshipsImported: 0,
          eventsImported: 0,
          duplicatesSkipped,
          errorsCount: 0,
        });

        return {
          success: true,
          importId: importSession.id,
          membersCreated: 0,
          relationshipsCreated: 0,
          marriagesCreated: 0,
          duplicatesSkipped,
          errors: [],
          warnings: [...warnings, "No new members to import (all may be duplicates)"],
        };
      }

      // Create members in database
      const createdMembers = await createFamilyMembers(
        membersToCreate.map(({ _externalId, _externalUrl, ...m }) => m)
      );

      // Build external ID to internal ID mapping
      membersToCreate.forEach((m, i) => {
        externalIdToMemberMap.set(m._externalId, createdMembers[i].id);
      });

      // Also add existing members to the name map for relationship linking
      existingMembers.forEach((m) => {
        const nameKey = `${m.firstName.toLowerCase()}|${m.lastName.toLowerCase()}`;
        // Don't overwrite if already mapped
        if (!externalIdToMemberMap.has(nameKey)) {
          externalIdToMemberMap.set(nameKey, m.id);
        }
      });

      // Create external member references for traceability
      const externalReferences = membersToCreate.map((m, i) => ({
        id: crypto.randomUUID(),
        familyMemberId: createdMembers[i].id,
        familyTreeId: data.familyTreeId,
        service: data.service,
        externalId: m._externalId,
        externalUrl: m._externalUrl,
        externalData: null,
      }));

      await createExternalMemberReferences(externalReferences);

      // Create parent-child relationships
      let relationshipsCreated = 0;
      if (data.options?.importRelationships && data.relationships && data.relationships.length > 0) {
        const relationshipsToCreate = data.relationships
          .map((r) => {
            const parentId = externalIdToMemberMap.get(r.parentId);
            const childId = externalIdToMemberMap.get(r.childId);

            if (!parentId) {
              warnings.push(`Could not find parent with external ID: ${r.parentId}`);
              return null;
            }
            if (!childId) {
              warnings.push(`Could not find child with external ID: ${r.childId}`);
              return null;
            }

            return {
              id: crypto.randomUUID(),
              familyTreeId: data.familyTreeId,
              parentId,
              childId,
              relationshipType: (r.type || "biological") as RelationshipType,
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
            const spouse1Id = externalIdToMemberMap.get(m.spouse1Id);
            const spouse2Id = externalIdToMemberMap.get(m.spouse2Id);

            if (!spouse1Id) {
              warnings.push(`Could not find spouse 1 with external ID: ${m.spouse1Id}`);
              return null;
            }
            if (!spouse2Id) {
              warnings.push(`Could not find spouse 2 with external ID: ${m.spouse2Id}`);
              return null;
            }

            return {
              id: crypto.randomUUID(),
              familyTreeId: data.familyTreeId,
              spouse1Id,
              spouse2Id,
              marriageDate: m.marriageDate || null,
              marriagePlace: m.marriagePlace || null,
              divorceDate: m.divorceDate || null,
              status: (m.status || "married") as MarriageStatus,
            };
          })
          .filter((m): m is NonNullable<typeof m> => m !== null);

        if (marriagesToCreate.length > 0) {
          await createMarriageConnections(marriagesToCreate);
          marriagesCreated = marriagesToCreate.length;
        }
      }

      // Update import session with results
      await updateGenealogyImportStatus(importSession.id, "completed", {
        membersImported: createdMembers.length,
        relationshipsImported: relationshipsCreated,
        eventsImported: 0,
        duplicatesSkipped,
        errorsCount: errors.length,
        errorDetails: errors.length > 0 ? errors.map((e) => ({ message: e })) : null,
      });

      // Capture tree version for the import
      try {
        const serviceName = GENEALOGY_SERVICES[data.service].name;
        await captureTreeVersion(
          data.familyTreeId,
          context.userId,
          `Imported from ${serviceName}: ${createdMembers.length} member(s), ${relationshipsCreated} relationship(s), ${marriagesCreated} marriage(s)`,
          [
            {
              type: "BULK_IMPORT",
              entityType: "TREE",
              entityId: data.familyTreeId,
              oldData: null,
              newData: {
                source: data.service,
                sourceTreeId: data.sourceTreeId,
                sourceTreeName: data.sourceTreeName,
                membersImported: createdMembers.length,
                relationshipsImported: relationshipsCreated,
                marriagesImported: marriagesCreated,
              },
              description: `Genealogy import from ${serviceName}: ${createdMembers.length} members, ${relationshipsCreated} relationships, ${marriagesCreated} marriages`,
            },
          ]
        );
      } catch (versionError) {
        console.error("Failed to capture tree version:", versionError);
        warnings.push("Failed to record import in version history");
      }

      return {
        success: true,
        importId: importSession.id,
        membersCreated: createdMembers.length,
        relationshipsCreated,
        marriagesCreated,
        duplicatesSkipped,
        errors,
        warnings,
      };
    } catch (error) {
      // Update import session with error
      await updateGenealogyImportStatus(importSession.id, "failed", {
        errorsCount: 1,
        errorDetails: [{ message: error instanceof Error ? error.message : "Unknown error" }],
      });

      throw error;
    }
  });

/**
 * Parse GEDCOM file content
 * This is a simplified parser - real GEDCOM parsing is more complex
 */
export const parseGedcomFileFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      content: z.string().min(1),
      service: genealogyServiceSchema.optional().default("familysearch"),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data }) => {
    try {
      const result = parseGedcomContent(data.content);
      return {
        success: true,
        data: {
          service: data.service,
          ...result,
        },
        errors: [],
      };
    } catch (error) {
      return {
        success: false,
        data: null,
        errors: [error instanceof Error ? error.message : "Failed to parse GEDCOM file"],
      };
    }
  });

/**
 * Simplified GEDCOM parser
 * Handles basic GEDCOM 5.5/7.0 format
 */
function parseGedcomContent(content: string): {
  persons: GenealogyPerson[];
  relationships: GenealogyRelationship[];
  marriages: GenealogyMarriage[];
  sourceTreeName?: string;
} {
  const lines = content.split(/\r?\n/);
  const persons: GenealogyPerson[] = [];
  const relationships: GenealogyRelationship[] = [];
  const marriages: GenealogyMarriage[] = [];

  const personMap = new Map<string, GenealogyPerson>();
  const familyMap = new Map<string, { husbandId?: string; wifeId?: string; childIds: string[] }>();

  let currentPerson: Partial<GenealogyPerson> | null = null;
  let currentPersonId: string | null = null;
  let currentFamily: { id: string; husbandId?: string; wifeId?: string; childIds: string[] } | null = null;
  let currentContext: "INDI" | "FAM" | "HEAD" | null = null;
  let currentSubContext: string | null = null;
  let sourceTreeName: string | undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse GEDCOM line: level tag [value]
    const match = line.match(/^(\d+)\s+(@\w+@|\w+)\s*(.*)$/);
    if (!match) continue;

    const [, levelStr, tag, value] = match;
    const level = parseInt(levelStr, 10);

    // Level 0 - new record
    if (level === 0) {
      // Save previous person
      if (currentPerson && currentPersonId) {
        const person: GenealogyPerson = {
          id: currentPersonId,
          firstName: currentPerson.firstName || "Unknown",
          lastName: currentPerson.lastName || "Unknown",
          middleName: currentPerson.middleName,
          nickname: currentPerson.nickname,
          gender: currentPerson.gender,
          birthDate: currentPerson.birthDate,
          birthPlace: currentPerson.birthPlace,
          deathDate: currentPerson.deathDate,
          deathPlace: currentPerson.deathPlace,
          bio: currentPerson.bio,
        };
        personMap.set(currentPersonId, person);
        persons.push(person);
      }

      // Save previous family
      if (currentFamily) {
        familyMap.set(currentFamily.id, {
          husbandId: currentFamily.husbandId,
          wifeId: currentFamily.wifeId,
          childIds: currentFamily.childIds,
        });
      }

      currentPerson = null;
      currentPersonId = null;
      currentFamily = null;
      currentSubContext = null;

      if (tag.startsWith("@") && tag.endsWith("@")) {
        // This is an ID, the actual tag is in value
        const actualTag = value.split(/\s+/)[0];
        if (actualTag === "INDI") {
          currentContext = "INDI";
          currentPersonId = tag;
          currentPerson = {};
        } else if (actualTag === "FAM") {
          currentContext = "FAM";
          currentFamily = { id: tag, childIds: [] };
        } else if (actualTag === "HEAD") {
          currentContext = "HEAD";
        }
      } else if (tag === "HEAD") {
        currentContext = "HEAD";
      }
      continue;
    }

    // Process individual records
    if (currentContext === "INDI" && currentPerson) {
      if (level === 1) {
        currentSubContext = tag;
        switch (tag) {
          case "NAME":
            // Parse name: FirstName MiddleName /LastName/
            const nameMatch = value.match(/^([^/]*)\s*\/([^/]*)\/\s*$/);
            if (nameMatch) {
              const [, givenNames, surname] = nameMatch;
              const nameParts = givenNames.trim().split(/\s+/);
              currentPerson.firstName = nameParts[0] || "";
              currentPerson.middleName = nameParts.slice(1).join(" ") || null;
              currentPerson.lastName = surname.trim() || "";
            } else {
              // Simple name without surname delimiters
              const nameParts = value.trim().split(/\s+/);
              currentPerson.firstName = nameParts[0] || "";
              currentPerson.lastName = nameParts[nameParts.length - 1] || "";
              if (nameParts.length > 2) {
                currentPerson.middleName = nameParts.slice(1, -1).join(" ");
              }
            }
            break;
          case "SEX":
            if (value === "M") currentPerson.gender = "male";
            else if (value === "F") currentPerson.gender = "female";
            else currentPerson.gender = "other";
            break;
          case "BIRT":
          case "DEAT":
            // Will be filled by level 2 DATE/PLAC
            break;
          case "NICK":
            currentPerson.nickname = value;
            break;
          case "NOTE":
            currentPerson.bio = value;
            break;
        }
      } else if (level === 2) {
        switch (tag) {
          case "DATE":
            if (currentSubContext === "BIRT") {
              currentPerson.birthDate = parseGedcomDate(value);
            } else if (currentSubContext === "DEAT") {
              currentPerson.deathDate = parseGedcomDate(value);
            }
            break;
          case "PLAC":
            if (currentSubContext === "BIRT") {
              currentPerson.birthPlace = value;
            } else if (currentSubContext === "DEAT") {
              currentPerson.deathPlace = value;
            }
            break;
        }
      }
    }

    // Process family records
    if (currentContext === "FAM" && currentFamily) {
      if (level === 1) {
        switch (tag) {
          case "HUSB":
            currentFamily.husbandId = value;
            break;
          case "WIFE":
            currentFamily.wifeId = value;
            break;
          case "CHIL":
            currentFamily.childIds.push(value);
            break;
        }
      }
    }

    // Process header for tree name
    if (currentContext === "HEAD" && level === 1 && tag === "FILE") {
      sourceTreeName = value;
    }
  }

  // Save last person
  if (currentPerson && currentPersonId) {
    const person: GenealogyPerson = {
      id: currentPersonId,
      firstName: currentPerson.firstName || "Unknown",
      lastName: currentPerson.lastName || "Unknown",
      middleName: currentPerson.middleName,
      nickname: currentPerson.nickname,
      gender: currentPerson.gender,
      birthDate: currentPerson.birthDate,
      birthPlace: currentPerson.birthPlace,
      deathDate: currentPerson.deathDate,
      deathPlace: currentPerson.deathPlace,
      bio: currentPerson.bio,
    };
    personMap.set(currentPersonId, person);
    persons.push(person);
  }

  // Save last family
  if (currentFamily) {
    familyMap.set(currentFamily.id, {
      husbandId: currentFamily.husbandId,
      wifeId: currentFamily.wifeId,
      childIds: currentFamily.childIds,
    });
  }

  // Build relationships from family records
  familyMap.forEach((family) => {
    // Marriage relationship
    if (family.husbandId && family.wifeId) {
      marriages.push({
        spouse1Id: family.husbandId,
        spouse2Id: family.wifeId,
        status: "married",
      });
    }

    // Parent-child relationships
    family.childIds.forEach((childId) => {
      if (family.husbandId) {
        relationships.push({
          parentId: family.husbandId,
          childId,
          type: "biological",
        });
      }
      if (family.wifeId) {
        relationships.push({
          parentId: family.wifeId,
          childId,
          type: "biological",
        });
      }
    });
  });

  return {
    persons,
    relationships,
    marriages,
    sourceTreeName,
  };
}

/**
 * Parse GEDCOM date format to ISO date
 */
function parseGedcomDate(gedcomDate: string): string | null {
  if (!gedcomDate) return null;

  // Remove modifiers like "ABT", "BEF", "AFT", etc.
  const cleaned = gedcomDate
    .replace(/^(ABT|ABOUT|BEF|BEFORE|AFT|AFTER|EST|ESTIMATED|CAL|CALCULATED)\s+/i, "")
    .replace(/^(BET|BETWEEN)\s+.*\s+AND\s+/i, "")
    .trim();

  // Common GEDCOM date formats:
  // 1 JAN 2000, JAN 2000, 2000
  const months: Record<string, string> = {
    JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
    JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
  };

  // Try full date: 1 JAN 2000
  const fullMatch = cleaned.match(/^(\d{1,2})\s+(\w{3})\s+(\d{4})$/);
  if (fullMatch) {
    const [, day, month, year] = fullMatch;
    const monthNum = months[month.toUpperCase()];
    if (monthNum) {
      return `${year}-${monthNum}-${day.padStart(2, "0")}`;
    }
  }

  // Try month and year: JAN 2000
  const monthYearMatch = cleaned.match(/^(\w{3})\s+(\d{4})$/);
  if (monthYearMatch) {
    const [, month, year] = monthYearMatch;
    const monthNum = months[month.toUpperCase()];
    if (monthNum) {
      return `${year}-${monthNum}-01`;
    }
  }

  // Try year only: 2000
  const yearMatch = cleaned.match(/^(\d{4})$/);
  if (yearMatch) {
    return `${yearMatch[1]}-01-01`;
  }

  return null;
}
