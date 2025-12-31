"use client";

import { useMemo } from "react";
import {
  User,
  Heart,
  Calendar,
  MapPin,
  Cake,
  Users,
  FileText,
  X,
  Eye,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import type {
  FamilyMember,
  ParentChildRelationship,
  MarriageConnection,
} from "~/db/schema";

interface PublicMemberProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: FamilyMember | null;
  allMembers: FamilyMember[];
  relationships: ParentChildRelationship[];
  marriages: MarriageConnection[];
}

// Get initials from name
function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

// Format date for display
function formatDate(dateString: string | null): string | null {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
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
        border: "border-blue-400",
        bg: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30",
        avatar: "from-blue-500 to-blue-600",
        icon: "text-blue-500",
        badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
      };
    case "female":
      return {
        border: "border-pink-400",
        bg: "bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-950/50 dark:to-pink-900/30",
        avatar: "from-pink-500 to-pink-600",
        icon: "text-pink-500",
        badge: "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300",
      };
    default:
      return {
        border: "border-purple-400",
        bg: "bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/30",
        avatar: "from-purple-500 to-purple-600",
        icon: "text-purple-500",
        badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
      };
  }
}

// Get marriage status badge color
function getMarriageStatusColor(status: string) {
  switch (status) {
    case "married":
      return "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300";
    case "divorced":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300";
    case "widowed":
      return "bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300";
    case "separated":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300";
    case "annulled":
      return "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300";
  }
}

// Get relationship type label
function getRelationshipTypeLabel(type: string) {
  switch (type) {
    case "biological":
      return "Biological";
    case "adopted":
      return "Adopted";
    case "step":
      return "Step";
    case "foster":
      return "Foster";
    default:
      return type;
  }
}

export function PublicMemberProfileModal({
  open,
  onOpenChange,
  member,
  allMembers,
  relationships,
  marriages,
}: PublicMemberProfileModalProps) {
  // Compute derived data for the member
  const memberData = useMemo(() => {
    if (!member) return null;

    const memberMap = new Map<string, FamilyMember>();
    allMembers.forEach((m) => memberMap.set(m.id, m));

    // Find parents (relationships where this member is the child)
    const parentRelations = relationships.filter(
      (rel) => rel.childId === member.id
    );
    const parents = parentRelations
      .map((rel) => ({
        member: memberMap.get(rel.parentId),
        relationshipType: rel.relationshipType,
      }))
      .filter((p) => p.member !== undefined) as {
      member: FamilyMember;
      relationshipType: string;
    }[];

    // Find children (relationships where this member is the parent)
    const childRelations = relationships.filter(
      (rel) => rel.parentId === member.id
    );
    const children = childRelations
      .map((rel) => ({
        member: memberMap.get(rel.childId),
        relationshipType: rel.relationshipType,
      }))
      .filter((c) => c.member !== undefined) as {
      member: FamilyMember;
      relationshipType: string;
    }[];

    // Find spouses (marriages where this member is either spouse)
    const memberMarriages = marriages.filter(
      (m) => m.spouse1Id === member.id || m.spouse2Id === member.id
    );
    const spouses = memberMarriages
      .map((marriage) => {
        const spouseId =
          marriage.spouse1Id === member.id
            ? marriage.spouse2Id
            : marriage.spouse1Id;
        return {
          member: memberMap.get(spouseId),
          marriage,
        };
      })
      .filter((s) => s.member !== undefined) as {
      member: FamilyMember;
      marriage: MarriageConnection;
    }[];

    // Find siblings (other children of the same parents)
    const siblingIds = new Set<string>();
    parentRelations.forEach((parentRel) => {
      relationships.forEach((rel) => {
        if (rel.parentId === parentRel.parentId && rel.childId !== member.id) {
          siblingIds.add(rel.childId);
        }
      });
    });
    const siblings = Array.from(siblingIds)
      .map((id) => memberMap.get(id))
      .filter((m) => m !== undefined) as FamilyMember[];

    return {
      parents,
      children,
      spouses,
      siblings,
    };
  }, [member, allMembers, relationships, marriages]);

  if (!member || !memberData) {
    return null;
  }

  const styles = getGenderStyles(member.gender);
  const fullName = getFullName(
    member.firstName,
    member.middleName,
    member.lastName
  );
  const birthDate = formatDate(member.birthDate);
  const deathDate = formatDate(member.deathDate);
  const isDeceased = !!member.deathDate;
  const age = calculateAge(member.birthDate, member.deathDate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        data-testid="public-member-profile-modal"
      >
        <DialogHeader>
          <DialogTitle className="sr-only">Member Profile</DialogTitle>
          <DialogDescription className="sr-only">
            Public profile information about {fullName}
          </DialogDescription>
        </DialogHeader>

        {/* Read-only notice */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-blue-500" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              View-only mode - This is a public family tree
            </p>
          </div>
        </div>

        {/* Header Section with Avatar and Basic Info */}
        <div
          className={cn(
            "flex flex-col sm:flex-row items-center sm:items-start gap-6 p-6 rounded-xl border-2",
            styles.border,
            styles.bg,
            isDeceased && "opacity-90"
          )}
          data-testid="public-member-profile-header"
        >
          {/* Avatar */}
          <div className="relative">
            <Avatar
              className={cn(
                "h-24 w-24 ring-4 ring-white dark:ring-slate-700 shadow-lg"
              )}
              data-testid="public-member-profile-avatar"
            >
              {member.profileImageUrl ? (
                <AvatarImage
                  src={member.profileImageUrl}
                  alt={fullName}
                  className="object-cover"
                />
              ) : (
                <AvatarFallback
                  className={cn(
                    "bg-gradient-to-br text-white font-bold text-2xl",
                    styles.avatar
                  )}
                >
                  {getInitials(member.firstName, member.lastName)}
                </AvatarFallback>
              )}
            </Avatar>

            {/* Age badge */}
            {age !== null && (
              <Badge
                variant="secondary"
                className={cn(
                  "absolute -bottom-2 -right-2 h-7 min-w-7 px-2 text-sm font-semibold",
                  "flex items-center justify-center shadow-md",
                  isDeceased
                    ? "bg-slate-500 text-white"
                    : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200"
                )}
                data-testid="public-member-profile-age"
              >
                {age}
              </Badge>
            )}
          </div>

          {/* Basic Info */}
          <div className="flex-1 text-center sm:text-left">
            <h2
              className="text-2xl font-bold text-slate-900 dark:text-slate-100"
              data-testid="public-member-profile-name"
            >
              {fullName}
            </h2>

            {member.nickname && (
              <p
                className="text-lg text-slate-500 dark:text-slate-400 italic"
                data-testid="public-member-profile-nickname"
              >
                "{member.nickname}"
              </p>
            )}

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
              {/* Gender Badge */}
              <Badge className={cn("capitalize", styles.badge)}>
                <User className="h-3 w-3 mr-1" />
                {member.gender || "Unknown"}
              </Badge>

              {/* Deceased Badge */}
              {isDeceased && (
                <Badge
                  variant="secondary"
                  className="bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                  data-testid="public-member-profile-deceased"
                >
                  <span className="mr-1">✝</span>
                  Deceased
                  {age !== null && ` (aged ${age})`}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Details Section */}
        <div className="grid gap-6 mt-4">
          {/* Dates and Places */}
          <div className="space-y-3" data-testid="public-member-profile-dates">
            {birthDate && (
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex items-center justify-center h-10 w-10 rounded-lg",
                    styles.bg
                  )}
                >
                  <Cake className={cn("h-5 w-5", styles.icon)} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Born
                  </p>
                  <p className="text-base text-slate-900 dark:text-slate-100">
                    {birthDate}
                  </p>
                  {member.birthPlace && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {member.birthPlace}
                    </p>
                  )}
                </div>
              </div>
            )}

            {deathDate && (
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800">
                  <Calendar className="h-5 w-5 text-slate-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Died
                  </p>
                  <p className="text-base text-slate-900 dark:text-slate-100">
                    {deathDate}
                  </p>
                  {member.deathPlace && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {member.deathPlace}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bio Section */}
          {member.bio && (
            <div className="space-y-2" data-testid="public-member-profile-bio">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  About
                </h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                {member.bio}
              </p>
            </div>
          )}

          {/* Relationships Section */}
          <div
            className="space-y-4"
            data-testid="public-member-profile-relationships"
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Family Relationships
              </h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Parents */}
              {memberData.parents.length > 0 && (
                <div
                  className="space-y-2"
                  data-testid="public-member-profile-parents"
                >
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Parents ({memberData.parents.length})
                  </p>
                  <div className="space-y-2">
                    {memberData.parents.map(
                      ({ member: parent, relationshipType }) => (
                        <div
                          key={parent.id}
                          className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                        >
                          <Avatar className="h-8 w-8">
                            {parent.profileImageUrl ? (
                              <AvatarImage
                                src={parent.profileImageUrl}
                                alt={parent.firstName}
                              />
                            ) : (
                              <AvatarFallback
                                className={cn(
                                  "bg-gradient-to-br text-white text-xs",
                                  getGenderStyles(parent.gender).avatar
                                )}
                              >
                                {getInitials(parent.firstName, parent.lastName)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                              {parent.firstName} {parent.lastName}
                            </p>
                            {relationshipType !== "biological" && (
                              <p className="text-xs text-slate-500">
                                {getRelationshipTypeLabel(relationshipType)}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Spouses */}
              {memberData.spouses.length > 0 && (
                <div
                  className="space-y-2"
                  data-testid="public-member-profile-spouses"
                >
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Spouse(s) ({memberData.spouses.length})
                  </p>
                  <div className="space-y-2">
                    {memberData.spouses.map(({ member: spouse, marriage }) => (
                      <div
                        key={spouse.id}
                        className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                      >
                        <Avatar className="h-8 w-8">
                          {spouse.profileImageUrl ? (
                            <AvatarImage
                              src={spouse.profileImageUrl}
                              alt={spouse.firstName}
                            />
                          ) : (
                            <AvatarFallback
                              className={cn(
                                "bg-gradient-to-br text-white text-xs",
                                getGenderStyles(spouse.gender).avatar
                              )}
                            >
                              {getInitials(spouse.firstName, spouse.lastName)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {spouse.firstName} {spouse.lastName}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-[10px] px-1.5 py-0",
                                getMarriageStatusColor(marriage.status)
                              )}
                            >
                              {marriage.status}
                            </Badge>
                            {marriage.marriageDate && (
                              <span className="text-[10px] text-slate-400">
                                {formatDate(marriage.marriageDate)}
                              </span>
                            )}
                          </div>
                        </div>
                        <Heart className="h-4 w-4 text-pink-500 shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Children */}
              {memberData.children.length > 0 && (
                <div
                  className="space-y-2"
                  data-testid="public-member-profile-children"
                >
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Children ({memberData.children.length})
                  </p>
                  <div className="space-y-2">
                    {memberData.children.map(
                      ({ member: child, relationshipType }) => (
                        <div
                          key={child.id}
                          className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                        >
                          <Avatar className="h-8 w-8">
                            {child.profileImageUrl ? (
                              <AvatarImage
                                src={child.profileImageUrl}
                                alt={child.firstName}
                              />
                            ) : (
                              <AvatarFallback
                                className={cn(
                                  "bg-gradient-to-br text-white text-xs",
                                  getGenderStyles(child.gender).avatar
                                )}
                              >
                                {getInitials(child.firstName, child.lastName)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                              {child.firstName} {child.lastName}
                            </p>
                            {relationshipType !== "biological" && (
                              <p className="text-xs text-slate-500">
                                {getRelationshipTypeLabel(relationshipType)}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Siblings */}
              {memberData.siblings.length > 0 && (
                <div
                  className="space-y-2"
                  data-testid="public-member-profile-siblings"
                >
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Siblings ({memberData.siblings.length})
                  </p>
                  <div className="space-y-2">
                    {memberData.siblings.map((sibling) => (
                      <div
                        key={sibling.id}
                        className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                      >
                        <Avatar className="h-8 w-8">
                          {sibling.profileImageUrl ? (
                            <AvatarImage
                              src={sibling.profileImageUrl}
                              alt={sibling.firstName}
                            />
                          ) : (
                            <AvatarFallback
                              className={cn(
                                "bg-gradient-to-br text-white text-xs",
                                getGenderStyles(sibling.gender).avatar
                              )}
                            >
                              {getInitials(sibling.firstName, sibling.lastName)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {sibling.firstName} {sibling.lastName}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* No relationships message */}
            {memberData.parents.length === 0 &&
              memberData.spouses.length === 0 &&
              memberData.children.length === 0 &&
              memberData.siblings.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                  No family relationships have been added yet.
                </p>
              )}
          </div>
        </div>

        {/* Footer with Close button only (read-only mode) */}
        <div className="flex justify-end mt-4 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="public-member-profile-close-button"
          >
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
