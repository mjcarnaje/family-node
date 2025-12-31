"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Calendar } from "lucide-react";
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
import type { FamilyMemberEventType } from "~/db/schema";

export const EVENT_TYPES: FamilyMemberEventType[] = [
  "birth",
  "death",
  "marriage",
  "divorce",
  "child_born",
  "graduation",
  "career",
  "achievement",
  "residence",
  "medical",
  "military",
  "religious",
  "other",
];

export const EVENT_TYPE_LABELS: Record<FamilyMemberEventType, string> = {
  birth: "Birth",
  death: "Death",
  marriage: "Marriage",
  divorce: "Divorce",
  child_born: "Child Born",
  graduation: "Graduation",
  career: "Career",
  achievement: "Achievement",
  residence: "Residence Change",
  medical: "Medical Event",
  military: "Military Service",
  religious: "Religious Event",
  other: "Other",
};

export const EVENT_TYPE_ICONS: Record<FamilyMemberEventType, string> = {
  birth: "Baby icon",
  death: "Heart icon",
  marriage: "Heart icon",
  divorce: "Broken heart icon",
  child_born: "Baby icon",
  graduation: "Graduation cap icon",
  career: "Briefcase icon",
  achievement: "Trophy icon",
  residence: "Home icon",
  medical: "Medical icon",
  military: "Medal icon",
  religious: "Church icon",
  other: "Star icon",
};

export const timelineEventFormSchema = z.object({
  eventType: z.enum([
    "birth",
    "death",
    "marriage",
    "divorce",
    "child_born",
    "graduation",
    "career",
    "achievement",
    "residence",
    "medical",
    "military",
    "religious",
    "other",
  ]),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters"),
  description: z
    .string()
    .max(2000, "Description must be less than 2000 characters")
    .optional()
    .or(z.literal("")),
  eventDate: z.string().optional().or(z.literal("")),
  eventYear: z.string().optional().or(z.literal("")),
  location: z
    .string()
    .max(200, "Location must be less than 200 characters")
    .optional()
    .or(z.literal("")),
});

export type TimelineEventFormData = z.infer<typeof timelineEventFormSchema>;

interface TimelineEventFormProps {
  defaultValues?: Partial<TimelineEventFormData>;
  onSubmit: (data: TimelineEventFormData) => void | Promise<void>;
  isPending?: boolean;
  submitLabel?: string;
  onCancel?: () => void;
  cancelLabel?: string;
}

export function TimelineEventForm({
  defaultValues,
  onSubmit,
  isPending = false,
  submitLabel = "Add Event",
  onCancel,
  cancelLabel = "Cancel",
}: TimelineEventFormProps) {
  const form = useForm<TimelineEventFormData>({
    resolver: zodResolver(timelineEventFormSchema),
    defaultValues: {
      eventType: "other",
      title: "",
      description: "",
      eventDate: "",
      eventYear: "",
      location: "",
      ...defaultValues,
    },
  });

  const handleSubmit = async (data: TimelineEventFormData) => {
    await onSubmit(data);
  };

  const selectedEventType = form.watch("eventType");

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-6"
        data-testid="timeline-event-form"
      >
        <FormField
          control={form.control}
          name="eventType"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-medium">Event Type *</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isPending}
              >
                <FormControl>
                  <SelectTrigger className="w-full" data-testid="event-type-select">
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {EVENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {EVENT_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-medium">Title *</FormLabel>
              <FormControl>
                <Input
                  placeholder={`Enter ${EVENT_TYPE_LABELS[selectedEventType]?.toLowerCase() || "event"} title`}
                  className="h-11 text-base"
                  disabled={isPending}
                  data-testid="event-title-input"
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

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="eventDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium">
                  Date (Optional)
                </FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    className="h-11 text-base"
                    disabled={isPending}
                    data-testid="event-date-input"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Full date if known
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="eventYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium">
                  Year Only (Optional)
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g., 1990"
                    min={0}
                    max={9999}
                    className="h-11 text-base"
                    disabled={isPending}
                    data-testid="event-year-input"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormDescription>
                  If exact date unknown
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-medium">
                Location (Optional)
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., New York, NY"
                  className="h-11 text-base"
                  disabled={isPending}
                  data-testid="event-location-input"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-medium">
                Description (Optional)
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add details about this event..."
                  className="min-h-[100px] text-base resize-none"
                  disabled={isPending}
                  data-testid="event-description-input"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {field.value?.length || 0}/2000 characters
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
              data-testid="event-submit-button"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
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
