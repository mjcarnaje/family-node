import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import {
  BarChart3,
  Users,
  Heart,
  TrendingUp,
  Layers,
  Calendar,
  UserCircle,
  Skull,
  Baby,
  TreeDeciduous,
  Activity,
  PieChart,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelDescription,
  PanelContent,
} from "~/components/ui/panel";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Button } from "~/components/ui/button";
import { getMyFamilyTreesFn } from "~/fn/family-trees";
import { useTreeStatistics } from "~/hooks/useTreeStatistics";
import { cn } from "~/lib/utils";

// Query options for fetching user's family trees
const getMyTreesQuery = () =>
  queryOptions({
    queryKey: ["my-family-trees"],
    queryFn: () => getMyFamilyTreesFn(),
  });

export const Route = createFileRoute("/dashboard/analytics")({
  component: AnalyticsDashboard,
});

// Stat Card Component
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subLabel?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
}

function StatCard({
  icon,
  label,
  value,
  subLabel,
  trend,
  trendValue,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold mt-2">{value}</p>
            {subLabel && (
              <p className="text-xs text-muted-foreground mt-1">{subLabel}</p>
            )}
            {trend && trendValue && (
              <div className="flex items-center gap-1 mt-2">
                {trend === "up" ? (
                  <ArrowUp className="h-3 w-3 text-green-500" />
                ) : trend === "down" ? (
                  <ArrowDown className="h-3 w-3 text-red-500" />
                ) : null}
                <span
                  className={cn(
                    "text-xs font-medium",
                    trend === "up" && "text-green-500",
                    trend === "down" && "text-red-500",
                    trend === "neutral" && "text-muted-foreground"
                  )}
                >
                  {trendValue}
                </span>
              </div>
            )}
          </div>
          <div className="p-3 rounded-xl bg-primary/10 text-primary">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// Mini Stat Card for compact display
interface MiniStatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  className?: string;
}

function MiniStatCard({ icon, label, value, className }: MiniStatCardProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-4 rounded-lg bg-muted/50 border",
        className
      )}
    >
      <div className="flex-shrink-0 p-2 rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-lg font-semibold">{value}</p>
      </div>
    </div>
  );
}

// Skeleton components for loading states
function StatCardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-8 w-16 bg-muted rounded mt-2" />
            <div className="h-3 w-20 bg-muted rounded mt-2" />
          </div>
          <div className="w-12 h-12 rounded-xl bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
}

function MiniStatSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border animate-pulse">
      <div className="w-10 h-10 rounded-md bg-muted" />
      <div className="flex-1">
        <div className="h-3 w-16 bg-muted rounded mb-2" />
        <div className="h-5 w-10 bg-muted rounded" />
      </div>
    </div>
  );
}

// Growth Chart Bar Component
interface GrowthBarProps {
  month: string;
  value: number;
  maxValue: number;
  cumulative: number;
}

function GrowthBar({ month, value, maxValue, cumulative }: GrowthBarProps) {
  const heightPercent = maxValue > 0 ? (value / maxValue) * 100 : 0;

  return (
    <div className="flex flex-col items-center gap-2 flex-1 min-w-[60px]">
      <div className="relative w-full h-32 bg-muted/30 rounded-t-md overflow-hidden">
        <div
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary to-primary/60 rounded-t-md transition-all duration-500"
          style={{ height: `${heightPercent}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold text-foreground/80">
            +{value}
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-medium text-muted-foreground">{month}</p>
        <p className="text-xs text-muted-foreground/70">{cumulative} total</p>
      </div>
    </div>
  );
}

// Demographics Chart Component
interface DemographicsChartProps {
  data: {
    male: number;
    female: number;
    other: number;
    unknown: number;
  };
}

function DemographicsChart({ data }: DemographicsChartProps) {
  const total = data.male + data.female + data.other + data.unknown;
  const segments = [
    { label: "Male", value: data.male, color: "bg-blue-500" },
    { label: "Female", value: data.female, color: "bg-pink-500" },
    { label: "Other", value: data.other, color: "bg-purple-500" },
    { label: "Unknown", value: data.unknown, color: "bg-gray-400" },
  ].filter((s) => s.value > 0);

  return (
    <div className="space-y-4">
      {/* Bar visualization */}
      <div className="h-4 rounded-full overflow-hidden flex bg-muted">
        {segments.map((segment, index) => (
          <div
            key={segment.label}
            className={cn(segment.color, "transition-all duration-500")}
            style={{ width: `${(segment.value / total) * 100}%` }}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2">
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded-full", segment.color)} />
            <span className="text-sm text-muted-foreground">
              {segment.label}:{" "}
              <span className="font-medium text-foreground">
                {segment.value}
              </span>{" "}
              ({total > 0 ? Math.round((segment.value / total) * 100) : 0}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Tree Statistics Component
interface TreeStatisticsDisplayProps {
  familyTreeId: string;
}

function TreeStatisticsDisplay({ familyTreeId }: TreeStatisticsDisplayProps) {
  const { data: statistics, isLoading, error } = useTreeStatistics(familyTreeId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Panel>
            <PanelHeader>
              <div className="h-6 w-32 bg-muted rounded animate-pulse" />
            </PanelHeader>
            <PanelContent>
              <div className="h-40 bg-muted rounded animate-pulse" />
            </PanelContent>
          </Panel>
          <Panel>
            <PanelHeader>
              <div className="h-6 w-32 bg-muted rounded animate-pulse" />
            </PanelHeader>
            <PanelContent>
              <div className="h-40 bg-muted rounded animate-pulse" />
            </PanelContent>
          </Panel>
        </div>
      </div>
    );
  }

  if (error || !statistics) {
    return (
      <Panel className="py-12">
        <div className="text-center text-muted-foreground">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Unable to load statistics for this tree</p>
          <p className="text-sm mt-2">
            {error?.message || "Please try again later"}
          </p>
        </div>
      </Panel>
    );
  }

  const formatMonthYear = (year: number, month: number) => {
    const date = new Date(year, month - 1);
    return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  };

  const recentGrowth = statistics.growthData.slice(-6);
  const maxGrowth = Math.max(...recentGrowth.map((d) => d.membersAdded), 1);

  // Calculate engagement metrics
  const relationshipRatio =
    statistics.memberStats.totalMembers > 0
      ? (
          statistics.relationshipStats.totalParentChildRelationships /
          statistics.memberStats.totalMembers
        ).toFixed(1)
      : "0";

  const marriageRatio =
    statistics.memberStats.totalMembers > 0
      ? (
          (statistics.relationshipStats.totalMarriages * 2) /
          statistics.memberStats.totalMembers
        ).toFixed(1)
      : "0";

  return (
    <div className="space-y-6" data-testid="tree-statistics-display">
      {/* Primary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="primary-stats">
        <StatCard
          icon={<Users className="h-6 w-6" />}
          label="Total Members"
          value={statistics.memberStats.totalMembers}
          subLabel={`${statistics.memberStats.livingMembers} living, ${statistics.memberStats.deceasedMembers} deceased`}
        />
        <StatCard
          icon={<Layers className="h-6 w-6" />}
          label="Generations"
          value={statistics.generationCount}
          subLabel="Family depth"
        />
        <StatCard
          icon={<Heart className="h-6 w-6" />}
          label="Marriages"
          value={statistics.relationshipStats.totalMarriages}
          subLabel={`${marriageRatio}x per member`}
        />
        <StatCard
          icon={<TrendingUp className="h-6 w-6" />}
          label="Relationships"
          value={statistics.relationshipStats.totalParentChildRelationships}
          subLabel={`${relationshipRatio}x per member`}
        />
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Demographics Panel */}
        <Panel className="lg:col-span-1">
          <PanelHeader className="pb-2">
            <div className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              <PanelTitle className="text-lg">Demographics</PanelTitle>
            </div>
            <PanelDescription>Gender distribution</PanelDescription>
          </PanelHeader>
          <PanelContent>
            <DemographicsChart data={statistics.memberStats.genderBreakdown} />
          </PanelContent>
        </Panel>

        {/* Growth Chart Panel */}
        <Panel className="lg:col-span-2">
          <PanelHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <PanelTitle className="text-lg">Family Growth</PanelTitle>
            </div>
            <PanelDescription>Members added over time</PanelDescription>
          </PanelHeader>
          <PanelContent>
            {recentGrowth.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto pb-2" data-testid="growth-chart">
                {recentGrowth.map((data, index) => (
                  <GrowthBar
                    key={index}
                    month={formatMonthYear(data.year, data.month)}
                    value={data.membersAdded}
                    maxValue={maxGrowth}
                    cumulative={data.cumulativeTotal}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No growth data available yet</p>
              </div>
            )}
          </PanelContent>
        </Panel>
      </div>

      {/* Age and Relationship Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Age Statistics Panel */}
        <Panel>
          <PanelHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <PanelTitle className="text-lg">Age Statistics</PanelTitle>
            </div>
            <PanelDescription>Member age information</PanelDescription>
          </PanelHeader>
          <PanelContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {statistics.ageStats.oldestMember && (
                <MiniStatCard
                  icon={<UserCircle className="h-4 w-4" />}
                  label="Oldest Member"
                  value={`${statistics.ageStats.oldestMember.age} years`}
                />
              )}
              {statistics.ageStats.youngestMember && (
                <MiniStatCard
                  icon={<Baby className="h-4 w-4" />}
                  label="Youngest Member"
                  value={`${statistics.ageStats.youngestMember.age} years`}
                />
              )}
              {statistics.ageStats.averageAge !== null && (
                <MiniStatCard
                  icon={<Users className="h-4 w-4" />}
                  label="Average Age"
                  value={`${statistics.ageStats.averageAge} years`}
                />
              )}
              {!statistics.ageStats.oldestMember &&
                !statistics.ageStats.youngestMember &&
                statistics.ageStats.averageAge === null && (
                  <div className="col-span-3 text-center py-4 text-muted-foreground">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      No birth dates recorded yet
                    </p>
                  </div>
                )}
            </div>

            {/* Oldest/Youngest member names */}
            {(statistics.ageStats.oldestMember ||
              statistics.ageStats.youngestMember) && (
              <div className="mt-4 pt-4 border-t space-y-2">
                {statistics.ageStats.oldestMember && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Oldest:</span>
                    <span className="font-medium">
                      {statistics.ageStats.oldestMember.firstName}{" "}
                      {statistics.ageStats.oldestMember.lastName}
                    </span>
                  </div>
                )}
                {statistics.ageStats.youngestMember && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Youngest:</span>
                    <span className="font-medium">
                      {statistics.ageStats.youngestMember.firstName}{" "}
                      {statistics.ageStats.youngestMember.lastName}
                    </span>
                  </div>
                )}
              </div>
            )}
          </PanelContent>
        </Panel>

        {/* Relationship Types Panel */}
        <Panel>
          <PanelHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              <PanelTitle className="text-lg">Relationship Types</PanelTitle>
            </div>
            <PanelDescription>Breakdown by relationship type</PanelDescription>
          </PanelHeader>
          <PanelContent>
            <div className="grid grid-cols-2 gap-3">
              <MiniStatCard
                icon={<UserCircle className="h-4 w-4" />}
                label="Living Members"
                value={statistics.memberStats.livingMembers}
              />
              <MiniStatCard
                icon={<Skull className="h-4 w-4" />}
                label="Deceased Members"
                value={statistics.memberStats.deceasedMembers}
              />
            </div>

            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium text-muted-foreground mb-3">
                Parent-Child Relationships
              </p>
              <div className="flex flex-wrap gap-2">
                {statistics.relationshipStats.relationshipTypeBreakdown
                  .biological > 0 && (
                  <Badge>
                    Biological:{" "}
                    {
                      statistics.relationshipStats.relationshipTypeBreakdown
                        .biological
                    }
                  </Badge>
                )}
                {statistics.relationshipStats.relationshipTypeBreakdown
                  .adopted > 0 && (
                  <Badge variant="secondary">
                    Adopted:{" "}
                    {
                      statistics.relationshipStats.relationshipTypeBreakdown
                        .adopted
                    }
                  </Badge>
                )}
                {statistics.relationshipStats.relationshipTypeBreakdown.step >
                  0 && (
                  <Badge variant="secondary">
                    Step:{" "}
                    {
                      statistics.relationshipStats.relationshipTypeBreakdown
                        .step
                    }
                  </Badge>
                )}
                {statistics.relationshipStats.relationshipTypeBreakdown.foster >
                  0 && (
                  <Badge variant="secondary">
                    Foster:{" "}
                    {
                      statistics.relationshipStats.relationshipTypeBreakdown
                        .foster
                    }
                  </Badge>
                )}
                {Object.values(
                  statistics.relationshipStats.relationshipTypeBreakdown
                ).every((v) => v === 0) && (
                  <span className="text-sm text-muted-foreground">
                    No relationships recorded yet
                  </span>
                )}
              </div>
            </div>
          </PanelContent>
        </Panel>
      </div>
    </div>
  );
}

function AnalyticsDashboard() {
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const { data: trees, isLoading: isLoadingTrees } = useQuery(getMyTreesQuery());

  // Auto-select first tree if none selected
  const effectiveTreeId =
    selectedTreeId || (trees && trees.length > 0 ? trees[0].id : null);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Analytics Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              View statistics, trends, and insights about your family trees.
            </p>
          </div>

          {/* Tree Selector */}
          {trees && trees.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Viewing:</span>
              <Select
                value={effectiveTreeId || ""}
                onValueChange={setSelectedTreeId}
              >
                <SelectTrigger className="w-[200px]" data-testid="tree-selector">
                  <SelectValue placeholder="Select a tree" />
                </SelectTrigger>
                <SelectContent>
                  {trees.map((tree) => (
                    <SelectItem key={tree.id} value={tree.id}>
                      <div className="flex items-center gap-2">
                        <TreeDeciduous className="h-4 w-4" />
                        <span>{tree.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoadingTrees && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-pulse flex flex-col items-center gap-4">
              <BarChart3 className="h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">Loading analytics...</p>
            </div>
          </div>
        )}

        {/* No Trees State */}
        {!isLoadingTrees && (!trees || trees.length === 0) && (
          <Panel className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <TreeDeciduous className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground">
                No family trees yet
              </h3>
              <p className="text-sm text-muted-foreground/80 mt-2 max-w-sm">
                Create your first family tree to start viewing analytics and
                insights about your family history.
              </p>
              <Button asChild className="mt-6">
                <Link to="/dashboard/trees/new">
                  <TreeDeciduous className="h-4 w-4 mr-2" />
                  Create Your First Tree
                </Link>
              </Button>
            </div>
          </Panel>
        )}

        {/* Tree Statistics */}
        {!isLoadingTrees && effectiveTreeId && (
          <TreeStatisticsDisplay familyTreeId={effectiveTreeId} />
        )}

        {/* Summary Cards for All Trees */}
        {!isLoadingTrees && trees && trees.length > 1 && (
          <Panel>
            <PanelHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <PanelTitle className="text-lg">All Trees Overview</PanelTitle>
              </div>
              <PanelDescription>
                Quick summary of all your family trees
              </PanelDescription>
            </PanelHeader>
            <PanelContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MiniStatCard
                  icon={<TreeDeciduous className="h-4 w-4" />}
                  label="Total Trees"
                  value={trees.length}
                />
                <MiniStatCard
                  icon={<Users className="h-4 w-4" />}
                  label="Total Members"
                  value={trees.reduce((sum, t) => sum + (t.memberCount || 0), 0)}
                />
                <MiniStatCard
                  icon={<Activity className="h-4 w-4" />}
                  label="Public Trees"
                  value={trees.filter((t) => t.isPublic).length}
                />
                <MiniStatCard
                  icon={<Calendar className="h-4 w-4" />}
                  label="Latest Update"
                  value={
                    trees.length > 0
                      ? new Date(
                          Math.max(...trees.map((t) => new Date(t.createdAt).getTime()))
                        ).toLocaleDateString()
                      : "N/A"
                  }
                />
              </div>

              {/* Tree List */}
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm font-medium text-muted-foreground mb-3">
                  Your Family Trees
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {trees.map((tree) => (
                    <button
                      key={tree.id}
                      onClick={() => setSelectedTreeId(tree.id)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                        effectiveTreeId === tree.id
                          ? "bg-primary/10 border-primary/40"
                          : "bg-muted/30 hover:bg-muted/50 border-transparent"
                      )}
                    >
                      <TreeDeciduous
                        className={cn(
                          "h-5 w-5",
                          effectiveTreeId === tree.id
                            ? "text-primary"
                            : "text-muted-foreground"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{tree.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {tree.memberCount} members
                        </p>
                      </div>
                      {tree.isPublic && (
                        <Badge variant="outline" className="text-xs">
                          Public
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </PanelContent>
          </Panel>
        )}
      </div>
    </div>
  );
}
