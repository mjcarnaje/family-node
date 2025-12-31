import { useMemo } from "react";
import { Layers } from "lucide-react";
import { cn } from "~/lib/utils";
import type { Node } from "@xyflow/react";
import { LAYOUT_CONFIG } from "~/utils/tree-layout";

interface GenerationLabelsProps {
  nodes: Node[];
  availableGenerations: number[];
  className?: string;
}

/**
 * Component that displays generation level information
 * when in generation view mode.
 */
export function GenerationLabels({
  nodes,
  availableGenerations,
  className,
}: GenerationLabelsProps) {
  // Calculate member counts per generation
  const generationStats = useMemo(() => {
    if (nodes.length === 0 || availableGenerations.length === 0) {
      return [];
    }

    // Group nodes by generation based on y position
    const membersByGeneration = new Map<number, number>();

    nodes.forEach((node) => {
      const yPos = node.position.y;
      const generationIndex = Math.round(yPos / (LAYOUT_CONFIG.nodeHeight + LAYOUT_CONFIG.verticalSpacing));

      const current = membersByGeneration.get(generationIndex) || 0;
      membersByGeneration.set(generationIndex, current + 1);
    });

    // Create stats for each available generation
    return availableGenerations.map((gen, index) => ({
      generation: gen,
      memberCount: membersByGeneration.get(index) || 0,
      label: getGenerationLabel(gen),
    }));
  }, [nodes, availableGenerations]);

  if (generationStats.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-3",
        className
      )}
      data-testid="generation-labels"
    >
      <div className="flex items-center gap-2 mb-2">
        <Layers className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Generations
        </h3>
      </div>

      <div className="space-y-1.5">
        {generationStats.map(({ generation, memberCount, label }) => (
          <div
            key={generation}
            className="flex items-center justify-between text-xs"
            data-testid={`generation-label-${generation}`}
          >
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-2 pt-2 border-t">
        <p className="text-[10px] text-muted-foreground">
          Members are grouped by generation level from oldest (top) to youngest (bottom)
        </p>
      </div>
    </div>
  );
}

/**
 * Get a human-readable label for a generation number
 */
function getGenerationLabel(generation: number): string {
  if (generation === 0) {
    return "Gen 0 (Ancestors)";
  }
  return `Generation ${generation}`;
}
