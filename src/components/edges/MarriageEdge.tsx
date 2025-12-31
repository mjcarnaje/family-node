import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  type Position,
} from "@xyflow/react";
import { Heart, HeartCrack } from "lucide-react";
import type { MarriageEdgeData } from "~/hooks/useTreeVisualization";

interface MarriageEdgeProps {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: Position;
  targetPosition: Position;
  data?: MarriageEdgeData;
  selected?: boolean;
  markerEnd?: string;
}

/**
 * Custom edge component for marriage/spouse relationships
 * Uses a straight path with heart decoration and status-based styling
 */
function MarriageEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  selected,
  markerEnd,
}: MarriageEdgeProps) {
  const marriage = data?.marriage;
  const status = marriage?.status || "married";

  // Get path for the edge
  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  // Color and style based on marriage status - simplified for cleaner look
  const getEdgeStyle = () => {
    switch (status) {
      case "married":
        return {
          stroke: "#f472b6", // pink-400 - lighter for cleaner look
          strokeWidth: 1.5,
          strokeDasharray: undefined as string | undefined,
          iconColor: "#f472b6",
          showBrokenHeart: false,
        };
      case "divorced":
        return {
          stroke: "#9ca3af", // gray-400
          strokeWidth: 1.5,
          strokeDasharray: "5,3",
          iconColor: "#9ca3af",
          showBrokenHeart: true,
        };
      case "widowed":
        return {
          stroke: "#9ca3af", // gray-400
          strokeWidth: 1.5,
          strokeDasharray: "2,2",
          iconColor: "#9ca3af",
          showBrokenHeart: false,
        };
      case "separated":
        return {
          stroke: "#fbbf24", // amber-400
          strokeWidth: 1.5,
          strokeDasharray: "6,3",
          iconColor: "#fbbf24",
          showBrokenHeart: true,
        };
      case "annulled":
        return {
          stroke: "#f87171", // red-400
          strokeWidth: 1.5,
          strokeDasharray: "4,3",
          iconColor: "#f87171",
          showBrokenHeart: true,
        };
      default:
        return {
          stroke: "#f472b6",
          strokeWidth: 1.5,
          strokeDasharray: undefined as string | undefined,
          iconColor: "#f472b6",
          showBrokenHeart: false,
        };
    }
  };

  const style = getEdgeStyle();

  // Get status label for screen readers
  const statusLabel = status === "married"
    ? "Married"
    : status === "divorced"
    ? "Divorced"
    : status === "widowed"
    ? "Widowed"
    : status === "separated"
    ? "Separated"
    : status === "annulled"
    ? "Annulled"
    : "Marriage";

  const marriageYear = marriage?.marriageDate ? new Date(marriage.marriageDate).getFullYear() : null;
  const ariaLabel = marriageYear
    ? `${statusLabel} since ${marriageYear}`
    : statusLabel;

  return (
    <>
      {/* Main edge path - simplified, no double-line effect */}
      <g role="img" aria-label={ariaLabel}>
        <BaseEdge
          id={id}
          path={edgePath}
          markerEnd={markerEnd}
          style={{
            stroke: style.stroke,
            strokeWidth: selected ? style.strokeWidth + 0.5 : style.strokeWidth,
            strokeDasharray: style.strokeDasharray,
            strokeLinecap: "round",
            opacity: 0.8,
            transition: "stroke-width 0.2s, opacity 0.2s",
          }}
        />
      </g>

      {/* Heart icon in the middle - smaller and subtler */}
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
            className="flex items-center justify-center w-5 h-5 rounded-full bg-white dark:bg-slate-800 shadow-sm border high-contrast:border-2"
            style={{ borderColor: style.stroke }}
            title={ariaLabel}
            aria-label={ariaLabel}
            role="img"
            data-testid={`marriage-edge-label-${status}`}
          >
            {style.showBrokenHeart ? (
              <HeartCrack
                className="w-2.5 h-2.5"
                style={{ color: style.iconColor }}
                aria-hidden="true"
              />
            ) : (
              <Heart
                className="w-2.5 h-2.5 fill-current"
                style={{ color: style.iconColor }}
                aria-hidden="true"
              />
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const MarriageEdge = memo(MarriageEdgeComponent);
