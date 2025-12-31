import { GitBranch, Layers } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export type ViewMode = "tree" | "generation";

interface ViewModeSelectorProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  className?: string;
}

export function ViewModeSelector({
  viewMode,
  onViewModeChange,
  className,
}: ViewModeSelectorProps) {
  return (
    <div
      className={cn(
        "bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-3",
        className
      )}
      data-testid="view-mode-selector"
    >
      <div className="flex items-center gap-2 mb-2">
        <Layers className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          View Mode
        </h3>
      </div>

      <div className="flex gap-1" data-testid="view-mode-buttons">
        <Button
          variant={viewMode === "tree" ? "default" : "outline"}
          size="sm"
          onClick={() => onViewModeChange("tree")}
          className="flex-1 h-7 text-xs"
          data-testid="view-mode-tree"
        >
          <GitBranch className="h-3 w-3 mr-1" />
          Tree View
        </Button>
        <Button
          variant={viewMode === "generation" ? "default" : "outline"}
          size="sm"
          onClick={() => onViewModeChange("generation")}
          className="flex-1 h-7 text-xs"
          data-testid="view-mode-generation"
        >
          <Layers className="h-3 w-3 mr-1" />
          By Generation
        </Button>
      </div>

      {/* View mode description */}
      <div className="mt-2 text-[10px] text-muted-foreground">
        {viewMode === "tree" ? (
          <span>Traditional family tree layout with parent-child connections</span>
        ) : (
          <span>Members organized by generation level, stacked horizontally</span>
        )}
      </div>
    </div>
  );
}
