import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type NodeTypes,
  type EdgeTypes,
  type Node,
  type Edge,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Loader2, Users, GitFork, Heart, Keyboard, Eye } from "lucide-react";
import { useAriaAnnouncements } from "~/hooks/useAccessibility";
import { FamilyMemberNode } from "~/components/FamilyMemberNode";
import { ParentChildEdge, MarriageEdge, SiblingEdge } from "~/components/edges";
import { FocusModeControls } from "~/components/FocusModeControls";
import {
  FamilyTreeFilters,
  DEFAULT_FILTER_STATE,
  type TreeFilterState,
} from "~/components/FamilyTreeFilters";
import { PublicMemberProfileModal } from "~/components/PublicMemberProfileModal";
import { TreeSearchBar } from "~/components/TreeSearchBar";
import { ViewModeSelector, type ViewMode } from "~/components/ViewModeSelector";
import { GenerationLabels } from "~/components/GenerationLabels";
import { cn } from "~/lib/utils";
import {
  filterByFocusMode,
  filterByAttributes,
  getAvailableGenerations,
  type FocusMode,
} from "~/utils/family-tree-traversal";
import {
  calculateHierarchicalLayout,
  calculateGenerationLayout,
} from "~/utils/tree-layout";
import {
  generateLayoutCacheKey,
  getCachedLayout,
  setCachedLayout,
} from "~/utils/tree-virtualization";
import type {
  FamilyMember,
  ParentChildRelationship,
  MarriageConnection,
} from "~/db/schema";
import type { SiblingEdgeData } from "~/components/edges";

interface PublicFamilyTreeVisualizationProps {
  familyTreeId: string;
  treeName: string;
  treeDescription: string | null;
  members: FamilyMember[];
  relationships: ParentChildRelationship[];
  marriages: MarriageConnection[];
  className?: string;
}

// Custom node data types
interface FamilyMemberNodeData {
  member: FamilyMember;
  isSpouse?: boolean;
  spouseId?: string;
  isFocusMember?: boolean;
  [key: string]: unknown;
}

type FamilyMemberNodeType = Node<FamilyMemberNodeData, "familyMember">;

interface MarriageEdgeData {
  marriage: MarriageConnection;
  [key: string]: unknown;
}

interface ParentChildEdgeData {
  relationship: ParentChildRelationship;
  [key: string]: unknown;
}

// Define custom node types
const nodeTypes = {
  familyMember: FamilyMemberNode,
} as NodeTypes;

// Define custom edge types
const edgeTypes = {
  parentChild: ParentChildEdge,
  marriage: MarriageEdge,
  sibling: SiblingEdge,
} as EdgeTypes;

/**
 * Detects sibling relationships from parent-child data
 */
function detectSiblingRelationships(
  relationships: ParentChildRelationship[],
  memberIds: Set<string>
): Array<{
  sibling1Id: string;
  sibling2Id: string;
  siblingType: SiblingEdgeData["siblingType"];
}> {
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

  const siblingPairs: Array<{
    sibling1Id: string;
    sibling2Id: string;
    siblingType: SiblingEdgeData["siblingType"];
  }> = [];
  const processedPairs = new Set<string>();

  parentToChildren.forEach((children) => {
    if (children.length < 2) return;

    for (let i = 0; i < children.length; i++) {
      for (let j = i + 1; j < children.length; j++) {
        const child1 = children[i];
        const child2 = children[j];

        const pairKey = [child1, child2].sort().join("-");
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        const parents1 = childToParents.get(child1) || [];
        const parents2 = childToParents.get(child2) || [];

        const sharedParents = parents1.filter((p) => parents2.includes(p));

        let siblingType: SiblingEdgeData["siblingType"];

        if (sharedParents.length >= 2) {
          siblingType = "full";
        } else if (sharedParents.length === 1) {
          siblingType = "half";
        } else {
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

// Inner component that uses ReactFlow hooks
function PublicFamilyTreeVisualizationInner({
  familyTreeId,
  treeName,
  treeDescription,
  members,
  relationships,
  marriages,
  className,
}: PublicFamilyTreeVisualizationProps) {
  // Accessibility announcements
  const { announce } = useAriaAnnouncements();

  // Keyboard navigation state
  const [keyboardNavEnabled, setKeyboardNavEnabled] = useState(false);
  const [keyboardFocusedNodeId, setKeyboardFocusedNodeId] = useState<
    string | null
  >(null);
  const treeContainerRef = useRef<HTMLDivElement>(null);

  // Focus mode state
  const [focusMemberId, setFocusMemberId] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState<FocusMode>("all");

  // Filter state
  const [filters, setFilters] = useState<TreeFilterState>(DEFAULT_FILTER_STATE);

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>("tree");

  // Member profile modal state (read-only)
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(
    null
  );

  // Calculate available generations
  const availableGenerations = useMemo(() => {
    return getAvailableGenerations(members, relationships, marriages);
  }, [members, relationships, marriages]);

  // Transform data into React Flow nodes and edges
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    // Apply focus mode filtering if enabled
    let filteredMembers = members;
    let filteredRelationships = relationships;
    let filteredMarriages = marriages;

    if (focusMemberId && focusMode !== "all") {
      const filtered = filterByFocusMode(
        focusMemberId,
        focusMode,
        members,
        relationships,
        marriages
      );
      filteredMembers = filtered.filteredMembers;
      filteredRelationships = filtered.filteredRelationships;
      filteredMarriages = filtered.filteredMarriages;
    }

    // Apply attribute filters
    const hasActiveAttributeFilters =
      (filters.generations && filters.generations.length > 0) ||
      (filters.genders && filters.genders.length > 0) ||
      (filters.relationshipTypes && filters.relationshipTypes.length > 0) ||
      (filters.marriageStatuses && filters.marriageStatuses.length > 0) ||
      filters.showDeceased === false;

    if (hasActiveAttributeFilters) {
      const attributeFilterResult = filterByAttributes(
        filteredMembers,
        filteredRelationships,
        filteredMarriages,
        {
          generations: filters.generations.length > 0 ? filters.generations : undefined,
          genders: filters.genders.length > 0 ? (filters.genders as ("male" | "female" | "other")[]) : undefined,
          relationshipTypes: filters.relationshipTypes.length > 0 ? (filters.relationshipTypes as ("biological" | "adopted" | "step" | "foster")[]) : undefined,
          marriageStatuses: filters.marriageStatuses.length > 0 ? (filters.marriageStatuses as ("married" | "divorced" | "widowed" | "separated" | "annulled")[]) : undefined,
          showDeceased: filters.showDeceased,
        }
      );
      filteredMembers = attributeFilterResult.filteredMembers;
      filteredRelationships = attributeFilterResult.filteredRelationships;
      filteredMarriages = attributeFilterResult.filteredMarriages;
    }

    // Build spouse pairs from marriages
    const spousePairs = new Map<string, string>();
    filteredMarriages.forEach((marriage) => {
      spousePairs.set(marriage.spouse1Id, marriage.spouse2Id);
      spousePairs.set(marriage.spouse2Id, marriage.spouse1Id);
    });

    // Build set of member IDs
    const memberIds = new Set(filteredMembers.map((m) => m.id));

    // Calculate positions using the appropriate layout algorithm
    const layoutCalculator =
      viewMode === "generation"
        ? calculateGenerationLayout
        : calculateHierarchicalLayout;

    // Generate cache key for layout calculations
    const cacheKey =
      generateLayoutCacheKey(
        filteredMembers.map((m) => m.id),
        filteredRelationships.map((r) => r.id),
        filteredMarriages.map((m) => m.id)
      ) + `-${viewMode}`;

    // Try to get cached layout first
    let layoutResult = getCachedLayout(cacheKey);

    if (!layoutResult) {
      layoutResult = layoutCalculator(
        filteredMembers,
        filteredRelationships,
        filteredMarriages
      );
      setCachedLayout(cacheKey, layoutResult);
    }

    const { nodePositions, processedMembers } = layoutResult;

    // Create nodes for each family member
    const nodes: FamilyMemberNodeType[] = processedMembers.map((member) => {
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

    // Check line visibility options
    const showParentChildLines = filters.showParentChildLines !== false;
    const showMarriageLines = filters.showMarriageLines !== false;
    const showSiblingLines = filters.showSiblingLines !== false;

    // Create parent-child edges
    const parentChildEdges: Edge<ParentChildEdgeData>[] = showParentChildLines
      ? filteredRelationships.map((rel) => ({
          id: `parent-child-${rel.id}`,
          source: rel.parentId,
          target: rel.childId,
          type: "parentChild",
          animated: false,
          data: { relationship: rel },
        }))
      : [];

    // Create marriage edges
    const marriageEdges: Edge<MarriageEdgeData>[] = showMarriageLines
      ? filteredMarriages.map((marriage) => ({
          id: `marriage-${marriage.id}`,
          source: marriage.spouse1Id,
          target: marriage.spouse2Id,
          sourceHandle: "spouse-left",
          targetHandle: "spouse-right",
          type: "marriage",
          animated: false,
          data: { marriage },
        }))
      : [];

    // Create sibling edges
    const siblingPairs = showSiblingLines
      ? detectSiblingRelationships(filteredRelationships, memberIds)
      : [];

    const siblingEdges: Edge<SiblingEdgeData>[] = siblingPairs.map((pair) => ({
      id: `sibling-${pair.sibling1Id}-${pair.sibling2Id}`,
      source: pair.sibling1Id,
      target: pair.sibling2Id,
      type: "sibling",
      animated: false,
      data: { siblingType: pair.siblingType },
    }));

    const edges = [...parentChildEdges, ...marriageEdges, ...siblingEdges];

    return { nodes, edges };
  }, [
    members,
    relationships,
    marriages,
    focusMemberId,
    focusMode,
    filters,
    viewMode,
  ]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Get the ReactFlow instance
  const reactFlowInstance = useReactFlow();

  // Update nodes and edges when data changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);

    if (initialNodes.length > 0) {
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2, maxZoom: 1.5 });
      }, 50);
    }
  }, [initialNodes, initialEdges, setNodes, setEdges, reactFlowInstance]);

  // Handle node click - opens the member profile modal (read-only)
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id);
    const nodeData = node.data as { member?: FamilyMember };
    if (nodeData?.member) {
      setSelectedMember(nodeData.member);
      setProfileModalOpen(true);
    }
  }, []);

  // Handle double-click to focus on a member
  const onNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setFocusMemberId(node.id);
      if (focusMode === "all") {
        setFocusMode("ancestors");
      }
    },
    [focusMode]
  );

  // Handle search member selection
  const handleSearchMemberSelect = useCallback(
    (memberId: string) => {
      setFocusMemberId(memberId);

      setTimeout(() => {
        const node = reactFlowInstance.getNode(memberId);
        if (node) {
          reactFlowInstance.setCenter(
            node.position.x + 100,
            node.position.y + 100,
            {
              zoom: 1.2,
              duration: 600,
            }
          );
        }
      }, 100);
    },
    [reactFlowInstance]
  );

  // Count relationships
  const stats = useMemo(() => {
    const memberCount = nodes.length;
    const relationshipCount = edges.filter((e: Edge) =>
      e.id.startsWith("parent-child")
    ).length;
    const marriageCount = edges.filter((e: Edge) =>
      e.id.startsWith("marriage")
    ).length;
    return { memberCount, relationshipCount, marriageCount };
  }, [nodes, edges]);

  const totalMemberCount = members.length;

  // Check if filtered
  const hasActiveAttributeFilters =
    filters.generations.length > 0 ||
    filters.genders.length > 0 ||
    filters.relationshipTypes.length > 0 ||
    filters.marriageStatuses.length > 0 ||
    !filters.showDeceased ||
    !filters.showParentChildLines ||
    !filters.showMarriageLines ||
    !filters.showSiblingLines;

  const isFiltered =
    (focusMemberId && focusMode !== "all") || hasActiveAttributeFilters;

  // Keyboard navigation handler
  const handleTreeKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!keyboardNavEnabled || nodes.length === 0) return;

      const currentIndex = nodes.findIndex(
        (n: Node) => n.id === keyboardFocusedNodeId
      );

      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown": {
          event.preventDefault();
          const nextIndex =
            currentIndex < nodes.length - 1 ? currentIndex + 1 : 0;
          const nextNode = nodes[nextIndex];
          setKeyboardFocusedNodeId(nextNode.id);
          setSelectedNode(nextNode.id);
          const nodeData = nextNode.data as {
            member?: { firstName: string; lastName: string };
          };
          if (nodeData?.member) {
            announce(
              `${nodeData.member.firstName} ${nodeData.member.lastName}`
            );
          }
          reactFlowInstance.setCenter(
            nextNode.position.x + 100,
            nextNode.position.y + 100,
            { zoom: 1.2, duration: 300 }
          );
          break;
        }
        case "ArrowLeft":
        case "ArrowUp": {
          event.preventDefault();
          const prevIndex =
            currentIndex > 0 ? currentIndex - 1 : nodes.length - 1;
          const prevNode = nodes[prevIndex];
          setKeyboardFocusedNodeId(prevNode.id);
          setSelectedNode(prevNode.id);
          const nodeData = prevNode.data as {
            member?: { firstName: string; lastName: string };
          };
          if (nodeData?.member) {
            announce(
              `${nodeData.member.firstName} ${nodeData.member.lastName}`
            );
          }
          reactFlowInstance.setCenter(
            prevNode.position.x + 100,
            prevNode.position.y + 100,
            { zoom: 1.2, duration: 300 }
          );
          break;
        }
        case "Enter":
        case " ": {
          event.preventDefault();
          if (keyboardFocusedNodeId) {
            const node = nodes.find(
              (n: Node) => n.id === keyboardFocusedNodeId
            );
            if (node) {
              const nodeData = node.data as { member?: FamilyMember };
              if (nodeData?.member) {
                setSelectedMember(nodeData.member);
                setProfileModalOpen(true);
                announce(
                  `Opening profile for ${nodeData.member.firstName} ${nodeData.member.lastName}`
                );
              }
            }
          }
          break;
        }
        case "Escape": {
          event.preventDefault();
          setKeyboardFocusedNodeId(null);
          setSelectedNode(null);
          setKeyboardNavEnabled(false);
          announce("Keyboard navigation disabled");
          break;
        }
        case "+":
        case "=": {
          event.preventDefault();
          reactFlowInstance.zoomIn({ duration: 200 });
          announce("Zoomed in");
          break;
        }
        case "-":
        case "_": {
          event.preventDefault();
          reactFlowInstance.zoomOut({ duration: 200 });
          announce("Zoomed out");
          break;
        }
        case "0": {
          event.preventDefault();
          reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
          announce("Fit view to all members");
          break;
        }
      }
    },
    [keyboardNavEnabled, nodes, keyboardFocusedNodeId, reactFlowInstance, announce]
  );

  // Enable keyboard navigation when entering the tree
  const handleTreeFocus = useCallback(() => {
    if (!keyboardNavEnabled) {
      setKeyboardNavEnabled(true);
      if (nodes.length > 0 && !keyboardFocusedNodeId) {
        const firstNode = nodes[0];
        setKeyboardFocusedNodeId(firstNode.id);
        setSelectedNode(firstNode.id);
        const nodeData = firstNode.data as {
          member?: { firstName: string; lastName: string };
        };
        if (nodeData?.member) {
          announce(
            `Keyboard navigation enabled. ${nodeData.member.firstName} ${nodeData.member.lastName}. Use arrow keys to navigate, Enter to select, Escape to exit.`
          );
        }
      }
    }
  }, [keyboardNavEnabled, nodes, keyboardFocusedNodeId, announce]);

  // Empty state
  if (totalMemberCount === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center h-[600px] bg-slate-50 dark:bg-slate-900/50 rounded-xl border",
          className
        )}
        data-testid="public-tree-visualization-empty"
      >
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <Users className="h-16 w-16 text-muted-foreground/50" />
          <h3 className="font-semibold text-lg text-muted-foreground">
            No family members yet
          </h3>
          <p className="text-sm text-muted-foreground/80 max-w-sm">
            This family tree doesn't have any members yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={treeContainerRef}
      className={cn(
        "h-[700px] rounded-xl border overflow-hidden relative",
        className
      )}
      data-testid="public-tree-visualization"
      role="tree"
      aria-label={`Public family tree: ${treeName} with ${stats.memberCount} members`}
      tabIndex={0}
      onKeyDown={handleTreeKeyDown}
      onFocus={handleTreeFocus}
    >
      {/* Screen reader instructions */}
      <div className="sr-only" aria-live="polite">
        {keyboardNavEnabled
          ? "Use arrow keys to navigate between family members, Enter or Space to open member profile, Escape to exit keyboard navigation, plus/minus to zoom, 0 to fit view."
          : "Press Tab to enter the family tree and enable keyboard navigation."}
      </div>

      {/* Skip link */}
      <a
        href="#tree-controls"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:bg-white focus:p-2 focus:rounded focus:shadow-lg"
      >
        Skip to tree controls
      </a>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{
          padding: 0.2,
          maxZoom: 1.5,
        }}
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: "smoothstep",
          animated: false,
        }}
        // Read-only: disable node dragging and edge connections
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800"
      >
        {/* Controls */}
        <Controls
          showZoom={true}
          showFitView={true}
          showInteractive={false}
          className="!bg-white dark:!bg-slate-800 !border !border-slate-200 dark:!border-slate-700 !rounded-lg !shadow-lg"
          aria-label="Tree zoom and view controls"
        />

        {/* MiniMap */}
        <MiniMap
          nodeColor={(node: Node) => {
            const data = node.data as {
              member?: { gender?: string };
              isFocusMember?: boolean;
            } | undefined;
            const gender = data?.member?.gender;
            const isFocusMember = data?.isFocusMember;

            if (isFocusMember) {
              return "#22c55e";
            }

            switch (gender) {
              case "male":
                return "#3b82f6";
              case "female":
                return "#ec4899";
              default:
                return "#8b5cf6";
            }
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
          className="!bg-white dark:!bg-slate-800 !border !border-slate-200 dark:!border-slate-700 !rounded-lg"
          aria-label="Tree minimap overview"
        />

        {/* Background */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#94a3b8"
          className="opacity-30"
        />

        {/* Tree info panel */}
        <Panel position="top-left" className="!m-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-4 max-w-sm">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-lg text-slate-900 dark:text-slate-100 truncate">
                {treeName}
              </h2>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                <Eye className="h-3 w-3" />
                View Only
              </span>
            </div>
            {treeDescription && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {treeDescription}
              </p>
            )}
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                <span>
                  {isFiltered
                    ? `${stats.memberCount} / ${totalMemberCount} members`
                    : `${stats.memberCount} members`}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <GitFork className="h-4 w-4" />
                <span>{stats.relationshipCount} relationships</span>
              </div>
            </div>
          </div>
        </Panel>

        {/* Search, View Mode, Focus Mode Controls and Filters panel */}
        <Panel
          position="top-right"
          className="!m-4 space-y-2 max-h-[calc(100%-8rem)] overflow-y-auto"
        >
          <TreeSearchBar
            allMembers={members}
            onMemberSelect={handleSearchMemberSelect}
          />
          <ViewModeSelector viewMode={viewMode} onViewModeChange={setViewMode} />
          <FocusModeControls
            allMembers={members}
            focusMemberId={focusMemberId}
            focusMode={focusMode}
            onFocusMemberChange={setFocusMemberId}
            onFocusModeChange={setFocusMode}
          />
          <FamilyTreeFilters
            filters={filters}
            onFiltersChange={setFilters}
            availableGenerations={availableGenerations}
          />
        </Panel>

        {/* Generation info panel */}
        {viewMode === "generation" && availableGenerations.length > 0 && (
          <Panel position="bottom-right" className="!m-4 !mb-20">
            <GenerationLabels
              nodes={nodes}
              availableGenerations={availableGenerations}
            />
          </Panel>
        )}

        {/* Legend panel */}
        <Panel position="bottom-left" className="!m-4">
          <div
            className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-3"
            data-testid="tree-legend"
            role="region"
            aria-label="Tree legend"
          >
            <h3 className="text-xs font-semibold text-muted-foreground mb-2">
              Legend
            </h3>
            <dl className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <dt
                  className="w-3 h-3 rounded-full bg-blue-500"
                  aria-hidden="true"
                />
                <dd>
                  <span className="high-contrast:font-bold">♂</span> Male
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <dt
                  className="w-3 h-3 rounded-full bg-pink-500"
                  aria-hidden="true"
                />
                <dd>
                  <span className="high-contrast:font-bold">♀</span> Female
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <dt
                  className="w-3 h-3 rounded-full bg-purple-500"
                  aria-hidden="true"
                />
                <dd>
                  <span className="high-contrast:font-bold">⚥</span>{" "}
                  Other/Unknown
                </dd>
              </div>
              {isFiltered && (
                <div className="flex items-center gap-2">
                  <dt
                    className="w-3 h-3 rounded-full bg-green-500"
                    aria-hidden="true"
                  />
                  <dd>Focus Member</dd>
                </div>
              )}

              {/* Relationship Lines Section */}
              <div
                className="mt-2 pt-2 border-t space-y-1.5"
                role="group"
                aria-label="Relationship line types"
              >
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  Relationship Lines
                </span>

                <div
                  className="flex items-center gap-2"
                  data-testid="legend-parent-child"
                >
                  <dt
                    className="w-5 h-0.5 bg-slate-500 rounded"
                    aria-hidden="true"
                  />
                  <dd>Parent-Child (Bio)</dd>
                </div>
                <div className="flex items-center gap-2">
                  <dt
                    className="w-5 h-0.5 bg-purple-500 rounded"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(90deg, #8b5cf6 0, #8b5cf6 4px, transparent 4px, transparent 6px)",
                    }}
                    aria-hidden="true"
                  />
                  <dd>Adopted (A)</dd>
                </div>

                <div
                  className="flex items-center gap-2 mt-1.5"
                  data-testid="legend-marriage"
                >
                  <dt className="flex items-center" aria-hidden="true">
                    <div className="w-5 h-0.5 bg-pink-500 rounded" />
                    <Heart className="w-2.5 h-2.5 text-pink-500 -ml-0.5" />
                  </dt>
                  <dd>Marriage</dd>
                </div>

                <div
                  className="flex items-center gap-2 mt-1.5"
                  data-testid="legend-sibling"
                >
                  <dt
                    className="w-5 h-0.5 bg-green-500 rounded"
                    aria-hidden="true"
                  />
                  <dd>Siblings (Full)</dd>
                </div>
              </div>
            </dl>
          </div>
        </Panel>

        {/* Keyboard shortcuts help */}
        <Panel position="bottom-right" className="!m-4">
          <div
            className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-3"
            role="region"
            aria-label="Keyboard shortcuts"
            id="tree-controls"
          >
            <div className="flex items-center gap-2 mb-2">
              <Keyboard
                className="h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <h3 className="text-xs font-semibold text-muted-foreground">
                Keyboard
              </h3>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
              <dt>
                <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
                  ↑↓←→
                </kbd>
              </dt>
              <dd>Navigate</dd>
              <dt>
                <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
                  Enter
                </kbd>
              </dt>
              <dd>View Profile</dd>
              <dt>
                <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
                  Esc
                </kbd>
              </dt>
              <dd>Exit nav</dd>
              <dt>
                <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">
                  +/-
                </kbd>
              </dt>
              <dd>Zoom</dd>
            </dl>
          </div>
        </Panel>
      </ReactFlow>

      {/* Read-only Member Profile Modal */}
      <PublicMemberProfileModal
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        member={selectedMember}
        allMembers={members}
        relationships={relationships}
        marriages={marriages}
      />
    </div>
  );
}

// Wrapper component with ReactFlowProvider
export function PublicFamilyTreeVisualization(
  props: PublicFamilyTreeVisualizationProps
) {
  return (
    <ReactFlowProvider>
      <PublicFamilyTreeVisualizationInner {...props} />
    </ReactFlowProvider>
  );
}
