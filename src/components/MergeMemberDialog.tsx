"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Loader2,
  AlertTriangle,
  Users,
  Heart,
  GitFork,
  ArrowRight,
  Merge,
  Images,
  FileText,
  Calendar,
  Check,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import { cn } from "~/lib/utils";
import { useAnalyzeMemberMerge, useMergeFamilyMembers } from "~/hooks/useMemberMerge";
import type { FamilyMember } from "~/db/schema";

interface MergeMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceMember: FamilyMember | null;
  allMembers: FamilyMember[];
  familyTreeId: string;
  onSuccess?: () => void;
}

// Analysis result type
interface MergeAnalysisResult {
  sourceMember: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
  };
  targetMember: {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
  };
  fieldConflicts: Array<{
    field: string;
    sourceValue: string | null;
    targetValue: string | null;
  }>;
  willTransfer: {
    parentRelationships: number;
    childRelationships: number;
    marriages: number;
    media: number;
    stories: number;
    events: number;
  };
  warnings: string[];
}

// Get initials from name
function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

// Get gender-based styling
function getGenderStyles(gender: string | null) {
  switch (gender) {
    case "male":
      return {
        avatar: "from-blue-500 to-blue-600",
        border: "border-blue-400",
      };
    case "female":
      return {
        avatar: "from-pink-500 to-pink-600",
        border: "border-pink-400",
      };
    default:
      return {
        avatar: "from-purple-500 to-purple-600",
        border: "border-purple-400",
      };
  }
}

// Get full name
function getFullName(member: FamilyMember): string {
  if (member.middleName) {
    return `${member.firstName} ${member.middleName} ${member.lastName}`;
  }
  return `${member.firstName} ${member.lastName}`;
}

type Step = "select" | "review" | "confirm";

export function MergeMemberDialog({
  open,
  onOpenChange,
  sourceMember,
  allMembers,
  familyTreeId,
  onSuccess,
}: MergeMemberDialogProps) {
  const [step, setStep] = useState<Step>("select");
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  const analyzeMutation = useAnalyzeMemberMerge();
  const mergeMutation = useMergeFamilyMembers(familyTreeId);

  // Filter out the source member from potential targets
  const potentialTargets = useMemo(() => {
    if (!sourceMember) return [];
    return allMembers.filter((m) => m.id !== sourceMember.id);
  }, [allMembers, sourceMember]);

  // Get the selected target member
  const selectedTarget = useMemo(() => {
    if (!selectedTargetId) return null;
    return allMembers.find((m) => m.id === selectedTargetId) || null;
  }, [selectedTargetId, allMembers]);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setStep("select");
      setSelectedTargetId(null);
      analyzeMutation.reset();
      mergeMutation.reset();
    }
  }, [open]);

  // Handle target selection and analysis
  const handleTargetSelect = async (targetId: string) => {
    if (!sourceMember) return;

    setSelectedTargetId(targetId);
    setStep("review");

    // Analyze the merge
    await analyzeMutation.mutateAsync({
      sourceMemberId: sourceMember.id,
      targetMemberId: targetId,
    });
  };

  // Handle merge confirmation
  const handleConfirmMerge = async () => {
    if (!sourceMember || !selectedTargetId) return;

    try {
      await mergeMutation.mutateAsync({
        sourceMemberId: sourceMember.id,
        targetMemberId: selectedTargetId,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch {
      // Error is handled by the mutation
    }
  };

  // Handle going back
  const handleBack = () => {
    if (step === "review") {
      setStep("select");
      setSelectedTargetId(null);
      analyzeMutation.reset();
    } else if (step === "confirm") {
      setStep("review");
    }
  };

  if (!sourceMember) return null;

  const sourceFullName = getFullName(sourceMember);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        data-testid="merge-member-dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="h-5 w-5 text-primary" />
            Merge Family Member
          </DialogTitle>
          <DialogDescription>
            {step === "select" && (
              <>
                Select another member to merge{" "}
                <span className="font-semibold">{sourceFullName}</span> into.
                The selected member will be kept, and all data from{" "}
                <span className="font-semibold">{sourceMember.firstName}</span>{" "}
                will be transferred to them.
              </>
            )}
            {step === "review" && (
              <>
                Review the merge details below. All relationships, media,
                stories, and events will be transferred.
              </>
            )}
            {step === "confirm" && (
              <>Are you sure you want to proceed with this merge?</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {/* Step 1: Select Target */}
          {step === "select" && (
            <SelectTargetStep
              sourceMember={sourceMember}
              potentialTargets={potentialTargets}
              onSelect={handleTargetSelect}
            />
          )}

          {/* Step 2: Review Merge */}
          {step === "review" && (
            <ReviewMergeStep
              sourceMember={sourceMember}
              targetMember={selectedTarget}
              analysis={analyzeMutation.data}
              isLoading={analyzeMutation.isPending}
              onProceed={() => setStep("confirm")}
            />
          )}

          {/* Step 3: Confirm */}
          {step === "confirm" && (
            <ConfirmMergeStep
              sourceMember={sourceMember}
              targetMember={selectedTarget}
              analysis={analyzeMutation.data}
            />
          )}
        </div>

        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          <div className="flex justify-between w-full">
            <Button
              variant="outline"
              onClick={step === "select" ? () => onOpenChange(false) : handleBack}
              disabled={mergeMutation.isPending}
            >
              {step === "select" ? "Cancel" : "Back"}
            </Button>

            {step === "confirm" && (
              <Button
                onClick={handleConfirmMerge}
                disabled={mergeMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700"
                data-testid="merge-confirm-button"
              >
                {mergeMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Merging...
                  </>
                ) : (
                  <>
                    <Merge className="h-4 w-4 mr-2" />
                    Confirm Merge
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Step 1: Select Target Component
function SelectTargetStep({
  sourceMember,
  potentialTargets,
  onSelect,
}: {
  sourceMember: FamilyMember;
  potentialTargets: FamilyMember[];
  onSelect: (targetId: string) => void;
}) {
  const sourceStyles = getGenderStyles(sourceMember.gender);

  return (
    <div className="space-y-4">
      {/* Source member card */}
      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border">
        <p className="text-xs font-medium text-slate-500 mb-2">
          MERGING FROM (will be deleted)
        </p>
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            {sourceMember.profileImageUrl ? (
              <AvatarImage
                src={sourceMember.profileImageUrl}
                alt={sourceMember.firstName}
              />
            ) : (
              <AvatarFallback
                className={cn(
                  "bg-gradient-to-br text-white text-sm",
                  sourceStyles.avatar
                )}
              >
                {getInitials(sourceMember.firstName, sourceMember.lastName)}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <p className="font-medium">{getFullName(sourceMember)}</p>
            {sourceMember.birthDate && (
              <p className="text-xs text-slate-500">
                Born: {sourceMember.birthDate}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Arrow */}
      <div className="flex justify-center">
        <ArrowRight className="h-5 w-5 text-slate-400" />
      </div>

      {/* Target selection */}
      <div>
        <p className="text-xs font-medium text-slate-500 mb-2">
          SELECT TARGET (will be kept)
        </p>
        <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
          {potentialTargets.map((target) => {
            const styles = getGenderStyles(target.gender);
            return (
              <button
                key={target.id}
                onClick={() => onSelect(target.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors text-left",
                  "hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-primary"
                )}
                data-testid={`merge-target-${target.id}`}
              >
                <Avatar className="h-10 w-10">
                  {target.profileImageUrl ? (
                    <AvatarImage
                      src={target.profileImageUrl}
                      alt={target.firstName}
                    />
                  ) : (
                    <AvatarFallback
                      className={cn(
                        "bg-gradient-to-br text-white text-sm",
                        styles.avatar
                      )}
                    >
                      {getInitials(target.firstName, target.lastName)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{getFullName(target)}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    {target.birthDate && (
                      <span>Born: {target.birthDate}</span>
                    )}
                    {target.gender && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {target.gender}
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Step 2: Review Merge Component
function ReviewMergeStep({
  sourceMember,
  targetMember,
  analysis,
  isLoading,
  onProceed,
}: {
  sourceMember: FamilyMember;
  targetMember: FamilyMember | null;
  analysis: MergeAnalysisResult | undefined;
  isLoading: boolean;
  onProceed: () => void;
}) {
  if (isLoading || !analysis) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-slate-500">Analyzing merge...</span>
      </div>
    );
  }

  if (!targetMember) return null;

  const sourceStyles = getGenderStyles(sourceMember.gender);
  const targetStyles = getGenderStyles(targetMember.gender);

  return (
    <div className="max-h-[400px] overflow-y-auto pr-2">
      <div className="space-y-4">
        {/* Merge Preview */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border">
          {/* Source */}
          <div className="flex items-center gap-2">
            <Avatar className="h-12 w-12">
              {sourceMember.profileImageUrl ? (
                <AvatarImage
                  src={sourceMember.profileImageUrl}
                  alt={sourceMember.firstName}
                />
              ) : (
                <AvatarFallback
                  className={cn(
                    "bg-gradient-to-br text-white",
                    sourceStyles.avatar
                  )}
                >
                  {getInitials(sourceMember.firstName, sourceMember.lastName)}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <p className="font-medium text-sm">{analysis.sourceMember.fullName}</p>
              <Badge variant="destructive" className="text-[10px]">
                Will be deleted
              </Badge>
            </div>
          </div>

          <ArrowRight className="h-5 w-5 text-slate-400 mx-4" />

          {/* Target */}
          <div className="flex items-center gap-2">
            <Avatar className="h-12 w-12">
              {targetMember.profileImageUrl ? (
                <AvatarImage
                  src={targetMember.profileImageUrl}
                  alt={targetMember.firstName}
                />
              ) : (
                <AvatarFallback
                  className={cn(
                    "bg-gradient-to-br text-white",
                    targetStyles.avatar
                  )}
                >
                  {getInitials(targetMember.firstName, targetMember.lastName)}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <p className="font-medium text-sm">{analysis.targetMember.fullName}</p>
              <Badge
                variant="secondary"
                className="text-[10px] bg-green-100 text-green-700"
              >
                Will be kept
              </Badge>
            </div>
          </div>
        </div>

        {/* What will be transferred */}
        <div>
          <h4 className="text-sm font-semibold mb-2">Data to be transferred:</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 p-2 rounded border bg-white dark:bg-slate-900">
              <Users className="h-4 w-4 text-slate-500" />
              <span className="text-sm">
                {analysis.willTransfer.parentRelationships} parent relationship
                {analysis.willTransfer.parentRelationships !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded border bg-white dark:bg-slate-900">
              <GitFork className="h-4 w-4 text-slate-500" />
              <span className="text-sm">
                {analysis.willTransfer.childRelationships} child relationship
                {analysis.willTransfer.childRelationships !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded border bg-white dark:bg-slate-900">
              <Heart className="h-4 w-4 text-pink-500" />
              <span className="text-sm">
                {analysis.willTransfer.marriages} marriage
                {analysis.willTransfer.marriages !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded border bg-white dark:bg-slate-900">
              <Images className="h-4 w-4 text-slate-500" />
              <span className="text-sm">
                {analysis.willTransfer.media} photo
                {analysis.willTransfer.media !== 1 ? "s" : ""}/video
                {analysis.willTransfer.media !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded border bg-white dark:bg-slate-900">
              <FileText className="h-4 w-4 text-slate-500" />
              <span className="text-sm">
                {analysis.willTransfer.stories} stor
                {analysis.willTransfer.stories !== 1 ? "ies" : "y"}
              </span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded border bg-white dark:bg-slate-900">
              <Calendar className="h-4 w-4 text-slate-500" />
              <span className="text-sm">
                {analysis.willTransfer.events} event
                {analysis.willTransfer.events !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Field Conflicts */}
        {analysis.fieldConflicts.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Field differences:</h4>
            <div className="space-y-2">
              {analysis.fieldConflicts.map((conflict) => (
                <div
                  key={conflict.field}
                  className="p-2 rounded border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
                >
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-200 capitalize">
                    {conflict.field.replace(/([A-Z])/g, " $1").trim()}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-500 line-through">
                      {conflict.sourceValue || "(empty)"}
                    </span>
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                    <span className="text-xs font-medium">
                      {conflict.targetValue || "(empty)"}
                    </span>
                  </div>
                </div>
              ))}
              <p className="text-xs text-slate-500 italic">
                Target member&apos;s values will be kept by default.
              </p>
            </div>
          </div>
        )}

        {/* Warnings */}
        {analysis.warnings.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Warnings
              </span>
            </div>
            <ul className="space-y-1">
              {analysis.warnings.map((warning, i) => (
                <li key={i} className="text-xs text-amber-700 dark:text-amber-300">
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Proceed Button */}
        <Button onClick={onProceed} className="w-full" data-testid="merge-proceed-button">
          Proceed to Confirmation
        </Button>
      </div>
    </div>
  );
}

// Step 3: Confirm Merge Component
function ConfirmMergeStep({
  sourceMember,
  targetMember,
  analysis,
}: {
  sourceMember: FamilyMember;
  targetMember: FamilyMember | null;
  analysis: MergeAnalysisResult | undefined;
}) {
  if (!targetMember || !analysis) return null;

  return (
    <div className="space-y-4 py-4">
      <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
          <div>
            <h4 className="font-semibold text-destructive">
              This action cannot be undone
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              You are about to permanently delete{" "}
              <span className="font-semibold">{analysis.sourceMember.fullName}</span>{" "}
              and transfer all their data to{" "}
              <span className="font-semibold">{analysis.targetMember.fullName}</span>.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
        <h4 className="font-medium mb-3">Merge Summary:</h4>
        <ul className="space-y-2">
          <li className="flex items-center gap-2 text-sm">
            <X className="h-4 w-4 text-destructive" />
            <span>
              <span className="font-medium">{analysis.sourceMember.fullName}</span>{" "}
              will be deleted
            </span>
          </li>
          <li className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-green-600" />
            <span>
              <span className="font-medium">{analysis.targetMember.fullName}</span>{" "}
              will receive all transferred data
            </span>
          </li>
          <li className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-green-600" />
            <span>
              All relationships will be preserved and transferred
            </span>
          </li>
          <li className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-green-600" />
            <span>
              A version history entry will be created for this change
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
