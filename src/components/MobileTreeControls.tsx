import { useState, useCallback, useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import {
  Menu,
  X,
  Search,
  Filter,
  Focus,
  LayoutGrid,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Info,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { TreeSearchBar } from "~/components/TreeSearchBar";
import { FamilyTreeFilters, type TreeFilterState } from "~/components/FamilyTreeFilters";
import { FocusModeControls } from "~/components/FocusModeControls";
import { ViewModeSelector, type ViewMode } from "~/components/ViewModeSelector";
import { cn } from "~/lib/utils";
import type { FamilyMember } from "~/db/schema";
import type { FocusMode } from "~/utils/family-tree-traversal";

interface MobileTreeControlsProps {
  allMembers: FamilyMember[];
  filters: TreeFilterState;
  onFiltersChange: (filters: TreeFilterState) => void;
  availableGenerations: number[];
  focusMemberId: string | null;
  focusMode: FocusMode;
  onFocusMemberChange: (memberId: string | null) => void;
  onFocusModeChange: (mode: FocusMode) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onSearchMemberSelect: (memberId: string) => void;
  treeName?: string;
  memberCount: number;
  relationshipCount: number;
}

type ActivePanel = "none" | "search" | "filters" | "focus" | "view" | "info";

export function MobileTreeControls({
  allMembers,
  filters,
  onFiltersChange,
  availableGenerations,
  focusMemberId,
  focusMode,
  onFocusMemberChange,
  onFocusModeChange,
  viewMode,
  onViewModeChange,
  onSearchMemberSelect,
  treeName,
  memberCount,
  relationshipCount,
}: MobileTreeControlsProps) {
  const [activePanel, setActivePanel] = useState<ActivePanel>("none");
  const [showZoomControls, setShowZoomControls] = useState(false);
  const reactFlowInstance = useReactFlow();

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Don't close if clicking within the controls
      if (target.closest('[data-mobile-controls]')) return;
      setActivePanel("none");
    };

    if (activePanel !== "none") {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [activePanel]);

  const togglePanel = useCallback((panel: ActivePanel) => {
    setActivePanel((current) => (current === panel ? "none" : panel));
  }, []);

  const handleZoomIn = useCallback(() => {
    reactFlowInstance.zoomIn({ duration: 200 });
  }, [reactFlowInstance]);

  const handleZoomOut = useCallback(() => {
    reactFlowInstance.zoomOut({ duration: 200 });
  }, [reactFlowInstance]);

  const handleFitView = useCallback(() => {
    reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
  }, [reactFlowInstance]);

  // Check if filters are active
  const hasActiveFilters =
    filters.generations.length > 0 ||
    filters.genders.length > 0 ||
    filters.relationshipTypes.length > 0 ||
    filters.marriageStatuses.length > 0 ||
    !filters.showDeceased ||
    !filters.showParentChildLines ||
    !filters.showMarriageLines ||
    !filters.showSiblingLines;

  const hasFocusActive = focusMemberId && focusMode !== "all";

  return (
    <div data-mobile-controls className="md:hidden">
      {/* Mobile Floating Action Buttons - Bottom right */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {/* Zoom controls toggle */}
        {showZoomControls && (
          <div className="flex flex-col gap-2 mb-2 animate-fadeIn">
            <Button
              size="icon"
              variant="secondary"
              className="h-11 w-11 rounded-full shadow-lg"
              onClick={handleZoomIn}
              aria-label="Zoom in"
            >
              <ZoomIn className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="h-11 w-11 rounded-full shadow-lg"
              onClick={handleZoomOut}
              aria-label="Zoom out"
            >
              <ZoomOut className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="h-11 w-11 rounded-full shadow-lg"
              onClick={handleFitView}
              aria-label="Fit to view"
            >
              <Maximize2 className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Zoom toggle button */}
        <Button
          size="icon"
          variant="outline"
          className="h-11 w-11 rounded-full shadow-lg bg-white dark:bg-slate-800"
          onClick={() => setShowZoomControls(!showZoomControls)}
          aria-label={showZoomControls ? "Hide zoom controls" : "Show zoom controls"}
        >
          {showZoomControls ? (
            <ChevronDown className="h-5 w-5" />
          ) : (
            <ZoomIn className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around py-2 px-2">
          {/* Search button */}
          <Button
            variant={activePanel === "search" ? "default" : "ghost"}
            size="sm"
            className={cn(
              "flex-1 flex flex-col items-center gap-0.5 h-auto py-2",
              "min-w-[36px] min-h-[36px]"
            )}
            onClick={(e) => {
              e.stopPropagation();
              togglePanel("search");
            }}
            aria-label="Search members"
            aria-expanded={activePanel === "search"}
          >
            <Search className="h-5 w-5" />
            <span className="text-[10px]">Search</span>
          </Button>

          {/* Filters button */}
          <Button
            variant={activePanel === "filters" ? "default" : "ghost"}
            size="sm"
            className={cn(
              "flex-1 flex flex-col items-center gap-0.5 h-auto py-2 relative",
              "min-w-[36px] min-h-[36px]"
            )}
            onClick={(e) => {
              e.stopPropagation();
              togglePanel("filters");
            }}
            aria-label="Filters"
            aria-expanded={activePanel === "filters"}
          >
            <Filter className="h-5 w-5" />
            <span className="text-[10px]">Filters</span>
            {hasActiveFilters && (
              <span className="absolute top-1 right-1/4 w-2 h-2 bg-primary rounded-full" />
            )}
          </Button>

          {/* Focus button */}
          <Button
            variant={activePanel === "focus" ? "default" : "ghost"}
            size="sm"
            className={cn(
              "flex-1 flex flex-col items-center gap-0.5 h-auto py-2 relative",
              "min-w-[36px] min-h-[36px]"
            )}
            onClick={(e) => {
              e.stopPropagation();
              togglePanel("focus");
            }}
            aria-label="Focus view"
            aria-expanded={activePanel === "focus"}
          >
            <Focus className="h-5 w-5" />
            <span className="text-[10px]">Focus</span>
            {hasFocusActive && (
              <span className="absolute top-1 right-1/4 w-2 h-2 bg-green-500 rounded-full" />
            )}
          </Button>

          {/* View mode button */}
          <Button
            variant={activePanel === "view" ? "default" : "ghost"}
            size="sm"
            className={cn(
              "flex-1 flex flex-col items-center gap-0.5 h-auto py-2",
              "min-w-[36px] min-h-[36px]"
            )}
            onClick={(e) => {
              e.stopPropagation();
              togglePanel("view");
            }}
            aria-label="View mode"
            aria-expanded={activePanel === "view"}
          >
            <LayoutGrid className="h-5 w-5" />
            <span className="text-[10px]">View</span>
          </Button>

          {/* Info button */}
          <Button
            variant={activePanel === "info" ? "default" : "ghost"}
            size="sm"
            className={cn(
              "flex-1 flex flex-col items-center gap-0.5 h-auto py-2",
              "min-w-[36px] min-h-[36px]"
            )}
            onClick={(e) => {
              e.stopPropagation();
              togglePanel("info");
            }}
            aria-label="Tree info"
            aria-expanded={activePanel === "info"}
          >
            <Info className="h-5 w-5" />
            <span className="text-[10px]">Info</span>
          </Button>
        </div>
      </div>

      {/* Bottom Sheet Panels */}
      {activePanel !== "none" && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-30 bg-black/20"
            onClick={() => setActivePanel("none")}
          />

          {/* Panel */}
          <div
            className="mobile-bottom-sheet mobile-panel-enter z-40"
            role="dialog"
            aria-label={`${activePanel} panel`}
          >
            {/* Handle */}
            <div className="mobile-sheet-handle" />

            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8"
              onClick={() => setActivePanel("none")}
              aria-label="Close panel"
            >
              <X className="h-4 w-4" />
            </Button>

            {/* Panel content */}
            <div className="px-4 pb-6 touch-scroll">
              {activePanel === "search" && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Search Members</h3>
                  <TreeSearchBar
                    allMembers={allMembers}
                    onMemberSelect={(id) => {
                      onSearchMemberSelect(id);
                      setActivePanel("none");
                    }}
                    className="shadow-none border-0 p-0"
                  />
                </div>
              )}

              {activePanel === "filters" && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Filters</h3>
                  <FamilyTreeFilters
                    filters={filters}
                    onFiltersChange={onFiltersChange}
                    availableGenerations={availableGenerations}
                    className="shadow-none border-0 p-0"
                  />
                </div>
              )}

              {activePanel === "focus" && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Focus View</h3>
                  <FocusModeControls
                    allMembers={allMembers}
                    focusMemberId={focusMemberId}
                    focusMode={focusMode}
                    onFocusMemberChange={onFocusMemberChange}
                    onFocusModeChange={onFocusModeChange}
                    className="shadow-none border-0 p-0"
                  />
                </div>
              )}

              {activePanel === "view" && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">View Mode</h3>
                  <ViewModeSelector
                    viewMode={viewMode}
                    onViewModeChange={(mode) => {
                      onViewModeChange(mode);
                    }}
                    className="shadow-none border-0 p-0"
                  />
                  <div className="pt-4 space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Zoom Controls
                    </h4>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 h-12"
                        onClick={handleZoomOut}
                      >
                        <ZoomOut className="h-5 w-5 mr-2" />
                        Zoom Out
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 h-12"
                        onClick={handleZoomIn}
                      >
                        <ZoomIn className="h-5 w-5 mr-2" />
                        Zoom In
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full h-12"
                      onClick={handleFitView}
                    >
                      <Maximize2 className="h-5 w-5 mr-2" />
                      Fit to View
                    </Button>
                  </div>
                </div>
              )}

              {activePanel === "info" && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Tree Information</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Tree Name</p>
                      <p className="font-medium">{treeName || "Family Tree"}</p>
                    </div>
                    <div className="flex gap-6">
                      <div>
                        <p className="text-sm text-muted-foreground">Members</p>
                        <p className="text-2xl font-bold">{memberCount}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Relationships</p>
                        <p className="text-2xl font-bold">{relationshipCount}</p>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Legend */}
                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium mb-3">Legend</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        <span>Male</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-pink-500" />
                        <span>Female</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500" />
                        <span>Other</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span>Focused</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
