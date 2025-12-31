import { findFamilyMemberById } from "~/data-access/family-members";
import { areSiblings } from "~/data-access/sibling-relationships";
import {
  findAllAncestors,
  getMembersByIds,
} from "~/data-access/genetic-relationships";
import {
  validateMarriageRelationship,
  formatRelationshipValidationErrors,
  RELATIONSHIP_VALIDATION_CONFIG,
  type RelationshipValidationResult,
  type RelationshipValidationErrorCode,
  type MemberForRelationshipValidation,
} from "~/utils/relationship-validation";

/**
 * Custom error class for relationship validation failures
 */
export class RelationshipValidationError extends Error {
  constructor(
    message: string,
    public readonly code: RelationshipValidationErrorCode | "VALIDATION_FAILED",
    public readonly validationResult: RelationshipValidationResult
  ) {
    super(message);
    this.name = "RelationshipValidationError";
  }
}

/**
 * Convert a family member from the database to the validation format
 */
function toMemberForValidation(member: {
  id: string;
  firstName: string;
  lastName: string;
}): MemberForRelationshipValidation {
  return {
    id: member.id,
    firstName: member.firstName,
    lastName: member.lastName,
  };
}

/**
 * Validate a marriage relationship between two people
 * Checks for impossible or genetically problematic relationships
 *
 * @throws RelationshipValidationError if validation fails
 */
export async function validateMarriageConnectionRelationship(
  spouse1Id: string,
  spouse2Id: string
): Promise<RelationshipValidationResult> {
  // Fetch spouse details
  const [spouse1, spouse2] = await Promise.all([
    findFamilyMemberById(spouse1Id),
    findFamilyMemberById(spouse2Id),
  ]);

  if (!spouse1) {
    throw new Error("First spouse not found");
  }

  if (!spouse2) {
    throw new Error("Second spouse not found");
  }

  // Check if they are siblings
  const siblingInfo = await areSiblings(spouse1Id, spouse2Id);

  // Get ancestors for both spouses to check for blood relations
  const maxGenerations = RELATIONSHIP_VALIDATION_CONFIG.MAX_KINSHIP_DEGREE;
  const [spouse1Ancestors, spouse2Ancestors] = await Promise.all([
    findAllAncestors(spouse1Id, maxGenerations),
    findAllAncestors(spouse2Id, maxGenerations),
  ]);

  // Convert to validation format
  const spouse1ForValidation = toMemberForValidation(spouse1);
  const spouse2ForValidation = toMemberForValidation(spouse2);

  // Perform validation
  const result = validateMarriageRelationship(
    spouse1ForValidation,
    spouse2ForValidation,
    spouse1Ancestors,
    spouse2Ancestors,
    siblingInfo
  );

  return result;
}

/**
 * Validate and throw if invalid
 * Use this in server functions to block invalid marriages
 *
 * @throws RelationshipValidationError if validation fails
 */
export async function validateAndThrowIfInvalidMarriage(
  spouse1Id: string,
  spouse2Id: string
): Promise<void> {
  const result = await validateMarriageConnectionRelationship(spouse1Id, spouse2Id);

  if (!result.isValid) {
    throw new RelationshipValidationError(
      formatRelationshipValidationErrors(result),
      result.errors[0]?.code || "VALIDATION_FAILED",
      result
    );
  }
}

/**
 * Get validation warnings for a potential marriage
 * Returns warnings without throwing an error
 * Use this to show warnings to users before they confirm
 */
export async function getMarriageValidationWarnings(
  spouse1Id: string,
  spouse2Id: string
): Promise<RelationshipValidationResult> {
  try {
    return await validateMarriageConnectionRelationship(spouse1Id, spouse2Id);
  } catch {
    // If there's an error fetching data, return a valid result
    // The actual marriage creation will catch the error
    return { isValid: true, errors: [], warnings: [] };
  }
}

/**
 * Batch validate multiple potential marriages
 * Useful for validating imported data or bulk operations
 */
export async function validateMultipleMarriages(
  marriages: Array<{ spouse1Id: string; spouse2Id: string }>
): Promise<Map<string, RelationshipValidationResult>> {
  const results = new Map<string, RelationshipValidationResult>();

  for (const marriage of marriages) {
    const key = `${marriage.spouse1Id}-${marriage.spouse2Id}`;
    const result = await validateMarriageConnectionRelationship(
      marriage.spouse1Id,
      marriage.spouse2Id
    );
    results.set(key, result);
  }

  return results;
}

/**
 * Check if two people can potentially marry
 * Returns true if they can, false if they cannot
 * Use this for quick checks without detailed validation results
 */
export async function canMarry(
  spouse1Id: string,
  spouse2Id: string
): Promise<boolean> {
  try {
    const result = await validateMarriageConnectionRelationship(spouse1Id, spouse2Id);
    return result.isValid;
  } catch {
    return false;
  }
}
