import { useState } from "react";
import { Link2, ChevronDown, X } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Checkbox } from "~/components/ui/checkbox";
import { useCreateParentChildRelationship } from "~/hooks/useParentChildRelationships";
import type { FamilyMember, RelationshipType } from "~/db/schema";
import { cn } from "~/lib/utils";

interface AddRelationshipDialogProps {
  familyTreeId: string;
  existingMembers: FamilyMember[];
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const RELATIONSHIP_TYPES: { value: RelationshipType; label: string }[] = [
  { value: "biological", label: "Biological" },
  { value: "adopted", label: "Adopted" },
  { value: "step", label: "Step" },
  { value: "foster", label: "Foster" },
];

export function AddRelationshipDialog({
  familyTreeId,
  existingMembers,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: AddRelationshipDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const [childId, setChildId] = useState<string>("");
  const [parentIds, setParentIds] = useState<string[]>([]);
  const [relationshipType, setRelationshipType] = useState<RelationshipType>("biological");
  const [parentListOpen, setParentListOpen] = useState(false);

  const createRelationship = useCreateParentChildRelationship(familyTreeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!childId || parentIds.length === 0) {
      return;
    }

    // Create relationships for each selected parent
    for (const parentId of parentIds) {
      await createRelationship.mutateAsync({
        familyTreeId,
        parentId,
        childId,
        relationshipType,
      });
    }

    resetAndClose();
  };

  const resetAndClose = () => {
    setOpen(false);
    setChildId("");
    setParentIds([]);
    setRelationshipType("biological");
    setParentListOpen(false);
  };

  const getMemberDisplayName = (member: FamilyMember) => {
    const parts = [member.firstName];
    if (member.middleName) parts.push(member.middleName);
    parts.push(member.lastName);
    return parts.join(" ");
  };

  // Filter out already selected child from the parent dropdown
  const availableParents = existingMembers.filter((m) => m.id !== childId);
  const isControlled = controlledOpen !== undefined;

  const toggleParent = (parentId: string) => {
    setParentIds((prev) =>
      prev.includes(parentId)
        ? prev.filter((id) => id !== parentId)
        : [...prev, parentId]
    );
  };

  const removeParent = (parentId: string) => {
    setParentIds((prev) => prev.filter((id) => id !== parentId));
  };

  const selectedParents = existingMembers.filter((m) => parentIds.includes(m.id));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm">
              <Link2 className="h-4 w-4 mr-2" />
              Add Relationship
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Parent-Child Relationship</DialogTitle>
          <DialogDescription>
            Connect a child to their parent(s). You can select both mother and
            father at once.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Child Selection */}
          <div className="space-y-2">
            <Label htmlFor="child">Child *</Label>
            <Select value={childId} onValueChange={(value) => {
              setChildId(value);
              // Clear parent selection if child changes
              setParentIds([]);
            }}>
              <SelectTrigger id="child" className="w-full">
                <SelectValue placeholder="Select the child" />
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

          {/* Parent Selection - Multi-select */}
          <div className="space-y-2">
            <Label>Parent(s) * <span className="text-muted-foreground font-normal">(select up to 2)</span></Label>

            {/* Selected parents display */}
            {selectedParents.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedParents.map((parent) => (
                  <div
                    key={parent.id}
                    className="flex items-center gap-1 bg-primary/10 text-primary rounded-md px-2 py-1 text-sm"
                  >
                    <span>{getMemberDisplayName(parent)}</span>
                    <button
                      type="button"
                      onClick={() => removeParent(parent.id)}
                      className="hover:bg-primary/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Parent list toggle */}
            <button
              type="button"
              onClick={() => setParentListOpen(!parentListOpen)}
              disabled={!childId}
              className={cn(
                "flex items-center justify-between w-full px-3 py-2 text-sm border rounded-md",
                "bg-background hover:bg-accent hover:text-accent-foreground",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                parentListOpen && "ring-2 ring-ring"
              )}
            >
              <span className={parentIds.length === 0 ? "text-muted-foreground" : ""}>
                {parentIds.length === 0
                  ? "Select parent(s)"
                  : `${parentIds.length} parent${parentIds.length > 1 ? "s" : ""} selected`}
              </span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", parentListOpen && "rotate-180")} />
            </button>

            {/* Parent checkbox list */}
            {parentListOpen && childId && (
              <div className="border rounded-md max-h-48 overflow-y-auto">
                {availableParents.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">No other members available</p>
                ) : (
                  availableParents.map((member) => (
                    <label
                      key={member.id}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-accent",
                        parentIds.includes(member.id) && "bg-accent/50"
                      )}
                    >
                      <Checkbox
                        checked={parentIds.includes(member.id)}
                        onCheckedChange={() => toggleParent(member.id)}
                        disabled={parentIds.length >= 2 && !parentIds.includes(member.id)}
                      />
                      <span className="text-sm">{getMemberDisplayName(member)}</span>
                      {member.gender && (
                        <span className="text-xs text-muted-foreground ml-auto">
                          {member.gender === "male" ? "M" : member.gender === "female" ? "F" : "O"}
                        </span>
                      )}
                    </label>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Relationship Type */}
          <div className="space-y-2">
            <Label htmlFor="relationshipType">Relationship Type</Label>
            <Select
              value={relationshipType}
              onValueChange={(value) => setRelationshipType(value as RelationshipType)}
            >
              <SelectTrigger id="relationshipType" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIP_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Biological = birth parent, Adopted = legal adoption, Step = marriage to birth parent, Foster = temporary care
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={resetAndClose}
              disabled={createRelationship.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!childId || parentIds.length === 0 || createRelationship.isPending}
            >
              {createRelationship.isPending
                ? "Adding..."
                : parentIds.length > 1
                ? `Add ${parentIds.length} Relationships`
                : "Add Relationship"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
