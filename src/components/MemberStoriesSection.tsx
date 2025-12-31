"use client";

import { useState } from "react";
import { BookOpen, Plus, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
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
import { StoryCard } from "~/components/StoryCard";
import { StoryDialog } from "~/components/StoryDialog";
import { StoryViewerDialog } from "~/components/StoryViewerDialog";
import { useStoriesByMember, useDeleteStory } from "~/hooks/useStories";
import type { FamilyMemberStory } from "~/db/schema";

interface MemberStoriesSectionProps {
  familyMemberId: string;
  familyTreeId: string;
  memberName: string;
  canEdit?: boolean;
}

export function MemberStoriesSection({
  familyMemberId,
  familyTreeId,
  memberName,
  canEdit = true,
}: MemberStoriesSectionProps) {
  // Story dialog state
  const [storyDialogOpen, setStoryDialogOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<FamilyMemberStory | null>(null);

  // Story viewer state
  const [viewingStory, setViewingStory] = useState<FamilyMemberStory | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  // Delete confirmation state
  const [deletingStory, setDeletingStory] = useState<FamilyMemberStory | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Fetch stories
  const { data: stories, isLoading, error } = useStoriesByMember(familyMemberId);

  // Delete mutation
  const deleteStory = useDeleteStory(familyMemberId);

  // Handlers
  const handleAddStory = () => {
    setEditingStory(null);
    setStoryDialogOpen(true);
  };

  const handleEditStory = (story: FamilyMemberStory) => {
    setEditingStory(story);
    setStoryDialogOpen(true);
  };

  const handleViewStory = (story: FamilyMemberStory) => {
    setViewingStory(story);
    setViewerOpen(true);
  };

  const handleDeleteClick = (story: FamilyMemberStory) => {
    setDeletingStory(story);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deletingStory) {
      await deleteStory.mutateAsync(deletingStory.id);
      setDeleteDialogOpen(false);
      setDeletingStory(null);
    }
  };

  return (
    <div className="space-y-4" data-testid="member-stories-section">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Stories & Documents
          </h3>
          {stories && stories.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              ({stories.length})
            </span>
          )}
        </div>
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddStory}
            data-testid="add-story-button"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Story
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-sm text-red-500">Failed to load stories</p>
        </div>
      ) : stories && stories.length > 0 ? (
        <div className="grid gap-3" data-testid="stories-list">
          {stories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              onView={handleViewStory}
              onEdit={canEdit ? handleEditStory : undefined}
              onDelete={canEdit ? handleDeleteClick : undefined}
              canEdit={canEdit}
              isDeleting={deleteStory.isPending && deletingStory?.id === story.id}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 rounded-lg bg-slate-50 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800">
          <BookOpen className="h-8 w-8 mx-auto text-slate-400 mb-2" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No stories have been added yet.
          </p>
          {canEdit && (
            <Button
              variant="link"
              size="sm"
              onClick={handleAddStory}
              className="mt-2"
            >
              Add the first story
            </Button>
          )}
        </div>
      )}

      {/* Story Add/Edit Dialog */}
      <StoryDialog
        open={storyDialogOpen}
        onOpenChange={setStoryDialogOpen}
        familyMemberId={familyMemberId}
        familyTreeId={familyTreeId}
        memberName={memberName}
        story={editingStory}
      />

      {/* Story Viewer Dialog */}
      <StoryViewerDialog
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        story={viewingStory}
        onEdit={canEdit ? handleEditStory : undefined}
        onDelete={canEdit ? handleDeleteClick : undefined}
        canEdit={canEdit}
        isDeleting={deleteStory.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="delete-story-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Story</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingStory?.title}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteStory.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteStory.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteStory.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
