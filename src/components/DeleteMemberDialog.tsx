"use client";

import { useMemo } from "react";
import { Loader2, AlertTriangle, Users, Heart, GitFork } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import type {
  FamilyMember,
  ParentChildRelationship,
  MarriageConnection,
} from "~/db/schema";

interface DeleteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending?: boolean;
  member: FamilyMember | null;
  allMembers: FamilyMember[];
  relationships: ParentChildRelationship[];
  marriages: MarriageConnection[];
}

interface RelationshipSummary {
  parentCount: number;
  childCount: number;
  spouseCount: number;
  siblingCount: number;
  totalRelationships: number;
}

function getRelationshipSummary(
  member: FamilyMember,
  allMembers: FamilyMember[],
  relationships: ParentChildRelationship[],
  marriages: MarriageConnection[]
): RelationshipSummary {
  const memberMap = new Map<string, FamilyMember>();
  allMembers.forEach((m) => memberMap.set(m.id, m));

  // Count parents (relationships where this member is the child)
  const parentRelations = relationships.filter(
    (rel) => rel.childId === member.id && memberMap.has(rel.parentId)
  );

  // Count children (relationships where this member is the parent)
  const childRelations = relationships.filter(
    (rel) => rel.parentId === member.id && memberMap.has(rel.childId)
  );

  // Count spouses (marriages where this member is either spouse)
  const memberMarriages = marriages.filter(
    (m) =>
      (m.spouse1Id === member.id && memberMap.has(m.spouse2Id)) ||
      (m.spouse2Id === member.id && memberMap.has(m.spouse1Id))
  );

  // Count siblings (other children of the same parents)
  const siblingIds = new Set<string>();
  parentRelations.forEach((parentRel) => {
    relationships.forEach((rel) => {
      if (
        rel.parentId === parentRel.parentId &&
        rel.childId !== member.id &&
        memberMap.has(rel.childId)
      ) {
        siblingIds.add(rel.childId);
      }
    });
  });

  return {
    parentCount: parentRelations.length,
    childCount: childRelations.length,
    spouseCount: memberMarriages.length,
    siblingCount: siblingIds.size,
    totalRelationships:
      parentRelations.length + childRelations.length + memberMarriages.length,
  };
}

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

export function DeleteMemberDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending = false,
  member,
  allMembers,
  relationships,
  marriages,
}: DeleteMemberDialogProps) {
  const summary = useMemo(() => {
    if (!member) return null;
    return getRelationshipSummary(member, allMembers, relationships, marriages);
  }, [member, allMembers, relationships, marriages]);

  if (!member || !summary) {
    return null;
  }

  const fullName = getFullName(member.firstName, member.middleName, member.lastName);
  const hasRelationships = summary.totalRelationships > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md" data-testid="delete-member-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Family Member
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Are you sure you want to delete{" "}
                <span className="font-semibold text-foreground">{fullName}</span>?
              </p>

              {hasRelationships && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" />
                    This will also remove the following relationships:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {summary.parentCount > 0 && (
                      <Badge
                        variant="secondary"
                        className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                      >
                        <Users className="h-3 w-3 mr-1" />
                        {summary.parentCount} parent{summary.parentCount !== 1 ? "s" : ""}
                      </Badge>
                    )}
                    {summary.spouseCount > 0 && (
                      <Badge
                        variant="secondary"
                        className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                      >
                        <Heart className="h-3 w-3 mr-1" />
                        {summary.spouseCount} spouse{summary.spouseCount !== 1 ? "s" : ""}
                      </Badge>
                    )}
                    {summary.childCount > 0 && (
                      <Badge
                        variant="secondary"
                        className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                      >
                        <GitFork className="h-3 w-3 mr-1" />
                        {summary.childCount} child{summary.childCount !== 1 ? "ren" : ""}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                This action cannot be undone. The member's data will be permanently removed from your family tree.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending} data-testid="delete-member-cancel">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid="delete-member-confirm"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Member"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
