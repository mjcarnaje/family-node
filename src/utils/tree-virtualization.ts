/**
 * Tree Virtualization Utilities
 *
 * This module provides utilities for optimizing rendering of large family trees
 * using viewport-based culling and lazy loading techniques.
 *
 * Key features:
 * - Viewport-based node culling (only render visible nodes)
 * - Adaptive level-of-detail based on zoom level
 * - Spatial indexing for fast visibility queries
 * - Chunked layout calculations for non-blocking updates
 * - Memoization of expensive computations
 */

import type { Node, Edge, Viewport } from "@xyflow/react";
import { LAYOUT_CONFIG } from "./tree-layout";

// Virtualization configuration
export const VIRTUALIZATION_CONFIG = {
  // Buffer zone around viewport to preload nodes (in pixels)
  viewportBuffer: 200,
  // Minimum zoom level to show full detail nodes
  fullDetailZoom: 0.5,
  // Minimum zoom level to show simplified nodes (below this, show clusters)
  simplifiedZoom: 0.2,
  // Maximum nodes to render at once
  maxVisibleNodes: 500,
  // Chunk size for progressive rendering
  chunkSize: 50,
  // Debounce delay for viewport changes (ms)
  viewportDebounce: 16, // ~60fps
} as const;

// Types for virtualization
export interface VirtualizationState {
  visibleNodeIds: Set<string>;
  visibleEdgeIds: Set<string>;
  detailLevel: "full" | "simplified" | "clustered";
  viewport: ViewportBounds;
  isLoading: boolean;
}

export interface ViewportBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  zoom: number;
}

export interface SpatialIndex<T> {
  items: Map<string, { item: T; bounds: NodeBounds }>;
  gridCells: Map<string, string[]>;
  cellSize: number;
}

export interface NodeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Calculate viewport bounds from React Flow viewport state
 */
export function calculateViewportBounds(
  viewport: Viewport,
  containerWidth: number,
  containerHeight: number
): ViewportBounds {
  const { x, y, zoom } = viewport;

  // Calculate visible area in flow coordinates
  const visibleWidth = containerWidth / zoom;
  const visibleHeight = containerHeight / zoom;

  // Viewport position is inverted (negative x/y means we've panned right/down)
  const minX = -x / zoom - VIRTUALIZATION_CONFIG.viewportBuffer / zoom;
  const maxX = minX + visibleWidth + (2 * VIRTUALIZATION_CONFIG.viewportBuffer) / zoom;
  const minY = -y / zoom - VIRTUALIZATION_CONFIG.viewportBuffer / zoom;
  const maxY = minY + visibleHeight + (2 * VIRTUALIZATION_CONFIG.viewportBuffer) / zoom;

  return { minX, maxX, minY, maxY, zoom };
}

/**
 * Determine the level of detail to render based on zoom level
 */
export function getDetailLevel(zoom: number): "full" | "simplified" | "clustered" {
  if (zoom >= VIRTUALIZATION_CONFIG.fullDetailZoom) {
    return "full";
  } else if (zoom >= VIRTUALIZATION_CONFIG.simplifiedZoom) {
    return "simplified";
  }
  return "clustered";
}

/**
 * Check if a node is within the viewport bounds
 */
export function isNodeInViewport(
  node: Node,
  bounds: ViewportBounds,
  nodeWidth: number = LAYOUT_CONFIG.nodeWidth,
  nodeHeight: number = LAYOUT_CONFIG.nodeHeight
): boolean {
  const { x, y } = node.position;

  // Check if node rectangle intersects viewport rectangle
  return (
    x + nodeWidth >= bounds.minX &&
    x <= bounds.maxX &&
    y + nodeHeight >= bounds.minY &&
    y <= bounds.maxY
  );
}

/**
 * Check if an edge should be visible (either node is visible)
 */
export function isEdgeVisible(
  edge: Edge,
  visibleNodeIds: Set<string>
): boolean {
  return visibleNodeIds.has(edge.source) || visibleNodeIds.has(edge.target);
}

/**
 * Create a spatial index for fast visibility queries
 */
export function createSpatialIndex<T extends { id: string; position: { x: number; y: number } }>(
  items: T[],
  cellSize: number = 500
): SpatialIndex<T> {
  const spatialIndex: SpatialIndex<T> = {
    items: new Map(),
    gridCells: new Map(),
    cellSize,
  };

  items.forEach((item) => {
    const bounds: NodeBounds = {
      x: item.position.x,
      y: item.position.y,
      width: LAYOUT_CONFIG.nodeWidth,
      height: LAYOUT_CONFIG.nodeHeight,
    };

    // Store item with bounds
    spatialIndex.items.set(item.id, { item, bounds });

    // Calculate grid cells this item belongs to
    const startCellX = Math.floor(bounds.x / cellSize);
    const endCellX = Math.floor((bounds.x + bounds.width) / cellSize);
    const startCellY = Math.floor(bounds.y / cellSize);
    const endCellY = Math.floor((bounds.y + bounds.height) / cellSize);

    // Add to all overlapping cells
    for (let cx = startCellX; cx <= endCellX; cx++) {
      for (let cy = startCellY; cy <= endCellY; cy++) {
        const cellKey = `${cx},${cy}`;
        if (!spatialIndex.gridCells.has(cellKey)) {
          spatialIndex.gridCells.set(cellKey, []);
        }
        spatialIndex.gridCells.get(cellKey)!.push(item.id);
      }
    }
  });

  return spatialIndex;
}

/**
 * Query spatial index for items in viewport
 */
export function queryVisibleItems<T>(
  spatialIndex: SpatialIndex<T>,
  bounds: ViewportBounds
): Set<string> {
  const visibleIds = new Set<string>();
  const { cellSize } = spatialIndex;

  // Calculate which grid cells overlap with viewport
  const startCellX = Math.floor(bounds.minX / cellSize);
  const endCellX = Math.floor(bounds.maxX / cellSize);
  const startCellY = Math.floor(bounds.minY / cellSize);
  const endCellY = Math.floor(bounds.maxY / cellSize);

  // Check all overlapping cells
  for (let cx = startCellX; cx <= endCellX; cx++) {
    for (let cy = startCellY; cy <= endCellY; cy++) {
      const cellKey = `${cx},${cy}`;
      const cellItems = spatialIndex.gridCells.get(cellKey);

      if (cellItems) {
        cellItems.forEach((id) => {
          // Precise bounds check
          const itemData = spatialIndex.items.get(id);
          if (itemData) {
            const { bounds: itemBounds } = itemData;
            if (
              itemBounds.x + itemBounds.width >= bounds.minX &&
              itemBounds.x <= bounds.maxX &&
              itemBounds.y + itemBounds.height >= bounds.minY &&
              itemBounds.y <= bounds.maxY
            ) {
              visibleIds.add(id);
            }
          }
        });
      }
    }
  }

  return visibleIds;
}

/**
 * Filter nodes to only those visible in viewport
 */
export function filterVisibleNodes<T extends Node>(
  nodes: T[],
  bounds: ViewportBounds,
  maxNodes: number = VIRTUALIZATION_CONFIG.maxVisibleNodes
): T[] {
  const visibleNodes: T[] = [];

  for (const node of nodes) {
    if (isNodeInViewport(node, bounds)) {
      visibleNodes.push(node);
      if (visibleNodes.length >= maxNodes) {
        break;
      }
    }
  }

  return visibleNodes;
}

/**
 * Filter edges to only those with visible endpoints
 */
export function filterVisibleEdges<T extends Edge>(
  edges: T[],
  visibleNodeIds: Set<string>
): T[] {
  return edges.filter((edge) => isEdgeVisible(edge, visibleNodeIds));
}

/**
 * Memoization cache for layout calculations
 */
const layoutCache = new Map<string, {
  result: ReturnType<typeof import("./tree-layout").calculateHierarchicalLayout>;
  timestamp: number;
}>();

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Generate cache key from input data
 */
export function generateLayoutCacheKey(
  memberIds: string[],
  relationshipIds: string[],
  marriageIds: string[]
): string {
  // Sort IDs for consistent keys
  const sortedMembers = [...memberIds].sort();
  const sortedRelationships = [...relationshipIds].sort();
  const sortedMarriages = [...marriageIds].sort();

  return `layout:${sortedMembers.join(",")}-${sortedRelationships.join(",")}-${sortedMarriages.join(",")}`;
}

/**
 * Get cached layout result or null if expired/missing
 */
export function getCachedLayout(cacheKey: string) {
  const cached = layoutCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }
  // Clean up expired entry
  if (cached) {
    layoutCache.delete(cacheKey);
  }
  return null;
}

/**
 * Store layout result in cache
 */
export function setCachedLayout(
  cacheKey: string,
  result: ReturnType<typeof import("./tree-layout").calculateHierarchicalLayout>
): void {
  // Limit cache size to prevent memory issues
  if (layoutCache.size > 100) {
    // Remove oldest entries
    const entries = Array.from(layoutCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    entries.slice(0, 50).forEach(([key]) => layoutCache.delete(key));
  }

  layoutCache.set(cacheKey, {
    result,
    timestamp: Date.now(),
  });
}

/**
 * Clear layout cache (useful for testing or forced refresh)
 */
export function clearLayoutCache(): void {
  layoutCache.clear();
}

/**
 * Calculate tree bounds from node positions
 */
export function calculateTreeBounds(nodes: Node[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
} {
  if (nodes.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  nodes.forEach((node) => {
    const { x, y } = node.position;
    const right = x + LAYOUT_CONFIG.nodeWidth;
    const bottom = y + LAYOUT_CONFIG.nodeHeight;

    minX = Math.min(minX, x);
    maxX = Math.max(maxX, right);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, bottom);
  });

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Progressive rendering helper - yields control back to browser periodically
 */
export async function processInChunks<T, R>(
  items: T[],
  processor: (item: T) => R,
  chunkSize: number = VIRTUALIZATION_CONFIG.chunkSize,
  onProgress?: (processed: number, total: number) => void
): Promise<R[]> {
  const results: R[] = [];
  const total = items.length;

  for (let i = 0; i < total; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    chunk.forEach((item) => {
      results.push(processor(item));
    });

    // Report progress
    onProgress?.(Math.min(i + chunkSize, total), total);

    // Yield to browser
    if (i + chunkSize < total) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  }

  return results;
}

/**
 * Debounce function for viewport changes
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Throttle function for high-frequency events
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  let lastArgs: Parameters<T> | null = null;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          fn(...lastArgs);
          lastArgs = null;
        }
      }, limit);
    } else {
      lastArgs = args;
    }
  };
}

/**
 * Performance metrics tracker
 */
export interface PerformanceMetrics {
  totalNodes: number;
  visibleNodes: number;
  totalEdges: number;
  visibleEdges: number;
  detailLevel: "full" | "simplified" | "clustered";
  lastRenderTime: number;
  fps: number;
  memoryUsage?: number;
}

let lastFrameTime = performance.now();
let frameCount = 0;
let currentFPS = 60;

/**
 * Update FPS calculation
 */
export function updateFPS(): number {
  frameCount++;
  const now = performance.now();
  const elapsed = now - lastFrameTime;

  if (elapsed >= 1000) {
    currentFPS = Math.round((frameCount * 1000) / elapsed);
    frameCount = 0;
    lastFrameTime = now;
  }

  return currentFPS;
}

/**
 * Get current performance metrics
 */
export function getPerformanceMetrics(
  totalNodes: number,
  visibleNodes: number,
  totalEdges: number,
  visibleEdges: number,
  detailLevel: "full" | "simplified" | "clustered",
  renderTime: number
): PerformanceMetrics {
  return {
    totalNodes,
    visibleNodes,
    totalEdges,
    visibleEdges,
    detailLevel,
    lastRenderTime: renderTime,
    fps: updateFPS(),
    memoryUsage: (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize,
  };
}
