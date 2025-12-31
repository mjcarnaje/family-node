"use client";

import {
  BookOpen,
  Calendar,
  Edit2,
  Trash2,
  X,
  User,
  FileText,
  Star,
  Heart,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
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
function formatDate(dateString: string | Date | null): string | null {
  if (!dateString) return null;
  try {
    const date = typeof dateString === "string" ? new Date(dateString) : dateString;
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return typeof dateString === "string" ? dateString : null;
  }
}

interface StoryViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  story: FamilyMemberStory | null;
  onEdit?: (story: FamilyMemberStory) => void;
  onDelete?: (story: FamilyMemberStory) => void;
  canEdit?: boolean;
  isDeleting?: boolean;
}

export function StoryViewerDialog({
  open,
  onOpenChange,
  story,
  onEdit,
  onDelete,
  canEdit = true,
  isDeleting = false,
}: StoryViewerDialogProps) {
  if (!story) return null;

  const styles = getStoryTypeStyles(story.storyType);
  const Icon = getStoryTypeIcon(story.storyType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        data-testid="story-viewer-dialog"
      >
        <DialogHeader>
          <DialogTitle className="sr-only">{story.title}</DialogTitle>
          <DialogDescription className="sr-only">
            View story details
          </DialogDescription>
        </DialogHeader>

        {/* Header with type badge */}
        <div
          className={cn(
            "p-4 rounded-xl border",
            styles.bg,
            styles.border
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex items-center justify-center h-12 w-12 rounded-full shrink-0",
                styles.badge
              )}
            >
              <Icon className={cn("h-6 w-6", styles.icon)} />
            </div>
            <div className="flex-1 min-w-0">
              <h2
                className="text-xl font-bold text-slate-900 dark:text-slate-100"
                data-testid="story-viewer-title"
              >
                {story.title}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className={cn(styles.badge)}>
                  {STORY_TYPE_LABELS[story.storyType]}
                </Badge>
                {story.eventDate && (
                  <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{formatDate(story.eventDate)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="py-4">
          <p
            className="text-base text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed"
            data-testid="story-viewer-content"
          >
            {story.content}
          </p>
        </div>

        {/* Footer with metadata and actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Added {formatDate(story.createdAt)}
            {story.updatedAt && story.updatedAt > story.createdAt && (
              <span> (Updated {formatDate(story.updatedAt)})</span>
            )}
          </p>

          <div className="flex gap-2">
            {canEdit && (
              <>
                {onEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onEdit(story);
                      onOpenChange(false);
                    }}
                    data-testid="story-viewer-edit-button"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onDelete(story);
                      onOpenChange(false);
                    }}
                    disabled={isDeleting}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    data-testid="story-viewer-delete-button"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
