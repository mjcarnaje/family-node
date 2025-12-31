"use client";

import { useState } from "react";
import {
  UserPlus,
  UserCog,
  UserMinus,
  Link,
  LinkIcon,
  Unlink,
  Heart,
  HeartCrack,
  Settings,
  Upload,
  RotateCcw,
  Clock,
  User,
  Loader2,
  ChevronDown,
  Filter,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useTreeActivityLog } from "~/hooks/useTreeVersions";
import type { TreeChangeType, TreeEntityType } from "~/db/schema";
import { cn } from "~/lib/utils";

// Icon mapping for change types
const CHANGE_TYPE_ICONS: Record<TreeChangeType, React.ElementType> = {
  MEMBER_ADDED: UserPlus,
  MEMBER_UPDATED: UserCog,
  MEMBER_DELETED: UserMinus,
  RELATIONSHIP_ADDED: Link,
  RELATIONSHIP_UPDATED: LinkIcon,
  RELATIONSHIP_DELETED: Unlink,
  MARRIAGE_ADDED: Heart,
  MARRIAGE_UPDATED: Heart,
  MARRIAGE_DELETED: HeartCrack,
  TREE_UPDATED: Settings,
  BULK_IMPORT: Upload,
  REVERT: RotateCcw,
};

// Color mapping for change types
const CHANGE_TYPE_COLORS: Record<TreeChangeType, string> = {
  MEMBER_ADDED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  MEMBER_UPDATED: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  MEMBER_DELETED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  RELATIONSHIP_ADDED: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  RELATIONSHIP_UPDATED: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  RELATIONSHIP_DELETED: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  MARRIAGE_ADDED: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  MARRIAGE_UPDATED: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  MARRIAGE_DELETED: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  TREE_UPDATED: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
  BULK_IMPORT: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  REVERT: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

// Human-readable labels for change types
const CHANGE_TYPE_LABELS: Record<TreeChangeType, string> = {
  MEMBER_ADDED: "Member Added",
  MEMBER_UPDATED: "Member Updated",
  MEMBER_DELETED: "Member Deleted",
  RELATIONSHIP_ADDED: "Relationship Added",
  RELATIONSHIP_UPDATED: "Relationship Updated",
  RELATIONSHIP_DELETED: "Relationship Deleted",
  MARRIAGE_ADDED: "Marriage Added",
  MARRIAGE_UPDATED: "Marriage Updated",
  MARRIAGE_DELETED: "Marriage Deleted",
  TREE_UPDATED: "Tree Updated",
  BULK_IMPORT: "Bulk Import",
  REVERT: "Version Reverted",
};

// Entity type labels
const ENTITY_TYPE_LABELS: Record<TreeEntityType, string> = {
  MEMBER: "Member",
  RELATIONSHIP: "Relationship",
  MARRIAGE: "Marriage",
  TREE: "Tree",
};

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function getUserInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getEntityName(
  changeType: TreeChangeType,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  newData: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oldData: any
): string | null {
  // Try to get a meaningful name from the data
  const data = newData || oldData;
  if (!data) return null;

  // For members, try to get full name
  if (data.firstName || data.lastName) {
    const parts = [data.firstName, data.middleName, data.lastName].filter(Boolean);
    return parts.join(" ") || null;
  }

  return null;
}

interface ActivityLogEntryProps {
  entry: {
    id: string;
    changeType: TreeChangeType;
    entityType: TreeEntityType;
    description: string | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    oldData: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    newData: any;
    createdAt: Date;
    user: {
      id: string;
      name: string;
      email: string;
      image: string | null;
    } | null;
  };
  isLast: boolean;
}

function ActivityLogEntry({ entry, isLast }: ActivityLogEntryProps) {
  const Icon = CHANGE_TYPE_ICONS[entry.changeType];
  const colorClass = CHANGE_TYPE_COLORS[entry.changeType];
  const entityName = getEntityName(entry.changeType, entry.newData, entry.oldData);

  const description =
    entry.description ||
    `${CHANGE_TYPE_LABELS[entry.changeType]}${entityName ? `: ${entityName}` : ""}`;

  return (
    <div className="relative flex gap-3 pb-6 last:pb-0" data-testid="activity-log-entry">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-[18px] top-10 bottom-0 w-0.5 bg-border" />
      )}

      {/* Icon */}
      <div
        className={cn(
          "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          colorClass
        )}
      >
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-medium text-foreground truncate"
              data-testid="activity-description"
            >
              {description}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                {ENTITY_TYPE_LABELS[entry.entityType]}
              </Badge>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatRelativeTime(new Date(entry.createdAt))}
              </span>
            </div>
          </div>
        </div>

        {/* User info */}
        <div className="flex items-center gap-2 mt-2">
          {entry.user ? (
            <>
              <Avatar className="h-5 w-5">
                <AvatarImage src={entry.user.image || undefined} alt={entry.user.name} />
                <AvatarFallback className="text-[10px]">
                  {getUserInitials(entry.user.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate">
                {entry.user.name}
              </span>
            </>
          ) : (
            <>
              <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
                <User className="h-3 w-3 text-muted-foreground" />
              </div>
              <span className="text-xs text-muted-foreground">Unknown user</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface TreeActivityLogProps {
  familyTreeId: string;
  maxHeight?: string;
}

const ALL_CHANGE_TYPES: TreeChangeType[] = [
  "MEMBER_ADDED",
  "MEMBER_UPDATED",
  "MEMBER_DELETED",
  "RELATIONSHIP_ADDED",
  "RELATIONSHIP_UPDATED",
  "RELATIONSHIP_DELETED",
  "MARRIAGE_ADDED",
  "MARRIAGE_UPDATED",
  "MARRIAGE_DELETED",
  "TREE_UPDATED",
  "BULK_IMPORT",
  "REVERT",
];

export function TreeActivityLog({
  familyTreeId,
  maxHeight = "400px",
}: TreeActivityLogProps) {
  const [limit, setLimit] = useState(20);
  const [selectedChangeTypes, setSelectedChangeTypes] = useState<Set<TreeChangeType>>(
    new Set(ALL_CHANGE_TYPES)
  );

  const { data, isLoading, error } = useTreeActivityLog({
    familyTreeId,
    limit,
    offset: 0,
  });

  const toggleChangeType = (changeType: TreeChangeType) => {
    setSelectedChangeTypes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(changeType)) {
        newSet.delete(changeType);
      } else {
        newSet.add(changeType);
      }
      return newSet;
    });
  };

  const filteredLogs = data?.activityLogs.filter((log) =>
    selectedChangeTypes.has(log.changeType)
  );

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center py-8"
        data-testid="activity-log-loading"
      >
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center" data-testid="activity-log-error">
        <p className="text-sm text-destructive">
          Failed to load activity log. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="tree-activity-log">
      {/* Filter */}
      <div className="flex items-center justify-between">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filter
              {selectedChangeTypes.size < ALL_CHANGE_TYPES.length && (
                <Badge variant="secondary" className="ml-1">
                  {selectedChangeTypes.size}
                </Badge>
              )}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Filter by change type</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {ALL_CHANGE_TYPES.map((changeType) => (
              <DropdownMenuCheckboxItem
                key={changeType}
                checked={selectedChangeTypes.has(changeType)}
                onCheckedChange={() => toggleChangeType(changeType)}
              >
                {CHANGE_TYPE_LABELS[changeType]}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <span className="text-xs text-muted-foreground">
          {data?.totalCount || 0} total changes
        </span>
      </div>

      {/* Activity List */}
      <div style={{ maxHeight }} className="overflow-y-auto pr-2">
        {filteredLogs && filteredLogs.length > 0 ? (
          <div className="space-y-0">
            {filteredLogs.map((entry, index) => (
              <ActivityLogEntry
                key={entry.id}
                entry={entry}
                isLast={index === filteredLogs.length - 1}
              />
            ))}
          </div>
        ) : (
          <div
            className="py-8 text-center"
            data-testid="activity-log-empty"
          >
            <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              {data?.activityLogs.length === 0
                ? "No activity yet. Changes to your family tree will appear here."
                : "No activities match the selected filters."}
            </p>
          </div>
        )}
      </div>

      {/* Load More */}
      {data?.hasMore && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setLimit((prev) => prev + 20)}
          data-testid="load-more-button"
        >
          Load more
        </Button>
      )}
    </div>
  );
}
