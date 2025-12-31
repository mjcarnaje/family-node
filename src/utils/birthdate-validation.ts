import { differenceInYears, parseISO, isValid, isBefore, isAfter } from "date-fns";

/**
 * Configuration for birthdate validation rules
 */
export const BIRTHDATE_VALIDATION_CONFIG = {
  // Minimum age for a parent (in years)
  MIN_PARENT_AGE: 12,
  // Maximum age for a parent at child's birth (in years)
  MAX_PARENT_AGE: 80,
  // Minimum reasonable age gap between generations (in years)
  MIN_GENERATION_GAP: 12,
  // Maximum reasonable age gap between generations (in years)
  MAX_GENERATION_GAP: 80,
} as const;

/**
 * Result of birthdate validation
 */
export interface BirthdateValidationResult {
  isValid: boolean;
  errors: BirthdateValidationError[];
  warnings: BirthdateValidationWarning[];
}

/**
 * Validation error with details
 */
export interface BirthdateValidationError {
  code: BirthdateValidationErrorCode;
  message: string;
  details?: {
    parentName?: string;
    childName?: string;
    parentBirthDate?: string;
    childBirthDate?: string;
    ageGap?: number;
  };
}

/**
 * Validation warning (non-blocking but notable)
 */
export interface BirthdateValidationWarning {
  code: BirthdateValidationWarningCode;
  message: string;
  details?: {
    parentName?: string;
    childName?: string;
    ageGap?: number;
  };
}

/**
 * Error codes for birthdate validation
 */
export type BirthdateValidationErrorCode =
  | "PARENT_BORN_AFTER_CHILD"
  | "PARENT_BORN_SAME_TIME"
  | "PARENT_TOO_YOUNG"
  | "PARENT_TOO_OLD"
  | "INVALID_PARENT_BIRTHDATE"
  | "INVALID_CHILD_BIRTHDATE";

/**
 * Warning codes for birthdate validation
 */
export type BirthdateValidationWarningCode =
  | "UNUSUALLY_YOUNG_PARENT"
  | "UNUSUALLY_OLD_PARENT"
  | "SMALL_GENERATION_GAP";

/**
 * Member data structure for validation
 */
export interface MemberForValidation {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
}

/**
 * Parse a date string to a Date object
 * Handles both ISO date strings (YYYY-MM-DD) and full ISO datetime strings
 */
export function parseBirthDate(dateString: string | null | undefined): Date | null {
  if (!dateString) {
    return null;
  }

  try {
    const date = parseISO(dateString);
    return isValid(date) ? date : null;
  } catch {
    return null;
  }
}

/**
 * Get the full name of a member for error messages
 */
export function getMemberFullName(member: MemberForValidation): string {
  return `${member.firstName} ${member.lastName}`.trim();
}

/**
 * Calculate the age of a parent when a child was born
 */
export function calculateAgeAtChildBirth(
  parentBirthDate: Date,
  childBirthDate: Date
): number {
  return differenceInYears(childBirthDate, parentBirthDate);
}

/**
 * Validate that a parent was born before their child with reasonable age gap
 */
export function validateParentChildBirthdates(
  parent: MemberForValidation,
  child: MemberForValidation
): BirthdateValidationResult {
  const errors: BirthdateValidationError[] = [];
  const warnings: BirthdateValidationWarning[] = [];

  const parentBirthDate = parseBirthDate(parent.birthDate);
  const childBirthDate = parseBirthDate(child.birthDate);

  const parentName = getMemberFullName(parent);
  const childName = getMemberFullName(child);

  // If either birthdate is unknown, we can't validate - allow the relationship
  if (!parentBirthDate) {
    // No error - unknown parent birthdate is allowed
    return { isValid: true, errors: [], warnings: [] };
  }

  if (!childBirthDate) {
    // No error - unknown child birthdate is allowed
    return { isValid: true, errors: [], warnings: [] };
  }

  // Check if parent was born after child (definitely invalid)
  if (isAfter(parentBirthDate, childBirthDate)) {
    errors.push({
      code: "PARENT_BORN_AFTER_CHILD",
      message: `${parentName} cannot be a parent of ${childName} because they were born after the child.`,
      details: {
        parentName,
        childName,
        parentBirthDate: parent.birthDate!,
        childBirthDate: child.birthDate!,
      },
    });
    return { isValid: false, errors, warnings };
  }

  // Calculate age gap
  const ageGap = calculateAgeAtChildBirth(parentBirthDate, childBirthDate);

  // Check if born at the same time or parent is younger (invalid)
  if (ageGap <= 0) {
    errors.push({
      code: "PARENT_BORN_SAME_TIME",
      message: `${parentName} cannot be a parent of ${childName} because they were born at the same time or are younger.`,
      details: {
        parentName,
        childName,
        parentBirthDate: parent.birthDate!,
        childBirthDate: child.birthDate!,
        ageGap,
      },
    });
    return { isValid: false, errors, warnings };
  }

  // Check if parent was too young when child was born (error)
  if (ageGap < BIRTHDATE_VALIDATION_CONFIG.MIN_PARENT_AGE) {
    errors.push({
      code: "PARENT_TOO_YOUNG",
      message: `${parentName} would have been only ${ageGap} years old when ${childName} was born. Parents must be at least ${BIRTHDATE_VALIDATION_CONFIG.MIN_PARENT_AGE} years older than their children.`,
      details: {
        parentName,
        childName,
        parentBirthDate: parent.birthDate!,
        childBirthDate: child.birthDate!,
        ageGap,
      },
    });
    return { isValid: false, errors, warnings };
  }

  // Check if parent was too old when child was born (error)
  if (ageGap > BIRTHDATE_VALIDATION_CONFIG.MAX_PARENT_AGE) {
    errors.push({
      code: "PARENT_TOO_OLD",
      message: `${parentName} would have been ${ageGap} years old when ${childName} was born. This exceeds the maximum reasonable age gap of ${BIRTHDATE_VALIDATION_CONFIG.MAX_PARENT_AGE} years.`,
      details: {
        parentName,
        childName,
        parentBirthDate: parent.birthDate!,
        childBirthDate: child.birthDate!,
        ageGap,
      },
    });
    return { isValid: false, errors, warnings };
  }

  // Check for unusual but allowed age gaps (warnings)
  if (ageGap < 18) {
    warnings.push({
      code: "UNUSUALLY_YOUNG_PARENT",
      message: `${parentName} was ${ageGap} years old when ${childName} was born, which is unusually young.`,
      details: {
        parentName,
        childName,
        ageGap,
      },
    });
  }

  if (ageGap > 60) {
    warnings.push({
      code: "UNUSUALLY_OLD_PARENT",
      message: `${parentName} was ${ageGap} years old when ${childName} was born, which is unusually old.`,
      details: {
        parentName,
        childName,
        ageGap,
      },
    });
  }

  return {
    isValid: true,
    errors,
    warnings,
  };
}

/**
 * Validate birthdates when updating a family member
 * Checks the member's relationships with existing parents and children
 */
export async function validateMemberBirthdateUpdate(
  member: MemberForValidation,
  parents: MemberForValidation[],
  children: MemberForValidation[]
): Promise<BirthdateValidationResult> {
  const allErrors: BirthdateValidationError[] = [];
  const allWarnings: BirthdateValidationWarning[] = [];

  // Validate against each parent (member is the child)
  for (const parent of parents) {
    const result = validateParentChildBirthdates(parent, member);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  }

  // Validate against each child (member is the parent)
  for (const child of children) {
    const result = validateParentChildBirthdates(member, child);
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
 * Validate a new parent-child relationship
 */
export function validateNewParentChildRelationship(
  parent: MemberForValidation,
  child: MemberForValidation
): BirthdateValidationResult {
  return validateParentChildBirthdates(parent, child);
}

/**
 * Format validation errors for API response
 */
export function formatValidationErrors(result: BirthdateValidationResult): string {
  if (result.isValid) {
    return "";
  }

  return result.errors.map((error) => error.message).join(" ");
}
