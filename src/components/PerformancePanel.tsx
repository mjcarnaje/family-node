/**
 * PerformancePanel Component
 *
 * Displays real-time performance metrics for the family tree visualization.
 * Useful for debugging and monitoring large tree performance.
 */

import { memo, useState, useEffect } from "react";
import { Activity, Eye, GitBranch, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "~/lib/utils";
import type { PerformanceMetrics } from "~/utils/tree-virtualization";

interface PerformancePanelProps {
  metrics: PerformanceMetrics | null;
  isVirtualized: boolean;
  className?: string;
}

function PerformancePanelComponent({
  metrics,
  isVirtualized,
  className,
}: PerformancePanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [fpsHistory, setFpsHistory] = useState<number[]>([]);

  // Track FPS history for sparkline
  useEffect(() => {
    if (metrics?.fps) {
      setFpsHistory((prev) => {
        const newHistory = [...prev, metrics.fps];
        // Keep last 20 samples
        return newHistory.slice(-20);
      });
    }
  }, [metrics?.fps]);

  if (!metrics) {
    return null;
  }

  const {
    totalNodes,
    visibleNodes,
    totalEdges,
    visibleEdges,
    detailLevel,
    lastRenderTime,
    fps,
    memoryUsage,
  } = metrics;

  // Calculate culling efficiency
  const nodeCullingPercent = totalNodes > 0
    ? Math.round((1 - visibleNodes / totalNodes) * 100)
    : 0;

  const edgeCullingPercent = totalEdges > 0
    ? Math.round((1 - visibleEdges / totalEdges) * 100)
    : 0;

  // Performance status
  const getPerformanceStatus = () => {
    if (fps >= 55) return { color: "text-green-500", label: "Excellent" };
    if (fps >= 45) return { color: "text-yellow-500", label: "Good" };
    if (fps >= 30) return { color: "text-orange-500", label: "Fair" };
    return { color: "text-red-500", label: "Poor" };
  };

  const status = getPerformanceStatus();

  // Format memory usage
  const formatMemory = (bytes?: number) => {
    if (!bytes) return "N/A";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  // Detail level indicator
  const getDetailLevelInfo = (level: string) => {
    switch (level) {
      case "full":
        return { color: "bg-green-500", label: "Full Detail" };
      case "simplified":
        return { color: "bg-yellow-500", label: "Simplified" };
      case "clustered":
        return { color: "bg-orange-500", label: "Clustered" };
      default:
        return { color: "bg-gray-500", label: "Unknown" };
    }
  };

  const levelInfo = getDetailLevelInfo(detailLevel);

  return (
    <div
      className={cn(
        "bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700",
        "text-xs font-mono",
        className
      )}
      data-testid="performance-panel"
    >
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-t-lg transition-colors"
      >
        <div className="flex items-center gap-2">
          <Activity className={cn("h-3.5 w-3.5", status.color)} />
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Performance
          </span>
          {isVirtualized && (
            <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded text-[10px]">
              Virtualized
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("font-bold", status.color)}>{fps} FPS</span>
          {isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="p-2 pt-0 space-y-2 border-t border-slate-100 dark:border-slate-700">
          {/* FPS Sparkline */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 w-16">FPS:</span>
            <div className="flex-1 h-4 flex items-end gap-px">
              {fpsHistory.map((value, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-1 rounded-t transition-all",
                    value >= 55 ? "bg-green-400" :
                    value >= 45 ? "bg-yellow-400" :
                    value >= 30 ? "bg-orange-400" : "bg-red-400"
                  )}
                  style={{ height: `${Math.min(100, (value / 60) * 100)}%` }}
                />
              ))}
            </div>
            <span className={cn("font-bold w-12 text-right", status.color)}>
              {fps}
            </span>
          </div>

          {/* Nodes */}
          <div className="flex items-center gap-2">
            <Eye className="h-3 w-3 text-slate-400" />
            <span className="text-slate-500 w-16">Nodes:</span>
            <div className="flex-1">
              <div className="flex items-center gap-1">
                <span className="text-slate-700 dark:text-slate-300">
                  {visibleNodes}
                </span>
                <span className="text-slate-400">/</span>
                <span className="text-slate-500">{totalNodes}</span>
                {nodeCullingPercent > 0 && (
                  <span className="text-green-600 dark:text-green-400 ml-1">
                    (-{nodeCullingPercent}%)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Edges */}
          <div className="flex items-center gap-2">
            <GitBranch className="h-3 w-3 text-slate-400" />
            <span className="text-slate-500 w-16">Edges:</span>
            <div className="flex-1">
              <div className="flex items-center gap-1">
                <span className="text-slate-700 dark:text-slate-300">
                  {visibleEdges}
                </span>
                <span className="text-slate-400">/</span>
                <span className="text-slate-500">{totalEdges}</span>
                {edgeCullingPercent > 0 && (
                  <span className="text-green-600 dark:text-green-400 ml-1">
                    (-{edgeCullingPercent}%)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Detail Level */}
          <div className="flex items-center gap-2">
            <Zap className="h-3 w-3 text-slate-400" />
            <span className="text-slate-500 w-16">Detail:</span>
            <div className="flex items-center gap-1.5">
              <div className={cn("w-2 h-2 rounded-full", levelInfo.color)} />
              <span className="text-slate-700 dark:text-slate-300">
                {levelInfo.label}
              </span>
            </div>
          </div>

          {/* Render Time */}
          <div className="flex items-center gap-2">
            <Activity className="h-3 w-3 text-slate-400" />
            <span className="text-slate-500 w-16">Render:</span>
            <span className="text-slate-700 dark:text-slate-300">
              {lastRenderTime.toFixed(2)} ms
            </span>
          </div>

          {/* Memory (if available) */}
          {memoryUsage && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 w-16 ml-4">Memory:</span>
              <span className="text-slate-700 dark:text-slate-300">
                {formatMemory(memoryUsage)}
              </span>
            </div>
          )}

          {/* Status Summary */}
          <div className="pt-1 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Status:</span>
              <span className={cn("font-semibold", status.color)}>
                {status.label}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const PerformancePanel = memo(PerformancePanelComponent);
