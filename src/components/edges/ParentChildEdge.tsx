import { memo, useMemo } from "react";
import {
  EdgeLabelRenderer,
  useReactFlow,
  type Position,
} from "@xyflow/react";
import type { ParentChildEdgeData } from "~/hooks/useTreeVisualization";

interface ParentChildEdgeProps {
  id: string;
  source: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: Position;
  targetPosition: Position;
  data?: ParentChildEdgeData;
  selected?: boolean;
  markerEnd?: string;
}

/**
 * Custom edge component for parent-child relationships
 * Uses a clean orthogonal path (straight down, then horizontal, then down)
 * For married parents, draws from the center point between them
 */
function ParentChildEdgeComponent({
  id,
  source,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  selected,
}: ParentChildEdgeProps) {
  const { getNode } = useReactFlow();
  const relationship = data?.relationship;
  const relationshipType = relationship?.relationshipType || "biological";
  const marriedParentIds = data?.marriedParentIds;

  // Calculate the actual source position
  // If parents are married, draw from the center between them
  const { effectiveSourceX, effectiveSourceY } = useMemo(() => {
    if (marriedParentIds && marriedParentIds.length === 2) {
      const parent1 = getNode(marriedParentIds[0]);
      const parent2 = getNode(marriedParentIds[1]);

      if (parent1 && parent2) {
        // Get actual node dimensions (use measured height or default)
        const nodeWidth = parent1.measured?.width || 200;
        const nodeHeight1 = parent1.measured?.height || 220;
        const nodeHeight2 = parent2.measured?.height || 220;

        // Calculate center X between the two married parents
        const parent1CenterX = parent1.position.x + nodeWidth / 2;
        const parent2CenterX = parent2.position.x + nodeWidth / 2;
        const centerX = (parent1CenterX + parent2CenterX) / 2;

        // Calculate Y from the bottom of the taller parent (for consistent alignment)
        const parent1Bottom = parent1.position.y + nodeHeight1;
        const parent2Bottom = parent2.position.y + nodeHeight2;
        const bottomY = Math.max(parent1Bottom, parent2Bottom);

        return { effectiveSourceX: centerX, effectiveSourceY: bottomY };
      }
    }
    return { effectiveSourceX: sourceX, effectiveSourceY: sourceY };
  }, [marriedParentIds, getNode, sourceX, sourceY]);

  // Create a clean orthogonal path for family tree style
  // Path: parent(s) → straight down → horizontal → straight down → child
  // Use a FIXED offset from parent bottom so all edges to siblings share the same horizontal rail
  const VERTICAL_DROP = 50; // Fixed distance from parent bottom to horizontal rail
  const midY = effectiveSourceY + VERTICAL_DROP;

  // Create the path: down from parent center, horizontal to child's x, down to child
  const edgePath = `
    M ${effectiveSourceX} ${effectiveSourceY}
    L ${effectiveSourceX} ${midY}
    L ${targetX} ${midY}
    L ${targetX} ${targetY}
  `;

  // Label position at the horizontal segment
  const labelX = (effectiveSourceX + targetX) / 2;
  const labelY = midY;

  // Color and style based on relationship type - simplified for cleaner look
  const getEdgeStyle = () => {
    switch (relationshipType) {
      case "biological":
        return {
          stroke: "#94a3b8", // slate-400 - lighter for cleaner look
          strokeWidth: 1.5,
          strokeDasharray: undefined as string | undefined,
          label: "",
        };
      case "adopted":
        return {
          stroke: "#a78bfa", // purple-400
          strokeWidth: 1.5,
          strokeDasharray: "6,3",
          label: "A",
        };
      case "step":
        return {
          stroke: "#fbbf24", // amber-400
          strokeWidth: 1.5,
          strokeDasharray: "4,3",
          label: "S",
        };
      case "foster":
        return {
          stroke: "#22d3ee", // cyan-400
          strokeWidth: 1.5,
          strokeDasharray: "2,3",
          label: "F",
        };
      default:
        return {
          stroke: "#94a3b8",
          strokeWidth: 1.5,
          strokeDasharray: undefined as string | undefined,
          label: "",
        };
    }
  };

  const style = getEdgeStyle();

  // Get full relationship type name for screen readers
  const relationshipTypeName = relationshipType === "biological"
    ? "Biological"
    : relationshipType === "adopted"
    ? "Adopted"
    : relationshipType === "step"
    ? "Step"
    : relationshipType === "foster"
    ? "Foster"
    : "Unknown";

  return (
    <>
      {/* Main edge path - clean orthogonal lines for family tree style */}
      <g
        role="img"
        aria-label={`${relationshipTypeName} parent-child relationship`}
      >
        <path
          id={id}
          d={edgePath}
          fill="none"
          stroke={style.stroke}
          strokeWidth={selected ? style.strokeWidth + 0.5 : style.strokeWidth}
          strokeDasharray={style.strokeDasharray}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            opacity: 0.7,
            transition: "stroke-width 0.2s, opacity 0.2s",
          }}
        />
      </g>

      {/* Relationship type label for non-biological relationships */}
      {style.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
            }}
            className="nodrag nopan"
          >
            <div
              className="flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white shadow-md high-contrast:ring-2 high-contrast:ring-offset-1 high-contrast:ring-current"
              style={{ backgroundColor: style.stroke }}
              title={`${relationshipTypeName} relationship`}
              aria-label={`${relationshipTypeName} relationship`}
              role="img"
              data-testid={`parent-child-edge-label-${relationshipType}`}
            >
              {style.label}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const ParentChildEdge = memo(ParentChildEdgeComponent);
