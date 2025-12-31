/**
 * Family Tree Traversal Utilities
 *
 * This module provides utility functions for traversing family tree relationships
 * to find ancestors, descendants, and related members.
 */

import type {
  FamilyMember,
  ParentChildRelationship,
  MarriageConnection,
} from "~/db/schema";

export type FocusMode = "all" | "ancestors" | "descendants";

interface TraversalContext {
  childToParents: Map<string, string[]>;
  parentToChildren: Map<string, string[]>;
  spouseMap: Map<string, string[]>;
  memberMap: Map<string, FamilyMember>;
}

/**
 * Build relationship maps for quick lookups during traversal
 */
export function buildTraversalContext(
  members: FamilyMember[],
  relationships: ParentChildRelationship[],
  marriages: MarriageConnection[]
): TraversalContext {
  const memberMap = new Map<string, FamilyMember>();
  members.forEach((m) => memberMap.set(m.id, m));

  const childToParents = new Map<string, string[]>();
  const parentToChildren = new Map<string, string[]>();

  relationships.forEach((rel) => {
    // Child to parents
    if (!childToParents.has(rel.childId)) {
      childToParents.set(rel.childId, []);
    }
    const parents = childToParents.get(rel.childId)!;
    if (!parents.includes(rel.parentId)) {
      parents.push(rel.parentId);
    }

    // Parent to children
    if (!parentToChildren.has(rel.parentId)) {
      parentToChildren.set(rel.parentId, []);
    }
    const children = parentToChildren.get(rel.parentId)!;
    if (!children.includes(rel.childId)) {
      children.push(rel.childId);
    }
  });

  // Build spouse map
  const spouseMap = new Map<string, string[]>();
  marriages.forEach((marriage) => {
    if (!spouseMap.has(marriage.spouse1Id)) {
      spouseMap.set(marriage.spouse1Id, []);
    }
    const spouses1 = spouseMap.get(marriage.spouse1Id)!;
    if (!spouses1.includes(marriage.spouse2Id)) {
      spouses1.push(marriage.spouse2Id);
    }

    if (!spouseMap.has(marriage.spouse2Id)) {
      spouseMap.set(marriage.spouse2Id, []);
    }
    const spouses2 = spouseMap.get(marriage.spouse2Id)!;
    if (!spouses2.includes(marriage.spouse1Id)) {
      spouses2.push(marriage.spouse1Id);
    }
  });

  return { childToParents, parentToChildren, spouseMap, memberMap };
}

/**
 * Get all ancestors of a member (parents, grandparents, etc.)
 * Uses BFS to traverse up the tree
 * Optionally includes spouses of ancestors
 */
export function getAncestors(
  memberId: string,
  context: TraversalContext,
  includeSpouses: boolean = true
): Set<string> {
  const ancestors = new Set<string>();
  const queue: string[] = [];

  // Start with the member's parents
  const parents = context.childToParents.get(memberId) || [];
  queue.push(...parents);

  while (queue.length > 0) {
    const currentId = queue.shift()!;

    if (ancestors.has(currentId)) continue;
    ancestors.add(currentId);

    // Add this ancestor's parents to the queue
    const parentParents = context.childToParents.get(currentId) || [];
    queue.push(...parentParents);

    // Optionally include spouse(s) of this ancestor
    if (includeSpouses) {
      const spouses = context.spouseMap.get(currentId) || [];
      for (const spouseId of spouses) {
        if (!ancestors.has(spouseId)) {
          ancestors.add(spouseId);
          // Also add spouse's parents (in-laws become part of ancestor view)
          const spouseParents = context.childToParents.get(spouseId) || [];
          queue.push(...spouseParents);
        }
      }
    }
  }

  return ancestors;
}

/**
 * Get all descendants of a member (children, grandchildren, etc.)
 * Uses BFS to traverse down the tree
 * Optionally includes spouses of descendants
 */
export function getDescendants(
  memberId: string,
  context: TraversalContext,
  includeSpouses: boolean = true
): Set<string> {
  const descendants = new Set<string>();
  const queue: string[] = [];

  // Start with the member's children
  const children = context.parentToChildren.get(memberId) || [];
  queue.push(...children);

  // Also include children from spouse relationships
  const spouses = context.spouseMap.get(memberId) || [];
  for (const spouseId of spouses) {
    const spouseChildren = context.parentToChildren.get(spouseId) || [];
    queue.push(...spouseChildren);
  }

  while (queue.length > 0) {
    const currentId = queue.shift()!;

    if (descendants.has(currentId)) continue;
    descendants.add(currentId);

    // Add this descendant's children to the queue
    const childChildren = context.parentToChildren.get(currentId) || [];
    queue.push(...childChildren);

    // Optionally include spouse(s) of this descendant
    if (includeSpouses) {
      const childSpouses = context.spouseMap.get(currentId) || [];
      for (const spouseId of childSpouses) {
        if (!descendants.has(spouseId)) {
          descendants.add(spouseId);
          // Also get spouse's children (step-children become part of descendant view)
          const spouseChildren = context.parentToChildren.get(spouseId) || [];
          queue.push(...spouseChildren);
        }
      }
    }
  }

  return descendants;
}

/**
 * Filter members, relationships, and marriages based on focus mode
 */
export function filterByFocusMode(
  focusMemberId: string,
  focusMode: FocusMode,
  members: FamilyMember[],
  relationships: ParentChildRelationship[],
  marriages: MarriageConnection[]
): {
  filteredMembers: FamilyMember[];
  filteredRelationships: ParentChildRelationship[];
  filteredMarriages: MarriageConnection[];
} {
  // If no focus mode or "all", return everything
  if (focusMode === "all" || !focusMemberId) {
    return {
      filteredMembers: members,
      filteredRelationships: relationships,
      filteredMarriages: marriages,
    };
  }

  const context = buildTraversalContext(members, relationships, marriages);

  // Get the set of member IDs to include
  let includedIds: Set<string>;

  if (focusMode === "ancestors") {
    includedIds = getAncestors(focusMemberId, context, true);
    // Always include the focus member itself
    includedIds.add(focusMemberId);
    // Include spouse of focus member
    const focusSpouses = context.spouseMap.get(focusMemberId) || [];
    focusSpouses.forEach(id => includedIds.add(id));
  } else {
    // descendants
    includedIds = getDescendants(focusMemberId, context, true);
    // Always include the focus member itself
    includedIds.add(focusMemberId);
    // Include spouse of focus member
    const focusSpouses = context.spouseMap.get(focusMemberId) || [];
    focusSpouses.forEach(id => includedIds.add(id));
  }

  // Filter members
  const filteredMembers = members.filter((m) => includedIds.has(m.id));

  // Filter relationships - only include if both parent and child are in the filtered set
  const filteredRelationships = relationships.filter(
    (r) => includedIds.has(r.parentId) && includedIds.has(r.childId)
  );

  // Filter marriages - only include if both spouses are in the filtered set
  const filteredMarriages = marriages.filter(
    (m) => includedIds.has(m.spouse1Id) && includedIds.has(m.spouse2Id)
  );

  return {
    filteredMembers,
    filteredRelationships,
    filteredMarriages,
  };
}

/**
 * Get member info for focus mode display
 */
export function getMemberDisplayName(member: FamilyMember): string {
  return `${member.firstName} ${member.lastName}`;
}

/**
 * Calculate generation levels for all members
 * Returns a map of memberId -> generation number (0 = root ancestors)
 */
export function calculateGenerations(
  members: FamilyMember[],
  relationships: ParentChildRelationship[],
  marriages: MarriageConnection[]
): Map<string, number> {
  const context = buildTraversalContext(members, relationships, marriages);
  const generationMap = new Map<string, number>();

  // Find root members (those with no parents in the tree)
  const rootIds: string[] = [];
  members.forEach((member) => {
    const parents = context.childToParents.get(member.id);
    if (!parents || parents.length === 0) {
      rootIds.push(member.id);
    }
  });

  // If no clear roots, all members are generation 0
  if (rootIds.length === 0) {
    members.forEach((member) => generationMap.set(member.id, 0));
    return generationMap;
  }

  // BFS to assign generations
  const queue: { id: string; generation: number }[] = [];
  const visited = new Set<string>();

  // Start with roots at generation 0
  rootIds.forEach((id) => {
    if (!visited.has(id)) {
      queue.push({ id, generation: 0 });
      visited.add(id);

      // Add spouses at same generation
      const spouses = context.spouseMap.get(id) || [];
      spouses.forEach((spouseId) => {
        if (!visited.has(spouseId)) {
          queue.push({ id: spouseId, generation: 0 });
          visited.add(spouseId);
        }
      });
    }
  });

  // Process queue
  while (queue.length > 0) {
    const { id, generation } = queue.shift()!;

    // Set or update generation (take the maximum if already assigned)
    const existingGen = generationMap.get(id);
    const newGen = existingGen !== undefined ? Math.max(existingGen, generation) : generation;
    generationMap.set(id, newGen);

    // Process children
    const children = context.parentToChildren.get(id) || [];
    children.forEach((childId) => {
      const childGeneration = newGen + 1;
      const existingChildGen = generationMap.get(childId);

      if (!visited.has(childId) || (existingChildGen !== undefined && existingChildGen < childGeneration)) {
        generationMap.set(childId, childGeneration);

        if (!visited.has(childId)) {
          visited.add(childId);
          queue.push({ id: childId, generation: childGeneration });

          // Add child's spouses at same generation
          const childSpouses = context.spouseMap.get(childId) || [];
          childSpouses.forEach((spouseId) => {
            if (!visited.has(spouseId)) {
              visited.add(spouseId);
              queue.push({ id: spouseId, generation: childGeneration });
            }
          });
        }
      }
    });
  }

  // Handle any remaining unvisited members
  members.forEach((member) => {
    if (!generationMap.has(member.id)) {
      generationMap.set(member.id, 0);
    }
  });

  return generationMap;
}

/**
 * Get unique generation levels available in the tree
 */
export function getAvailableGenerations(
  members: FamilyMember[],
  relationships: ParentChildRelationship[],
  marriages: MarriageConnection[]
): number[] {
  const generationMap = calculateGenerations(members, relationships, marriages);
  const generations = new Set<number>();

  generationMap.forEach((gen) => generations.add(gen));

  return Array.from(generations).sort((a, b) => a - b);
}

/**
 * Filter options for attribute-based filtering
 */
export interface AttributeFilterOptions {
  generations?: number[];
  genders?: ("male" | "female" | "other")[];
  relationshipTypes?: ("biological" | "adopted" | "step" | "foster")[];
  marriageStatuses?: ("married" | "divorced" | "widowed" | "separated" | "annulled")[];
  showDeceased?: boolean;
  showParentChildLines?: boolean;
  showMarriageLines?: boolean;
}

/**
 * Filter members, relationships, and marriages based on attribute filters
 */
export function filterByAttributes(
  members: FamilyMember[],
  relationships: ParentChildRelationship[],
  marriages: MarriageConnection[],
  options: AttributeFilterOptions
): {
  filteredMembers: FamilyMember[];
  filteredRelationships: ParentChildRelationship[];
  filteredMarriages: MarriageConnection[];
} {
  // Calculate generation map for generation filtering
  const generationMap = calculateGenerations(members, relationships, marriages);

  // Filter members
  let filteredMembers = [...members];

  // Filter by generation
  if (options.generations && options.generations.length > 0) {
    filteredMembers = filteredMembers.filter((member) => {
      const generation = generationMap.get(member.id);
      return generation !== undefined && options.generations!.includes(generation);
    });
  }

  // Filter by gender
  if (options.genders && options.genders.length > 0) {
    filteredMembers = filteredMembers.filter((member) => {
      // Include members with matching gender, or null/undefined gender if "other" is selected
      if (member.gender) {
        return options.genders!.includes(member.gender);
      }
      // Treat null/undefined gender as "other"
      return options.genders!.includes("other");
    });
  }

  // Filter by deceased status
  if (options.showDeceased === false) {
    filteredMembers = filteredMembers.filter((member) => !member.deathDate);
  }

  // Get set of filtered member IDs for relationship filtering
  const filteredMemberIds = new Set(filteredMembers.map((m) => m.id));

  // Filter relationships - only include if both parent and child are in the filtered set
  let filteredRelationships = relationships.filter(
    (r) => filteredMemberIds.has(r.parentId) && filteredMemberIds.has(r.childId)
  );

  // Filter by relationship type
  if (options.relationshipTypes && options.relationshipTypes.length > 0) {
    filteredRelationships = filteredRelationships.filter((r) =>
      options.relationshipTypes!.includes(r.relationshipType)
    );
  }

  // Filter marriages - only include if both spouses are in the filtered set
  let filteredMarriages = marriages.filter(
    (m) => filteredMemberIds.has(m.spouse1Id) && filteredMemberIds.has(m.spouse2Id)
  );

  // Filter by marriage status
  if (options.marriageStatuses && options.marriageStatuses.length > 0) {
    filteredMarriages = filteredMarriages.filter((m) =>
      options.marriageStatuses!.includes(m.status)
    );
  }

  return {
    filteredMembers,
    filteredRelationships,
    filteredMarriages,
  };
}
