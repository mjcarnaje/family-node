"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, BookOpen } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { StoryType } from "~/db/schema";

export const STORY_TYPES: StoryType[] = [
  "biography",
  "memory",
  "story",
  "document",
  "milestone",
];

export const STORY_TYPE_LABELS: Record<StoryType, string> = {
  biography: "Biography",
  memory: "Memory",
  story: "Story",
  document: "Document",
  milestone: "Milestone",
};

export const STORY_TYPE_DESCRIPTIONS: Record<StoryType, string> = {
  biography: "Biographical information about this person's life",
  memory: "A cherished memory or moment with this person",
  story: "A story or anecdote about this person",
  document: "A historical document, letter, or record",
  milestone: "An important life event or achievement",
};

export const storyFormSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters"),
  content: z
    .string()
    .min(1, "Content is required")
    .max(50000, "Content must be less than 50000 characters"),
  storyType: z.enum(["biography", "memory", "story", "document", "milestone"]),
  eventDate: z.string().optional().or(z.literal("")),
});

export type StoryFormData = z.infer<typeof storyFormSchema>;

interface StoryFormProps {
  defaultValues?: Partial<StoryFormData>;
  onSubmit: (data: StoryFormData) => void | Promise<void>;
  isPending?: boolean;
  submitLabel?: string;
  submitIcon?: React.ReactNode;
  onCancel?: () => void;
  cancelLabel?: string;
}

export function StoryForm({
  defaultValues,
  onSubmit,
  isPending = false,
  submitLabel = "Add Story",
  submitIcon = <BookOpen className="h-4 w-4 mr-2" />,
  onCancel,
  cancelLabel = "Cancel",
}: StoryFormProps) {
  const form = useForm<StoryFormData>({
    resolver: zodResolver(storyFormSchema),
    defaultValues: {
      title: "",
      content: "",
      storyType: "story",
      eventDate: "",
      ...defaultValues,
    },
  });

  const handleSubmit = async (data: StoryFormData) => {
    await onSubmit(data);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-6"
        data-testid="story-form"
      >
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-medium">Title *</FormLabel>
              <FormControl>
                <Input
                  placeholder="Story title"
                  className="h-11 text-base"
                  disabled={isPending}
                  data-testid="story-title-input"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {field.value?.length || 0}/200 characters
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="storyType"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-medium">Story Type</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isPending}
              >
                <FormControl>
                  <SelectTrigger className="w-full" data-testid="story-type-select">
                    <SelectValue placeholder="Select story type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {STORY_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      <div className="flex flex-col">
                        <span>{STORY_TYPE_LABELS[type]}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                {STORY_TYPE_DESCRIPTIONS[field.value]}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="eventDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-medium">
                Event Date (Optional)
              </FormLabel>
              <FormControl>
                <Input
                  type="date"
                  className="h-11 text-base"
                  disabled={isPending}
                  data-testid="story-date-input"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                The date when this event or story took place
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-medium">Content *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Write your story here..."
                  className="min-h-[200px] text-base resize-none"
                  disabled={isPending}
                  data-testid="story-content-input"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {field.value?.length || 0}/50000 characters
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col gap-4 pt-4 border-t border-border">
          <div className="flex gap-3">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={isPending}
                onClick={onCancel}
              >
                {cancelLabel}
              </Button>
            )}
            <Button
              type="submit"
              className="flex-1"
              disabled={isPending}
              data-testid="story-submit-button"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  {submitIcon}
                  {submitLabel}
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
