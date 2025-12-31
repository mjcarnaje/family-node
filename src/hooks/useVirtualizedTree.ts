/**
 * useVirtualizedTree Hook
 *
 * This hook provides virtualized rendering for large family trees.
 * It handles viewport-based culling, level-of-detail switching,
 * and performance optimization through memoization.
 *
 * Key features:
 * - Only renders nodes/edges visible in viewport
 * - Switches between detail levels based on zoom
 * - Efficient spatial indexing for visibility queries
 * - Progressive rendering for initial load
 * - Performance metrics tracking
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useReactFlow, type Viewport, type Node, type Edge } from "@xyflow/react";
import {
  calculateViewportBounds,
  getDetailLevel,
  createSpatialIndex,
  queryVisibleItems,
  filterVisibleEdges,
  VIRTUALIZATION_CONFIG,
  type ViewportBounds,
  type SpatialIndex,
  type PerformanceMetrics,
  getPerformanceMetrics,
  debounce,
} from "~/utils/tree-virtualization";

export interface UseVirtualizedTreeOptions {
  /** Enable virtualization (can be disabled for small trees) */
  enabled?: boolean;
  /** Minimum node count to enable virtualization */
  minNodesForVirtualization?: number;
  /** Custom viewport buffer in pixels */
  viewportBuffer?: number;
  /** Callback when performance metrics update */
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

export interface UseVirtualizedTreeResult {
  /** Filtered nodes to render (only visible ones) */
  visibleNodes: Node[];
  /** Filtered edges to render (connected to visible nodes) */
  visibleEdges: Edge[];
  /** Current detail level based on zoom */
  detailLevel: "full" | "simplified" | "clustered";
  /** Whether virtualization is active */
  isVirtualized: boolean;
  /** Current performance metrics */
  metrics: PerformanceMetrics | null;
  /** Whether initial load is in progress */
  isInitializing: boolean;
  /** Force refresh visible nodes */
  refresh: () => void;
}

/**
 * Hook for virtualized tree rendering
 */
export function useVirtualizedTree(
  allNodes: Node[],
  allEdges: Edge[],
  containerRef: React.RefObject<HTMLElement | null>,
  options: UseVirtualizedTreeOptions = {}
): UseVirtualizedTreeResult {
  const {
    enabled = true,
    minNodesForVirtualization = 100,
    viewportBuffer = VIRTUALIZATION_CONFIG.viewportBuffer,
    onMetricsUpdate,
  } = options;

  // React Flow instance for viewport access
  const reactFlowInstance = useReactFlow();

  // State
  const [visibleNodeIds, setVisibleNodeIds] = useState<Set<string>>(new Set());
  const [detailLevel, setDetailLevel] = useState<"full" | "simplified" | "clustered">("full");
  const [isInitializing, setIsInitializing] = useState(true);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);

  // Refs for performance
  const spatialIndexRef = useRef<SpatialIndex<Node> | null>(null);
  const lastViewportRef = useRef<ViewportBounds | null>(null);
  const renderStartTimeRef = useRef<number>(0);

  // Determine if virtualization should be active
  const shouldVirtualize = enabled && allNodes.length >= minNodesForVirtualization;

  // Build spatial index when nodes change
  useEffect(() => {
    if (shouldVirtualize && allNodes.length > 0) {
      spatialIndexRef.current = createSpatialIndex(allNodes);
    } else {
      spatialIndexRef.current = null;
    }
  }, [allNodes, shouldVirtualize]);

  // Update visible nodes based on viewport
  const updateVisibleNodes = useCallback(() => {
    if (!shouldVirtualize) {
      // No virtualization - show all nodes
      setVisibleNodeIds(new Set(allNodes.map((n) => n.id)));
      setDetailLevel("full");
      return;
    }

    renderStartTimeRef.current = performance.now();

    try {
      // Get current viewport
      const viewport = reactFlowInstance.getViewport();
      const container = containerRef.current;

      if (!container) {
        setVisibleNodeIds(new Set(allNodes.map((n) => n.id)));
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const bounds = calculateViewportBounds(
        viewport,
        containerRect.width,
        containerRect.height
      );

      // Check if viewport changed significantly
      const lastBounds = lastViewportRef.current;
      const significantChange =
        !lastBounds ||
        Math.abs(bounds.minX - lastBounds.minX) > 50 ||
        Math.abs(bounds.minY - lastBounds.minY) > 50 ||
        Math.abs(bounds.zoom - lastBounds.zoom) > 0.1;

      if (!significantChange && visibleNodeIds.size > 0) {
        return; // Skip update if viewport hasn't changed significantly
      }

      lastViewportRef.current = bounds;

      // Determine detail level based on zoom
      const newDetailLevel = getDetailLevel(bounds.zoom);
      setDetailLevel(newDetailLevel);

      // Query spatial index for visible nodes
      let newVisibleIds: Set<string>;

      if (spatialIndexRef.current) {
        newVisibleIds = queryVisibleItems(spatialIndexRef.current, bounds);
      } else {
        // Fallback to linear search
        newVisibleIds = new Set(
          allNodes
            .filter((node) => {
              const { x, y } = node.position;
              return (
                x + 200 >= bounds.minX &&
                x <= bounds.maxX &&
                y + 150 >= bounds.minY &&
                y <= bounds.maxY
              );
            })
            .map((n) => n.id)
        );
      }

      // Limit max visible nodes
      if (newVisibleIds.size > VIRTUALIZATION_CONFIG.maxVisibleNodes) {
        const limitedIds = new Set<string>();
        let count = 0;
        for (const id of newVisibleIds) {
          if (count >= VIRTUALIZATION_CONFIG.maxVisibleNodes) break;
          limitedIds.add(id);
          count++;
        }
        newVisibleIds = limitedIds;
      }

      setVisibleNodeIds(newVisibleIds);

      // Update metrics
      const renderTime = performance.now() - renderStartTimeRef.current;
      const visibleEdgeCount = allEdges.filter(
        (e) => newVisibleIds.has(e.source) || newVisibleIds.has(e.target)
      ).length;

      const newMetrics = getPerformanceMetrics(
        allNodes.length,
        newVisibleIds.size,
        allEdges.length,
        visibleEdgeCount,
        newDetailLevel,
        renderTime
      );

      setMetrics(newMetrics);
      onMetricsUpdate?.(newMetrics);
    } catch (error) {
      console.error("Error updating visible nodes:", error);
      // Fallback to showing all nodes
      setVisibleNodeIds(new Set(allNodes.map((n) => n.id)));
    }
  }, [
    allNodes,
    allEdges,
    shouldVirtualize,
    reactFlowInstance,
    containerRef,
    visibleNodeIds.size,
    onMetricsUpdate,
  ]);

  // Debounced version for viewport changes
  const debouncedUpdateVisibleNodes = useMemo(
    () => debounce(updateVisibleNodes, VIRTUALIZATION_CONFIG.viewportDebounce),
    [updateVisibleNodes]
  );

  // Initial load
  useEffect(() => {
    if (allNodes.length > 0) {
      updateVisibleNodes();
      setIsInitializing(false);
    }
  }, [allNodes.length]); // Only on initial load

  // Subscribe to viewport changes
  useEffect(() => {
    if (!shouldVirtualize) return;

    // Create a MutationObserver or use ReactFlow's viewport change events
    // For now, we'll use a polling approach with RAF
    let rafId: number;
    let lastViewport: Viewport | null = null;

    const checkViewport = () => {
      const viewport = reactFlowInstance.getViewport();

      if (
        !lastViewport ||
        viewport.x !== lastViewport.x ||
        viewport.y !== lastViewport.y ||
        viewport.zoom !== lastViewport.zoom
      ) {
        lastViewport = { ...viewport };
        debouncedUpdateVisibleNodes();
      }

      rafId = requestAnimationFrame(checkViewport);
    };

    rafId = requestAnimationFrame(checkViewport);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [shouldVirtualize, reactFlowInstance, debouncedUpdateVisibleNodes]);

  // Compute visible nodes array
  const visibleNodes = useMemo(() => {
    if (!shouldVirtualize) {
      return allNodes;
    }
    return allNodes.filter((node) => visibleNodeIds.has(node.id));
  }, [allNodes, visibleNodeIds, shouldVirtualize]);

  // Compute visible edges array
  const visibleEdges = useMemo(() => {
    if (!shouldVirtualize) {
      return allEdges;
    }
    return filterVisibleEdges(allEdges, visibleNodeIds);
  }, [allEdges, visibleNodeIds, shouldVirtualize]);

  // Manual refresh function
  const refresh = useCallback(() => {
    lastViewportRef.current = null;
    updateVisibleNodes();
  }, [updateVisibleNodes]);

  return {
    visibleNodes,
    visibleEdges,
    detailLevel,
    isVirtualized: shouldVirtualize,
    metrics,
    isInitializing,
    refresh,
  };
}

/**
 * Hook for viewport-aware node rendering optimization
 * This is a simpler hook for components that just need to know their visibility
 */
export function useNodeVisibility(
  nodeId: string,
  nodePosition: { x: number; y: number },
  containerRef: React.RefObject<HTMLElement | null>
): boolean {
  const [isVisible, setIsVisible] = useState(true);
  const reactFlowInstance = useReactFlow();

  useEffect(() => {
    const checkVisibility = () => {
      try {
        const viewport = reactFlowInstance.getViewport();
        const container = containerRef.current;

        if (!container) {
          setIsVisible(true);
          return;
        }

        const containerRect = container.getBoundingClientRect();
        const bounds = calculateViewportBounds(
          viewport,
          containerRect.width,
          containerRect.height
        );

        const visible =
          nodePosition.x + 200 >= bounds.minX &&
          nodePosition.x <= bounds.maxX &&
          nodePosition.y + 150 >= bounds.minY &&
          nodePosition.y <= bounds.maxY;

        setIsVisible(visible);
      } catch {
        setIsVisible(true);
      }
    };

    checkVisibility();

    // Check on viewport changes
    const interval = setInterval(checkVisibility, 100);
    return () => clearInterval(interval);
  }, [nodeId, nodePosition, containerRef, reactFlowInstance]);

  return isVisible;
}
