import { useState } from "react";
import { Edit } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { FamilyMemberForm, type FamilyMemberSubmitData } from "~/components/FamilyMemberForm";
import { useUpdateFamilyMemberWithImage } from "~/hooks/useFamilyMembers";
import type { FamilyMember } from "~/db/schema";

interface EditFamilyMemberDialogProps {
  familyTreeId: string;
  member: FamilyMember;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditFamilyMemberDialog({
  familyTreeId,
  member,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSuccess,
}: EditFamilyMemberDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  const updateMember = useUpdateFamilyMemberWithImage(familyTreeId);

  const handleSubmit = async (data: FamilyMemberSubmitData, imageFile?: File) => {
    await updateMember.mutateAsync({
      id: member.id,
      firstName: data.firstName,
      middleName: data.middleName,
      lastName: data.lastName,
      nickname: data.nickname,
      gender: data.gender,
      birthDate: data.birthDate,
      birthPlace: data.birthPlace,
      deathDate: data.deathDate,
      deathPlace: data.deathPlace,
      bio: data.bio,
      imageFile,
      // Keep existing profile image if no new image is uploaded
      profileImageUrl: imageFile ? undefined : member.profileImageUrl,
    });
    setOpen(false);
    onSuccess?.();
  };

  // Prepare default values from the existing member
  const defaultValues = {
    firstName: member.firstName,
    middleName: member.middleName || "",
    lastName: member.lastName,
    nickname: member.nickname || "",
    gender: member.gender,
    birthDate: member.birthDate || "",
    birthPlace: member.birthPlace || "",
    deathDate: member.deathDate || "",
    deathPlace: member.deathPlace || "",
    bio: member.bio || "",
  };

  const dialogContent = (
    <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" data-testid="edit-member-dialog">
      <DialogHeader>
        <DialogTitle>Edit Family Member</DialogTitle>
        <DialogDescription>
          Update the information for {member.firstName} {member.lastName}.
        </DialogDescription>
      </DialogHeader>
      <FamilyMemberForm
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        onCancel={() => setOpen(false)}
        isPending={updateMember.isPending}
        submitLabel="Save Changes"
        submitIcon={<Edit className="h-4 w-4 mr-2" />}
        existingMembers={[]}
        showRelationshipFields={false}
        existingProfileImageUrl={member.profileImageUrl}
      />
    </DialogContent>
  );

  // If we have a trigger, render the full Dialog with trigger
  if (trigger) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
        {dialogContent}
      </Dialog>
    );
  }

  // Otherwise, render just the Dialog (for controlled mode from parent)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {dialogContent}
    </Dialog>
  );
}
