import { useMemo } from "react";
import {
  Users,
  ArrowUp,
  ArrowDown,
  X,
  Focus,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import type { FamilyMember } from "~/db/schema";
import type { FocusMode } from "~/utils/family-tree-traversal";

interface FocusModeControlsProps {
  allMembers: FamilyMember[];
  focusMemberId: string | null;
  focusMode: FocusMode;
  onFocusMemberChange: (memberId: string | null) => void;
  onFocusModeChange: (mode: FocusMode) => void;
  className?: string;
}

export function FocusModeControls({
  allMembers,
  focusMemberId,
  focusMode,
  onFocusMemberChange,
  onFocusModeChange,
  className,
}: FocusModeControlsProps) {
  // Sort members alphabetically by name for easier selection
  const sortedMembers = useMemo(() => {
    return [...allMembers].sort((a, b) => {
      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [allMembers]);

  // Get the selected member's name for display
  const selectedMemberName = useMemo(() => {
    if (!focusMemberId) return null;
    const member = allMembers.find((m) => m.id === focusMemberId);
    return member ? `${member.firstName} ${member.lastName}` : null;
  }, [focusMemberId, allMembers]);

  // Check if focus mode is active
  const isFocusActive = focusMemberId && focusMode !== "all";

  // Handle clearing the focus
  const handleClearFocus = () => {
    onFocusMemberChange(null);
    onFocusModeChange("all");
  };

  // Handle member selection
  const handleMemberSelect = (value: string) => {
    if (value === "none") {
      handleClearFocus();
    } else {
      onFocusMemberChange(value);
      // If no mode is selected yet, default to ancestors
      if (focusMode === "all") {
        onFocusModeChange("ancestors");
      }
    }
  };

  // Handle mode selection
  const handleModeSelect = (value: string) => {
    onFocusModeChange(value as FocusMode);
  };

  return (
    <div
      className={cn(
        "bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-3",
        className
      )}
      data-testid="focus-mode-controls"
    >
      <div className="flex items-center gap-2 mb-2">
        <Focus className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Focus View
        </h3>
        {isFocusActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFocus}
            className="ml-auto h-6 w-6 p-0"
            title="Clear focus"
            data-testid="clear-focus-button"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Member selector */}
      <div className="space-y-2">
        <Select
          value={focusMemberId || "none"}
          onValueChange={handleMemberSelect}
        >
          <SelectTrigger
            className="w-full h-8 text-xs"
            data-testid="focus-member-select"
          >
            <SelectValue placeholder="Select a member..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none" data-testid="focus-member-option-none">
              <div className="flex items-center gap-2">
                <Users className="h-3 w-3" />
                <span>Show all members</span>
              </div>
            </SelectItem>
            {sortedMembers.map((member) => (
              <SelectItem
                key={member.id}
                value={member.id}
                data-testid={`focus-member-option-${member.id}`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full",
                      member.gender === "male"
                        ? "bg-blue-500"
                        : member.gender === "female"
                        ? "bg-pink-500"
                        : "bg-purple-500"
                    )}
                  />
                  <span>
                    {member.firstName} {member.lastName}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* View mode buttons - only show when a member is selected */}
        {focusMemberId && (
          <div className="flex gap-1" data-testid="focus-mode-buttons">
            <Button
              variant={focusMode === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => handleModeSelect("all")}
              className="flex-1 h-7 text-xs"
              data-testid="focus-mode-all"
            >
              <Users className="h-3 w-3 mr-1" />
              All
            </Button>
            <Button
              variant={focusMode === "ancestors" ? "default" : "outline"}
              size="sm"
              onClick={() => handleModeSelect("ancestors")}
              className="flex-1 h-7 text-xs"
              data-testid="focus-mode-ancestors"
            >
              <ArrowUp className="h-3 w-3 mr-1" />
              Ancestors
            </Button>
            <Button
              variant={focusMode === "descendants" ? "default" : "outline"}
              size="sm"
              onClick={() => handleModeSelect("descendants")}
              className="flex-1 h-7 text-xs"
              data-testid="focus-mode-descendants"
            >
              <ArrowDown className="h-3 w-3 mr-1" />
              Descendants
            </Button>
          </div>
        )}

        {/* Active focus indicator */}
        {isFocusActive && selectedMemberName && (
          <div
            className="mt-2 px-2 py-1.5 bg-primary/10 rounded-md text-xs text-primary dark:text-primary-foreground"
            data-testid="focus-active-indicator"
          >
            <span className="font-medium">
              Showing {focusMode === "ancestors" ? "ancestors" : "descendants"}{" "}
              of {selectedMemberName}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
