"use client";

import { Edit, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { StoryForm, type StoryFormData } from "~/components/StoryForm";
import { useCreateStory, useUpdateStory } from "~/hooks/useStories";
import type { FamilyMemberStory } from "~/db/schema";

interface StoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  familyMemberId: string;
  familyTreeId: string;
  memberName: string;
  story?: FamilyMemberStory | null; // If provided, we're editing
}

export function StoryDialog({
  open,
  onOpenChange,
  familyMemberId,
  familyTreeId,
  memberName,
  story,
}: StoryDialogProps) {
  const isEditing = !!story;

  const createStory = useCreateStory();
  const updateStory = useUpdateStory(familyMemberId);

  const isPending = createStory.isPending || updateStory.isPending;

  const handleSubmit = async (data: StoryFormData) => {
    if (isEditing && story) {
      await updateStory.mutateAsync({
        id: story.id,
        title: data.title,
        content: data.content,
        storyType: data.storyType,
        eventDate: data.eventDate || null,
      });
    } else {
      await createStory.mutateAsync({
        familyMemberId,
        familyTreeId,
        title: data.title,
        content: data.content,
        storyType: data.storyType,
        eventDate: data.eventDate || null,
      });
    }
    onOpenChange(false);
  };

  const defaultValues: Partial<StoryFormData> | undefined = story
    ? {
        title: story.title,
        content: story.content,
        storyType: story.storyType,
        eventDate: story.eventDate || "",
      }
    : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto" data-testid="story-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Edit className="h-5 w-5" />
                Edit Story
              </>
            ) : (
              <>
                <Plus className="h-5 w-5" />
                Add Story for {memberName}
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the story details below."
              : "Add a story, memory, or document to preserve family history."}
          </DialogDescription>
        </DialogHeader>

        <StoryForm
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          isPending={isPending}
          submitLabel={isEditing ? "Update Story" : "Add Story"}
          submitIcon={isEditing ? <Edit className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
