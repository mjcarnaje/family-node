import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  FamilyMemberForm,
  type FamilyMemberSubmitData,
} from "~/components/FamilyMemberForm";
import { DuplicateMemberWarning } from "~/components/DuplicateMemberWarning";
import { useCreateFamilyMemberWithRelationship } from "~/hooks/useFamilyMembers";
import { useMemberDuplicateDetection } from "~/hooks/useMemberDuplicateDetection";
import type { FamilyMember } from "~/db/schema";
import type { DuplicateDetectionResult } from "~/utils/member-duplicate-detection";

interface AddFamilyMemberDialogProps {
  familyTreeId: string;
  existingMembers?: FamilyMember[];
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddFamilyMemberDialog({
  familyTreeId,
  existingMembers = [],
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: AddFamilyMemberDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const [duplicateWarning, setDuplicateWarning] =
    useState<DuplicateDetectionResult | null>(null);
  const [pendingSubmitData, setPendingSubmitData] = useState<{
    data: FamilyMemberSubmitData;
    imageFile?: File;
  } | null>(null);

  const createMember = useCreateFamilyMemberWithRelationship(familyTreeId);
  const duplicateCheck = useMemberDuplicateDetection(familyTreeId);

  const handleSubmit = async (
    data: FamilyMemberSubmitData,
    imageFile?: File
  ) => {
    // Check for duplicates first (only if there are existing members)
    if (existingMembers.length > 0) {
      try {
        const result = await duplicateCheck.mutateAsync({
          firstName: data.firstName,
          lastName: data.lastName,
          middleName: data.middleName,
          birthDate: data.birthDate,
        });

        if (result.hasPotentialDuplicates) {
          // Show warning and save pending data
          setDuplicateWarning(result);
          setPendingSubmitData({ data, imageFile });
          return;
        }
      } catch (error) {
        // If duplicate check fails, proceed with creation anyway
        console.error("Duplicate check failed:", error);
      }
    }

    // No duplicates found, proceed with creation
    await createMemberAndClose(data, imageFile);
  };

  const createMemberAndClose = async (
    data: FamilyMemberSubmitData,
    imageFile?: File
  ) => {
    await createMember.mutateAsync({
      familyTreeId,
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
      relatedMemberId: data.relatedMemberId,
      relationshipDirection: data.relationshipDirection,
      relationshipType: data.relationshipType,
      imageFile,
    });
    resetAndClose();
  };

  const handleProceedAnyway = async () => {
    if (pendingSubmitData) {
      await createMemberAndClose(
        pendingSubmitData.data,
        pendingSubmitData.imageFile
      );
    }
  };

  const handleCancelDuplicateWarning = () => {
    // Clear warning and let user review the form
    setDuplicateWarning(null);
    setPendingSubmitData(null);
  };

  const resetAndClose = () => {
    setOpen(false);
    setDuplicateWarning(null);
    setPendingSubmitData(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      setDuplicateWarning(null);
      setPendingSubmitData(null);
    }
    setOpen(newOpen);
  };

  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Family Member</DialogTitle>
          <DialogDescription>
            Add a new family member to your tree. You can optionally connect
            them to an existing member.
          </DialogDescription>
        </DialogHeader>

        {/* Show duplicate warning if detected */}
        {duplicateWarning && duplicateWarning.hasPotentialDuplicates && (
          <DuplicateMemberWarning
            result={duplicateWarning}
            onProceedAnyway={handleProceedAnyway}
            onCancel={handleCancelDuplicateWarning}
            isLoading={createMember.isPending}
          />
        )}

        {/* Only show form when not showing duplicate warning */}
        {!duplicateWarning && (
          <FamilyMemberForm
            onSubmit={handleSubmit}
            onCancel={() => resetAndClose()}
            isPending={createMember.isPending || duplicateCheck.isPending}
            existingMembers={existingMembers}
            showRelationshipFields={existingMembers.length > 0}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
