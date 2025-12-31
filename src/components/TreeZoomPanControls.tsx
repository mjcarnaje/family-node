import { useCallback, useEffect, useState } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  Move,
  RotateCcw,
  Target,
} from "lucide-react";
import { useReactFlow, useViewport } from "@xyflow/react";
import { Button } from "~/components/ui/button";
import { Tooltip } from "~/components/ui/tooltip";
import { Slider } from "~/components/ui/slider";
import { cn } from "~/lib/utils";

interface TreeZoomPanControlsProps {
  className?: string;
  /** Minimum zoom level (default: 0.1) */
  minZoom?: number;
  /** Maximum zoom level (default: 2) */
  maxZoom?: number;
  /** Whether pan mode is enabled */
  panModeEnabled?: boolean;
  /** Callback when pan mode changes */
  onPanModeChange?: (enabled: boolean) => void;
  /** ID of the focused member to zoom to */
  focusedMemberId?: string | null;
  /** Callback for accessibility announcements */
  onAnnounce?: (message: string) => void;
}

export function TreeZoomPanControls({
  className,
  minZoom = 0.1,
  maxZoom = 2,
  panModeEnabled = false,
  onPanModeChange,
  focusedMemberId,
  onAnnounce,
}: TreeZoomPanControlsProps) {
  const reactFlowInstance = useReactFlow();
  const { zoom } = useViewport();
  const [zoomLevel, setZoomLevel] = useState(Math.round(zoom * 100));

  // Update zoom level display when viewport changes
  useEffect(() => {
    setZoomLevel(Math.round(zoom * 100));
  }, [zoom]);

  // Announce function with fallback
  const announce = useCallback(
    (message: string) => {
      if (onAnnounce) {
        onAnnounce(message);
      }
    },
    [onAnnounce]
  );

  // Zoom in handler
  const handleZoomIn = useCallback(() => {
    reactFlowInstance.zoomIn({ duration: 200 });
    announce("Zoomed in");
  }, [reactFlowInstance, announce]);

  // Zoom out handler
  const handleZoomOut = useCallback(() => {
    reactFlowInstance.zoomOut({ duration: 200 });
    announce("Zoomed out");
  }, [reactFlowInstance, announce]);

  // Fit view handler (reset view)
  const handleFitView = useCallback(() => {
    reactFlowInstance.fitView({ padding: 0.2, maxZoom: 1.5, duration: 300 });
    announce("View reset to fit all members");
  }, [reactFlowInstance, announce]);

  // Reset to 100% zoom
  const handleResetZoom = useCallback(() => {
    const viewport = reactFlowInstance.getViewport();
    reactFlowInstance.setViewport(
      { x: viewport.x, y: viewport.y, zoom: 1 },
      { duration: 200 }
    );
    announce("Zoom reset to 100%");
  }, [reactFlowInstance, announce]);

  // Zoom to focused member
  const handleZoomToFocused = useCallback(() => {
    if (!focusedMemberId) {
      announce("No member selected");
      return;
    }

    const node = reactFlowInstance.getNode(focusedMemberId);
    if (node) {
      reactFlowInstance.setCenter(
        node.position.x + 100,
        node.position.y + 100,
        {
          zoom: 1.2,
          duration: 600,
        }
      );
      announce("Zoomed to focused member");
    }
  }, [reactFlowInstance, focusedMemberId, announce]);

  // Toggle pan mode
  const handleTogglePanMode = useCallback(() => {
    const newPanMode = !panModeEnabled;
    if (onPanModeChange) {
      onPanModeChange(newPanMode);
    }
    announce(newPanMode ? "Pan mode enabled - drag to move view" : "Pan mode disabled");
  }, [panModeEnabled, onPanModeChange, announce]);

  // Handle slider change for zoom
  const handleSliderChange = useCallback(
    (value: number[]) => {
      const newZoom = value[0] / 100;
      const clampedZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));
      const viewport = reactFlowInstance.getViewport();
      reactFlowInstance.setViewport({
        x: viewport.x,
        y: viewport.y,
        zoom: clampedZoom,
      });
    },
    [reactFlowInstance, minZoom, maxZoom]
  );

  return (
    <div
      className={cn(
        "bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-3",
        className
      )}
      role="group"
      aria-label="Tree view controls"
      data-testid="tree-zoom-pan-controls"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Move className="h-4 w-4 text-primary" aria-hidden="true" />
        <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          View Controls
        </h3>
      </div>

      {/* Zoom controls row */}
      <div className="flex items-center gap-2 mb-3">
        <Tooltip content="Zoom out (-)">
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            className="h-8 w-8 p-0"
            aria-label="Zoom out"
            data-testid="zoom-out-button"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
        </Tooltip>

        {/* Zoom slider */}
        <div className="flex-1 px-2">
          <Slider
            value={[zoomLevel]}
            min={Math.round(minZoom * 100)}
            max={Math.round(maxZoom * 100)}
            step={5}
            onValueChange={handleSliderChange}
            className="w-full"
            aria-label="Zoom level"
            data-testid="zoom-slider"
          />
        </div>

        <Tooltip content="Zoom in (+)">
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            className="h-8 w-8 p-0"
            aria-label="Zoom in"
            data-testid="zoom-in-button"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </Tooltip>
      </div>

      {/* Zoom level display */}
      <div className="text-center mb-3">
        <span
          className="text-xs text-muted-foreground font-mono"
          data-testid="zoom-level-display"
        >
          {zoomLevel}%
        </span>
      </div>

      {/* Control buttons row */}
      <div className="grid grid-cols-2 gap-2">
        <Tooltip content="Fit all members in view (0)">
          <Button
            variant="outline"
            size="sm"
            onClick={handleFitView}
            className="h-8 text-xs"
            aria-label="Fit view to all members"
            data-testid="fit-view-button"
          >
            <Maximize className="h-3 w-3 mr-1" />
            Fit All
          </Button>
        </Tooltip>

        <Tooltip content="Reset zoom to 100%">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetZoom}
            className="h-8 text-xs"
            aria-label="Reset zoom to 100%"
            data-testid="reset-zoom-button"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            100%
          </Button>
        </Tooltip>

        <Tooltip content="Enable pan mode to drag the view">
          <Button
            variant={panModeEnabled ? "default" : "outline"}
            size="sm"
            onClick={handleTogglePanMode}
            className="h-8 text-xs"
            aria-label={panModeEnabled ? "Disable pan mode" : "Enable pan mode"}
            aria-pressed={panModeEnabled}
            data-testid="pan-mode-button"
          >
            <Move className="h-3 w-3 mr-1" />
            Pan
          </Button>
        </Tooltip>

        <Tooltip
          content={
            focusedMemberId
              ? "Zoom to focused member"
              : "Select a member first"
          }
        >
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomToFocused}
            disabled={!focusedMemberId}
            className="h-8 text-xs"
            aria-label="Zoom to focused member"
            data-testid="zoom-to-focused-button"
          >
            <Target className="h-3 w-3 mr-1" />
            Focus
          </Button>
        </Tooltip>
      </div>

      {/* Quick tips */}
      <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700">
        <p className="text-[10px] text-muted-foreground">
          <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[9px]">
            Scroll
          </kbd>{" "}
          to zoom,{" "}
          <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[9px]">
            Drag
          </kbd>{" "}
          to pan
        </p>
      </div>
    </div>
  );
}
