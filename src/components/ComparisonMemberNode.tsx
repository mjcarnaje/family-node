import { memo, useRef, useEffect, useCallback } from "react";
import { Handle, Position } from "@xyflow/react";
import { User, Calendar, MapPin, Cake, Plus, Minus, Edit } from "lucide-react";
import { FamilyMemberAvatar } from "~/components/FamilyMemberAvatar";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import type { ComparisonMemberNodeData, ComparisonStatus } from "~/hooks/useTreeComparison";

// Custom props interface for the node component
interface ComparisonMemberNodeProps {
  data: ComparisonMemberNodeData;
  selected?: boolean;
  id?: string;
}

// Format date for display
function formatDate(dateString: string | null): string | null {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

// Calculate age from birth date (and optionally death date)
function calculateAge(birthDate: string | null, deathDate: string | null): number | null {
  if (!birthDate) return null;
  try {
    const birth = new Date(birthDate);
    const endDate = deathDate ? new Date(deathDate) : new Date();
    let age = endDate.getFullYear() - birth.getFullYear();
    const monthDiff = endDate.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && endDate.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  } catch {
    return null;
  }
}

// Get full display name
function getFullName(firstName: string, middleName: string | null, lastName: string): string {
  if (middleName) {
    return `${firstName} ${middleName} ${lastName}`;
  }
  return `${firstName} ${lastName}`;
}

// Get comparison status styling
function getComparisonStatusStyles(status: ComparisonStatus) {
  switch (status) {
    case "only-tree1":
      return {
        border: "border-red-400 border-2",
        bg: "bg-red-50 dark:bg-red-950/30",
        indicator: "bg-red-500",
        icon: Minus,
        label: "Only in Tree 1",
      };
    case "only-tree2":
      return {
        border: "border-green-400 border-2",
        bg: "bg-green-50 dark:bg-green-950/30",
        indicator: "bg-green-500",
        icon: Plus,
        label: "Only in Tree 2",
      };
    case "modified":
      return {
        border: "border-yellow-400 border-2",
        bg: "bg-yellow-50 dark:bg-yellow-950/30",
        indicator: "bg-yellow-500",
        icon: Edit,
        label: "Modified",
      };
    case "unchanged":
    case "both":
    default:
      return {
        border: "border-slate-300 dark:border-slate-600",
        bg: "bg-white dark:bg-slate-800",
        indicator: "bg-slate-400",
        icon: null,
        label: "Unchanged",
      };
  }
}

// Get gender-based styling (softer version for comparison)
function getGenderAccent(gender: string | null) {
  switch (gender) {
    case "male":
      return "text-blue-500";
    case "female":
      return "text-pink-500";
    default:
      return "text-purple-500";
  }
}

function ComparisonMemberNodeComponent({
  data,
  selected,
  id,
}: ComparisonMemberNodeProps) {
  const { member, comparisonStatus, differences, isSpouse } = data;
  const nodeRef = useRef<HTMLDivElement>(null);
  const statusStyles = getComparisonStatusStyles(comparisonStatus);
  const genderAccent = getGenderAccent(member.gender);
  const fullName = getFullName(member.firstName, member.middleName, member.lastName);
  const shortName = `${member.firstName} ${member.lastName}`;
  const birthDate = formatDate(member.birthDate);
  const deathDate = formatDate(member.deathDate);
  const isDeceased = !!member.deathDate;
  const age = calculateAge(member.birthDate, member.deathDate);

  // Handle keyboard interaction on node
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      nodeRef.current?.click();
    }
  }, []);

  // Focus node when selected for keyboard navigation
  useEffect(() => {
    if (selected && nodeRef.current) {
      nodeRef.current.focus();
    }
  }, [selected]);

  const StatusIcon = statusStyles.icon;

  return (
    <div
      ref={nodeRef}
      className={cn(
        "group relative min-w-[180px] max-w-[220px] rounded-xl shadow-lg transition-all duration-200",
        "hover:shadow-xl hover:scale-[1.02]",
        "focus:outline-none focus:ring-4 focus:ring-primary/50 focus:ring-offset-2",
        statusStyles.border,
        statusStyles.bg,
        selected && "ring-2 ring-primary ring-offset-2",
        isDeceased && "opacity-80"
      )}
      data-testid="comparison-member-node"
      data-member-id={id}
      data-comparison-status={comparisonStatus}
      role="treeitem"
      aria-label={`${fullName}, ${statusStyles.label}`}
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      onKeyDown={handleKeyDown}
    >
      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white dark:!border-slate-800 transition-colors"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white dark:!border-slate-800 transition-colors"
      />

      {/* Left handle for spouse connection */}
      <Handle
        type="source"
        position={Position.Left}
        id="spouse-left"
        className="!w-2 !h-2 !bg-pink-400 !border-2 !border-white dark:!border-slate-800"
      />

      {/* Right handle for spouse connection */}
      <Handle
        type="target"
        position={Position.Right}
        id="spouse-right"
        className="!w-2 !h-2 !bg-pink-400 !border-2 !border-white dark:!border-slate-800"
      />

      {/* Comparison status indicator */}
      {StatusIcon && (
        <div
          className={cn(
            "absolute -top-2 -right-2 text-white rounded-full p-1 shadow-md z-10",
            statusStyles.indicator
          )}
          data-testid="comparison-status-indicator"
          role="img"
          aria-label={statusStyles.label}
        >
          <StatusIcon className="h-3 w-3" aria-hidden="true" />
        </div>
      )}

      {/* Deceased indicator */}
      {isDeceased && (
        <div
          className="absolute -top-2 -left-2 bg-slate-600 text-white rounded-full p-1 shadow-md text-xs font-medium z-10"
          data-testid="deceased-indicator"
          role="img"
          aria-label="Deceased"
        >
          <span className="px-1" aria-hidden="true">✝</span>
        </div>
      )}

      <div className="p-4 flex flex-col items-center gap-3">
        {/* Avatar with profile image */}
        <div className="relative">
          <FamilyMemberAvatar
            firstName={member.firstName}
            lastName={member.lastName}
            profileImageUrl={member.profileImageUrl}
            gender={member.gender}
            size="xl"
            showRing
            className="transition-transform group-hover:ring-4"
          />

          {/* Age badge overlay */}
          {age !== null && (
            <Badge
              variant="secondary"
              className={cn(
                "absolute -bottom-1 -right-1 h-5 min-w-5 px-1 text-[10px] font-semibold",
                "flex items-center justify-center shadow-sm",
                isDeceased
                  ? "bg-slate-500 text-white"
                  : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200"
              )}
              data-testid="member-age-badge"
            >
              {age}
            </Badge>
          )}
        </div>

        {/* Name section */}
        <div className="text-center w-full" data-testid="member-name-section">
          <h3
            className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate"
            title={fullName}
            data-testid="member-full-name"
          >
            {member.middleName ? shortName : fullName}
          </h3>
          {member.middleName && (
            <p
              className="text-[10px] text-slate-400 dark:text-slate-500 truncate"
              title={`Middle name: ${member.middleName}`}
            >
              {member.middleName}
            </p>
          )}
          {member.nickname && (
            <p
              className="text-xs text-slate-500 dark:text-slate-400 truncate italic"
              data-testid="member-nickname"
            >
              "{member.nickname}"
            </p>
          )}
        </div>

        {/* Details section */}
        <div className="w-full space-y-1.5 text-xs text-slate-600 dark:text-slate-400" data-testid="member-details">
          {/* Birth info with age */}
          {birthDate && (
            <div className="flex items-center gap-1.5" data-testid="member-birth-info">
              <Cake className={cn("h-3 w-3 shrink-0", genderAccent)} />
              <span className="truncate">
                {birthDate}
                {age !== null && !isDeceased && (
                  <span className="text-slate-400 ml-1">({age}y)</span>
                )}
              </span>
            </div>
          )}

          {/* Death info */}
          {deathDate && (
            <div className="flex items-center gap-1.5 text-slate-500" data-testid="member-death-info">
              <Calendar className="h-3 w-3 shrink-0" />
              <span className="truncate">
                d. {deathDate}
                {age !== null && (
                  <span className="text-slate-400 ml-1">(aged {age})</span>
                )}
              </span>
            </div>
          )}

          {/* Birth place */}
          {member.birthPlace && (
            <div className="flex items-center gap-1.5" data-testid="member-birth-place">
              <MapPin className={cn("h-3 w-3 shrink-0", genderAccent)} />
              <span className="truncate" title={member.birthPlace}>{member.birthPlace}</span>
            </div>
          )}

          {/* Gender indicator */}
          <div className="flex items-center gap-1.5" data-testid="member-gender">
            <User className={cn("h-3 w-3 shrink-0", genderAccent)} aria-hidden="true" />
            <span className="capitalize">{member.gender || "Unknown"}</span>
          </div>
        </div>

        {/* Differences badge (for modified members) */}
        {differences && differences.length > 0 && (
          <div className="w-full" data-testid="member-differences">
            <Badge
              variant="outline"
              className="w-full justify-center text-[10px] text-yellow-700 border-yellow-300 bg-yellow-50 dark:text-yellow-400 dark:border-yellow-700 dark:bg-yellow-950/50"
            >
              Changed: {differences.join(", ")}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}

export const ComparisonMemberNode = memo(ComparisonMemberNodeComponent);
