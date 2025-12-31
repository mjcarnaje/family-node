"use client";

import {
  BookOpen,
  Calendar,
  Edit2,
  Trash2,
  User,
  FileText,
  Star,
  Heart,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import type { FamilyMemberStory, StoryType } from "~/db/schema";
import { STORY_TYPE_LABELS } from "./StoryForm";

// Get icon for story type
function getStoryTypeIcon(type: StoryType) {
  switch (type) {
    case "biography":
      return User;
    case "memory":
      return Heart;
    case "story":
      return BookOpen;
    case "document":
      return FileText;
    case "milestone":
      return Star;
    default:
      return BookOpen;
  }
}

// Get color scheme for story type
function getStoryTypeStyles(type: StoryType) {
  switch (type) {
    case "biography":
      return {
        bg: "bg-blue-50 dark:bg-blue-950/30",
        border: "border-blue-200 dark:border-blue-800",
        badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
        icon: "text-blue-500",
      };
    case "memory":
      return {
        bg: "bg-pink-50 dark:bg-pink-950/30",
        border: "border-pink-200 dark:border-pink-800",
        badge: "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300",
        icon: "text-pink-500",
      };
    case "story":
      return {
        bg: "bg-purple-50 dark:bg-purple-950/30",
        border: "border-purple-200 dark:border-purple-800",
        badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
        icon: "text-purple-500",
      };
    case "document":
      return {
        bg: "bg-amber-50 dark:bg-amber-950/30",
        border: "border-amber-200 dark:border-amber-800",
        badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
        icon: "text-amber-500",
      };
    case "milestone":
      return {
        bg: "bg-green-50 dark:bg-green-950/30",
        border: "border-green-200 dark:border-green-800",
        badge: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
        icon: "text-green-500",
      };
    default:
      return {
        bg: "bg-slate-50 dark:bg-slate-900/30",
        border: "border-slate-200 dark:border-slate-800",
        badge: "bg-slate-100 text-slate-700 dark:bg-slate-900/50 dark:text-slate-300",
        icon: "text-slate-500",
      };
  }
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

interface StoryCardProps {
  story: FamilyMemberStory;
  onEdit?: (story: FamilyMemberStory) => void;
  onDelete?: (story: FamilyMemberStory) => void;
  onView?: (story: FamilyMemberStory) => void;
  isDeleting?: boolean;
  canEdit?: boolean;
}

export function StoryCard({
  story,
  onEdit,
  onDelete,
  onView,
  isDeleting = false,
  canEdit = true,
}: StoryCardProps) {
  const styles = getStoryTypeStyles(story.storyType);
  const Icon = getStoryTypeIcon(story.storyType);

  // Truncate content for preview
  const previewContent =
    story.content.length > 200
      ? story.content.substring(0, 200) + "..."
      : story.content;

  return (
    <div
      className={cn(
        "p-4 rounded-lg border transition-all hover:shadow-md cursor-pointer",
        styles.bg,
        styles.border
      )}
      onClick={() => onView?.(story)}
      data-testid={`story-card-${story.id}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            className={cn(
              "flex items-center justify-center h-8 w-8 rounded-full shrink-0",
              styles.badge
            )}
          >
            <Icon className={cn("h-4 w-4", styles.icon)} />
          </div>
          <div className="min-w-0 flex-1">
            <h4
              className="font-semibold text-slate-900 dark:text-slate-100 truncate"
              data-testid="story-card-title"
            >
              {story.title}
            </h4>
            <Badge variant="secondary" className={cn("text-xs", styles.badge)}>
              {STORY_TYPE_LABELS[story.storyType]}
            </Badge>
          </div>
        </div>

        {/* Action buttons */}
        {canEdit && (onEdit || onDelete) && (
          <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(story)}
                className="h-8 w-8 p-0"
                data-testid="story-edit-button"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(story)}
                disabled={isDeleting}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                data-testid="story-delete-button"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Content preview */}
      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 mb-3">
        {previewContent}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        {story.eventDate && (
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(story.eventDate)}</span>
          </div>
        )}
        <div className="flex items-center gap-1 ml-auto">
          <span>Added {formatDate(story.createdAt.toString())}</span>
        </div>
      </div>
    </div>
  );
}
