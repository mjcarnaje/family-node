import { useQuery } from "@tanstack/react-query";
import { useMemo, useCallback, useRef } from "react";
import type { Node, Edge } from "@xyflow/react";
import { getTreeVisualizationQuery } from "~/queries/tree-visualization";
import type {
  FamilyMember,
  ParentChildRelationship,
  MarriageConnection,
} from "~/db/schema";
import { calculateHierarchicalLayout, calculateGenerationLayout } from "~/utils/tree-layout";
import type { ViewMode } from "~/components/ViewModeSelector";
import {
  filterByFocusMode,
  filterByAttributes,
  getAvailableGenerations,
  type FocusMode,
  type AttributeFilterOptions,
} from "~/utils/family-tree-traversal";
import type { SiblingEdgeData } from "~/components/edges";
import {
  generateLayoutCacheKey,
  getCachedLayout,
  setCachedLayout,
} from "~/utils/tree-virtualization";

// Custom node data types - must include index signature for React Flow
export interface FamilyMemberNodeData {
  member: FamilyMember;
  isSpouse?: boolean;
  spouseId?: string;
  isFocusMember?: boolean;
  [key: string]: unknown;
}

export type FamilyMemberNode = Node<FamilyMemberNodeData, "familyMember">;

export interface MarriageEdgeData {
  marriage: MarriageConnection;
  [key: string]: unknown;
}

export interface ParentChildEdgeData {
  relationship: ParentChildRelationship;
  marriedParentIds?: [string, string]; // Both parent IDs if they are married
  [key: string]: unknown;
}

// Re-export SiblingEdgeData for convenience
export type { SiblingEdgeData };

// Focus mode options
export interface FocusModeOptions {
  focusMemberId: string | null;
  focusMode: FocusMode;
}

// Attribute filter options for the hook
export interface TreeFilterOptions {
  generations?: number[];
  genders?: ("male" | "female" | "other")[];
  relationshipTypes?: ("biological" | "adopted" | "step" | "foster")[];
  marriageStatuses?: ("married" | "divorced" | "widowed" | "separated" | "annulled")[];
  showDeceased?: boolean;
  showParentChildLines?: boolean;
  showMarriageLines?: boolean;
  showSiblingLines?: boolean;
}

// View mode options for the hook
export interface ViewModeOptions {
  viewMode: ViewMode;
}

/**
 * Detects sibling relationships from parent-child data
 * Returns pairs of siblings with their relationship type
 */
function detectSiblingRelationships(
  relationships: ParentChildRelationship[],
  memberIds: Set<string>
): Array<{ sibling1Id: string; sibling2Id: string; siblingType: SiblingEdgeData["siblingType"] }> {
  // Build parent-to-children map
  const parentToChildren = new Map<string, string[]>();
  const childToParents = new Map<string, string[]>();

  relationships.forEach((rel) => {
    if (!memberIds.has(rel.parentId) || !memberIds.has(rel.childId)) return;

    if (!parentToChildren.has(rel.parentId)) {
      parentToChildren.set(rel.parentId, []);
    }
    parentToChildren.get(rel.parentId)!.push(rel.childId);

    if (!childToParents.has(rel.childId)) {
      childToParents.set(rel.childId, []);
    }
    childToParents.get(rel.childId)!.push(rel.parentId);
  });

  const siblingPairs: Array<{ sibling1Id: string; sibling2Id: string; siblingType: SiblingEdgeData["siblingType"] }> = [];
  const processedPairs = new Set<string>();

  // For each parent, find children and determine sibling relationships
  parentToChildren.forEach((children, parentId) => {
    if (children.length < 2) return;

    // Compare each pair of children
    for (let i = 0; i < children.length; i++) {
      for (let j = i + 1; j < children.length; j++) {
        const child1 = children[i];
        const child2 = children[j];

        // Create unique key for this pair
        const pairKey = [child1, child2].sort().join("-");
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        // Determine sibling type based on shared parents
        const parents1 = childToParents.get(child1) || [];
        const parents2 = childToParents.get(child2) || [];

        const sharedParents = parents1.filter((p) => parents2.includes(p));

        let siblingType: SiblingEdgeData["siblingType"];

        if (sharedParents.length >= 2) {
          // Both parents are shared - full siblings
          siblingType = "full";
        } else if (sharedParents.length === 1) {
          // Only one parent is shared - half siblings
          siblingType = "half";
        } else {
          // No biological parent shared but connected through step relationship
          siblingType = "step";
        }

        siblingPairs.push({
          sibling1Id: child1,
          sibling2Id: child2,
          siblingType,
        });
      }
    }
  });

  return siblingPairs;
}

// Hook to fetch and transform tree visualization data
export function useTreeVisualization(
  familyTreeId: string,
  focusModeOptions?: FocusModeOptions,
  filterOptions?: TreeFilterOptions,
  viewModeOptions?: ViewModeOptions
) {
  const query = useQuery(getTreeVisualizationQuery(familyTreeId));

  // Calculate available generations from the raw data
  const availableGenerations = useMemo(() => {
    if (!query.data) return [];
    const { members, relationships, marriages } = query.data;
    return getAvailableGenerations(members, relationships, marriages);
  }, [query.data]);

  // Transform data into React Flow nodes and edges
  const { nodes, edges, allMembers } = useMemo(() => {
    if (!query.data) {
      return { nodes: [], edges: [], allMembers: [] };
    }

    const { members, relationships, marriages } = query.data;

    // Apply focus mode filtering if enabled
    const focusMemberId = focusModeOptions?.focusMemberId || null;
    const focusMode = focusModeOptions?.focusMode || "all";

    // First apply focus mode filtering
    let { filteredMembers, filteredRelationships, filteredMarriages } =
      focusMemberId && focusMode !== "all"
        ? filterByFocusMode(
            focusMemberId,
            focusMode,
            members,
            relationships,
            marriages
          )
        : {
            filteredMembers: members,
            filteredRelationships: relationships,
            filteredMarriages: marriages,
          };

    // Then apply attribute filters if any are active
    const hasActiveAttributeFilters =
      (filterOptions?.generations && filterOptions.generations.length > 0) ||
      (filterOptions?.genders && filterOptions.genders.length > 0) ||
      (filterOptions?.relationshipTypes && filterOptions.relationshipTypes.length > 0) ||
      (filterOptions?.marriageStatuses && filterOptions.marriageStatuses.length > 0) ||
      filterOptions?.showDeceased === false;

    if (hasActiveAttributeFilters) {
      const attributeFilterResult = filterByAttributes(
        filteredMembers,
        filteredRelationships,
        filteredMarriages,
        {
          generations: filterOptions?.generations,
          genders: filterOptions?.genders,
          relationshipTypes: filterOptions?.relationshipTypes,
          marriageStatuses: filterOptions?.marriageStatuses,
          showDeceased: filterOptions?.showDeceased,
        }
      );
      filteredMembers = attributeFilterResult.filteredMembers;
      filteredRelationships = attributeFilterResult.filteredRelationships;
      filteredMarriages = attributeFilterResult.filteredMarriages;
    }

    // Build a map for quick member lookup
    const memberMap = new Map<string, FamilyMember>();
    filteredMembers.forEach((member) => memberMap.set(member.id, member));

    // Build set of member IDs for sibling detection
    const memberIds = new Set(filteredMembers.map((m) => m.id));

    // Build spouse pairs from marriages
    const spousePairs = new Map<string, string>();
    filteredMarriages.forEach((marriage) => {
      spousePairs.set(marriage.spouse1Id, marriage.spouse2Id);
      spousePairs.set(marriage.spouse2Id, marriage.spouse1Id);
    });

    // Calculate positions using the appropriate layout algorithm based on view mode
    const viewMode = viewModeOptions?.viewMode || "tree";
    const layoutCalculator = viewMode === "generation"
      ? calculateGenerationLayout
      : calculateHierarchicalLayout;

    // Generate cache key for layout calculations
    const cacheKey = generateLayoutCacheKey(
      filteredMembers.map((m) => m.id),
      filteredRelationships.map((r) => r.id),
      filteredMarriages.map((m) => m.id)
    ) + `-${viewMode}`;

    // Try to get cached layout first
    let layoutResult = getCachedLayout(cacheKey);

    if (!layoutResult) {
      // Calculate layout and cache it
      layoutResult = layoutCalculator(
        filteredMembers,
        filteredRelationships,
        filteredMarriages
      );
      setCachedLayout(cacheKey, layoutResult);
    }

    const { nodePositions, processedMembers } = layoutResult;

    // Create nodes for each family member
    const nodes: FamilyMemberNode[] = processedMembers.map((member) => {
      const position = nodePositions.get(member.id) || { x: 0, y: 0 };
      const spouseId = spousePairs.get(member.id);
      const isFocusMember = focusMemberId === member.id;

      return {
        id: member.id,
        type: "familyMember",
        position,
        data: {
          member,
          isSpouse: !!spouseId,
          spouseId,
          isFocusMember,
        },
      };
    });

    // Check line visibility options (default to true if not specified)
    const showParentChildLines = filterOptions?.showParentChildLines !== false;
    const showMarriageLines = filterOptions?.showMarriageLines !== false;
    const showSiblingLines = filterOptions?.showSiblingLines !== false;

    // Create edges for parent-child relationships (using custom edge type)
    // Build a map of children to their parent pairs (for married parents)
    const childToParents = new Map<string, string[]>();
    filteredRelationships.forEach((rel) => {
      if (!childToParents.has(rel.childId)) {
        childToParents.set(rel.childId, []);
      }
      childToParents.get(rel.childId)!.push(rel.parentId);
    });

    // Build a map of married couples for quick lookup
    const marriedCouples = new Map<string, string>();
    filteredMarriages.forEach((marriage) => {
      marriedCouples.set(marriage.spouse1Id, marriage.spouse2Id);
      marriedCouples.set(marriage.spouse2Id, marriage.spouse1Id);
    });

    // For each child, if both parents are married, only create ONE edge
    // from one of the parents (the edge will be drawn from the marriage center)
    // Otherwise, create edges from all parents
    const processedChildren = new Set<string>();
    const parentChildEdges: Edge<ParentChildEdgeData>[] = [];

    if (showParentChildLines) {
      filteredRelationships.forEach((rel) => {
        const childId = rel.childId;
        const parentId = rel.parentId;

        // Get all parents for this child
        const parents = childToParents.get(childId) || [];

        // Check if this child has two married parents
        if (parents.length === 2) {
          const [parent1, parent2] = parents;
          const areMarried = marriedCouples.get(parent1) === parent2;

          if (areMarried) {
            // Only create one edge for married parents (from first parent)
            // The edge component will draw from the marriage center
            if (!processedChildren.has(childId)) {
              processedChildren.add(childId);
              parentChildEdges.push({
                id: `parent-child-${rel.id}`,
                source: parentId,
                target: childId,
                sourceHandle: undefined,
                targetHandle: undefined,
                type: "parentChild",
                animated: false,
                data: {
                  relationship: rel,
                  // Pass both parent IDs so edge can draw from center
                  marriedParentIds: [parent1, parent2],
                },
              });
            }
            return;
          }
        }

        // For non-married parents or single parent, create edge for each
        parentChildEdges.push({
          id: `parent-child-${rel.id}`,
          source: parentId,
          target: childId,
          sourceHandle: undefined,
          targetHandle: undefined,
          type: "parentChild",
          animated: false,
          data: { relationship: rel },
        });
      });
    }

    // Create edges for marriages (using custom edge type)
    const marriageEdges: Edge<MarriageEdgeData>[] = showMarriageLines
      ? filteredMarriages.map((marriage) => ({
          id: `marriage-${marriage.id}`,
          source: marriage.spouse1Id,
          target: marriage.spouse2Id,
          sourceHandle: "spouse-left",
          targetHandle: "spouse-right",
          type: "marriage", // Use custom edge type
          animated: false,
          data: { marriage },
        }))
      : [];

    // Detect and create sibling edges (using custom edge type)
    const siblingPairs = showSiblingLines
      ? detectSiblingRelationships(filteredRelationships, memberIds)
      : [];

    const siblingEdges: Edge<SiblingEdgeData>[] = siblingPairs.map((pair, index) => ({
      id: `sibling-${pair.sibling1Id}-${pair.sibling2Id}`,
      source: pair.sibling1Id,
      target: pair.sibling2Id,
      sourceHandle: undefined,
      targetHandle: undefined,
      type: "sibling", // Use custom edge type
      animated: false,
      data: { siblingType: pair.siblingType },
    }));

    const edges = [...parentChildEdges, ...marriageEdges, ...siblingEdges];

    return { nodes, edges, allMembers: members };
  }, [
    query.data,
    focusModeOptions?.focusMemberId,
    focusModeOptions?.focusMode,
    filterOptions?.generations,
    filterOptions?.genders,
    filterOptions?.relationshipTypes,
    filterOptions?.marriageStatuses,
    filterOptions?.showDeceased,
    filterOptions?.showParentChildLines,
    filterOptions?.showMarriageLines,
    filterOptions?.showSiblingLines,
    viewModeOptions?.viewMode,
  ]);

  return {
    ...query,
    nodes,
    edges,
    allMembers, // Return all members for the dropdown selector
    allRelationships: query.data?.relationships || [], // Return all relationships for modal
    allMarriages: query.data?.marriages || [], // Return all marriages for modal
    availableGenerations, // Return available generations for filter UI
    treeName: query.data?.treeName,
    treeDescription: query.data?.treeDescription,
  };
}
