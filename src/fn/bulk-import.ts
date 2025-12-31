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
import { captureTreeVersion } from "~/use-cases/tree-versioning";
import type {
  Gender,
  RelationshipType,
  MarriageStatus,
  FamilyMember,
} from "~/db/schema";

// Validation schemas for import data
const genderSchema = z.enum(["male", "female", "other"]).nullable().optional();
const relationshipTypeSchema = z
  .enum(["biological", "adopted", "step", "foster"])
  .default("biological");
const marriageStatusSchema = z
  .enum(["married", "divorced", "widowed", "separated", "annulled"])
  .default("married");

// Member import schema
const importMemberSchema = z.object({
  // Temporary ID for linking relationships (optional, used for JSON imports)
  tempId: z.string().optional(),
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(100, "First name must be less than 100 characters"),
  middleName: z
    .string()
    .max(100, "Middle name must be less than 100 characters")
    .nullable()
    .optional(),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(100, "Last name must be less than 100 characters"),
  nickname: z
    .string()
    .max(100, "Nickname must be less than 100 characters")
    .nullable()
    .optional(),
  gender: genderSchema,
  birthDate: z.string().nullable().optional(),
  birthPlace: z
    .string()
    .max(200, "Birth place must be less than 200 characters")
    .nullable()
    .optional(),
  deathDate: z.string().nullable().optional(),
  deathPlace: z
    .string()
    .max(200, "Death place must be less than 200 characters")
    .nullable()
    .optional(),
  bio: z
    .string()
    .max(5000, "Bio must be less than 5000 characters")
    .nullable()
    .optional(),
});

// Parent-child relationship import schema (references members by tempId or name)
const importRelationshipSchema = z.object({
  // Reference parent by tempId or name
  parentTempId: z.string().optional(),
  parentFirstName: z.string().optional(),
  parentLastName: z.string().optional(),
  // Reference child by tempId or name
  childTempId: z.string().optional(),
  childFirstName: z.string().optional(),
  childLastName: z.string().optional(),
  relationshipType: relationshipTypeSchema,
});

// Marriage import schema (references spouses by tempId or name)
const importMarriageSchema = z.object({
  // Reference spouse1 by tempId or name
  spouse1TempId: z.string().optional(),
  spouse1FirstName: z.string().optional(),
  spouse1LastName: z.string().optional(),
  // Reference spouse2 by tempId or name
  spouse2TempId: z.string().optional(),
  spouse2FirstName: z.string().optional(),
  spouse2LastName: z.string().optional(),
  marriageDate: z.string().nullable().optional(),
  marriagePlace: z.string().nullable().optional(),
  divorceDate: z.string().nullable().optional(),
  status: marriageStatusSchema,
});

// Full import data schema
const bulkImportSchema = z.object({
  familyTreeId: z.string().min(1, "Family tree ID is required"),
  members: z.array(importMemberSchema).min(1, "At least one member is required"),
  relationships: z.array(importRelationshipSchema).optional().default([]),
  marriages: z.array(importMarriageSchema).optional().default([]),
});

export type ImportMember = z.infer<typeof importMemberSchema>;
export type ImportRelationship = z.infer<typeof importRelationshipSchema>;
export type ImportMarriage = z.infer<typeof importMarriageSchema>;
export type BulkImportData = z.infer<typeof bulkImportSchema>;

// Result types
export interface BulkImportResult {
  success: boolean;
  membersCreated: number;
  relationshipsCreated: number;
  marriagesCreated: number;
  errors: string[];
  warnings: string[];
}

// Helper to find member by tempId or name
function findMemberInMap(
  tempIdMap: Map<string, string>,
  nameMap: Map<string, string>,
  tempId?: string,
  firstName?: string,
  lastName?: string
): string | null {
  // Try tempId first
  if (tempId && tempIdMap.has(tempId)) {
    return tempIdMap.get(tempId)!;
  }

  // Try name match
  if (firstName && lastName) {
    const nameKey = `${firstName.toLowerCase()}|${lastName.toLowerCase()}`;
    if (nameMap.has(nameKey)) {
      return nameMap.get(nameKey)!;
    }
  }

  return null;
}

/**
 * Parse CSV content into import data
 */
export function parseCSV(csvContent: string): {
  members: ImportMember[];
  errors: string[];
} {
  const lines = csvContent.trim().split("\n");
  const members: ImportMember[] = [];
  const errors: string[] = [];

  if (lines.length < 2) {
    return { members: [], errors: ["CSV must have at least a header row and one data row"] };
  }

  // Parse header
  const headerLine = lines[0];
  const headers = headerLine.split(",").map((h) => h.trim().toLowerCase());

  // Required columns
  const firstNameIndex = headers.findIndex(
    (h) => h === "firstname" || h === "first_name" || h === "first name"
  );
  const lastNameIndex = headers.findIndex(
    (h) => h === "lastname" || h === "last_name" || h === "last name"
  );

  if (firstNameIndex === -1) {
    return { members: [], errors: ["CSV must have a 'firstName' or 'first_name' column"] };
  }
  if (lastNameIndex === -1) {
    return { members: [], errors: ["CSV must have a 'lastName' or 'last_name' column"] };
  }

  // Optional columns
  const middleNameIndex = headers.findIndex(
    (h) => h === "middlename" || h === "middle_name" || h === "middle name"
  );
  const nicknameIndex = headers.findIndex((h) => h === "nickname");
  const genderIndex = headers.findIndex((h) => h === "gender");
  const birthDateIndex = headers.findIndex(
    (h) => h === "birthdate" || h === "birth_date" || h === "birth date"
  );
  const birthPlaceIndex = headers.findIndex(
    (h) => h === "birthplace" || h === "birth_place" || h === "birth place"
  );
  const deathDateIndex = headers.findIndex(
    (h) => h === "deathdate" || h === "death_date" || h === "death date"
  );
  const deathPlaceIndex = headers.findIndex(
    (h) => h === "deathplace" || h === "death_place" || h === "death place"
  );
  const bioIndex = headers.findIndex((h) => h === "bio");
  const tempIdIndex = headers.findIndex(
    (h) => h === "tempid" || h === "temp_id" || h === "id"
  );

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parsing (handle quoted values)
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const firstName = values[firstNameIndex]?.trim();
    const lastName = values[lastNameIndex]?.trim();

    if (!firstName || !lastName) {
      errors.push(`Row ${i + 1}: Missing first name or last name`);
      continue;
    }

    const member: ImportMember = {
      firstName,
      lastName,
      middleName: middleNameIndex >= 0 ? values[middleNameIndex]?.trim() || null : null,
      nickname: nicknameIndex >= 0 ? values[nicknameIndex]?.trim() || null : null,
      gender: genderIndex >= 0 ? parseGender(values[genderIndex]?.trim()) : null,
      birthDate: birthDateIndex >= 0 ? values[birthDateIndex]?.trim() || null : null,
      birthPlace: birthPlaceIndex >= 0 ? values[birthPlaceIndex]?.trim() || null : null,
      deathDate: deathDateIndex >= 0 ? values[deathDateIndex]?.trim() || null : null,
      deathPlace: deathPlaceIndex >= 0 ? values[deathPlaceIndex]?.trim() || null : null,
      bio: bioIndex >= 0 ? values[bioIndex]?.trim() || null : null,
      tempId: tempIdIndex >= 0 ? values[tempIdIndex]?.trim() || undefined : undefined,
    };

    members.push(member);
  }

  return { members, errors };
}

function parseGender(value?: string): Gender | null {
  if (!value) return null;
  const lower = value.toLowerCase();
  if (lower === "male" || lower === "m") return "male";
  if (lower === "female" || lower === "f") return "female";
  if (lower === "other" || lower === "o") return "other";
  return null;
}

/**
 * Parse JSON content into import data
 */
export function parseJSON(jsonContent: string): {
  data: BulkImportData | null;
  errors: string[];
} {
  try {
    const parsed = JSON.parse(jsonContent);

    // Handle both array (members only) and object (full import) formats
    if (Array.isArray(parsed)) {
      // Array of members only
      return {
        data: {
          familyTreeId: "", // Will be filled in by the caller
          members: parsed,
          relationships: [],
          marriages: [],
        },
        errors: [],
      };
    }

    return {
      data: {
        familyTreeId: parsed.familyTreeId || "",
        members: parsed.members || [],
        relationships: parsed.relationships || [],
        marriages: parsed.marriages || [],
      },
      errors: [],
    };
  } catch (error) {
    return {
      data: null,
      errors: [`Invalid JSON: ${error instanceof Error ? error.message : "Parse error"}`],
    };
  }
}

/**
 * Validate import data against the schema
 */
export function validateImportData(data: unknown): {
  valid: boolean;
  data: BulkImportData | null;
  errors: string[];
} {
  const result = bulkImportSchema.safeParse(data);

  if (!result.success) {
    const errors = result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`);
    return { valid: false, data: null, errors };
  }

  return { valid: true, data: result.data, errors: [] };
}

/**
 * Server function to perform bulk import
 */
export const bulkImportMembersFn = createServerFn({
  method: "POST",
})
  .inputValidator(bulkImportSchema)
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }): Promise<BulkImportResult> => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Verify the family tree exists
    const familyTree = await findFamilyTreeById(data.familyTreeId);
    if (!familyTree) {
      return {
        success: false,
        membersCreated: 0,
        relationshipsCreated: 0,
        marriagesCreated: 0,
        errors: ["Family tree not found"],
        warnings: [],
      };
    }

    // Verify the user owns the family tree
    const isOwner = await isUserFamilyTreeOwner(context.userId, data.familyTreeId);
    if (!isOwner) {
      return {
        success: false,
        membersCreated: 0,
        relationshipsCreated: 0,
        marriagesCreated: 0,
        errors: ["Unauthorized: You don't have permission to import members to this family tree"],
        warnings: [],
      };
    }

    // Get existing members for duplicate checking
    const existingMembers = await findFamilyMembersByTreeId(data.familyTreeId);
    const existingNameSet = new Set(
      existingMembers.map((m) => `${m.firstName.toLowerCase()}|${m.lastName.toLowerCase()}`)
    );

    // Create members
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
        familyTreeId: data.familyTreeId,
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
        _tempId: m.tempId, // Preserve tempId for relationship mapping
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

    // Create members in database
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

    // Also add existing members to the name map for relationship linking
    existingMembers.forEach((m) => {
      const nameKey = `${m.firstName.toLowerCase()}|${m.lastName.toLowerCase()}`;
      nameMap.set(nameKey, m.id);
    });

    // Create parent-child relationships
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

          if (!parentId) {
            warnings.push(
              `Could not find parent: ${r.parentFirstName || r.parentTempId} ${r.parentLastName || ""}`
            );
            return null;
          }
          if (!childId) {
            warnings.push(
              `Could not find child: ${r.childFirstName || r.childTempId} ${r.childLastName || ""}`
            );
            return null;
          }

          return {
            id: crypto.randomUUID(),
            familyTreeId: data.familyTreeId,
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

          if (!spouse1Id) {
            warnings.push(
              `Could not find spouse 1: ${m.spouse1FirstName || m.spouse1TempId} ${m.spouse1LastName || ""}`
            );
            return null;
          }
          if (!spouse2Id) {
            warnings.push(
              `Could not find spouse 2: ${m.spouse2FirstName || m.spouse2TempId} ${m.spouse2LastName || ""}`
            );
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
            status: m.status as MarriageStatus,
          };
        })
        .filter((m): m is NonNullable<typeof m> => m !== null);

      if (marriagesToCreate.length > 0) {
        await createMarriageConnections(marriagesToCreate);
        marriagesCreated = marriagesToCreate.length;
      }
    }

    // Capture tree version for the bulk import
    try {
      await captureTreeVersion(
        data.familyTreeId,
        context.userId,
        `Bulk imported ${createdMembers.length} member(s), ${relationshipsCreated} relationship(s), ${marriagesCreated} marriage(s)`,
        [
          {
            type: "BULK_IMPORT",
            entityType: "TREE",
            entityId: data.familyTreeId,
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
  });

/**
 * Server function to validate import data without performing the import
 */
export const validateBulkImportFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      familyTreeId: z.string(),
      content: z.string(),
      format: z.enum(["csv", "json"]),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Verify the family tree exists and user has access
    const familyTree = await findFamilyTreeById(data.familyTreeId);
    if (!familyTree) {
      return { valid: false, errors: ["Family tree not found"], warnings: [], preview: null };
    }

    const isOwner = await isUserFamilyTreeOwner(context.userId, data.familyTreeId);
    if (!isOwner) {
      return {
        valid: false,
        errors: ["Unauthorized: You don't have permission to import to this tree"],
        warnings: [],
        preview: null,
      };
    }

    // Parse the content based on format
    let importData: BulkImportData | null = null;

    if (data.format === "csv") {
      const csvResult = parseCSV(data.content);
      if (csvResult.errors.length > 0) {
        errors.push(...csvResult.errors);
      }
      if (csvResult.members.length > 0) {
        importData = {
          familyTreeId: data.familyTreeId,
          members: csvResult.members,
          relationships: [],
          marriages: [],
        };
      }
    } else {
      const jsonResult = parseJSON(data.content);
      if (jsonResult.errors.length > 0) {
        errors.push(...jsonResult.errors);
      }
      if (jsonResult.data) {
        importData = {
          ...jsonResult.data,
          familyTreeId: data.familyTreeId,
        };
      }
    }

    if (!importData) {
      return { valid: false, errors, warnings, preview: null };
    }

    // Validate the parsed data
    const validation = validateImportData(importData);
    if (!validation.valid) {
      errors.push(...validation.errors);
      return { valid: false, errors, warnings, preview: null };
    }

    // Check for duplicates
    const existingMembers = await findFamilyMembersByTreeId(data.familyTreeId);
    const existingNameSet = new Set(
      existingMembers.map((m) => `${m.firstName.toLowerCase()}|${m.lastName.toLowerCase()}`)
    );

    const duplicates: string[] = [];
    importData.members.forEach((m) => {
      const nameKey = `${m.firstName.toLowerCase()}|${m.lastName.toLowerCase()}`;
      if (existingNameSet.has(nameKey)) {
        duplicates.push(`${m.firstName} ${m.lastName}`);
      }
    });

    if (duplicates.length > 0) {
      warnings.push(`${duplicates.length} duplicate member(s) will be skipped: ${duplicates.slice(0, 5).join(", ")}${duplicates.length > 5 ? "..." : ""}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      preview: {
        membersCount: importData.members.length,
        relationshipsCount: importData.relationships?.length || 0,
        marriagesCount: importData.marriages?.length || 0,
        duplicatesCount: duplicates.length,
        members: importData.members.slice(0, 10), // Preview first 10 members
      },
    };
  });
