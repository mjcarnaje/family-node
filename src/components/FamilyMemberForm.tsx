import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, UserPlus, Upload, X } from "lucide-react";
import { useState, useRef } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import type { FamilyMember, RelationshipType } from "~/db/schema";

// Gender options
const GENDER_OPTIONS = ["male", "female", "other"] as const;
type Gender = (typeof GENDER_OPTIONS)[number];

const GENDER_LABELS: Record<Gender, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
};

// Relationship type options
const RELATIONSHIP_TYPE_OPTIONS = [
  "biological",
  "adopted",
  "step",
  "foster",
] as const;

const RELATIONSHIP_TYPE_LABELS: Record<RelationshipType, string> = {
  biological: "Biological",
  adopted: "Adopted",
  step: "Step",
  foster: "Foster",
};

// Form validation schema
export const familyMemberFormSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(100, "First name must be less than 100 characters"),
  middleName: z
    .string()
    .max(100, "Middle name must be less than 100 characters")
    .optional()
    .or(z.literal("")),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(100, "Last name must be less than 100 characters"),
  nickname: z
    .string()
    .max(100, "Nickname must be less than 100 characters")
    .optional()
    .or(z.literal("")),
  gender: z.enum(GENDER_OPTIONS).nullable().optional(),
  birthDate: z.string().optional().or(z.literal("")),
  birthPlace: z
    .string()
    .max(200, "Birth place must be less than 200 characters")
    .optional()
    .or(z.literal("")),
  deathDate: z.string().optional().or(z.literal("")),
  deathPlace: z
    .string()
    .max(200, "Death place must be less than 200 characters")
    .optional()
    .or(z.literal("")),
  bio: z
    .string()
    .max(5000, "Bio must be less than 5000 characters")
    .optional()
    .or(z.literal("")),
  // Relationship fields (for connecting to existing members)
  relatedMemberId: z.string().optional().or(z.literal("")),
  relationshipDirection: z.enum(["parent", "child"]).optional(),
  relationshipType: z.enum(RELATIONSHIP_TYPE_OPTIONS).optional(),
}).refine(
  (data) => {
    // Skip validation if either date is missing
    if (!data.birthDate || !data.deathDate) return true;
    // Death date must be after or equal to birth date
    return new Date(data.deathDate) >= new Date(data.birthDate);
  },
  {
    message: "Death date must be after birth date",
    path: ["deathDate"],
  }
);

export type FamilyMemberFormData = z.infer<typeof familyMemberFormSchema>;

/** Data submitted by the family member form */
export interface FamilyMemberSubmitData {
  firstName: string;
  middleName?: string | null;
  lastName: string;
  nickname?: string | null;
  gender?: Gender | null;
  birthDate?: string | null;
  birthPlace?: string | null;
  deathDate?: string | null;
  deathPlace?: string | null;
  bio?: string | null;
  profileImageUrl?: string | null;
  // Relationship data
  relatedMemberId?: string;
  relationshipDirection?: "parent" | "child";
  relationshipType?: RelationshipType;
}

interface FamilyMemberFormProps {
  defaultValues?: Partial<FamilyMemberFormData>;
  onSubmit: (data: FamilyMemberSubmitData, imageFile?: File) => void | Promise<void>;
  isPending?: boolean;
  submitLabel?: string;
  submitIcon?: React.ReactNode;
  onCancel?: () => void;
  cancelLabel?: string;
  /** Existing family members for relationship selection */
  existingMembers?: FamilyMember[];
  /** Whether to show relationship fields */
  showRelationshipFields?: boolean;
  /** Existing profile image URL for edit mode */
  existingProfileImageUrl?: string | null;
}

export function FamilyMemberForm({
  defaultValues,
  onSubmit,
  isPending = false,
  submitLabel = "Add Member",
  submitIcon = <UserPlus className="h-4 w-4 mr-2" />,
  onCancel,
  cancelLabel = "Cancel",
  existingMembers = [],
  showRelationshipFields = true,
  existingProfileImageUrl,
}: FamilyMemberFormProps) {
  // Initialize image preview with existing profile image URL if available
  const [imagePreview, setImagePreview] = useState<string | null>(existingProfileImageUrl || null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FamilyMemberFormData>({
    resolver: zodResolver(familyMemberFormSchema),
    defaultValues: {
      firstName: "",
      middleName: "",
      lastName: "",
      nickname: "",
      gender: null,
      birthDate: "",
      birthPlace: "",
      deathDate: "",
      deathPlace: "",
      bio: "",
      relatedMemberId: "",
      relationshipDirection: undefined,
      relationshipType: undefined,
      ...defaultValues,
    },
  });

  const watchRelatedMember = form.watch("relatedMemberId");

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (data: FamilyMemberFormData) => {
    await onSubmit(
      {
        firstName: data.firstName,
        middleName: data.middleName || null,
        lastName: data.lastName,
        nickname: data.nickname || null,
        gender: data.gender || null,
        birthDate: data.birthDate || null,
        birthPlace: data.birthPlace || null,
        deathDate: data.deathDate || null,
        deathPlace: data.deathPlace || null,
        bio: data.bio || null,
        relatedMemberId: data.relatedMemberId || undefined,
        relationshipDirection: data.relationshipDirection,
        relationshipType: data.relationshipType,
      },
      imageFile || undefined
    );
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-6"
      >
        {/* Profile Image Upload */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Avatar className="h-24 w-24">
              <AvatarImage src={imagePreview || undefined} alt="Profile preview" />
              <AvatarFallback className="text-lg">
                {form.watch("firstName") && form.watch("lastName")
                  ? getInitials(form.watch("firstName"), form.watch("lastName"))
                  : "?"}
              </AvatarFallback>
            </Avatar>
            {imagePreview && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                onClick={handleRemoveImage}
                disabled={isPending}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <div className="flex flex-col items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Photo
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              JPG, PNG or GIF. Max 5MB.
            </p>
          </div>
        </div>

        {/* Name Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium">
                  First Name *
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter first name"
                    className="h-11 text-base"
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium">
                  Last Name *
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter last name"
                    className="h-11 text-base"
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="middleName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium">
                  Middle Name
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter middle name (optional)"
                    className="h-11 text-base"
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nickname"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium">Nickname</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter nickname (optional)"
                    className="h-11 text-base"
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Gender and Birth Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium">Gender</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value || null)}
                  value={field.value || ""}
                  disabled={isPending}
                >
                  <FormControl>
                    <SelectTrigger className="w-full h-11">
                      <SelectValue placeholder="Select gender (optional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {GENDER_OPTIONS.map((gender) => (
                      <SelectItem key={gender} value={gender}>
                        {GENDER_LABELS[gender]}
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
            name="birthDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-medium">
                  Birth Date
                </FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    className="h-11 text-base"
                    disabled={isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Birth Place */}
        <FormField
          control={form.control}
          name="birthPlace"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-medium">
                Birth Place
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter birth place (optional)"
                  className="h-11 text-base"
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                City, State/Province, Country
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Death Date and Death Place */}
        <div className="space-y-4 pt-4 border-t border-border">
          <h3 className="text-base font-medium text-muted-foreground">
            Death Information (if applicable)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="deathDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    Death Date
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      className="h-11 text-base"
                      disabled={isPending}
                      data-testid="death-date-input"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="deathPlace"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    Death Place
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter death place (optional)"
                      className="h-11 text-base"
                      disabled={isPending}
                      data-testid="death-place-input"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    City, State/Province, Country
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Bio */}
        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-medium">Bio</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Write a short bio (optional)"
                  className="min-h-[100px] text-base resize-none"
                  disabled={isPending}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {field.value?.length || 0}/5000 characters
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Relationship Fields */}
        {showRelationshipFields && existingMembers.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="text-base font-medium">
              Relationship to Existing Member (Optional)
            </h3>
            <p className="text-sm text-muted-foreground">
              Connect this person to an existing family member in your tree.
            </p>

            <FormField
              control={form.control}
              name="relatedMemberId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-medium">
                    Related To
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ""}
                    disabled={isPending}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full h-11">
                        <SelectValue placeholder="Select a family member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {existingMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.firstName} {member.lastName}
                          {member.nickname && ` (${member.nickname})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchRelatedMember && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="relationshipDirection"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Relationship
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                        disabled={isPending}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full h-11">
                            <SelectValue placeholder="Select relationship" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="parent">
                            This person is a parent of the selected member
                          </SelectItem>
                          <SelectItem value="child">
                            This person is a child of the selected member
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Define how this person relates to the selected member
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="relationshipType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium">
                        Relationship Type
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                        disabled={isPending}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full h-11">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {RELATIONSHIP_TYPE_OPTIONS.map((type) => (
                            <SelectItem key={type} value={type}>
                              {RELATIONSHIP_TYPE_LABELS[type]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>
        )}

        {/* Form Actions */}
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
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
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
