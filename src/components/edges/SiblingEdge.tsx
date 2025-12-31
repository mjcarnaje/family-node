import { memo } from "react";
import {
  EdgeLabelRenderer,
  type Position,
} from "@xyflow/react";
import { Users } from "lucide-react";

export interface SiblingEdgeData {
  siblingType: "full" | "half" | "step";
  [key: string]: unknown;
}

interface SiblingEdgeProps {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: Position;
  targetPosition: Position;
  data?: SiblingEdgeData;
  selected?: boolean;
  markerEnd?: string;
}

/**
 * Custom edge component for sibling relationships
 * Uses a curved bezier path that arcs above the nodes to avoid crossing parent-child lines
 */
function SiblingEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  selected,
}: SiblingEdgeProps) {
  const siblingType = data?.siblingType || "full";

  // Calculate a bezier path that curves above the nodes
  // We want the line to arc upward to visually indicate horizontal sibling relationship
  const midX = (sourceX + targetX) / 2;
  const distance = Math.abs(targetX - sourceX);

  // Create a custom path that curves upward
  // The curvature is proportional to the distance between siblings
  const curveHeight = Math.min(distance * 0.3, 60); // Cap the curve height

  // Custom curved path that goes above
  const customPath = `
    M ${sourceX} ${sourceY - 15}
    Q ${midX} ${Math.min(sourceY, targetY) - curveHeight - 30} ${targetX} ${targetY - 15}
  `;

  // Color and style based on sibling type
  const getEdgeStyle = () => {
    switch (siblingType) {
      case "full":
        return {
          stroke: "#22c55e", // green-500
          strokeWidth: 2,
          strokeDasharray: undefined as string | undefined,
          label: "Siblings",
        };
      case "half":
        return {
          stroke: "#84cc16", // lime-500
          strokeWidth: 2,
          strokeDasharray: "6,3",
          label: "Half-siblings",
        };
      case "step":
        return {
          stroke: "#14b8a6", // teal-500
          strokeWidth: 2,
          strokeDasharray: "4,4",
          label: "Step-siblings",
        };
      default:
        return {
          stroke: "#22c55e",
          strokeWidth: 2,
          strokeDasharray: undefined as string | undefined,
          label: "Siblings",
        };
    }
  };

  const style = getEdgeStyle();

  // Get full sibling type name for screen readers
  const siblingTypeName = siblingType === "full"
    ? "Full siblings"
    : siblingType === "half"
    ? "Half-siblings"
    : siblingType === "step"
    ? "Step-siblings"
    : "Siblings";

  return (
    <>
      {/* Subtle background glow for sibling connection */}
      <path
        d={customPath}
        fill="none"
        stroke={style.stroke}
        strokeWidth={style.strokeWidth + 4}
        strokeOpacity={0.15}
        strokeLinecap="round"
        aria-hidden="true"
      />

      {/* Main edge path - with accessibility */}
      <g role="img" aria-label={siblingTypeName}>
        <path
          d={customPath}
          fill="none"
          stroke={style.stroke}
          strokeWidth={selected ? style.strokeWidth + 1 : style.strokeWidth}
          strokeDasharray={style.strokeDasharray}
          strokeLinecap="round"
          style={{
            filter: selected ? `drop-shadow(0 0 4px ${style.stroke})` : undefined,
            transition: "stroke-width 0.2s, filter 0.2s",
          }}
          data-testid={`sibling-edge-${siblingType}`}
        />
      </g>

      {/* Sibling indicator in the middle */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${midX}px, ${Math.min(sourceY, targetY) - curveHeight - 30}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
        >
          <div
            className="flex items-center justify-center w-6 h-6 rounded-full bg-white dark:bg-slate-800 shadow-md border-2 high-contrast:border-4"
            style={{ borderColor: style.stroke }}
            title={siblingTypeName}
            aria-label={siblingTypeName}
            role="img"
            data-testid={`sibling-edge-label-${siblingType}`}
          >
            <Users
              className="w-3 h-3"
              style={{ color: style.stroke }}
              aria-hidden="true"
            />
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const SiblingEdge = memo(SiblingEdgeComponent);
