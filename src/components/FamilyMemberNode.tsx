import { memo, useRef, useEffect, useCallback } from "react";
import { Handle, Position } from "@xyflow/react";
import { User, Heart, MapPin, Cake, Focus } from "lucide-react";
import { FamilyMemberAvatar } from "~/components/FamilyMemberAvatar";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import type { FamilyMemberNodeData } from "~/hooks/useTreeVisualization";

// Custom props interface for the node component (avoid strict NodeProps typing issues)
interface FamilyMemberNodeProps {
  data: FamilyMemberNodeData;
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
function calculateAge(
  birthDate: string | null,
  deathDate: string | null
): number | null {
  if (!birthDate) return null;
  try {
    const birth = new Date(birthDate);
    const endDate = deathDate ? new Date(deathDate) : new Date();
    let age = endDate.getFullYear() - birth.getFullYear();
    const monthDiff = endDate.getMonth() - birth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && endDate.getDate() < birth.getDate())
    ) {
      age--;
    }
    return age >= 0 ? age : null;
  } catch {
    return null;
  }
}

// Get full display name
function getFullName(
  firstName: string,
  middleName: string | null,
  lastName: string
): string {
  if (middleName) {
    return `${firstName} ${middleName} ${lastName}`;
  }
  return `${firstName} ${lastName}`;
}

// Get gender-based styling
function getGenderStyles(gender: string | null) {
  switch (gender) {
    case "male":
      return {
        border: "border-blue-400 high-contrast:border-blue-600",
        bg: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 high-contrast:from-blue-100 high-contrast:to-blue-200",
        avatar: "from-blue-500 to-blue-600",
        icon: "text-blue-500 high-contrast:text-blue-700",
      };
    case "female":
      return {
        border: "border-pink-400 high-contrast:border-pink-600",
        bg: "bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-950/50 dark:to-pink-900/30 high-contrast:from-pink-100 high-contrast:to-pink-200",
        avatar: "from-pink-500 to-pink-600",
        icon: "text-pink-500 high-contrast:text-pink-700",
      };
    default:
      return {
        border: "border-purple-400 high-contrast:border-purple-600",
        bg: "bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/30 high-contrast:from-purple-100 high-contrast:to-purple-200",
        avatar: "from-purple-500 to-purple-600",
        icon: "text-purple-500 high-contrast:text-purple-700",
      };
  }
}

// Get gender symbol for accessibility (text alternative to color)
function getGenderSymbol(gender: string | null): string {
  switch (gender) {
    case "male":
      return "♂";
    case "female":
      return "♀";
    default:
      return "⚥";
  }
}

// Get gender label for screen readers
function getGenderLabel(gender: string | null): string {
  switch (gender) {
    case "male":
      return "Male";
    case "female":
      return "Female";
    default:
      return "Other/Unknown gender";
  }
}

function FamilyMemberNodeComponent({
  data,
  selected,
  id,
}: FamilyMemberNodeProps) {
  const { member, isSpouse, isFocusMember } = data;
  const nodeRef = useRef<HTMLDivElement>(null);
  const styles = getGenderStyles(member.gender);
  const fullName = getFullName(
    member.firstName,
    member.middleName,
    member.lastName
  );
  const shortName = `${member.firstName} ${member.lastName}`;
  const birthDate = formatDate(member.birthDate);
  const deathDate = formatDate(member.deathDate);
  const isDeceased = !!member.deathDate;
  const age = calculateAge(member.birthDate, member.deathDate);
  const genderSymbol = getGenderSymbol(member.gender);
  const genderLabel = getGenderLabel(member.gender);

  // Build comprehensive aria-label for screen readers
  const ariaLabelParts = [
    fullName,
    genderLabel,
    age !== null ? `${age} years old` : null,
    isDeceased ? "deceased" : null,
    isFocusMember ? "currently focused member" : null,
    isSpouse ? "spouse" : null,
    member.birthPlace ? `born in ${member.birthPlace}` : null,
  ].filter(Boolean);

  const ariaLabel = ariaLabelParts.join(", ");

  // Handle keyboard interaction on node
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      // Trigger click behavior - node will be selected
      nodeRef.current?.click();
    }
  }, []);

  // Focus node when selected for keyboard navigation
  useEffect(() => {
    if (selected && nodeRef.current) {
      nodeRef.current.focus();
    }
  }, [selected]);

  // Full detailed view (always shown - no auto-shrink on zoom)
  return (
    <div
      ref={nodeRef}
      className={cn(
        "group relative rounded-xl border-2 shadow-lg transition-all duration-200",
        // Fixed width for consistent card sizes
        "w-[180px] md:w-[220px]",
        // Fixed height for consistent layout
        "min-h-[200px] md:min-h-[220px]",
        "hover:shadow-xl hover:scale-[1.02]",
        // Touch-friendly tap target
        "touch-action-manipulation",
        // Enhanced focus styles for keyboard navigation (WCAG 2.4.7)
        "focus:outline-none focus:ring-4 focus:ring-primary/50 focus:ring-offset-2",
        "focus-visible:ring-4 focus-visible:ring-primary focus-visible:ring-offset-2",
        isFocusMember
          ? "border-green-500 ring-2 ring-green-500/30 high-contrast:border-green-700 high-contrast:ring-green-700/50"
          : styles.border,
        isFocusMember
          ? "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30"
          : styles.bg,
        selected && !isFocusMember && "ring-2 ring-primary ring-offset-2",
        isDeceased &&
          "opacity-80 grayscale-[20%] high-contrast:opacity-100 high-contrast:grayscale-0"
      )}
      data-testid="family-member-node"
      data-member-id={id}
      // ARIA attributes for accessibility
      role="treeitem"
      aria-label={ariaLabel}
      aria-selected={selected}
      tabIndex={selected || isFocusMember ? 0 : -1}
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

      {/* Focus member indicator - with accessible label */}
      {isFocusMember && (
        <div
          className="absolute -top-2 -right-2 bg-green-500 high-contrast:bg-green-700 text-white rounded-full p-1 shadow-md z-10"
          data-testid="focus-member-indicator"
          role="img"
          aria-label="Focus member"
        >
          <Focus className="h-3 w-3" aria-hidden="true" />
          {/* High contrast mode: show text label */}
          <span className="sr-only high-contrast:not-sr-only high-contrast:absolute high-contrast:-bottom-5 high-contrast:left-1/2 high-contrast:-translate-x-1/2 high-contrast:text-[10px] high-contrast:font-bold high-contrast:text-green-700 high-contrast:whitespace-nowrap">
            Focus
          </span>
        </div>
      )}

      {/* Spouse indicator - with accessible label */}
      {isSpouse && !isFocusMember && (
        <div
          className="absolute -top-2 -right-2 bg-pink-500 high-contrast:bg-pink-700 text-white rounded-full p-1 shadow-md z-10"
          data-testid="spouse-indicator"
          role="img"
          aria-label="Spouse"
        >
          <Heart className="h-3 w-3 fill-current" aria-hidden="true" />
        </div>
      )}

      {/* Deceased indicator - with accessible label */}
      {isDeceased && (
        <div
          className="absolute -top-2 -left-2 bg-slate-600 high-contrast:bg-slate-800 text-white rounded-full p-1 shadow-md text-xs font-medium z-10"
          data-testid="deceased-indicator"
          role="img"
          aria-label="Deceased"
        >
          <span className="px-1" aria-hidden="true">
            ✝
          </span>
          {/* High contrast mode: show text label */}
          <span className="sr-only high-contrast:not-sr-only high-contrast:absolute high-contrast:-bottom-5 high-contrast:left-1/2 high-contrast:-translate-x-1/2 high-contrast:text-[10px] high-contrast:font-bold high-contrast:text-slate-700 high-contrast:whitespace-nowrap">
            Deceased
          </span>
        </div>
      )}

      {/* Content with responsive padding */}
      <div className="p-3 md:p-4 flex flex-col items-center gap-2 md:gap-3">
        {/* Avatar with profile image - responsive size */}
        <div className="relative">
          <FamilyMemberAvatar
            firstName={member.firstName}
            lastName={member.lastName}
            profileImageUrl={member.profileImageUrl}
            gender={member.gender}
            size="lg"
            showRing
            className={cn(
              "transition-transform w-20 h-20 md:w-24 md:h-24",
              "group-hover:ring-4"
            )}
          />

          {/* Age badge overlay */}
          {age !== null && (
            <Badge
              variant="secondary"
              className={cn(
                "absolute -bottom-1 -right-1 h-6 md:h-7 min-w-6 md:min-w-7 px-1.5 text-xs md:text-sm font-bold",
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

        {/* Name section - responsive text */}
        <div className="text-center w-full" data-testid="member-name-section">
          <h3
            className="font-semibold text-xs md:text-sm text-slate-900 dark:text-slate-100 truncate"
            title={fullName}
            data-testid="member-full-name"
          >
            {member.middleName ? shortName : fullName}
          </h3>
          {member.middleName && (
            <p
              className="text-[8px] md:text-[10px] text-slate-400 dark:text-slate-500 truncate"
              title={`Middle name: ${member.middleName}`}
            >
              {member.middleName}
            </p>
          )}
          {member.nickname && (
            <p
              className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 truncate italic"
              data-testid="member-nickname"
            >
              "{member.nickname}"
            </p>
          )}
        </div>

        {/* Details section - hidden on very small views, responsive text */}
        <div
          className="w-full space-y-1 md:space-y-1.5 text-[10px] md:text-xs text-slate-600 dark:text-slate-400"
          data-testid="member-details"
        >
          {/* Birth info with age */}
          {birthDate && (
            <div
              className="flex items-center gap-1 md:gap-1.5"
              data-testid="member-birth-info"
            >
              <Cake
                className={cn(
                  "h-2.5 w-2.5 md:h-3 md:w-3 shrink-0",
                  styles.icon
                )}
              />
              <span className="truncate">
                {birthDate}
                {age !== null && !isDeceased && (
                  <span className="text-slate-400 ml-1">({age}y)</span>
                )}
              </span>
            </div>
          )}

          {/* Birth place - hidden on mobile */}

          <div
            className="hidden md:flex items-center gap-1.5"
            data-testid="member-birth-place"
          >
            <MapPin className={cn("h-3 w-3 shrink-0", styles.icon)} />
            <span className="truncate" title={member.birthPlace || ""}>
              {member.birthPlace || "Unknown"}
            </span>
          </div>

          {/* Gender indicator - with symbol and text for accessibility */}
          <div
            className="flex items-center gap-1 md:gap-1.5"
            data-testid="member-gender"
          >
            <User
              className={cn("h-2.5 w-2.5 md:h-3 md:w-3 shrink-0", styles.icon)}
              aria-hidden="true"
            />
            <span className="capitalize" aria-label={genderLabel}>
              <span
                className="high-contrast:inline hidden mr-1"
                aria-hidden="true"
              >
                {genderSymbol}
              </span>
              {member.gender || "Unknown"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export const FamilyMemberNode = memo(FamilyMemberNodeComponent);
