import { useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useCreateMarriageConnection } from "~/hooks/useMarriageConnections";
import type { FamilyMember, MarriageStatus } from "~/db/schema";

interface AddMarriageDialogProps {
  familyTreeId: string;
  existingMembers: FamilyMember[];
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const MARRIAGE_STATUSES: { value: MarriageStatus; label: string }[] = [
  { value: "married", label: "Married" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
  { value: "separated", label: "Separated" },
  { value: "annulled", label: "Annulled" },
];

export function AddMarriageDialog({
  familyTreeId,
  existingMembers,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: AddMarriageDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const [spouse1Id, setSpouse1Id] = useState<string>("");
  const [spouse2Id, setSpouse2Id] = useState<string>("");
  const [marriageDate, setMarriageDate] = useState<string>("");
  const [marriagePlace, setMarriagePlace] = useState<string>("");
  const [divorceDate, setDivorceDate] = useState<string>("");
  const [status, setStatus] = useState<MarriageStatus>("married");

  const createMarriage = useCreateMarriageConnection(familyTreeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!spouse1Id || !spouse2Id) {
      return;
    }

    await createMarriage.mutateAsync({
      familyTreeId,
      spouse1Id,
      spouse2Id,
      marriageDate: marriageDate || null,
      marriagePlace: marriagePlace || null,
      divorceDate: divorceDate || null,
      status,
    });

    resetAndClose();
  };

  const resetAndClose = () => {
    setOpen(false);
    setSpouse1Id("");
    setSpouse2Id("");
    setMarriageDate("");
    setMarriagePlace("");
    setDivorceDate("");
    setStatus("married");
  };

  const getMemberDisplayName = (member: FamilyMember) => {
    const parts = [member.firstName];
    if (member.middleName) parts.push(member.middleName);
    parts.push(member.lastName);
    return parts.join(" ");
  };

  // Filter out already selected spouse from the other dropdown
  const availableForSpouse2 = existingMembers.filter(
    (m) => m.id !== spouse1Id
  );

  const showDivorceDate = status === "divorced";
  const isControlled = controlledOpen !== undefined;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm">
              <Heart className="h-4 w-4 mr-2" />
              Add Marriage
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Marriage Connection</DialogTitle>
          <DialogDescription>
            Create a marriage connection between two family members.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Spouse 1 */}
          <div className="space-y-2">
            <Label htmlFor="spouse1">First Spouse *</Label>
            <Select value={spouse1Id} onValueChange={setSpouse1Id}>
              <SelectTrigger id="spouse1" className="w-full">
                <SelectValue placeholder="Select first spouse" />
              </SelectTrigger>
              <SelectContent>
                {existingMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {getMemberDisplayName(member)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Spouse 2 */}
          <div className="space-y-2">
            <Label htmlFor="spouse2">Second Spouse *</Label>
            <Select
              value={spouse2Id}
              onValueChange={setSpouse2Id}
              disabled={!spouse1Id}
            >
              <SelectTrigger id="spouse2" className="w-full">
                <SelectValue placeholder="Select second spouse" />
              </SelectTrigger>
              <SelectContent>
                {availableForSpouse2.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {getMemberDisplayName(member)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Marriage Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as MarriageStatus)}
            >
              <SelectTrigger id="status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MARRIAGE_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Marriage Date */}
          <div className="space-y-2">
            <Label htmlFor="marriageDate">Marriage Date</Label>
            <Input
              id="marriageDate"
              type="date"
              value={marriageDate}
              onChange={(e) => setMarriageDate(e.target.value)}
            />
          </div>

          {/* Marriage Place */}
          <div className="space-y-2">
            <Label htmlFor="marriagePlace">Marriage Place</Label>
            <Input
              id="marriagePlace"
              type="text"
              placeholder="e.g., Manila, Philippines"
              value={marriagePlace}
              onChange={(e) => setMarriagePlace(e.target.value)}
            />
          </div>

          {/* Divorce Date (conditional) */}
          {showDivorceDate && (
            <div className="space-y-2">
              <Label htmlFor="divorceDate">Divorce Date *</Label>
              <Input
                id="divorceDate"
                type="date"
                value={divorceDate}
                onChange={(e) => setDivorceDate(e.target.value)}
                required
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={resetAndClose}
              disabled={createMarriage.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                !spouse1Id || !spouse2Id || createMarriage.isPending
              }
            >
              {createMarriage.isPending ? "Adding..." : "Add Marriage"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
