import { AlertTriangle, Users, Calendar, X, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import type {
  DuplicateCandidate,
  DuplicateSeverity,
  DuplicateDetectionResult,
} from "~/utils/member-duplicate-detection";
import {
  formatDuplicateWarningMessage,
  getConfidenceDescription,
} from "~/utils/member-duplicate-detection";

interface DuplicateMemberWarningProps {
  /** The duplicate detection result */
  result: DuplicateDetectionResult;
  /** Called when user dismisses the warning and wants to proceed anyway */
  onProceedAnyway: () => void;
  /** Called when user cancels and wants to review/edit */
  onCancel: () => void;
  /** Whether the form is in a loading state */
  isLoading?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * Component to display duplicate member warnings
 *
 * Shows a list of potential duplicate candidates with their
 * similarity information and allows the user to proceed anyway
 * or cancel to review.
 */
export function DuplicateMemberWarning({
  result,
  onProceedAnyway,
  onCancel,
  isLoading = false,
  className,
}: DuplicateMemberWarningProps) {
  if (!result.hasPotentialDuplicates || result.candidates.length === 0) {
    return null;
  }

  const { highestSeverity } = result;

  return (
    <div
      className={cn(
        "rounded-lg border p-4 space-y-4",
        getSeverityStyles(highestSeverity),
        className
      )}
      role="alert"
      aria-live="polite"
      data-testid="duplicate-member-warning"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <AlertTriangle
          className={cn(
            "h-5 w-5 mt-0.5 flex-shrink-0",
            getSeverityIconColor(highestSeverity)
          )}
        />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm">
            {getWarningTitle(highestSeverity, result.candidates.length)}
          </h4>
          <p className="text-sm text-muted-foreground mt-1">
            {getWarningDescription(highestSeverity)}
          </p>
        </div>
      </div>

      {/* Candidate List */}
      <div className="space-y-2" data-testid="duplicate-candidates-list">
        {result.candidates.map((candidate) => (
          <DuplicateCandidateCard key={candidate.memberId} candidate={candidate} />
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1"
          data-testid="duplicate-warning-cancel"
        >
          Review Information
        </Button>
        <Button
          type="button"
          variant={highestSeverity === "high" ? "destructive" : "default"}
          size="sm"
          onClick={onProceedAnyway}
          disabled={isLoading}
          className="flex-1"
          data-testid="duplicate-warning-proceed"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            "Add Anyway"
          )}
        </Button>
      </div>
    </div>
  );
}

/**
 * Individual candidate card component
 */
interface DuplicateCandidateCardProps {
  candidate: DuplicateCandidate;
}

function DuplicateCandidateCard({ candidate }: DuplicateCandidateCardProps) {
  const scorePercentage = Math.round(candidate.score * 100);

  return (
    <div
      className={cn(
        "rounded-md border p-3 bg-background/50",
        getSeverityBorderColor(candidate.severity)
      )}
      data-testid="duplicate-candidate-card"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium text-sm truncate">
              {candidate.fullName}
            </span>
          </div>

          {/* Match details */}
          <div className="flex flex-wrap gap-2 mt-2">
            {candidate.matchedOn.includes("birthDate") &&
              candidate.birthDate && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {candidate.details.dateProximityDays === 0
                      ? "Same birth date"
                      : `Birth date within ${candidate.details.dateProximityDays} days`}
                  </span>
                </div>
              )}
          </div>

          {/* Confidence description */}
          <p className="text-xs text-muted-foreground mt-1">
            {getConfidenceDescription(candidate.severity)}
          </p>
        </div>

        {/* Score badge */}
        <div
          className={cn(
            "flex-shrink-0 px-2 py-1 rounded text-xs font-medium",
            getSeverityBadgeStyles(candidate.severity)
          )}
        >
          {scorePercentage}% match
        </div>
      </div>
    </div>
  );
}

/**
 * Get the warning title based on severity and count
 */
function getWarningTitle(
  severity: DuplicateSeverity | undefined,
  count: number
): string {
  const personText = count === 1 ? "person" : "people";

  switch (severity) {
    case "high":
      return `Potential duplicate found`;
    case "medium":
      return `Similar ${personText} found in your tree`;
    case "low":
    default:
      return `Possible match${count > 1 ? "es" : ""} found`;
  }
}

/**
 * Get the warning description based on severity
 */
function getWarningDescription(severity: DuplicateSeverity | undefined): string {
  switch (severity) {
    case "high":
      return "This person may already exist in your family tree. Please review before adding.";
    case "medium":
      return "We found similar names or dates in your tree. Please verify this is a new person.";
    case "low":
    default:
      return "Some existing members have similar information. You can proceed if this is a different person.";
  }
}

/**
 * Get container styles based on severity
 */
function getSeverityStyles(severity: DuplicateSeverity | undefined): string {
  switch (severity) {
    case "high":
      return "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900";
    case "medium":
      return "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900";
    case "low":
    default:
      return "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900";
  }
}

/**
 * Get icon color based on severity
 */
function getSeverityIconColor(severity: DuplicateSeverity | undefined): string {
  switch (severity) {
    case "high":
      return "text-red-600 dark:text-red-400";
    case "medium":
      return "text-amber-600 dark:text-amber-400";
    case "low":
    default:
      return "text-blue-600 dark:text-blue-400";
  }
}

/**
 * Get border color for candidate cards based on severity
 */
function getSeverityBorderColor(severity: DuplicateSeverity): string {
  switch (severity) {
    case "high":
      return "border-red-200 dark:border-red-800";
    case "medium":
      return "border-amber-200 dark:border-amber-800";
    case "low":
    default:
      return "border-blue-200 dark:border-blue-800";
  }
}

/**
 * Get badge styles based on severity
 */
function getSeverityBadgeStyles(severity: DuplicateSeverity): string {
  switch (severity) {
    case "high":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
    case "medium":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
    case "low":
    default:
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
  }
}

/**
 * Compact version of the warning for inline use
 */
interface DuplicateMemberWarningCompactProps {
  /** The duplicate detection result */
  result: DuplicateDetectionResult;
  /** Called when user wants to see full details */
  onShowDetails?: () => void;
  /** Custom class name */
  className?: string;
}

export function DuplicateMemberWarningCompact({
  result,
  onShowDetails,
  className,
}: DuplicateMemberWarningCompactProps) {
  if (!result.hasPotentialDuplicates || result.candidates.length === 0) {
    return null;
  }

  const { highestSeverity, candidates } = result;
  const topCandidate = candidates[0];

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
        getSeverityStyles(highestSeverity),
        className
      )}
      data-testid="duplicate-warning-compact"
    >
      <AlertTriangle
        className={cn("h-4 w-4 flex-shrink-0", getSeverityIconColor(highestSeverity))}
      />
      <span className="flex-1 truncate">
        Similar to {formatDuplicateWarningMessage(topCandidate)}
        {candidates.length > 1 && ` and ${candidates.length - 1} more`}
      </span>
      {onShowDetails && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onShowDetails}
          className="h-auto py-1 px-2 text-xs"
        >
          View
        </Button>
      )}
    </div>
  );
}
