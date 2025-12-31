import { useMemo } from "react";
import { Users, Pencil, Clock, Activity } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Tooltip } from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { Collaborator, EntityLock, TreeActivityItem } from "~/hooks/useCollaboration";
import type { CollaborationSessionStatus } from "~/db/schema";

// ============================================
// Collaborator Avatars Component
// ============================================

interface CollaboratorAvatarsProps {
  collaborators: Collaborator[];
  maxDisplay?: number;
  className?: string;
}

/**
 * Displays a row of collaborator avatars with status indicators
 */
export function CollaboratorAvatars({
  collaborators,
  maxDisplay = 5,
  className,
}: CollaboratorAvatarsProps) {
  const displayedCollaborators = collaborators.slice(0, maxDisplay);
  const remainingCount = Math.max(0, collaborators.length - maxDisplay);

  if (collaborators.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Users className="h-4 w-4 text-muted-foreground mr-1" />
      <div className="flex -space-x-2">
        {displayedCollaborators.map((collaborator) => (
          <Tooltip
            key={collaborator.user.id}
            content={`${collaborator.user.name} - ${getStatusLabel(collaborator.status)}`}
          >
            <div className="relative">
              <Avatar className="h-8 w-8 border-2 border-background">
                {collaborator.user.image ? (
                  <AvatarImage
                    src={collaborator.user.image}
                    alt={collaborator.user.name}
                  />
                ) : (
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                    {getInitials(collaborator.user.name)}
                  </AvatarFallback>
                )}
              </Avatar>
              {/* Status indicator dot */}
              <span
                className={cn(
                  "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background",
                  getStatusColor(collaborator.status)
                )}
              />
            </div>
          </Tooltip>
        ))}
        {remainingCount > 0 && (
          <Tooltip content={`${remainingCount} more collaborator${remainingCount > 1 ? "s" : ""}`}>
            <Avatar className="h-8 w-8 border-2 border-background">
              <AvatarFallback className="text-xs bg-muted">
                +{remainingCount}
              </AvatarFallback>
            </Avatar>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

// ============================================
// Active Editors Panel
// ============================================

interface ActiveEditorsPanelProps {
  collaborators: Collaborator[];
  className?: string;
}

/**
 * Shows who is currently editing and what they're editing
 */
export function ActiveEditorsPanel({
  collaborators,
  className,
}: ActiveEditorsPanelProps) {
  const activeEditors = collaborators.filter(
    (c) => c.status === "editing" && c.editingEntityId
  );

  if (activeEditors.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-3",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <Pencil className="h-4 w-4 text-amber-500" />
        <span className="text-xs font-semibold text-muted-foreground">
          Currently Editing
        </span>
      </div>
      <div className="space-y-2">
        {activeEditors.map((editor) => (
          <div
            key={editor.user.id}
            className="flex items-center gap-2 text-sm"
          >
            <Avatar className="h-6 w-6">
              {editor.user.image ? (
                <AvatarImage src={editor.user.image} alt={editor.user.name} />
              ) : (
                <AvatarFallback className="text-[10px] bg-amber-500 text-white">
                  {getInitials(editor.user.name)}
                </AvatarFallback>
              )}
            </Avatar>
            <span className="text-slate-700 dark:text-slate-300 truncate">
              {editor.user.name}
            </span>
            <Badge variant="secondary" className="text-[10px] ml-auto">
              {editor.editingEntityType?.toLowerCase()}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Entity Lock Indicator
// ============================================

interface EntityLockIndicatorProps {
  lock: EntityLock | null;
  className?: string;
}

/**
 * Shows a lock indicator when an entity is being edited
 */
export function EntityLockIndicator({
  lock,
  className,
}: EntityLockIndicatorProps) {
  if (!lock) {
    return null;
  }

  return (
    <Tooltip content={`Being edited by ${lock.lockedBy.name}`}>
      <div
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-md text-xs",
          className
        )}
      >
        <Pencil className="h-3 w-3" />
        <span>{lock.lockedBy.name} is editing</span>
      </div>
    </Tooltip>
  );
}

// ============================================
// Recent Activity Feed
// ============================================

interface RecentActivityFeedProps {
  activities: TreeActivityItem[];
  maxDisplay?: number;
  className?: string;
}

/**
 * Shows a feed of recent tree activities
 */
export function RecentActivityFeed({
  activities,
  maxDisplay = 10,
  className,
}: RecentActivityFeedProps) {
  const displayedActivities = activities.slice(0, maxDisplay);

  if (displayedActivities.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-8 text-muted-foreground",
          className
        )}
      >
        <Activity className="h-8 w-8 mb-2 opacity-50" />
        <span className="text-sm">No recent activity</span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {displayedActivities.map((item) => (
        <div
          key={item.activity.id}
          className="flex items-start gap-3 text-sm"
        >
          <Avatar className="h-7 w-7 mt-0.5">
            {item.user.image ? (
              <AvatarImage src={item.user.image} alt={item.user.name} />
            ) : (
              <AvatarFallback className="text-[10px]">
                {getInitials(item.user.name)}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-slate-700 dark:text-slate-300">
              <span className="font-medium">{item.user.name}</span>{" "}
              <span className="text-muted-foreground">
                {getActivityDescription(item.activity.activityType)}
              </span>{" "}
              {item.activity.entityName && (
                <span className="font-medium">{item.activity.entityName}</span>
              )}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(item.activity.createdAt), {
                addSuffix: true,
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// Collaboration Status Badge
// ============================================

interface CollaborationStatusBadgeProps {
  isConnected: boolean;
  collaboratorCount: number;
  className?: string;
}

/**
 * Shows the current collaboration connection status
 */
export function CollaborationStatusBadge({
  isConnected,
  collaboratorCount,
  className,
}: CollaborationStatusBadgeProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
          isConnected
            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
            : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
        )}
      >
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            isConnected ? "bg-green-500 animate-pulse" : "bg-gray-400"
          )}
        />
        {isConnected ? "Live" : "Offline"}
      </div>
      {collaboratorCount > 0 && (
        <Tooltip content={`${collaboratorCount} other collaborator${collaboratorCount > 1 ? "s" : ""} viewing`}>
          <Badge variant="secondary" className="gap-1">
            <Users className="h-3 w-3" />
            {collaboratorCount}
          </Badge>
        </Tooltip>
      )}
    </div>
  );
}

// ============================================
// Edit Conflict Alert
// ============================================

interface EditConflictAlertProps {
  lockedBy: { id: string; name: string } | null;
  onRetry?: () => void;
  className?: string;
}

/**
 * Alert shown when trying to edit something that's locked
 */
export function EditConflictAlert({
  lockedBy,
  onRetry,
  className,
}: EditConflictAlertProps) {
  if (!lockedBy) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg",
        className
      )}
    >
      <Pencil className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
          This item is being edited
        </p>
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
          {lockedBy.name} is currently editing this. Please wait until they
          finish.
        </p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 hover:bg-amber-200 dark:hover:bg-amber-900 rounded-md transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}

// ============================================
// Helper Functions
// ============================================

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getStatusColor(status: string): string {
  switch (status) {
    case "active":
      return "bg-green-500";
    case "idle":
      return "bg-yellow-500";
    case "editing":
      return "bg-amber-500";
    case "disconnected":
      return "bg-gray-400";
    default:
      return "bg-gray-400";
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "active":
      return "Active";
    case "idle":
      return "Idle";
    case "editing":
      return "Editing";
    case "disconnected":
      return "Disconnected";
    default:
      return "Unknown";
  }
}

function getActivityDescription(activityType: string): string {
  switch (activityType) {
    case "MEMBER_ADDED":
      return "added";
    case "MEMBER_UPDATED":
      return "updated";
    case "MEMBER_DELETED":
      return "removed";
    case "RELATIONSHIP_ADDED":
      return "added a relationship for";
    case "RELATIONSHIP_UPDATED":
      return "updated a relationship for";
    case "RELATIONSHIP_DELETED":
      return "removed a relationship for";
    case "MARRIAGE_ADDED":
      return "added a marriage for";
    case "MARRIAGE_UPDATED":
      return "updated a marriage for";
    case "MARRIAGE_DELETED":
      return "removed a marriage for";
    case "TREE_UPDATED":
      return "updated tree settings";
    case "BULK_IMPORT":
      return "imported data";
    case "REVERT":
      return "reverted changes";
    default:
      return "made changes to";
  }
}
