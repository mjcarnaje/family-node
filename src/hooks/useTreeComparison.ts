import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Node, Edge } from "@xyflow/react";
import {
  getTreeComparisonQuery,
  type TreeComparisonParams,
} from "~/queries/tree-comparison";
import type {
  FamilyMember,
  ParentChildRelationship,
  MarriageConnection,
} from "~/db/schema";
import { calculateHierarchicalLayout } from "~/utils/tree-layout";

// Comparison status for highlighting
export type ComparisonStatus = "only-tree1" | "only-tree2" | "both" | "modified" | "unchanged";

// Extended node data with comparison info
export interface ComparisonMemberNodeData {
  member: FamilyMember;
  comparisonStatus: ComparisonStatus;
  differences?: string[];
  matchedMemberId?: string; // ID of matching member in the other tree
  isSpouse?: boolean;
  spouseId?: string;
  [key: string]: unknown;
}

export type ComparisonMemberNode = Node<ComparisonMemberNodeData, "comparisonMember">;

export interface ComparisonMarriageEdgeData {
  marriage: MarriageConnection;
  comparisonStatus: ComparisonStatus;
  [key: string]: unknown;
}

export interface ComparisonParentChildEdgeData {
  relationship: ParentChildRelationship;
  comparisonStatus: ComparisonStatus;
  [key: string]: unknown;
}

/**
 * Hook to fetch and transform tree comparison data
 */
export function useTreeComparison(params: TreeComparisonParams) {
  const query = useQuery(getTreeComparisonQuery(params));

  // Transform data into React Flow nodes and edges for both trees
  const { tree1Nodes, tree1Edges, tree2Nodes, tree2Edges, summary } = useMemo(() => {
    if (!query.data) {
      return {
        tree1Nodes: [],
        tree1Edges: [],
        tree2Nodes: [],
        tree2Edges: [],
        summary: null,
      };
    }

    const { tree1, tree2, comparison } = query.data;

    // Build sets for quick lookup
    const membersOnlyInTree1Ids = new Set(comparison.membersOnlyInTree1.map((m) => m.id));
    const membersOnlyInTree2Ids = new Set(comparison.membersOnlyInTree2.map((m) => m.id));
    const membersInBothMap1 = new Map(comparison.membersInBoth.map((m) => [m.member1.id, m]));
    const membersInBothMap2 = new Map(comparison.membersInBoth.map((m) => [m.member2.id, m]));

    const relationshipsOnlyInTree1Ids = new Set(comparison.relationshipsOnlyInTree1.map((r) => r.id));
    const relationshipsOnlyInTree2Ids = new Set(comparison.relationshipsOnlyInTree2.map((r) => r.id));

    const marriagesOnlyInTree1Ids = new Set(comparison.marriagesOnlyInTree1.map((m) => m.id));
    const marriagesOnlyInTree2Ids = new Set(comparison.marriagesOnlyInTree2.map((m) => m.id));

    // Build spouse pairs for both trees
    const spousePairs1 = new Map<string, string>();
    tree1.marriages.forEach((marriage) => {
      spousePairs1.set(marriage.spouse1Id, marriage.spouse2Id);
      spousePairs1.set(marriage.spouse2Id, marriage.spouse1Id);
    });

    const spousePairs2 = new Map<string, string>();
    tree2.marriages.forEach((marriage) => {
      spousePairs2.set(marriage.spouse1Id, marriage.spouse2Id);
      spousePairs2.set(marriage.spouse2Id, marriage.spouse1Id);
    });

    // Calculate layouts for both trees
    const layout1 = calculateHierarchicalLayout(
      tree1.members,
      tree1.relationships,
      tree1.marriages
    );

    const layout2 = calculateHierarchicalLayout(
      tree2.members,
      tree2.relationships,
      tree2.marriages
    );

    // Create nodes for tree 1
    const tree1Nodes: ComparisonMemberNode[] = layout1.processedMembers.map((member) => {
      const position = layout1.nodePositions.get(member.id) || { x: 0, y: 0 };
      const spouseId = spousePairs1.get(member.id);

      let comparisonStatus: ComparisonStatus;
      let differences: string[] | undefined;
      let matchedMemberId: string | undefined;

      if (membersOnlyInTree1Ids.has(member.id)) {
        comparisonStatus = "only-tree1";
      } else {
        const matchInfo = membersInBothMap1.get(member.id);
        if (matchInfo && matchInfo.differences.length > 0) {
          comparisonStatus = "modified";
          differences = matchInfo.differences;
          matchedMemberId = matchInfo.member2.id;
        } else if (matchInfo) {
          comparisonStatus = "unchanged";
          matchedMemberId = matchInfo.member2.id;
        } else {
          comparisonStatus = "both";
        }
      }

      return {
        id: member.id,
        type: "comparisonMember",
        position,
        data: {
          member,
          comparisonStatus,
          differences,
          matchedMemberId,
          isSpouse: !!spouseId,
          spouseId,
        },
      };
    });

    // Create nodes for tree 2
    const tree2Nodes: ComparisonMemberNode[] = layout2.processedMembers.map((member) => {
      const position = layout2.nodePositions.get(member.id) || { x: 0, y: 0 };
      const spouseId = spousePairs2.get(member.id);

      let comparisonStatus: ComparisonStatus;
      let differences: string[] | undefined;
      let matchedMemberId: string | undefined;

      if (membersOnlyInTree2Ids.has(member.id)) {
        comparisonStatus = "only-tree2";
      } else {
        const matchInfo = membersInBothMap2.get(member.id);
        if (matchInfo && matchInfo.differences.length > 0) {
          comparisonStatus = "modified";
          differences = matchInfo.differences;
          matchedMemberId = matchInfo.member1.id;
        } else if (matchInfo) {
          comparisonStatus = "unchanged";
          matchedMemberId = matchInfo.member1.id;
        } else {
          comparisonStatus = "both";
        }
      }

      return {
        id: member.id,
        type: "comparisonMember",
        position,
        data: {
          member,
          comparisonStatus,
          differences,
          matchedMemberId,
          isSpouse: !!spouseId,
          spouseId,
        },
      };
    });

    // Create edges for tree 1
    const tree1ParentChildEdges: Edge<ComparisonParentChildEdgeData>[] = tree1.relationships.map(
      (rel) => ({
        id: `parent-child-${rel.id}`,
        source: rel.parentId,
        target: rel.childId,
        type: "parentChild",
        animated: false,
        data: {
          relationship: rel,
          comparisonStatus: relationshipsOnlyInTree1Ids.has(rel.id) ? "only-tree1" : "unchanged",
        },
      })
    );

    const tree1MarriageEdges: Edge<ComparisonMarriageEdgeData>[] = tree1.marriages.map(
      (marriage) => ({
        id: `marriage-${marriage.id}`,
        source: marriage.spouse1Id,
        target: marriage.spouse2Id,
        sourceHandle: "spouse-left",
        targetHandle: "spouse-right",
        type: "marriage",
        animated: false,
        data: {
          marriage,
          comparisonStatus: marriagesOnlyInTree1Ids.has(marriage.id) ? "only-tree1" : "unchanged",
        },
      })
    );

    const tree1Edges = [...tree1ParentChildEdges, ...tree1MarriageEdges];

    // Create edges for tree 2
    const tree2ParentChildEdges: Edge<ComparisonParentChildEdgeData>[] = tree2.relationships.map(
      (rel) => ({
        id: `parent-child-${rel.id}`,
        source: rel.parentId,
        target: rel.childId,
        type: "parentChild",
        animated: false,
        data: {
          relationship: rel,
          comparisonStatus: relationshipsOnlyInTree2Ids.has(rel.id) ? "only-tree2" : "unchanged",
        },
      })
    );

    const tree2MarriageEdges: Edge<ComparisonMarriageEdgeData>[] = tree2.marriages.map(
      (marriage) => ({
        id: `marriage-${marriage.id}`,
        source: marriage.spouse1Id,
        target: marriage.spouse2Id,
        sourceHandle: "spouse-left",
        targetHandle: "spouse-right",
        type: "marriage",
        animated: false,
        data: {
          marriage,
          comparisonStatus: marriagesOnlyInTree2Ids.has(marriage.id) ? "only-tree2" : "unchanged",
        },
      })
    );

    const tree2Edges = [...tree2ParentChildEdges, ...tree2MarriageEdges];

    // Summary statistics
    const summary = {
      tree1Name: tree1.tree.name,
      tree2Name: tree2.tree.name,
      tree1MemberCount: tree1.members.length,
      tree2MemberCount: tree2.members.length,
      membersOnlyInTree1Count: comparison.membersOnlyInTree1.length,
      membersOnlyInTree2Count: comparison.membersOnlyInTree2.length,
      membersInBothCount: comparison.membersInBoth.length,
      membersModifiedCount: comparison.membersInBoth.filter((m) => m.differences.length > 0).length,
      relationshipsOnlyInTree1Count: comparison.relationshipsOnlyInTree1.length,
      relationshipsOnlyInTree2Count: comparison.relationshipsOnlyInTree2.length,
      marriagesOnlyInTree1Count: comparison.marriagesOnlyInTree1.length,
      marriagesOnlyInTree2Count: comparison.marriagesOnlyInTree2.length,
    };

    return { tree1Nodes, tree1Edges, tree2Nodes, tree2Edges, summary };
  }, [query.data]);

  return {
    ...query,
    tree1: query.data?.tree1,
    tree2: query.data?.tree2,
    comparison: query.data?.comparison,
    tree1Nodes,
    tree1Edges,
    tree2Nodes,
    tree2Edges,
    summary,
  };
}
