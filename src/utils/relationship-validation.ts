/**
 * Relationship Validation Utilities
 *
 * Provides validation logic to prevent impossible or genetically problematic relationships
 * such as sibling marriages, parent-child marriages, and other incestuous relationships.
 */

/**
 * Configuration for relationship validation rules
 */
export const RELATIONSHIP_VALIDATION_CONFIG = {
  // Whether to block marriages between half-siblings
  BLOCK_HALF_SIBLING_MARRIAGE: true,
  // Whether to block marriages between step-siblings (typically allowed)
  BLOCK_STEP_SIBLING_MARRIAGE: false,
  // Whether to block marriages between first cousins (varies by jurisdiction)
  BLOCK_FIRST_COUSIN_MARRIAGE: true,
  // Maximum degree of kinship to check (limits traversal depth)
  MAX_KINSHIP_DEGREE: 4,
} as const;

/**
 * Relationship validation result
 */
export interface RelationshipValidationResult {
  isValid: boolean;
  errors: RelationshipValidationError[];
  warnings: RelationshipValidationWarning[];
}

/**
 * Validation error with details
 */
export interface RelationshipValidationError {
  code: RelationshipValidationErrorCode;
  message: string;
  details?: {
    person1Name?: string;
    person2Name?: string;
    relationshipType?: string;
    commonAncestorNames?: string[];
  };
}

/**
 * Validation warning (non-blocking but notable)
 */
export interface RelationshipValidationWarning {
  code: RelationshipValidationWarningCode;
  message: string;
  details?: {
    person1Name?: string;
    person2Name?: string;
    relationshipType?: string;
  };
}

/**
 * Error codes for relationship validation
 */
export type RelationshipValidationErrorCode =
  | "SELF_RELATIONSHIP"
  | "SIBLING_MARRIAGE"
  | "HALF_SIBLING_MARRIAGE"
  | "PARENT_CHILD_MARRIAGE"
  | "GRANDPARENT_GRANDCHILD_MARRIAGE"
  | "AUNT_UNCLE_NIECE_NEPHEW_MARRIAGE"
  | "FIRST_COUSIN_MARRIAGE"
  | "ANCESTOR_DESCENDANT_MARRIAGE";

/**
 * Warning codes for relationship validation
 */
export type RelationshipValidationWarningCode =
  | "STEP_SIBLING_MARRIAGE"
  | "DISTANT_RELATIVE_MARRIAGE"
  | "SECOND_COUSIN_MARRIAGE";

/**
 * Member data structure for relationship validation
 */
export interface MemberForRelationshipValidation {
  id: string;
  firstName: string;
  lastName: string;
}

/**
 * Ancestor/Descendant information for relationship validation
 */
export interface AncestryInfo {
  ancestors: Map<string, { memberId: string; generation: number; path: string[] }>;
  descendants: Map<string, { memberId: string; generation: number; path: string[] }>;
}

/**
 * Get the full name of a member for error messages
 */
export function getMemberFullName(member: MemberForRelationshipValidation): string {
  return `${member.firstName} ${member.lastName}`.trim();
}

/**
 * Create a successful validation result
 */
export function createValidResult(): RelationshipValidationResult {
  return { isValid: true, errors: [], warnings: [] };
}

/**
 * Create a failed validation result with an error
 */
export function createErrorResult(
  code: RelationshipValidationErrorCode,
  message: string,
  details?: RelationshipValidationError["details"]
): RelationshipValidationResult {
  return {
    isValid: false,
    errors: [{ code, message, details }],
    warnings: [],
  };
}

/**
 * Create a warning result
 */
export function createWarningResult(
  code: RelationshipValidationWarningCode,
  message: string,
  details?: RelationshipValidationWarning["details"]
): RelationshipValidationResult {
  return {
    isValid: true,
    errors: [],
    warnings: [{ code, message, details }],
  };
}

/**
 * Merge multiple validation results into one
 */
export function mergeValidationResults(
  results: RelationshipValidationResult[]
): RelationshipValidationResult {
  const allErrors: RelationshipValidationError[] = [];
  const allWarnings: RelationshipValidationWarning[] = [];

  for (const result of results) {
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}

/**
 * Check if two people share a common ancestor (indicating blood relation)
 * Returns the common ancestors if found
 */
export function findCommonAncestors(
  ancestors1: Map<string, { memberId: string; generation: number; path: string[] }>,
  ancestors2: Map<string, { memberId: string; generation: number; path: string[] }>
): Array<{
  ancestorId: string;
  generationFromPerson1: number;
  generationFromPerson2: number;
  pathFromPerson1: string[];
  pathFromPerson2: string[];
}> {
  const commonAncestors: Array<{
    ancestorId: string;
    generationFromPerson1: number;
    generationFromPerson2: number;
    pathFromPerson1: string[];
    pathFromPerson2: string[];
  }> = [];

  for (const [ancestorId, info1] of ancestors1) {
    const info2 = ancestors2.get(ancestorId);
    if (info2) {
      commonAncestors.push({
        ancestorId,
        generationFromPerson1: info1.generation,
        generationFromPerson2: info2.generation,
        pathFromPerson1: info1.path,
        pathFromPerson2: info2.path,
      });
    }
  }

  return commonAncestors;
}

/**
 * Determine the relationship type based on generational distances
 */
export function determineRelationshipType(
  generationFromPerson1: number,
  generationFromPerson2: number
): string {
  // Direct ancestor-descendant
  if (generationFromPerson1 === 0 || generationFromPerson2 === 0) {
    const generations = Math.max(generationFromPerson1, generationFromPerson2);
    if (generations === 1) return "parent-child";
    if (generations === 2) return "grandparent-grandchild";
    if (generations === 3) return "great-grandparent-great-grandchild";
    return `ancestor-descendant (${generations} generations)`;
  }

  // Same generation from common ancestor
  if (generationFromPerson1 === generationFromPerson2) {
    const generation = generationFromPerson1;
    if (generation === 1) return "siblings";
    if (generation === 2) return "first cousins";
    if (generation === 3) return "second cousins";
    return `${generation - 1}th cousins`;
  }

  // Different generations (removed cousins)
  const minGen = Math.min(generationFromPerson1, generationFromPerson2);
  const maxGen = Math.max(generationFromPerson1, generationFromPerson2);
  const removed = maxGen - minGen;

  if (minGen === 1) {
    // Aunt/Uncle - Niece/Nephew relationship
    if (removed === 1) return "aunt/uncle and niece/nephew";
    return `great-${"great-".repeat(removed - 2)}aunt/uncle and niece/nephew`;
  }

  if (minGen === 2) {
    return `first cousins ${removed} times removed`;
  }

  return `${minGen - 1}th cousins ${removed} times removed`;
}

/**
 * Check if two people are in a direct ancestor-descendant relationship
 */
export function isAncestorDescendant(
  person1Ancestors: Map<string, { memberId: string; generation: number; path: string[] }>,
  person1Id: string,
  person2Ancestors: Map<string, { memberId: string; generation: number; path: string[] }>,
  person2Id: string
): { isRelated: boolean; type?: string; generations?: number } {
  // Check if person1 is an ancestor of person2
  if (person2Ancestors.has(person1Id)) {
    const info = person2Ancestors.get(person1Id)!;
    return { isRelated: true, type: "ancestor-descendant", generations: info.generation };
  }

  // Check if person2 is an ancestor of person1
  if (person1Ancestors.has(person2Id)) {
    const info = person1Ancestors.get(person2Id)!;
    return { isRelated: true, type: "ancestor-descendant", generations: info.generation };
  }

  return { isRelated: false };
}

/**
 * Validate a marriage/romantic relationship between two people
 * based on their genetic relationship
 */
export function validateMarriageRelationship(
  person1: MemberForRelationshipValidation,
  person2: MemberForRelationshipValidation,
  person1Ancestors: Map<string, { memberId: string; generation: number; path: string[] }>,
  person2Ancestors: Map<string, { memberId: string; generation: number; path: string[] }>,
  siblingInfo?: { areSiblings: boolean; relationshipType?: "full" | "half" | "step" }
): RelationshipValidationResult {
  const person1Name = getMemberFullName(person1);
  const person2Name = getMemberFullName(person2);

  // Check for self-relationship
  if (person1.id === person2.id) {
    return createErrorResult(
      "SELF_RELATIONSHIP",
      "A person cannot marry themselves",
      { person1Name, person2Name }
    );
  }

  // Check for sibling relationship
  if (siblingInfo?.areSiblings) {
    if (siblingInfo.relationshipType === "full") {
      return createErrorResult(
        "SIBLING_MARRIAGE",
        `${person1Name} and ${person2Name} cannot marry because they are full siblings.`,
        { person1Name, person2Name, relationshipType: "full siblings" }
      );
    }

    if (siblingInfo.relationshipType === "half" && RELATIONSHIP_VALIDATION_CONFIG.BLOCK_HALF_SIBLING_MARRIAGE) {
      return createErrorResult(
        "HALF_SIBLING_MARRIAGE",
        `${person1Name} and ${person2Name} cannot marry because they are half-siblings.`,
        { person1Name, person2Name, relationshipType: "half siblings" }
      );
    }

    if (siblingInfo.relationshipType === "step") {
      if (RELATIONSHIP_VALIDATION_CONFIG.BLOCK_STEP_SIBLING_MARRIAGE) {
        return createErrorResult(
          "SIBLING_MARRIAGE",
          `${person1Name} and ${person2Name} cannot marry because they are step-siblings.`,
          { person1Name, person2Name, relationshipType: "step siblings" }
        );
      } else {
        // Return warning but allow
        return createWarningResult(
          "STEP_SIBLING_MARRIAGE",
          `${person1Name} and ${person2Name} are step-siblings. This marriage is allowed but may be unusual.`,
          { person1Name, person2Name, relationshipType: "step siblings" }
        );
      }
    }
  }

  // Check for direct ancestor-descendant relationship
  const ancestorDescendant = isAncestorDescendant(
    person1Ancestors,
    person1.id,
    person2Ancestors,
    person2.id
  );

  if (ancestorDescendant.isRelated) {
    const generations = ancestorDescendant.generations!;
    if (generations === 1) {
      return createErrorResult(
        "PARENT_CHILD_MARRIAGE",
        `${person1Name} and ${person2Name} cannot marry because one is the parent of the other.`,
        { person1Name, person2Name, relationshipType: "parent-child" }
      );
    }

    if (generations === 2) {
      return createErrorResult(
        "GRANDPARENT_GRANDCHILD_MARRIAGE",
        `${person1Name} and ${person2Name} cannot marry because one is the grandparent of the other.`,
        { person1Name, person2Name, relationshipType: "grandparent-grandchild" }
      );
    }

    return createErrorResult(
      "ANCESTOR_DESCENDANT_MARRIAGE",
      `${person1Name} and ${person2Name} cannot marry because one is a direct ancestor of the other (${generations} generations apart).`,
      { person1Name, person2Name, relationshipType: `ancestor-descendant (${generations} generations)` }
    );
  }

  // Find common ancestors to check for other blood relations
  const commonAncestors = findCommonAncestors(person1Ancestors, person2Ancestors);

  if (commonAncestors.length > 0) {
    // Find the closest common ancestor (lowest total generation distance)
    const closestAncestor = commonAncestors.reduce((closest, current) => {
      const currentDistance = current.generationFromPerson1 + current.generationFromPerson2;
      const closestDistance = closest.generationFromPerson1 + closest.generationFromPerson2;
      return currentDistance < closestDistance ? current : closest;
    });

    const gen1 = closestAncestor.generationFromPerson1;
    const gen2 = closestAncestor.generationFromPerson2;

    // Check for aunt/uncle - niece/nephew relationship
    if ((gen1 === 1 && gen2 === 2) || (gen1 === 2 && gen2 === 1)) {
      return createErrorResult(
        "AUNT_UNCLE_NIECE_NEPHEW_MARRIAGE",
        `${person1Name} and ${person2Name} cannot marry because one is the aunt/uncle of the other.`,
        { person1Name, person2Name, relationshipType: "aunt/uncle and niece/nephew" }
      );
    }

    // Check for first cousin marriage
    if (gen1 === 2 && gen2 === 2) {
      if (RELATIONSHIP_VALIDATION_CONFIG.BLOCK_FIRST_COUSIN_MARRIAGE) {
        return createErrorResult(
          "FIRST_COUSIN_MARRIAGE",
          `${person1Name} and ${person2Name} cannot marry because they are first cousins.`,
          { person1Name, person2Name, relationshipType: "first cousins" }
        );
      } else {
        return createWarningResult(
          "DISTANT_RELATIVE_MARRIAGE",
          `${person1Name} and ${person2Name} are first cousins. This marriage may be restricted in some jurisdictions.`,
          { person1Name, person2Name, relationshipType: "first cousins" }
        );
      }
    }

    // Second cousins and beyond - just warn
    if (gen1 >= 3 && gen2 >= 3) {
      const relationshipType = determineRelationshipType(gen1, gen2);
      return createWarningResult(
        "SECOND_COUSIN_MARRIAGE",
        `${person1Name} and ${person2Name} are ${relationshipType}. This marriage is typically allowed.`,
        { person1Name, person2Name, relationshipType }
      );
    }
  }

  return createValidResult();
}

/**
 * Format validation errors for API response
 */
export function formatRelationshipValidationErrors(
  result: RelationshipValidationResult
): string {
  if (result.isValid) {
    return "";
  }

  return result.errors.map((error) => error.message).join(" ");
}
