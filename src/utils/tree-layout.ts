/**
 * Hierarchical Tree Layout Algorithm
 *
 * This module implements a sophisticated hierarchical layout algorithm for family trees
 * that automatically organizes family members based on generations and relationships.
 *
 * Key features:
 * - Generation-based vertical positioning
 * - Sibling grouping (children of same parents positioned together)
 * - Couple centering (children centered under their parents)
 * - Multiple marriages/blended families support
 * - Edge crossing minimization
 * - Subtree spacing optimization
 */

import type {
  FamilyMember,
  ParentChildRelationship,
  MarriageConnection,
} from "~/db/schema";

// Layout configuration constants
export const LAYOUT_CONFIG = {
  nodeWidth: 200,
  nodeHeight: 220, // Match min-h-[220px] in FamilyMemberNode
  horizontalSpacing: 100, // Space between nodes
  verticalSpacing: 150, // Space between generations
  coupleGap: 50, // Gap between spouses
  siblingGap: 30, // Additional gap between sibling groups
  minSubtreeSpacing: 50, // Minimum spacing between subtrees
} as const;

// Types for layout processing
interface LayoutNode {
  id: string;
  member: FamilyMember;
  generation: number;
  x: number;
  y: number;
  width: number;
  spouseId: string | null;
  parentIds: string[];
  childIds: string[];
  subtreeWidth: number;
  processed: boolean;
}

interface FamilyUnit {
  id: string;
  parentIds: string[]; // Can be 1 or 2 parents (couple)
  childIds: string[];
  generation: number;
}

interface LayoutResult {
  nodePositions: Map<string, { x: number; y: number }>;
  processedMembers: FamilyMember[];
}

/**
 * Main entry point for calculating tree layout
 */
export function calculateHierarchicalLayout(
  members: FamilyMember[],
  relationships: ParentChildRelationship[],
  marriages: MarriageConnection[]
): LayoutResult {
  const nodePositions = new Map<string, { x: number; y: number }>();

  if (members.length === 0) {
    return { nodePositions, processedMembers: [] };
  }

  // Build relationship maps
  const {
    childToParents,
    parentToChildren,
    spouseMap,
    memberMap,
    marriagesByMember,
  } = buildRelationshipMaps(members, relationships, marriages);

  // Create layout nodes
  const layoutNodes = createLayoutNodes(
    members,
    memberMap,
    childToParents,
    parentToChildren,
    spouseMap
  );

  // Assign generations (vertical levels)
  assignGenerations(layoutNodes, childToParents, parentToChildren, spouseMap);

  // Identify family units (parent couples with their children)
  const familyUnits = identifyFamilyUnits(
    layoutNodes,
    parentToChildren,
    spouseMap,
    marriagesByMember
  );

  // Group nodes by generation
  const generationGroups = groupByGeneration(layoutNodes);

  // Calculate subtree widths bottom-up
  calculateSubtreeWidths(
    layoutNodes,
    generationGroups,
    parentToChildren,
    spouseMap
  );

  // Position nodes generation by generation, top-down
  positionNodes(
    layoutNodes,
    generationGroups,
    familyUnits,
    parentToChildren,
    spouseMap
  );

  // Center the entire tree
  centerTree(layoutNodes);

  // Convert to output format
  layoutNodes.forEach((node) => {
    nodePositions.set(node.id, { x: node.x, y: node.y });
  });

  return { nodePositions, processedMembers: members };
}

/**
 * Build maps for quick relationship lookups
 */
function buildRelationshipMaps(
  members: FamilyMember[],
  relationships: ParentChildRelationship[],
  marriages: MarriageConnection[]
) {
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

  // Build spouse map (supports multiple marriages)
  const spouseMap = new Map<string, string[]>();
  const marriagesByMember = new Map<string, MarriageConnection[]>();

  marriages.forEach((marriage) => {
    // Add spouse1 -> spouse2
    if (!spouseMap.has(marriage.spouse1Id)) {
      spouseMap.set(marriage.spouse1Id, []);
    }
    const spouses1 = spouseMap.get(marriage.spouse1Id)!;
    if (!spouses1.includes(marriage.spouse2Id)) {
      spouses1.push(marriage.spouse2Id);
    }

    // Add spouse2 -> spouse1
    if (!spouseMap.has(marriage.spouse2Id)) {
      spouseMap.set(marriage.spouse2Id, []);
    }
    const spouses2 = spouseMap.get(marriage.spouse2Id)!;
    if (!spouses2.includes(marriage.spouse1Id)) {
      spouses2.push(marriage.spouse1Id);
    }

    // Track marriages by member
    if (!marriagesByMember.has(marriage.spouse1Id)) {
      marriagesByMember.set(marriage.spouse1Id, []);
    }
    marriagesByMember.get(marriage.spouse1Id)!.push(marriage);

    if (!marriagesByMember.has(marriage.spouse2Id)) {
      marriagesByMember.set(marriage.spouse2Id, []);
    }
    marriagesByMember.get(marriage.spouse2Id)!.push(marriage);
  });

  return {
    memberMap,
    childToParents,
    parentToChildren,
    spouseMap,
    marriagesByMember,
  };
}

/**
 * Create layout nodes from family members
 */
function createLayoutNodes(
  members: FamilyMember[],
  memberMap: Map<string, FamilyMember>,
  childToParents: Map<string, string[]>,
  parentToChildren: Map<string, string[]>,
  spouseMap: Map<string, string[]>
): Map<string, LayoutNode> {
  const layoutNodes = new Map<string, LayoutNode>();

  members.forEach((member) => {
    const spouses = spouseMap.get(member.id) || [];
    layoutNodes.set(member.id, {
      id: member.id,
      member,
      generation: -1, // Will be assigned later
      x: 0,
      y: 0,
      width: LAYOUT_CONFIG.nodeWidth,
      spouseId: spouses.length > 0 ? spouses[0] : null, // Primary spouse
      parentIds: childToParents.get(member.id) || [],
      childIds: parentToChildren.get(member.id) || [],
      subtreeWidth: LAYOUT_CONFIG.nodeWidth,
      processed: false,
    });
  });

  return layoutNodes;
}

/**
 * Assign generation levels to nodes using BFS
 * Generation 0 = root ancestors, higher numbers = younger generations
 */
function assignGenerations(
  layoutNodes: Map<string, LayoutNode>,
  childToParents: Map<string, string[]>,
  parentToChildren: Map<string, string[]>,
  spouseMap: Map<string, string[]>
): void {
  // Step 1: Identify members who have parents in the tree (native family members)
  // vs those who married in (no parents in tree)
  const hasParentsInTree = new Set<string>();
  layoutNodes.forEach((node) => {
    if (node.parentIds.length > 0) {
      hasParentsInTree.add(node.id);
    }
  });

  // Step 2: Find TRUE ancestors - people with no parents who are NOT married to someone with parents
  // People who married into a lower generation should not be treated as roots
  const trueAncestors: string[] = [];
  
  layoutNodes.forEach((node) => {
    if (node.parentIds.length === 0) {
      // Check if this person is married to someone who has parents
      const spouses = spouseMap.get(node.id) || [];
      const marriedToNativeMember = spouses.some(spouseId => hasParentsInTree.has(spouseId));
      
      if (!marriedToNativeMember) {
        // This is a true ancestor (oldest generation)
        trueAncestors.push(node.id);
      }
      // If married to native member, they'll get their generation from their spouse later
    }
  });

  // If no true ancestors found, use all members without parents
  if (trueAncestors.length === 0) {
    layoutNodes.forEach((node) => {
      if (node.parentIds.length === 0) {
        trueAncestors.push(node.id);
      }
    });
  }

  // Step 3: BFS to assign generations starting from true ancestors
  const queue: { id: string; generation: number }[] = [];
  const visited = new Set<string>();

  // Start with true ancestors at generation 0
  trueAncestors.forEach((id) => {
    if (!visited.has(id)) {
      queue.push({ id, generation: 0 });
      visited.add(id);

      // Add spouses of ancestors at same generation (only if spouse has no parents)
      const spouses = spouseMap.get(id) || [];
      spouses.forEach((spouseId) => {
        if (layoutNodes.has(spouseId) && !visited.has(spouseId) && !hasParentsInTree.has(spouseId)) {
          queue.push({ id: spouseId, generation: 0 });
          visited.add(spouseId);
        }
      });
    }
  });

  // Process queue
  while (queue.length > 0) {
    const { id, generation } = queue.shift()!;
    const node = layoutNodes.get(id);
    if (!node) continue;

    // Assign generation
    node.generation = Math.max(node.generation, generation);

    // Process children
    const children = parentToChildren.get(id) || [];
    children.forEach((childId) => {
      const childNode = layoutNodes.get(childId);
      if (childNode) {
        const childGeneration = generation + 1;
        if (!visited.has(childId) || childNode.generation < childGeneration) {
          childNode.generation = childGeneration;
          if (!visited.has(childId)) {
            visited.add(childId);
            queue.push({ id: childId, generation: childGeneration });

            // Add child's spouses at same generation
            const childSpouses = spouseMap.get(childId) || [];
            childSpouses.forEach((spouseId) => {
              const spouseNode = layoutNodes.get(spouseId);
              if (spouseNode && !visited.has(spouseId)) {
                visited.add(spouseId);
                spouseNode.generation = childGeneration;
                queue.push({ id: spouseId, generation: childGeneration });
              }
            });
          }
        }
      }
    });
  }

  // Step 4: Handle any remaining unvisited nodes (married-in members)
  layoutNodes.forEach((node) => {
    if (node.generation === -1) {
      // Try to get generation from spouse
      const spouses = spouseMap.get(node.id) || [];
      for (const spouseId of spouses) {
        const spouseNode = layoutNodes.get(spouseId);
        if (spouseNode && spouseNode.generation !== -1) {
          node.generation = spouseNode.generation;
          break;
        }
      }
      // If still no generation, default to 0
      if (node.generation === -1) {
        node.generation = 0;
      }
    }
  });
}

/**
 * Identify family units (couples with their shared children)
 */
function identifyFamilyUnits(
  layoutNodes: Map<string, LayoutNode>,
  parentToChildren: Map<string, string[]>,
  spouseMap: Map<string, string[]>,
  marriagesByMember: Map<string, MarriageConnection[]>
): FamilyUnit[] {
  const familyUnits: FamilyUnit[] = [];
  const processedCouples = new Set<string>();

  layoutNodes.forEach((node) => {
    if (node.childIds.length === 0) return;

    // Get spouses
    const spouses = spouseMap.get(node.id) || [];

    // For each spouse pair, find shared children
    spouses.forEach((spouseId) => {
      const coupleKey = [node.id, spouseId].sort().join("-");
      if (processedCouples.has(coupleKey)) return;
      processedCouples.add(coupleKey);

      const spouseNode = layoutNodes.get(spouseId);
      if (!spouseNode) return;

      // Find children shared by both parents
      const nodeChildren = new Set(node.childIds);
      const spouseChildren = new Set(spouseNode.childIds);
      const sharedChildren = node.childIds.filter((c) =>
        spouseChildren.has(c)
      );

      if (sharedChildren.length > 0) {
        familyUnits.push({
          id: coupleKey,
          parentIds: [node.id, spouseId],
          childIds: sharedChildren,
          generation: node.generation,
        });
      }
    });

    // Handle single parent situations
    const childrenWithBothParents = new Set<string>();
    spouses.forEach((spouseId) => {
      const spouseChildren = parentToChildren.get(spouseId) || [];
      node.childIds.forEach((childId) => {
        if (spouseChildren.includes(childId)) {
          childrenWithBothParents.add(childId);
        }
      });
    });

    const singleParentChildren = node.childIds.filter(
      (c) => !childrenWithBothParents.has(c)
    );
    if (singleParentChildren.length > 0) {
      const unitKey = `single-${node.id}`;
      if (!processedCouples.has(unitKey)) {
        processedCouples.add(unitKey);
        familyUnits.push({
          id: unitKey,
          parentIds: [node.id],
          childIds: singleParentChildren,
          generation: node.generation,
        });
      }
    }
  });

  return familyUnits;
}

/**
 * Group nodes by their generation level
 */
function groupByGeneration(
  layoutNodes: Map<string, LayoutNode>
): Map<number, LayoutNode[]> {
  const groups = new Map<number, LayoutNode[]>();

  layoutNodes.forEach((node) => {
    if (!groups.has(node.generation)) {
      groups.set(node.generation, []);
    }
    groups.get(node.generation)!.push(node);
  });

  return groups;
}

/**
 * Calculate subtree widths for proper spacing (bottom-up)
 */
function calculateSubtreeWidths(
  layoutNodes: Map<string, LayoutNode>,
  generationGroups: Map<number, LayoutNode[]>,
  parentToChildren: Map<string, string[]>,
  spouseMap: Map<string, string[]>
): void {
  // Get generations sorted from bottom to top
  const generations = Array.from(generationGroups.keys()).sort((a, b) => b - a);

  generations.forEach((gen) => {
    const nodes = generationGroups.get(gen)!;

    nodes.forEach((node) => {
      if (node.childIds.length === 0) {
        // Leaf node - just node width plus spouse if applicable
        const spouses = spouseMap.get(node.id) || [];
        const primarySpouse = spouses.find(
          (s) => layoutNodes.get(s)?.generation === node.generation
        );
        if (primarySpouse && !node.processed) {
          const spouseNode = layoutNodes.get(primarySpouse)!;
          // Couple width
          node.subtreeWidth =
            LAYOUT_CONFIG.nodeWidth * 2 + LAYOUT_CONFIG.coupleGap;
          spouseNode.subtreeWidth = 0; // Will be positioned with partner
          spouseNode.processed = true;
        } else if (!node.processed) {
          node.subtreeWidth = LAYOUT_CONFIG.nodeWidth;
        }
      } else {
        // Non-leaf node - sum of children's subtree widths
        let totalChildWidth = 0;
        const uniqueChildren = new Set(node.childIds);

        uniqueChildren.forEach((childId) => {
          const childNode = layoutNodes.get(childId);
          if (childNode) {
            totalChildWidth +=
              childNode.subtreeWidth + LAYOUT_CONFIG.horizontalSpacing;
          }
        });

        // Remove last spacing
        totalChildWidth = Math.max(
          0,
          totalChildWidth - LAYOUT_CONFIG.horizontalSpacing
        );

        // Ensure subtree is at least as wide as the parent couple
        const spouses = spouseMap.get(node.id) || [];
        const primarySpouse = spouses.find(
          (s) => layoutNodes.get(s)?.generation === node.generation
        );
        const parentWidth = primarySpouse
          ? LAYOUT_CONFIG.nodeWidth * 2 + LAYOUT_CONFIG.coupleGap
          : LAYOUT_CONFIG.nodeWidth;

        node.subtreeWidth = Math.max(totalChildWidth, parentWidth);

        if (primarySpouse && !node.processed) {
          const spouseNode = layoutNodes.get(primarySpouse)!;
          spouseNode.subtreeWidth = 0;
          spouseNode.processed = true;
        }
      }
    });
  });

  // Reset processed flags
  layoutNodes.forEach((node) => (node.processed = false));
}

/**
 * Position nodes generation by generation (top-down)
 * Uses subtree widths to space parents so children are always centered
 */
function positionNodes(
  layoutNodes: Map<string, LayoutNode>,
  generationGroups: Map<number, LayoutNode[]>,
  familyUnits: FamilyUnit[],
  parentToChildren: Map<string, string[]>,
  spouseMap: Map<string, string[]>
): void {
  // Get generations sorted from top to bottom
  const generations = Array.from(generationGroups.keys()).sort((a, b) => a - b);

  if (generations.length === 0) return;

  // Build a map of child to family unit for quick lookup
  const childToFamilyUnit = new Map<string, FamilyUnit>();
  familyUnits.forEach((unit) => {
    unit.childIds.forEach((childId) => {
      // Prefer units with both parents
      const existing = childToFamilyUnit.get(childId);
      if (!existing || unit.parentIds.length > existing.parentIds.length) {
        childToFamilyUnit.set(childId, unit);
      }
    });
  });

  // Position first generation using subtree widths
  const firstGen = generations[0];
  const firstGenNodes = generationGroups.get(firstGen)!;
  positionFirstGenerationBySubtreeWidth(
    firstGenNodes,
    firstGen,
    layoutNodes,
    spouseMap
  );

  // Position subsequent generations - children centered under parents
  for (let i = 1; i < generations.length; i++) {
    const gen = generations[i];
    const genNodes = generationGroups.get(gen)!;
    const y = gen * (LAYOUT_CONFIG.nodeHeight + LAYOUT_CONFIG.verticalSpacing);

    // Group children by their parent(s)
    const childrenByParent = new Map<string, LayoutNode[]>();
    const positionedNodes = new Set<string>();

    genNodes.forEach((node) => {
      if (positionedNodes.has(node.id)) return;

      const familyUnit = childToFamilyUnit.get(node.id);
      if (familyUnit) {
        const key = familyUnit.parentIds.sort().join("-");
        if (!childrenByParent.has(key)) {
          childrenByParent.set(key, []);
        }
        childrenByParent.get(key)!.push(node);
      } else {
        // Orphan node or single parent
        const parentIds = node.parentIds;
        const key = parentIds.length > 0 ? parentIds.sort().join("-") : "orphan";
        if (!childrenByParent.has(key)) {
          childrenByParent.set(key, []);
        }
        childrenByParent.get(key)!.push(node);
      }
    });

    // Position each group of siblings centered under their parents
    const parentGroups = Array.from(childrenByParent.entries());

    // Sort groups by parent position (left to right)
    parentGroups.sort((a, b) => {
      const [keyA] = a;
      const [keyB] = b;
      const parentIdA = keyA.split("-")[0];
      const parentIdB = keyB.split("-")[0];
      const parentNodeA = layoutNodes.get(parentIdA);
      const parentNodeB = layoutNodes.get(parentIdB);
      return (parentNodeA?.x || 0) - (parentNodeB?.x || 0);
    });

    parentGroups.forEach(([parentKey, children]) => {
      // Get parent center position - use the first child's actual parentIds for accuracy
      // This ensures we always use the real parent positions, not parsed from key
      const firstChild = children[0];
      const actualParentIds = firstChild ? firstChild.parentIds : [];
      const parentIdsToUse = actualParentIds.length > 0
        ? actualParentIds
        : parentKey.split("-").filter((id) => id !== "orphan");

      let parentCenterX = 0;

      if (parentIdsToUse.length > 0) {
        const parentPositions = parentIdsToUse
          .map((pid) => layoutNodes.get(pid)?.x)
          .filter((x) => x !== undefined) as number[];

        if (parentPositions.length > 0) {
          const minParentX = Math.min(...parentPositions);
          const maxParentX = Math.max(...parentPositions);
          parentCenterX =
            (minParentX + maxParentX + LAYOUT_CONFIG.nodeWidth) / 2;
        }
      }

      // Sort children for consistent ordering (by birth date if available)
      children.sort((a, b) => {
        const dateA = a.member.birthDate
          ? new Date(a.member.birthDate).getTime()
          : 0;
        const dateB = b.member.birthDate
          ? new Date(b.member.birthDate).getTime()
          : 0;
        return dateA - dateB;
      });

      // Calculate total width needed for this group of siblings
      let groupWidth = 0;
      const childrenWithSpouses: { node: LayoutNode; spouse?: LayoutNode }[] =
        [];

      children.forEach((child) => {
        if (positionedNodes.has(child.id)) return;

        const spouses = spouseMap.get(child.id) || [];
        const sameGenSpouse = spouses.find((s) => {
          const spouseNode = layoutNodes.get(s);
          return (
            spouseNode &&
            spouseNode.generation === child.generation &&
            !positionedNodes.has(s)
          );
        });

        const spouseNode = sameGenSpouse
          ? layoutNodes.get(sameGenSpouse)
          : undefined;

        childrenWithSpouses.push({ node: child, spouse: spouseNode });

        if (spouseNode) {
          // Use subtree width for spacing instead of just node width
          const subtreeW = Math.max(
            child.subtreeWidth,
            LAYOUT_CONFIG.nodeWidth * 2 + LAYOUT_CONFIG.coupleGap
          );
          groupWidth += subtreeW + LAYOUT_CONFIG.horizontalSpacing;
          positionedNodes.add(spouseNode.id);
        } else {
          const subtreeW = Math.max(child.subtreeWidth, LAYOUT_CONFIG.nodeWidth);
          groupWidth += subtreeW + LAYOUT_CONFIG.horizontalSpacing;
        }
        positionedNodes.add(child.id);
      });

      // Remove last spacing
      groupWidth -= LAYOUT_CONFIG.horizontalSpacing;

      // Start position for this group (centered under parents)
      let startX = parentCenterX - groupWidth / 2;

      // Position each child (and spouse) centered in their subtree space
      childrenWithSpouses.forEach(({ node, spouse }) => {
        const subtreeW = spouse
          ? Math.max(
              node.subtreeWidth,
              LAYOUT_CONFIG.nodeWidth * 2 + LAYOUT_CONFIG.coupleGap
            )
          : Math.max(node.subtreeWidth, LAYOUT_CONFIG.nodeWidth);

        // Center the node (or couple) within their subtree width
        if (spouse) {
          const coupleWidth = LAYOUT_CONFIG.nodeWidth * 2 + LAYOUT_CONFIG.coupleGap;
          const coupleOffset = (subtreeW - coupleWidth) / 2;
          node.x = startX + coupleOffset;
          node.y = y;
          spouse.x = node.x + LAYOUT_CONFIG.nodeWidth + LAYOUT_CONFIG.coupleGap;
          spouse.y = y;
        } else {
          const nodeOffset = (subtreeW - LAYOUT_CONFIG.nodeWidth) / 2;
          node.x = startX + nodeOffset;
          node.y = y;
        }

        startX += subtreeW + LAYOUT_CONFIG.horizontalSpacing;
      });
    });

    // Handle any remaining unpositioned nodes in this generation
    let orphanX = 0;
    genNodes.forEach((node) => {
      if (!positionedNodes.has(node.id)) {
        node.x = orphanX;
        node.y = y;
        orphanX += LAYOUT_CONFIG.nodeWidth + LAYOUT_CONFIG.horizontalSpacing;
        positionedNodes.add(node.id);
      }
    });
  }
}

/**
 * Position first generation using subtree widths for proper spacing
 */
function positionFirstGenerationBySubtreeWidth(
  nodes: LayoutNode[],
  generation: number,
  layoutNodes: Map<string, LayoutNode>,
  spouseMap: Map<string, string[]>
): void {
  const y = generation * (LAYOUT_CONFIG.nodeHeight + LAYOUT_CONFIG.verticalSpacing);
  let currentX = 0;
  const processedNodes = new Set<string>();

  // Sort nodes by subtree width (largest first for better layout)
  const sortedNodes = [...nodes].sort((a, b) => b.subtreeWidth - a.subtreeWidth);

  sortedNodes.forEach((node) => {
    if (processedNodes.has(node.id)) return;

    // Check for spouse at same generation
    const spouses = spouseMap.get(node.id) || [];
    const sameGenSpouse = spouses.find((s) => {
      const spouseNode = layoutNodes.get(s);
      return (
        spouseNode &&
        spouseNode.generation === generation &&
        !processedNodes.has(s)
      );
    });

    if (sameGenSpouse) {
      const spouseNode = layoutNodes.get(sameGenSpouse)!;
      // Use the larger subtree width of the couple
      const coupleSubtreeWidth = Math.max(node.subtreeWidth, spouseNode.subtreeWidth);
      const coupleWidth = LAYOUT_CONFIG.nodeWidth * 2 + LAYOUT_CONFIG.coupleGap;

      // Center couple within their subtree space
      const coupleOffset = (coupleSubtreeWidth - coupleWidth) / 2;
      node.x = currentX + coupleOffset;
      node.y = y;
      spouseNode.x = node.x + LAYOUT_CONFIG.nodeWidth + LAYOUT_CONFIG.coupleGap;
      spouseNode.y = y;

      processedNodes.add(node.id);
      processedNodes.add(sameGenSpouse);

      currentX += coupleSubtreeWidth + LAYOUT_CONFIG.horizontalSpacing;
    } else {
      // Single node - center within subtree width
      const subtreeWidth = Math.max(node.subtreeWidth, LAYOUT_CONFIG.nodeWidth);
      const nodeOffset = (subtreeWidth - LAYOUT_CONFIG.nodeWidth) / 2;
      node.x = currentX + nodeOffset;
      node.y = y;

      processedNodes.add(node.id);

      currentX += subtreeWidth + LAYOUT_CONFIG.horizontalSpacing;
    }
  });
}

/**
 * Position a single generation of nodes
 */
function positionGeneration(
  nodes: LayoutNode[],
  generation: number,
  startX: number,
  layoutNodes: Map<string, LayoutNode>,
  spouseMap: Map<string, string[]>,
  positionedNodes: Map<string, boolean>
): number {
  const y =
    generation * (LAYOUT_CONFIG.nodeHeight + LAYOUT_CONFIG.verticalSpacing);
  let currentX = startX;

  // Sort nodes - try to keep couples together
  const processedInThisPass = new Set<string>();

  nodes.forEach((node) => {
    if (processedInThisPass.has(node.id)) return;

    // Check for spouse at same generation
    const spouses = spouseMap.get(node.id) || [];
    const sameGenSpouse = spouses.find((s) => {
      const spouseNode = layoutNodes.get(s);
      return (
        spouseNode &&
        spouseNode.generation === generation &&
        !processedInThisPass.has(s)
      );
    });

    if (sameGenSpouse) {
      const spouseNode = layoutNodes.get(sameGenSpouse)!;

      // Position couple
      node.x = currentX;
      node.y = y;
      spouseNode.x = currentX + LAYOUT_CONFIG.nodeWidth + LAYOUT_CONFIG.coupleGap;
      spouseNode.y = y;

      processedInThisPass.add(node.id);
      processedInThisPass.add(sameGenSpouse);

      currentX +=
        LAYOUT_CONFIG.nodeWidth * 2 +
        LAYOUT_CONFIG.coupleGap +
        LAYOUT_CONFIG.horizontalSpacing;
    } else {
      // Position single node
      node.x = currentX;
      node.y = y;
      processedInThisPass.add(node.id);
      currentX += LAYOUT_CONFIG.nodeWidth + LAYOUT_CONFIG.horizontalSpacing;
    }
  });

  return currentX;
}

/**
 * Center the entire tree around x=0
 */
function centerTree(layoutNodes: Map<string, LayoutNode>): void {
  const allPositions = Array.from(layoutNodes.values());

  if (allPositions.length === 0) return;

  const minX = Math.min(...allPositions.map((n) => n.x));
  const maxX = Math.max(...allPositions.map((n) => n.x));
  const centerOffset = (minX + maxX + LAYOUT_CONFIG.nodeWidth) / 2;

  layoutNodes.forEach((node) => {
    node.x = node.x - centerOffset;
  });
}

/**
 * Calculate layout for generation view (horizontal stacking by generation)
 * This layout organizes family members by their generation level,
 * with each generation stacked horizontally in a single row.
 */
export function calculateGenerationLayout(
  members: FamilyMember[],
  relationships: ParentChildRelationship[],
  marriages: MarriageConnection[]
): LayoutResult {
  const nodePositions = new Map<string, { x: number; y: number }>();

  if (members.length === 0) {
    return { nodePositions, processedMembers: [] };
  }

  // Build relationship maps
  const {
    childToParents,
    parentToChildren,
    spouseMap,
    memberMap,
  } = buildRelationshipMaps(members, relationships, marriages);

  // Create layout nodes
  const layoutNodes = createLayoutNodes(
    members,
    memberMap,
    childToParents,
    parentToChildren,
    spouseMap
  );

  // Assign generations (vertical levels)
  assignGenerations(layoutNodes, childToParents, parentToChildren, spouseMap);

  // Group nodes by generation
  const generationGroups = groupByGeneration(layoutNodes);

  // Position nodes in generation layout (horizontal stacking)
  positionGenerationLayout(layoutNodes, generationGroups, spouseMap);

  // Center the entire layout
  centerTree(layoutNodes);

  // Convert to output format
  layoutNodes.forEach((node) => {
    nodePositions.set(node.id, { x: node.x, y: node.y });
  });

  return { nodePositions, processedMembers: members };
}

/**
 * Position nodes for generation view layout
 * Each generation is displayed as a horizontal row
 * Members within each generation are stacked horizontally
 */
function positionGenerationLayout(
  layoutNodes: Map<string, LayoutNode>,
  generationGroups: Map<number, LayoutNode[]>,
  spouseMap: Map<string, string[]>
): void {
  // Get generations sorted from top (oldest) to bottom (youngest)
  const generations = Array.from(generationGroups.keys()).sort((a, b) => a - b);

  if (generations.length === 0) return;

  // Process each generation
  generations.forEach((gen, genIndex) => {
    const genNodes = generationGroups.get(gen)!;
    const y = genIndex * (LAYOUT_CONFIG.nodeHeight + LAYOUT_CONFIG.verticalSpacing);

    // Sort nodes within generation
    // Try to keep couples together and sort by name for consistency
    const sortedNodes = sortNodesForGenerationView(genNodes, spouseMap, layoutNodes);

    // Position nodes horizontally within this generation
    let currentX = 0;
    const processedNodes = new Set<string>();

    sortedNodes.forEach((node) => {
      if (processedNodes.has(node.id)) return;

      // Check for spouse at same generation
      const spouses = spouseMap.get(node.id) || [];
      const sameGenSpouse = spouses.find((s) => {
        const spouseNode = layoutNodes.get(s);
        return (
          spouseNode &&
          spouseNode.generation === node.generation &&
          !processedNodes.has(s)
        );
      });

      if (sameGenSpouse) {
        // Position couple together
        const spouseNode = layoutNodes.get(sameGenSpouse)!;

        node.x = currentX;
        node.y = y;
        spouseNode.x = currentX + LAYOUT_CONFIG.nodeWidth + LAYOUT_CONFIG.coupleGap;
        spouseNode.y = y;

        processedNodes.add(node.id);
        processedNodes.add(sameGenSpouse);

        currentX +=
          LAYOUT_CONFIG.nodeWidth * 2 +
          LAYOUT_CONFIG.coupleGap +
          LAYOUT_CONFIG.horizontalSpacing;
      } else {
        // Position single node
        node.x = currentX;
        node.y = y;
        processedNodes.add(node.id);
        currentX += LAYOUT_CONFIG.nodeWidth + LAYOUT_CONFIG.horizontalSpacing;
      }
    });
  });
}

/**
 * Sort nodes for generation view to keep related members together
 */
function sortNodesForGenerationView(
  nodes: LayoutNode[],
  spouseMap: Map<string, string[]>,
  layoutNodes: Map<string, LayoutNode>
): LayoutNode[] {
  // First, group couples together
  const processed = new Set<string>();
  const result: LayoutNode[] = [];

  // Sort by name first for consistent ordering
  const sortedByName = [...nodes].sort((a, b) => {
    const nameA = `${a.member.firstName} ${a.member.lastName}`.toLowerCase();
    const nameB = `${b.member.firstName} ${b.member.lastName}`.toLowerCase();
    return nameA.localeCompare(nameB);
  });

  sortedByName.forEach((node) => {
    if (processed.has(node.id)) return;

    // Check for spouse
    const spouses = spouseMap.get(node.id) || [];
    const sameGenSpouse = spouses.find((s) => {
      const spouseNode = layoutNodes.get(s);
      return (
        spouseNode &&
        spouseNode.generation === node.generation &&
        !processed.has(s)
      );
    });

    result.push(node);
    processed.add(node.id);

    if (sameGenSpouse) {
      const spouseNode = layoutNodes.get(sameGenSpouse)!;
      result.push(spouseNode);
      processed.add(sameGenSpouse);
    }
  });

  return result;
}

/**
 * Calculate statistics about the tree structure
 */
export function calculateTreeStats(
  members: FamilyMember[],
  relationships: ParentChildRelationship[],
  marriages: MarriageConnection[]
) {
  const { childToParents, parentToChildren, spouseMap } = buildRelationshipMaps(
    members,
    relationships,
    marriages
  );

  // Count generations
  const layoutNodes = createLayoutNodes(
    members,
    new Map(members.map((m) => [m.id, m])),
    childToParents,
    parentToChildren,
    spouseMap
  );
  assignGenerations(layoutNodes, childToParents, parentToChildren, spouseMap);

  const generations = new Set<number>();
  layoutNodes.forEach((node) => generations.add(node.generation));

  // Count families
  const familyUnits = identifyFamilyUnits(
    layoutNodes,
    parentToChildren,
    spouseMap,
    new Map()
  );

  return {
    totalMembers: members.length,
    totalRelationships: relationships.length,
    totalMarriages: marriages.length,
    generationCount: generations.size,
    familyUnitCount: familyUnits.length,
    rootAncestors: members.filter((m) => !childToParents.has(m.id)).length,
    leafDescendants: members.filter((m) => !parentToChildren.has(m.id)).length,
  };
}
