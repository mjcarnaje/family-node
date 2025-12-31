import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { cn } from "~/lib/utils";
import type { Gender } from "~/db/schema";

interface FamilyMemberAvatarProps {
  firstName: string;
  lastName: string;
  profileImageUrl?: string | null;
  gender?: Gender | null;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showRing?: boolean;
}

const sizeMap = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
};

const fallbackTextSizeMap = {
  sm: "text-xs font-medium",
  md: "text-sm font-semibold",
  lg: "text-base font-semibold",
  xl: "text-lg font-bold",
};

/**
 * Get gender-based gradient styles for avatar fallback
 */
function getGenderGradient(gender: Gender | null | undefined): string {
  switch (gender) {
    case "male":
      return "from-blue-500 to-blue-600";
    case "female":
      return "from-pink-500 to-pink-600";
    default:
      return "from-purple-500 to-purple-600";
  }
}

/**
 * Get initials from first and last name for avatar fallback display.
 * @param firstName - The first name
 * @param lastName - The last name
 * @returns Up to 2 uppercase initials
 */
export function getFamilyMemberInitials(firstName: string, lastName: string): string {
  const firstInitial = firstName?.charAt(0) || "";
  const lastInitial = lastName?.charAt(0) || "";
  return `${firstInitial}${lastInitial}`.toUpperCase() || "?";
}

/**
 * FamilyMemberAvatar - A reusable avatar component for family members
 *
 * Features:
 * - Displays profile image if available
 * - Falls back to initials from first/last name
 * - Gender-based gradient colors for fallback
 * - Configurable sizes (sm, md, lg, xl)
 * - Optional ring styling for emphasis
 */
export function FamilyMemberAvatar({
  firstName,
  lastName,
  profileImageUrl,
  gender,
  className = "",
  size = "md",
  showRing = false,
}: FamilyMemberAvatarProps) {
  const initials = getFamilyMemberInitials(firstName, lastName);
  const fullName = `${firstName} ${lastName}`.trim();
  const gradientClass = getGenderGradient(gender);

  return (
    <Avatar
      className={cn(
        sizeMap[size],
        showRing && "ring-2 ring-white dark:ring-slate-700 shadow-md",
        className
      )}
      data-testid="family-member-avatar"
    >
      {profileImageUrl ? (
        <AvatarImage
          src={profileImageUrl}
          alt={fullName}
          className="object-cover"
          data-testid="family-member-avatar-image"
        />
      ) : null}
      <AvatarFallback
        className={cn(
          "bg-gradient-to-br text-white",
          gradientClass,
          fallbackTextSizeMap[size]
        )}
        data-testid="family-member-avatar-fallback"
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
