"use client";

import { useState } from "react";
import { History } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { TreeActivityLog } from "./TreeActivityLog";

interface TreeActivityLogDialogProps {
  familyTreeId: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TreeActivityLogDialog({
  familyTreeId,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: TreeActivityLogDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen ?? internalOpen;
  const setIsOpen = controlledOnOpenChange ?? setInternalOpen;
  const isControlled = controlledOpen !== undefined;

  return (
    <>
      {!isControlled && (trigger ? (
        <div onClick={() => setIsOpen(true)}>{trigger}</div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
          data-testid="activity-log-trigger"
        >
          <History className="h-4 w-4 mr-2" />
          Activity
        </Button>
      ))}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Activity Log
            </DialogTitle>
            <DialogDescription>
              Timeline of all changes made to this family tree
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-hidden">
            <TreeActivityLog familyTreeId={familyTreeId} maxHeight="calc(85vh - 150px)" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
