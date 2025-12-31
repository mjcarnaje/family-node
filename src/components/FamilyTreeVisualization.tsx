import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useTheme } from "~/components/theme-provider";
import {
  ReactFlow,
  MiniMap,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  ReactFlowProvider,
  type OnConnect,
  type NodeTypes,
  type EdgeTypes,
  type Node,
  type Edge,
  type Connection,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Loader2, Users, GitFork, Heart, Users as UsersIcon, Keyboard, X, ChevronDown, ChevronUp, PanelLeftClose, PanelLeft, Info, Settings2, BookOpen } from "lucide-react";
import { CollaborationPanel } from "~/components/CollaborationPanel";
import { useAriaAnnouncements } from "~/hooks/useAccessibility";
import { useMobileDetect } from "~/hooks/useMobileDetect";
import { FamilyMemberNode } from "~/components/FamilyMemberNode";
import { SimplifiedFamilyMemberNode, ClusteredNode } from "~/components/SimplifiedFamilyMemberNode";
import { ParentChildEdge, MarriageEdge, SiblingEdge } from "~/components/edges";
import { FocusModeControls } from "~/components/FocusModeControls";
import { PerformancePanel } from "~/components/PerformancePanel";
import { FamilyTreeFilters, DEFAULT_FILTER_STATE, type TreeFilterState } from "~/components/FamilyTreeFilters";
import { MemberProfileModal } from "~/components/MemberProfileModal";
import { TreeSearchBar } from "~/components/TreeSearchBar";
import { ViewModeSelector, type ViewMode } from "~/components/ViewModeSelector";
import { GenerationLabels } from "~/components/GenerationLabels";
import { TreeZoomPanControls } from "~/components/TreeZoomPanControls";
import { MobileTreeControls } from "~/components/MobileTreeControls";
import { useTreeVisualization, type TreeFilterOptions, type ViewModeOptions } from "~/hooks/useTreeVisualization";
import { useVirtualizedTree } from "~/hooks/useVirtualizedTree";
import { useDeleteFamilyMember } from "~/hooks/useFamilyMembers";
import { cn } from "~/lib/utils";
import type { FocusMode } from "~/utils/family-tree-traversal";
import type { FamilyMember } from "~/db/schema";
import type { PerformanceMetrics } from "~/utils/tree-virtualization";

interface FamilyTreeVisualizationProps {
  familyTreeId: string;
  className?: string;
  onViewportRef?: (getViewport: () => HTMLElement | null) => void;
}

// Define custom node types - using explicit cast to avoid strict typing issues
// Includes full, simplified, and clustered node types for different zoom levels
const nodeTypes = {
  familyMember: FamilyMemberNode,
  simplifiedMember: SimplifiedFamilyMemberNode,
  clusteredMember: ClusteredNode,
} as NodeTypes;

// Define custom edge types for relationship visualization
const edgeTypes = {
  parentChild: ParentChildEdge,
  marriage: MarriageEdge,
  sibling: SiblingEdge,
} as EdgeTypes;

// Inner component that uses ReactFlow hooks
function FamilyTreeVisualizationInner({
  familyTreeId,
  className,
  onViewportRef,
}: FamilyTreeVisualizationProps) {
  // Theme for dark mode support
  const { theme } = useTheme();

  // Mobile detection for responsive layout
  const { isMobile, isTouch } = useMobileDetect();

  // Determine if we're in dark mode (handles "system" theme)
  const isDarkMode = useMemo(() => {
    if (theme === "dark") return true;
    if (theme === "light") return false;
    // For "system" theme, check the actual preference
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  }, [theme]);

  // Accessibility announcements
  const { announce } = useAriaAnnouncements();

  // Keyboard navigation state
  const [keyboardNavEnabled, setKeyboardNavEnabled] = useState(false);
  const [keyboardFocusedNodeId, setKeyboardFocusedNodeId] = useState<string | null>(null);
  const treeContainerRef = useRef<HTMLDivElement>(null);

  // Focus mode state
  const [focusMemberId, setFocusMemberId] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState<FocusMode>("all");

  // Filter state
  const [filters, setFilters] = useState<TreeFilterState>(DEFAULT_FILTER_STATE);

  // View mode state (tree view vs generation view)
  const [viewMode, setViewMode] = useState<ViewMode>("tree");

  // Pan mode state for zoom/pan controls
  const [panModeEnabled, setPanModeEnabled] = useState(false);

  // Performance metrics state
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [showPerformancePanel, setShowPerformancePanel] = useState(false);

  // Panel collapse state - for cleaner view
  const [showInfoPanel, setShowInfoPanel] = useState(true);
  const [showControlsPanel, setShowControlsPanel] = useState(true);
  const [showLegendPanel, setShowLegendPanel] = useState(false); // Hidden by default for cleaner look

  // Convert filter state to hook options
  const filterOptions: TreeFilterOptions = useMemo(
    () => ({
      generations: filters.generations.length > 0 ? filters.generations : undefined,
      genders: filters.genders.length > 0 ? filters.genders : undefined,
      relationshipTypes: filters.relationshipTypes.length > 0 ? filters.relationshipTypes : undefined,
      marriageStatuses: filters.marriageStatuses.length > 0 ? filters.marriageStatuses : undefined,
      showDeceased: filters.showDeceased,
      showParentChildLines: filters.showParentChildLines,
      showMarriageLines: filters.showMarriageLines,
      showSiblingLines: filters.showSiblingLines,
    }),
    [filters]
  );

  // View mode options for the hook
  const viewModeOptions: ViewModeOptions = useMemo(
    () => ({
      viewMode,
    }),
    [viewMode]
  );

  const {
    nodes: initialNodes,
    edges: initialEdges,
    allMembers,
    allRelationships,
    allMarriages,
    availableGenerations,
    isLoading,
    isError,
    error,
    treeName,
    treeDescription,
  } = useTreeVisualization(familyTreeId, { focusMemberId, focusMode }, filterOptions, viewModeOptions);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Use virtualization for large trees (100+ nodes)
  const {
    visibleNodes,
    visibleEdges,
    detailLevel,
    isVirtualized,
    metrics: virtualizationMetrics,
    isInitializing: isVirtualizationInitializing,
  } = useVirtualizedTree(
    nodes,
    edges,
    treeContainerRef,
    {
      enabled: true, // Enable virtualization for large trees
      minNodesForVirtualization: 100, // Only virtualize when 100+ nodes
      onMetricsUpdate: setPerformanceMetrics,
    }
  );

  // Member profile modal state
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);

  // Delete member mutation
  const deleteMemberMutation = useDeleteFamilyMember(familyTreeId);

  // Handle member deletion
  const handleDeleteMember = useCallback((memberId: string, memberName?: string) => {
    deleteMemberMutation.mutate({ id: memberId, memberName }, {
      onSuccess: () => {
        setProfileModalOpen(false);
        setSelectedMember(null);
      },
    });
  }, [deleteMemberMutation]);

  // Get the ReactFlow instance for programmatic control
  const reactFlowInstance = useReactFlow();

  // Update nodes and edges when data changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);

    // Fit view when nodes/edges change (especially after filtering)
    if (initialNodes.length > 0) {
      // Small delay to ensure nodes are rendered before fitting view
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2, maxZoom: 1.5 });
      }, 50);
    }
  }, [initialNodes, initialEdges, setNodes, setEdges, reactFlowInstance]);

  // Expose viewport element getter for export functionality
  useEffect(() => {
    if (onViewportRef) {
      const getViewport = () => {
        return treeContainerRef.current?.querySelector('.react-flow__viewport')?.parentElement as HTMLElement | null;
      };
      onViewportRef(getViewport);
    }
  }, [onViewportRef]);

  // Handle edge connections
  const onConnect: OnConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Handle node selection - opens the member profile modal
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNode(node.id);
      // Find the member data from the node and open the profile modal
      const nodeData = node.data as { member?: FamilyMember };
      if (nodeData?.member) {
        setSelectedMember(nodeData.member);
        setProfileModalOpen(true);
      }
    },
    []
  );

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

  // Handle search member selection - highlight and zoom to member
  const handleSearchMemberSelect = useCallback(
    (memberId: string) => {
      // Set the member as the focus member with highlight
      setFocusMemberId(memberId);
      // Keep the current mode or set to "all" to show the member in context
      if (focusMode !== "all") {
        // If already in a focus mode, stay in it
      } else {
        // Stay in "all" mode so user can see the member in full tree context
      }

      // Zoom to the selected node after a short delay to allow state update
      setTimeout(() => {
        const node = reactFlowInstance.getNode(memberId);
        if (node) {
          // Center and zoom to the node with smooth animation
          reactFlowInstance.setCenter(
            node.position.x + 100, // Offset to center the node (node width ~200px)
            node.position.y + 100, // Offset to center the node (node height varies)
            {
              zoom: 1.2,
              duration: 600,
            }
          );
        }
      }, 100);
    },
    [reactFlowInstance, focusMode]
  );

  // Count relationships (from displayed nodes/edges)
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

  // Total member count (before filtering)
  const totalMemberCount = allMembers?.length || 0;

  // Check if we're in filtered mode (focus mode or attribute filters)
  const hasActiveAttributeFilters =
    filters.generations.length > 0 ||
    filters.genders.length > 0 ||
    filters.relationshipTypes.length > 0 ||
    filters.marriageStatuses.length > 0 ||
    !filters.showDeceased ||
    !filters.showParentChildLines ||
    !filters.showMarriageLines ||
    !filters.showSiblingLines;

  const isFiltered = (focusMemberId && focusMode !== "all") || hasActiveAttributeFilters;

  // Keyboard navigation handler for the tree
  const handleTreeKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!keyboardNavEnabled || nodes.length === 0) return;

      const currentIndex = nodes.findIndex((n: Node) => n.id === keyboardFocusedNodeId);

      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown": {
          event.preventDefault();
          const nextIndex = currentIndex < nodes.length - 1 ? currentIndex + 1 : 0;
          const nextNode = nodes[nextIndex];
          setKeyboardFocusedNodeId(nextNode.id);
          setSelectedNode(nextNode.id);
          const nodeData = nextNode.data as { member?: { firstName: string; lastName: string } };
          if (nodeData?.member) {
            announce(`${nodeData.member.firstName} ${nodeData.member.lastName}`);
          }
          // Center on the node
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
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : nodes.length - 1;
          const prevNode = nodes[prevIndex];
          setKeyboardFocusedNodeId(prevNode.id);
          setSelectedNode(prevNode.id);
          const nodeData = prevNode.data as { member?: { firstName: string; lastName: string } };
          if (nodeData?.member) {
            announce(`${nodeData.member.firstName} ${nodeData.member.lastName}`);
          }
          // Center on the node
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
            const node = nodes.find((n: Node) => n.id === keyboardFocusedNodeId);
            if (node) {
              const nodeData = node.data as { member?: FamilyMember };
              if (nodeData?.member) {
                setSelectedMember(nodeData.member);
                setProfileModalOpen(true);
                announce(`Opening profile for ${nodeData.member.firstName} ${nodeData.member.lastName}`);
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
        case "Home": {
          event.preventDefault();
          if (nodes.length > 0) {
            const firstNode = nodes[0];
            setKeyboardFocusedNodeId(firstNode.id);
            setSelectedNode(firstNode.id);
            const nodeData = firstNode.data as { member?: { firstName: string; lastName: string } };
            if (nodeData?.member) {
              announce(`${nodeData.member.firstName} ${nodeData.member.lastName}, first member`);
            }
            reactFlowInstance.setCenter(
              firstNode.position.x + 100,
              firstNode.position.y + 100,
              { zoom: 1.2, duration: 300 }
            );
          }
          break;
        }
        case "End": {
          event.preventDefault();
          if (nodes.length > 0) {
            const lastNode = nodes[nodes.length - 1];
            setKeyboardFocusedNodeId(lastNode.id);
            setSelectedNode(lastNode.id);
            const nodeData = lastNode.data as { member?: { firstName: string; lastName: string } };
            if (nodeData?.member) {
              announce(`${nodeData.member.firstName} ${nodeData.member.lastName}, last member`);
            }
            reactFlowInstance.setCenter(
              lastNode.position.x + 100,
              lastNode.position.y + 100,
              { zoom: 1.2, duration: 300 }
            );
          }
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
        const nodeData = firstNode.data as { member?: { firstName: string; lastName: string } };
        if (nodeData?.member) {
          announce(`Keyboard navigation enabled. ${nodeData.member.firstName} ${nodeData.member.lastName}. Use arrow keys to navigate, Enter to select, Escape to exit.`);
        }
      }
    }
  }, [keyboardNavEnabled, nodes, keyboardFocusedNodeId, announce]);

  // Loading state
  if (isLoading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center h-[600px] bg-slate-50 dark:bg-slate-900/50 rounded-xl border",
          className
        )}
        data-testid="tree-visualization-loading"
      >
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Loading family tree...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div
        className={cn(
          "flex items-center justify-center h-[600px] bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-900",
          className
        )}
        data-testid="tree-visualization-error"
      >
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <div className="text-red-500 dark:text-red-400">
            <svg
              className="h-12 w-12 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="font-semibold text-red-700 dark:text-red-300">
            Failed to load family tree
          </h3>
          <p className="text-sm text-red-600 dark:text-red-400">
            {error?.message || "An unknown error occurred"}
          </p>
        </div>
      </div>
    );
  }

  // Empty state (when no members in tree at all)
  if (totalMemberCount === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center h-[600px] bg-slate-50 dark:bg-slate-900/50 rounded-xl border",
          className
        )}
        data-testid="tree-visualization-empty"
      >
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <Users className="h-16 w-16 text-muted-foreground/50" />
          <h3 className="font-semibold text-lg text-muted-foreground">
            No family members yet
          </h3>
          <p className="text-sm text-muted-foreground/80 max-w-sm">
            Start building your family tree by adding family members. They will
            appear here as interactive nodes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={treeContainerRef}
      className={cn(
        // Responsive height: full viewport on mobile, fixed on desktop
        "h-[calc(100vh-12rem)] min-h-[400px] md:h-[700px]",
        // Add bottom padding on mobile for the navigation bar
        "pb-16 md:pb-0",
        "rounded-xl border overflow-hidden relative",
        className
      )}
      data-testid="tree-visualization"
      role="tree"
      aria-label={`Family tree: ${treeName || "Family Tree"} with ${stats.memberCount} members`}
      tabIndex={0}
      onKeyDown={handleTreeKeyDown}
      onFocus={handleTreeFocus}
    >
      {/* Keyboard navigation instructions (screen reader only) */}
      <div className="sr-only" aria-live="polite">
        {keyboardNavEnabled
          ? "Use arrow keys to navigate between family members, Enter or Space to open member profile, Escape to exit keyboard navigation, plus/minus to zoom, 0 to fit view."
          : "Press Tab to enter the family tree and enable keyboard navigation."}
      </div>

      {/* Skip link for keyboard users */}
      <a
        href="#tree-controls"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:bg-white focus:p-2 focus:rounded focus:shadow-lg"
      >
        Skip to tree controls
      </a>

      <ReactFlow
        nodes={(isVirtualized ? visibleNodes : nodes) as Node[]}
        edges={(isVirtualized ? visibleEdges : edges) as Edge[]}
        onNodesChange={onNodesChange as (changes: unknown[]) => void}
        onEdgesChange={onEdgesChange as (changes: unknown[]) => void}
        onConnect={onConnect}
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
        // Touch-friendly interactions
        panOnDrag={true}
        panOnScroll={!isMobile} // Disable scroll pan on mobile to prevent conflicts
        zoomOnScroll={!isMobile} // Use pinch zoom on mobile instead
        zoomOnPinch={true} // Enable pinch-to-zoom for touch devices
        zoomOnDoubleClick={true} // Double-tap to zoom
        nodesDraggable={!panModeEnabled && !isMobile} // Disable node dragging on mobile
        selectionOnDrag={!panModeEnabled && !isMobile}
        // Optimize for touch
        selectNodesOnDrag={false}
        className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800"
      >
        {/* Enhanced Zoom/Pan Controls - Hidden on mobile, toggleable */}
        {showControlsPanel && (
          <Panel position="top-left" className="!m-4 !mt-28 hidden md:block">
            <TreeZoomPanControls
              minZoom={0.1}
              maxZoom={2}
              panModeEnabled={panModeEnabled}
              onPanModeChange={setPanModeEnabled}
              focusedMemberId={focusMemberId}
              onAnnounce={announce}
            />
          </Panel>
        )}

        {/* MiniMap - Hidden on mobile for space, with ARIA label and dark mode support */}
        <MiniMap
          nodeColor={(node: Node) => {
            const data = node.data as {
              member?: { gender?: string };
              isFocusMember?: boolean;
            } | undefined;
            const gender = data?.member?.gender;
            const isFocusMember = data?.isFocusMember;

            // Highlight focus member with a distinct color
            if (isFocusMember) {
              return "#22c55e"; // Green for focus member
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
          maskColor={isDarkMode ? "rgba(15, 23, 42, 0.7)" : "rgba(0, 0, 0, 0.1)"}
          className="!bg-white dark:!bg-slate-800 !border !border-slate-200 dark:!border-slate-700 !rounded-lg hidden md:block"
          aria-label="Tree minimap overview"
        />

        {/* Background pattern - dark mode aware */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color={isDarkMode ? "#475569" : "#94a3b8"}
          className="opacity-30 dark:opacity-40"
        />

        {/* Tree info panel - Simplified on mobile, with toggle for controls */}
        <Panel position="top-left" className="!m-2 md:!m-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-2 md:p-4 max-w-[200px] md:max-w-sm">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-bold text-sm md:text-lg text-slate-900 dark:text-slate-100 truncate flex-1">
                {treeName || "Family Tree"}
              </h2>
              {/* Toggle panels button - desktop only */}
              <button
                onClick={() => setShowControlsPanel(!showControlsPanel)}
                className="hidden md:flex items-center justify-center w-6 h-6 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title={showControlsPanel ? "Hide controls" : "Show controls"}
                aria-label={showControlsPanel ? "Hide control panels" : "Show control panels"}
              >
                {showControlsPanel ? (
                  <PanelLeftClose className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <PanelLeft className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>
            {/* Description hidden on mobile */}
            {treeDescription && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2 hidden md:block">
                {treeDescription}
              </p>
            )}
            <div className="flex items-center gap-2 md:gap-4 mt-2 md:mt-3 text-[10px] md:text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3 md:h-4 md:w-4" />
                <span>
                  {isFiltered
                    ? `${stats.memberCount}/${totalMemberCount}`
                    : `${stats.memberCount}`}
                </span>
              </div>
              <div className="flex items-center gap-1 hidden md:flex">
                <GitFork className="h-4 w-4" />
                <span>{stats.relationshipCount} relationships</span>
              </div>
            </div>
          </div>
        </Panel>

        {/* Collaboration Panel - Shows active collaborators and activity */}
        {showControlsPanel && (
          <Panel position="top-right" className="!m-4 !mr-4 hidden md:block">
            <CollaborationPanel familyTreeId={familyTreeId} />
          </Panel>
        )}

        {/* Search, View Mode, Focus Mode Controls and Filters panel - Hidden on mobile, toggleable */}
        {showControlsPanel && (
          <Panel position="top-right" className="!m-4 !mt-20 space-y-2 max-h-[calc(100%-12rem)] overflow-y-auto hidden md:block">
            <TreeSearchBar
              allMembers={allMembers || []}
              onMemberSelect={handleSearchMemberSelect}
            />
            <ViewModeSelector
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
            <FocusModeControls
              allMembers={allMembers || []}
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
        )}

        {/* Generation info panel - only shown in generation view mode, hidden on mobile, toggleable */}
        {showControlsPanel && viewMode === "generation" && availableGenerations.length > 0 && (
          <Panel position="bottom-right" className="!m-4 !mb-20 hidden md:block">
            <GenerationLabels
              nodes={nodes}
              availableGenerations={availableGenerations}
            />
          </Panel>
        )}

        {/* Legend panel - Hidden on mobile, toggleable, with ARIA structure */}
        {showControlsPanel && showLegendPanel && (
        <Panel position="bottom-left" className="!m-4 hidden md:block">
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
              {/* Member types */}
              <div className="flex items-center gap-2">
                <dt className="w-3 h-3 rounded-full bg-blue-500 high-contrast:ring-2 high-contrast:ring-blue-700" aria-hidden="true" />
                <dd><span className="high-contrast:font-bold">♂</span> Male</dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="w-3 h-3 rounded-full bg-pink-500 high-contrast:ring-2 high-contrast:ring-pink-700" aria-hidden="true" />
                <dd><span className="high-contrast:font-bold">♀</span> Female</dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="w-3 h-3 rounded-full bg-purple-500 high-contrast:ring-2 high-contrast:ring-purple-700" aria-hidden="true" />
                <dd><span className="high-contrast:font-bold">⚥</span> Other/Unknown</dd>
              </div>
              {isFiltered && (
                <div className="flex items-center gap-2">
                  <dt className="w-3 h-3 rounded-full bg-green-500 high-contrast:ring-2 high-contrast:ring-green-700" aria-hidden="true" />
                  <dd>Focus Member</dd>
                </div>
              )}

              {/* Relationship Lines Section */}
              <div className="mt-2 pt-2 border-t space-y-1.5" role="group" aria-label="Relationship line types">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  Relationship Lines
                </span>

                {/* Parent-Child Lines */}
                <div className="flex items-center gap-2" data-testid="legend-parent-child">
                  <dt className="w-5 h-0.5 bg-slate-500 rounded high-contrast:h-1" aria-hidden="true" />
                  <dd>Parent-Child (Bio)</dd>
                </div>
                <div className="flex items-center gap-2">
                  <dt className="w-5 h-0.5 bg-purple-500 rounded high-contrast:h-1" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #8b5cf6 0, #8b5cf6 4px, transparent 4px, transparent 6px)' }} aria-hidden="true" />
                  <dd>Adopted (A)</dd>
                </div>
                <div className="flex items-center gap-2">
                  <dt className="w-5 h-0.5 bg-amber-500 rounded high-contrast:h-1" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #f59e0b 0, #f59e0b 2px, transparent 2px, transparent 4px)' }} aria-hidden="true" />
                  <dd>Step (S)</dd>
                </div>

                {/* Marriage Lines */}
                <div className="flex items-center gap-2 mt-1.5" data-testid="legend-marriage">
                  <dt className="flex items-center" aria-hidden="true">
                    <div className="w-5 h-0.5 bg-pink-500 rounded high-contrast:h-1" />
                    <Heart className="w-2.5 h-2.5 text-pink-500 -ml-0.5" />
                  </dt>
                  <dd>Marriage</dd>
                </div>
                <div className="flex items-center gap-2">
                  <dt className="w-5 h-0.5 rounded high-contrast:h-1" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #9ca3af 0, #9ca3af 3px, transparent 3px, transparent 5px)' }} aria-hidden="true" />
                  <dd>Divorced</dd>
                </div>

                {/* Sibling Lines */}
                <div className="flex items-center gap-2 mt-1.5" data-testid="legend-sibling">
                  <dt className="w-5 h-0.5 bg-green-500 rounded high-contrast:h-1" aria-hidden="true" />
                  <dd>Siblings (Full)</dd>
                </div>
                <div className="flex items-center gap-2">
                  <dt className="w-5 h-0.5 rounded high-contrast:h-1" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #84cc16 0, #84cc16 3px, transparent 3px, transparent 5px)' }} aria-hidden="true" />
                  <dd>Half-siblings</dd>
                </div>
              </div>
            </dl>
          </div>
        </Panel>
        )}

        {/* Keyboard shortcuts help - Hidden on mobile, toggleable */}
        {showControlsPanel && (
        <Panel position="bottom-right" className="!m-4 hidden md:block">
          <div
            className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-3"
            role="region"
            aria-label="Keyboard shortcuts"
            id="tree-controls"
          >
            <div className="flex items-center gap-2 mb-2">
              <Keyboard className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <h3 className="text-xs font-semibold text-muted-foreground">Keyboard</h3>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
              <dt><kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">↑↓←→</kbd></dt>
              <dd>Navigate</dd>
              <dt><kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">Enter</kbd></dt>
              <dd>Select</dd>
              <dt><kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">Esc</kbd></dt>
              <dd>Exit nav</dd>
              <dt><kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">+/-</kbd></dt>
              <dd>Zoom</dd>
              <dt><kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded">0</kbd></dt>
              <dd>Fit view</dd>
            </dl>
          </div>
        </Panel>
        )}
        {/* Performance Panel - Only show for large trees, toggleable */}
        {showControlsPanel && nodes.length >= 50 && (
          <Panel position="bottom-left" className="!m-4 !ml-60 hidden md:block">
            <PerformancePanel
              metrics={performanceMetrics}
              isVirtualized={isVirtualized}
            />
          </Panel>
        )}
      </ReactFlow>

      {/* Mobile Controls - Only visible on mobile */}
      <MobileTreeControls
        allMembers={allMembers || []}
        filters={filters}
        onFiltersChange={setFilters}
        availableGenerations={availableGenerations}
        focusMemberId={focusMemberId}
        focusMode={focusMode}
        onFocusMemberChange={setFocusMemberId}
        onFocusModeChange={setFocusMode}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onSearchMemberSelect={handleSearchMemberSelect}
        treeName={treeName}
        memberCount={stats.memberCount}
        relationshipCount={stats.relationshipCount}
      />

      {/* Member Profile Modal */}
      <MemberProfileModal
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        member={selectedMember}
        allMembers={allMembers || []}
        relationships={allRelationships}
        marriages={allMarriages}
        onDelete={handleDeleteMember}
        isDeleting={deleteMemberMutation.isPending}
        familyTreeId={familyTreeId}
        onEditSuccess={() => {
          // The tree will automatically re-render due to cache invalidation
          // from useUpdateFamilyMemberWithImage hook
          setProfileModalOpen(false);
          setSelectedMember(null);
        }}
      />
    </div>
  );
}

// Wrapper component with ReactFlowProvider
export function FamilyTreeVisualization(props: FamilyTreeVisualizationProps) {
  return (
    <ReactFlowProvider>
      <FamilyTreeVisualizationInner {...props} />
    </ReactFlowProvider>
  );
}
