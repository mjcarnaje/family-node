/**
 * Family Tree Limits Use Case
 *
 * All features are free with unlimited access, so this module
 * provides pass-through implementations that always allow actions.
 */

export class FamilyTreeLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FamilyTreeLimitError";
  }
}

/**
 * Check if a user can add a family member to a tree.
 * Since all features are free with unlimited access, this always succeeds.
 */
export async function checkCanAddFamilyMember(
  _userId: string,
  _familyTreeId: string
): Promise<void> {
  // All features are free with unlimited access - no limits to check
  return;
}

/**
 * Check if a user can add multiple family members to a tree.
 * Since all features are free with unlimited access, this always succeeds.
 */
export async function checkCanAddFamilyMembers(
  _userId: string,
  _familyTreeId: string,
  _count: number
): Promise<void> {
  // All features are free with unlimited access - no limits to check
  return;
}

/**
 * Check if a user can create a new family tree.
 * Since all features are free with unlimited access, this always succeeds.
 */
export async function checkCanCreateFamilyTree(_userId: string): Promise<void> {
  // All features are free with unlimited access - no limits to check
  return;
}
