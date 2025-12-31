import { useMemo, useState } from "react";
import {
  Filter,
  ChevronDown,
  ChevronUp,
  Users,
  Link2,
  X,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { cn } from "~/lib/utils";
import type { Gender, RelationshipType, MarriageStatus } from "~/db/schema";

// Filter state types
export interface TreeFilterState {
  // Generation filters
  generations: number[];
  // Gender filters
  genders: Gender[];
  // Relationship type filters (for parent-child relationships)
  relationshipTypes: RelationshipType[];
  // Marriage status filters
  marriageStatuses: MarriageStatus[];
  // Visibility toggles
  showDeceased: boolean;
  showParentChildLines: boolean;
  showMarriageLines: boolean;
  showSiblingLines: boolean;
}

// Default filter state - show everything except sibling lines (they add visual clutter)
export const DEFAULT_FILTER_STATE: TreeFilterState = {
  generations: [],
  genders: [],
  relationshipTypes: [],
  marriageStatuses: [],
  showDeceased: true,
  showParentChildLines: true,
  showMarriageLines: true,
  showSiblingLines: false, // Off by default - siblings are implicit (children of same parents)
};

interface FamilyTreeFiltersProps {
  filters: TreeFilterState;
  onFiltersChange: (filters: TreeFilterState) => void;
  availableGenerations: number[];
  className?: string;
}

// Gender options with labels and colors
const GENDER_OPTIONS: { value: Gender; label: string; color: string }[] = [
  { value: "male", label: "Male", color: "bg-blue-500" },
  { value: "female", label: "Female", color: "bg-pink-500" },
  { value: "other", label: "Other", color: "bg-purple-500" },
];

// Relationship type options
const RELATIONSHIP_TYPE_OPTIONS: { value: RelationshipType; label: string }[] = [
  { value: "biological", label: "Biological" },
  { value: "adopted", label: "Adopted" },
  { value: "step", label: "Step" },
  { value: "foster", label: "Foster" },
];

// Marriage status options
const MARRIAGE_STATUS_OPTIONS: { value: MarriageStatus; label: string }[] = [
  { value: "married", label: "Married" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
  { value: "separated", label: "Separated" },
  { value: "annulled", label: "Annulled" },
];

export function FamilyTreeFilters({
  filters,
  onFiltersChange,
  availableGenerations,
  className,
}: FamilyTreeFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.generations.length > 0 ||
      filters.genders.length > 0 ||
      filters.relationshipTypes.length > 0 ||
      filters.marriageStatuses.length > 0 ||
      !filters.showDeceased ||
      !filters.showParentChildLines ||
      !filters.showMarriageLines ||
      !filters.showSiblingLines
    );
  }, [filters]);

  // Toggle a generation filter
  const toggleGeneration = (generation: number) => {
    const newGenerations = filters.generations.includes(generation)
      ? filters.generations.filter((g) => g !== generation)
      : [...filters.generations, generation];
    onFiltersChange({ ...filters, generations: newGenerations });
  };

  // Toggle a gender filter
  const toggleGender = (gender: Gender) => {
    const newGenders = filters.genders.includes(gender)
      ? filters.genders.filter((g) => g !== gender)
      : [...filters.genders, gender];
    onFiltersChange({ ...filters, genders: newGenders });
  };

  // Toggle a relationship type filter
  const toggleRelationshipType = (type: RelationshipType) => {
    const newTypes = filters.relationshipTypes.includes(type)
      ? filters.relationshipTypes.filter((t) => t !== type)
      : [...filters.relationshipTypes, type];
    onFiltersChange({ ...filters, relationshipTypes: newTypes });
  };

  // Toggle a marriage status filter
  const toggleMarriageStatus = (status: MarriageStatus) => {
    const newStatuses = filters.marriageStatuses.includes(status)
      ? filters.marriageStatuses.filter((s) => s !== status)
      : [...filters.marriageStatuses, status];
    onFiltersChange({ ...filters, marriageStatuses: newStatuses });
  };

  // Reset all filters
  const resetFilters = () => {
    onFiltersChange(DEFAULT_FILTER_STATE);
  };

  // Get generation label
  const getGenerationLabel = (gen: number) => {
    if (gen === 0) return "Gen 0 (Ancestors)";
    return `Gen ${gen}`;
  };

  return (
    <div
      className={cn(
        "bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700",
        className
      )}
      data-testid="family-tree-filters"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid="filters-header"
      >
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Filters
          </h3>
          {hasActiveFilters && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary rounded-full">
              Active
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                resetFilters();
              }}
              className="h-6 w-6 p-0"
              title="Reset filters"
              data-testid="reset-filters-button"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Filter content */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-4" data-testid="filters-content">
          {/* Line Visibility Toggles */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Link2 className="h-3 w-3" />
              <span>Line Visibility</span>
            </div>
            <div className="space-y-2 pl-5">
              <div className="flex items-center justify-between">
                <Label htmlFor="show-parent-child" className="text-xs cursor-pointer">
                  Parent-Child Lines
                </Label>
                <Switch
                  id="show-parent-child"
                  checked={filters.showParentChildLines}
                  onCheckedChange={(checked) =>
                    onFiltersChange({ ...filters, showParentChildLines: checked })
                  }
                  data-testid="toggle-parent-child-lines"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="show-marriage" className="text-xs cursor-pointer">
                  Marriage Lines
                </Label>
                <Switch
                  id="show-marriage"
                  checked={filters.showMarriageLines}
                  onCheckedChange={(checked) =>
                    onFiltersChange({ ...filters, showMarriageLines: checked })
                  }
                  data-testid="toggle-marriage-lines"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="show-sibling" className="text-xs cursor-pointer">
                  Sibling Lines
                </Label>
                <Switch
                  id="show-sibling"
                  checked={filters.showSiblingLines}
                  onCheckedChange={(checked) =>
                    onFiltersChange({ ...filters, showSiblingLines: checked })
                  }
                  data-testid="toggle-sibling-lines"
                />
              </div>
            </div>
          </div>

          {/* Generation Filters */}
          {availableGenerations.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>Generations</span>
                {filters.generations.length > 0 && (
                  <span className="text-[10px] text-primary">
                    ({filters.generations.length} selected)
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1 pl-5">
                {availableGenerations.map((gen) => (
                  <button
                    key={gen}
                    onClick={() => toggleGeneration(gen)}
                    className={cn(
                      "px-2 py-1 text-[10px] font-medium rounded-md transition-colors",
                      filters.generations.includes(gen)
                        ? "bg-primary text-white"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                    )}
                    data-testid={`filter-generation-${gen}`}
                  >
                    {getGenerationLabel(gen)}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground pl-5">
                {filters.generations.length === 0
                  ? "Showing all generations"
                  : "Showing selected generations only"}
              </p>
            </div>
          )}

          {/* Gender Filters */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">Gender</span>
            <div className="flex flex-wrap gap-1 pl-0">
              {GENDER_OPTIONS.map(({ value, label, color }) => (
                <button
                  key={value}
                  onClick={() => toggleGender(value)}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium rounded-md transition-colors",
                    filters.genders.includes(value)
                      ? "bg-primary text-white"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                  )}
                  data-testid={`filter-gender-${value}`}
                >
                  <div className={cn("w-2 h-2 rounded-full", color)} />
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {filters.genders.length === 0
                ? "Showing all genders"
                : "Showing selected genders only"}
            </p>
          </div>

          {/* Show Deceased Toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="show-deceased" className="text-xs cursor-pointer">
                Show Deceased Members
              </Label>
              <Switch
                id="show-deceased"
                checked={filters.showDeceased}
                onCheckedChange={(checked) =>
                  onFiltersChange({ ...filters, showDeceased: checked })
                }
                data-testid="toggle-show-deceased"
              />
            </div>
          </div>

          {/* Relationship Type Filters */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">
              Relationship Type
            </span>
            <div className="flex flex-wrap gap-1">
              {RELATIONSHIP_TYPE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => toggleRelationshipType(value)}
                  className={cn(
                    "px-2 py-1 text-[10px] font-medium rounded-md transition-colors",
                    filters.relationshipTypes.includes(value)
                      ? "bg-primary text-white"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                  )}
                  data-testid={`filter-relationship-${value}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {filters.relationshipTypes.length === 0
                ? "Showing all relationship types"
                : "Showing selected types only"}
            </p>
          </div>

          {/* Marriage Status Filters */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">
              Marriage Status
            </span>
            <div className="flex flex-wrap gap-1">
              {MARRIAGE_STATUS_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => toggleMarriageStatus(value)}
                  className={cn(
                    "px-2 py-1 text-[10px] font-medium rounded-md transition-colors",
                    filters.marriageStatuses.includes(value)
                      ? "bg-primary text-white"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                  )}
                  data-testid={`filter-marriage-${value}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {filters.marriageStatuses.length === 0
                ? "Showing all marriage statuses"
                : "Showing selected statuses only"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
