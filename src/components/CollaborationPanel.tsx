import { useState } from "react";
import { Users, Activity, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  CollaboratorAvatars,
  RecentActivityFeed,
  CollaborationStatusBadge,
} from "~/components/CollaborationIndicators";
import { cn } from "~/lib/utils";
import { useCollaboration, type Collaborator } from "~/hooks/useCollaboration";

interface CollaborationPanelProps {
  familyTreeId: string;
  className?: string;
}

/**
 * Main collaboration panel shown in the tree visualization
 * Displays active collaborators, current editors, and recent activity
 */
export function CollaborationPanel({
  familyTreeId,
  className,
}: CollaborationPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"collaborators" | "activity">(
    "collaborators"
  );

  const {
    isConnected,
    isLoading,
    collaborators,
    locks,
    recentActivities,
  } = useCollaboration(familyTreeId);

  // Don't render anything if loading or no collaboration features
  if (isLoading) {
    return null;
  }

  const activeEditors = collaborators.filter(
    (c: Collaborator) => c.status === "editing" && c.editingEntityId
  );

  return (
    <div
      className={cn(
        "bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden transition-all duration-200",
        isExpanded ? "w-80" : "w-auto",
        className
      )}
    >
      {/* Header - Always visible */}
      <div
        className="flex items-center justify-between gap-2 p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <CollaborationStatusBadge
            isConnected={isConnected}
            collaboratorCount={collaborators.length}
          />
          {!isExpanded && collaborators.length > 0 && (
            <CollaboratorAvatars
              collaborators={collaborators}
              maxDisplay={3}
            />
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-slate-200 dark:border-slate-700">
          {/* Tab buttons */}
          <div className="flex border-b border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab("collaborators")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors",
                activeTab === "collaborators"
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-slate-50 dark:hover:bg-slate-700/50"
              )}
            >
              <Users className="h-4 w-4" />
              Collaborators
              {collaborators.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-slate-100 dark:bg-slate-700 rounded-full">
                  {collaborators.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("activity")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors",
                activeTab === "activity"
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-slate-50 dark:hover:bg-slate-700/50"
              )}
            >
              <Activity className="h-4 w-4" />
              Activity
            </button>
          </div>

          {/* Tab content */}
          <div className="p-3 max-h-80 overflow-y-auto">
            {activeTab === "collaborators" ? (
              <div className="space-y-4">
                {/* Active editors section */}
                {activeEditors.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Currently Editing
                    </h4>
                    <div className="space-y-2">
                      {activeEditors.map((editor: Collaborator) => (
                        <CollaboratorItem
                          key={editor.user.id}
                          collaborator={editor}
                          isEditing
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* All collaborators section */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {activeEditors.length > 0 ? "Other Viewers" : "Viewing"}
                  </h4>
                  {collaborators.filter(
                    (c: Collaborator) => c.status !== "editing" || !c.editingEntityId
                  ).length > 0 ? (
                    <div className="space-y-2">
                      {collaborators
                        .filter(
                          (c: Collaborator) => c.status !== "editing" || !c.editingEntityId
                        )
                        .map((collaborator: Collaborator) => (
                          <CollaboratorItem
                            key={collaborator.user.id}
                            collaborator={collaborator}
                          />
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {collaborators.length === 0
                        ? "You're the only one here"
                        : "Everyone is editing"}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <RecentActivityFeed
                activities={recentActivities}
                maxDisplay={15}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Collaborator Item Component
// ============================================

interface CollaboratorItemProps {
  collaborator: {
    user: {
      id: string;
      name: string;
      email: string;
      image: string | null;
    };
    status: string;
    editingEntityId?: string | null;
    editingEntityType?: string | null;
  };
  isEditing?: boolean;
}

function CollaboratorItem({ collaborator, isEditing }: CollaboratorItemProps) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
      <div className="relative">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
          {collaborator.user.image ? (
            <img
              src={collaborator.user.image}
              alt={collaborator.user.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xs font-medium text-primary">
              {collaborator.user.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </span>
          )}
        </div>
        {/* Status indicator */}
        <span
          className={cn(
            "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-700",
            isEditing
              ? "bg-amber-500"
              : collaborator.status === "active"
              ? "bg-green-500"
              : "bg-gray-400"
          )}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
          {collaborator.user.name}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {isEditing && collaborator.editingEntityType
            ? `Editing ${collaborator.editingEntityType.toLowerCase()}`
            : collaborator.status === "active"
            ? "Viewing"
            : collaborator.status === "idle"
            ? "Idle"
            : "Away"}
        </p>
      </div>
    </div>
  );
}

// ============================================
// Compact Collaboration Badge
// ============================================

interface CollaborationBadgeProps {
  familyTreeId: string;
  className?: string;
}

/**
 * A compact badge showing collaboration status, suitable for headers
 */
export function CollaborationBadge({
  familyTreeId,
  className,
}: CollaborationBadgeProps) {
  const { isConnected, collaborators } = useCollaboration(familyTreeId);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <CollaborationStatusBadge
        isConnected={isConnected}
        collaboratorCount={collaborators.length}
      />
      {collaborators.length > 0 && (
        <CollaboratorAvatars collaborators={collaborators} maxDisplay={3} />
      )}
    </div>
  );
}
