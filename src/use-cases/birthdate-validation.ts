import { findFamilyMemberById } from "~/data-access/family-members";
import {
  findParentsOfChild,
  findChildrenOfParent,
} from "~/data-access/parent-child-relationships";
import {
  validateParentChildBirthdates,
  validateMemberBirthdateUpdate,
  formatValidationErrors,
  type MemberForValidation,
  type BirthdateValidationResult,
  type BirthdateValidationErrorCode,
} from "~/utils/birthdate-validation";

/**
 * Custom error class for birthdate validation failures
 */
export class BirthdateValidationError extends Error {
  constructor(
    message: string,
    public readonly code: BirthdateValidationErrorCode | "VALIDATION_FAILED",
    public readonly validationResult: BirthdateValidationResult
  ) {
    super(message);
    this.name = "BirthdateValidationError";
  }
}

/**
 * Convert a family member from the database to the validation format
 */
function toMemberForValidation(member: {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
}): MemberForValidation {
  return {
    id: member.id,
    firstName: member.firstName,
    lastName: member.lastName,
    birthDate: member.birthDate,
  };
}

/**
 * Validate a new parent-child relationship
 * @throws BirthdateValidationError if validation fails
 */
export async function validateParentChildRelationship(
  parentId: string,
  childId: string
): Promise<void> {
  // Fetch parent and child members
  const [parent, child] = await Promise.all([
    findFamilyMemberById(parentId),
    findFamilyMemberById(childId),
  ]);

  if (!parent) {
    throw new Error("Parent member not found");
  }

  if (!child) {
    throw new Error("Child member not found");
  }

  // Validate the relationship
  const result = validateParentChildBirthdates(
    toMemberForValidation(parent),
    toMemberForValidation(child)
  );

  if (!result.isValid) {
    throw new BirthdateValidationError(
      formatValidationErrors(result),
      result.errors[0]?.code || "VALIDATION_FAILED",
      result
    );
  }
}

/**
 * Validate a family member's birthdate update against their existing relationships
 * @throws BirthdateValidationError if validation fails
 */
export async function validateMemberBirthdateChange(
  memberId: string,
  newBirthDate: string | null
): Promise<void> {
  // Fetch the member
  const member = await findFamilyMemberById(memberId);
  if (!member) {
    throw new Error("Family member not found");
  }

  // If birthdate is not changing to a value, no validation needed
  if (newBirthDate === null || newBirthDate === undefined) {
    return;
  }

  // Create a member object with the new birthdate for validation
  const memberWithNewBirthdate: MemberForValidation = {
    id: member.id,
    firstName: member.firstName,
    lastName: member.lastName,
    birthDate: newBirthDate,
  };

  // Fetch all parent relationships (where this member is the child)
  const parentRelationships = await findParentsOfChild(memberId);
  const parentIds = parentRelationships.map((rel) => rel.parentId);

  // Fetch all child relationships (where this member is the parent)
  const childRelationships = await findChildrenOfParent(memberId);
  const childIds = childRelationships.map((rel) => rel.childId);

  // Fetch all parent and child members
  const [parents, children] = await Promise.all([
    Promise.all(parentIds.map((id) => findFamilyMemberById(id))),
    Promise.all(childIds.map((id) => findFamilyMemberById(id))),
  ]);

  // Filter out null values and convert to validation format
  const validParents = parents
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .map(toMemberForValidation);

  const validChildren = children
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .map(toMemberForValidation);

  // Validate against all relationships
  const result = await validateMemberBirthdateUpdate(
    memberWithNewBirthdate,
    validParents,
    validChildren
  );

  if (!result.isValid) {
    throw new BirthdateValidationError(
      formatValidationErrors(result),
      result.errors[0]?.code || "VALIDATION_FAILED",
      result
    );
  }
}

/**
 * Get validation warnings for a member's birthdate (non-blocking)
 * Returns warnings without throwing an error
 */
export async function getMemberBirthdateWarnings(
  memberId: string,
  birthDate: string | null
): Promise<BirthdateValidationResult> {
  // Fetch the member
  const member = await findFamilyMemberById(memberId);
  if (!member) {
    return { isValid: true, errors: [], warnings: [] };
  }

  // If birthdate is not set, no warnings
  if (birthDate === null || birthDate === undefined) {
    return { isValid: true, errors: [], warnings: [] };
  }

  // Create a member object with the birthdate for validation
  const memberWithBirthdate: MemberForValidation = {
    id: member.id,
    firstName: member.firstName,
    lastName: member.lastName,
    birthDate: birthDate,
  };

  // Fetch all parent relationships (where this member is the child)
  const parentRelationships = await findParentsOfChild(memberId);
  const parentIds = parentRelationships.map((rel) => rel.parentId);

  // Fetch all child relationships (where this member is the parent)
  const childRelationships = await findChildrenOfParent(memberId);
  const childIds = childRelationships.map((rel) => rel.childId);

  // Fetch all parent and child members
  const [parents, children] = await Promise.all([
    Promise.all(parentIds.map((id) => findFamilyMemberById(id))),
    Promise.all(childIds.map((id) => findFamilyMemberById(id))),
  ]);

  // Filter out null values and convert to validation format
  const validParents = parents
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .map(toMemberForValidation);

  const validChildren = children
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .map(toMemberForValidation);

  // Get validation result (including warnings)
  return await validateMemberBirthdateUpdate(
    memberWithBirthdate,
    validParents,
    validChildren
  );
}
