/**
 * SimplifiedFamilyMemberNode Component
 *
 * A lightweight version of FamilyMemberNode for rendering when zoomed out.
 * This component reduces DOM complexity and improves performance for large trees.
 *
 * Features:
 * - Minimal DOM elements
 * - No hover effects or animations
 * - Simple color-coded gender indicator
 * - Optimized for rendering hundreds of nodes
 */

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { cn } from "~/lib/utils";
import type { FamilyMemberNodeData } from "~/hooks/useTreeVisualization";

interface SimplifiedFamilyMemberNodeProps {
  data: FamilyMemberNodeData;
  selected?: boolean;
  id?: string;
}

// Get gender-based background color
function getGenderColor(gender: string | null): string {
  switch (gender) {
    case "male":
      return "bg-blue-400";
    case "female":
      return "bg-pink-400";
    default:
      return "bg-purple-400";
  }
}

// Get gender-based border color
function getGenderBorderColor(gender: string | null): string {
  switch (gender) {
    case "male":
      return "border-blue-500";
    case "female":
      return "border-pink-500";
    default:
      return "border-purple-500";
  }
}

function SimplifiedFamilyMemberNodeComponent({
  data,
  selected,
  id,
}: SimplifiedFamilyMemberNodeProps) {
  const { member, isFocusMember } = data;
  const bgColor = getGenderColor(member.gender);
  const borderColor = getGenderBorderColor(member.gender);
  const isDeceased = !!member.deathDate;

  // Simple initials for the node
  const initials = `${member.firstName.charAt(0)}${member.lastName.charAt(0)}`;

  return (
    <div
      className={cn(
        "w-[180px] h-[60px] rounded-lg border-2 flex items-center justify-center",
        "transition-shadow duration-100",
        isFocusMember
          ? "border-green-500 bg-green-100 dark:bg-green-900/50"
          : borderColor,
        isFocusMember ? "" : "bg-white dark:bg-slate-800",
        selected && "ring-2 ring-primary ring-offset-1",
        isDeceased && "opacity-70"
      )}
      data-testid="simplified-family-member-node"
      data-member-id={id}
    >
      {/* Minimal handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-slate-400 !border !border-white"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-slate-400 !border !border-white"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="spouse-left"
        className="!w-1.5 !h-1.5 !bg-pink-400 !border !border-white"
      />
      <Handle
        type="target"
        position={Position.Right}
        id="spouse-right"
        className="!w-1.5 !h-1.5 !bg-pink-400 !border !border-white"
      />

      {/* Compact content */}
      <div className="flex items-center gap-2 px-3 overflow-hidden">
        {/* Gender indicator dot */}
        <div
          className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0",
            bgColor
          )}
        >
          {initials}
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
            {member.firstName} {member.lastName}
          </p>
        </div>

        {/* Focus indicator */}
        {isFocusMember && (
          <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
        )}
      </div>
    </div>
  );
}

export const SimplifiedFamilyMemberNode = memo(SimplifiedFamilyMemberNodeComponent);

/**
 * ClusteredNode Component
 *
 * An even more minimal node for very zoomed out views.
 * Shows just a colored dot representing a family member.
 */

interface ClusteredNodeProps {
  data: FamilyMemberNodeData;
  selected?: boolean;
  id?: string;
}

function ClusteredNodeComponent({
  data,
  selected,
  id,
}: ClusteredNodeProps) {
  const { member, isFocusMember } = data;
  const bgColor = getGenderColor(member.gender);

  return (
    <div
      className={cn(
        "w-8 h-8 rounded-full border-2 transition-transform",
        isFocusMember
          ? "border-green-500 bg-green-400"
          : `border-white dark:border-slate-700 ${bgColor}`,
        selected && "ring-2 ring-primary scale-125"
      )}
      data-testid="clustered-node"
      data-member-id={id}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-1 !h-1 !bg-slate-400 !border-0 !opacity-50"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-1 !h-1 !bg-slate-400 !border-0 !opacity-50"
      />
    </div>
  );
}

export const ClusteredNode = memo(ClusteredNodeComponent);
