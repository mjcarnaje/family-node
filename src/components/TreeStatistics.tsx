import { useState } from "react";
import {
  Users,
  Heart,
  Calendar,
  TrendingUp,
  Layers,
  UserCircle,
  Baby,
  Skull,
  ChevronDown,
  ChevronUp,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { useTreeStatistics } from "~/hooks/useTreeStatistics";
import { cn } from "~/lib/utils";

interface TreeStatisticsProps {
  familyTreeId: string;
  className?: string;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subLabel?: string;
  className?: string;
}

function StatCard({ icon, label, value, subLabel, className }: StatCardProps) {
  return (
    <div className={cn("flex items-center gap-3 p-3 rounded-lg bg-muted/50", className)}>
      <div className="flex-shrink-0 p-2 rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-lg font-semibold">{value}</p>
        {subLabel && (
          <p className="text-xs text-muted-foreground truncate">{subLabel}</p>
        )}
      </div>
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 animate-pulse">
      <div className="flex-shrink-0 w-10 h-10 rounded-md bg-muted" />
      <div className="flex-1">
        <div className="h-3 w-16 bg-muted rounded mb-2" />
        <div className="h-5 w-10 bg-muted rounded" />
      </div>
    </div>
  );
}

export function TreeStatistics({ familyTreeId, className }: TreeStatisticsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: statistics, isLoading, error } = useTreeStatistics(familyTreeId);

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground text-center">
            Unable to load statistics
          </p>
        </CardContent>
      </Card>
    );
  }

  const formatMonthYear = (year: number, month: number) => {
    const date = new Date(year, month - 1);
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Family Statistics</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 px-2"
            data-testid="toggle-statistics"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
        <CardDescription>Overview of your family tree</CardDescription>
      </CardHeader>

      <CardContent className="p-4 pt-2">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <StatSkeleton key={i} />
            ))}
          </div>
        ) : statistics ? (
          <div className="space-y-4">
            {/* Primary Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="primary-stats">
              <StatCard
                icon={<Users className="h-4 w-4" />}
                label="Total Members"
                value={statistics.memberStats.totalMembers}
                data-testid="stat-total-members"
              />
              <StatCard
                icon={<Layers className="h-4 w-4" />}
                label="Generations"
                value={statistics.generationCount}
                data-testid="stat-generations"
              />
              <StatCard
                icon={<Heart className="h-4 w-4" />}
                label="Marriages"
                value={statistics.relationshipStats.totalMarriages}
              />
              <StatCard
                icon={<TrendingUp className="h-4 w-4" />}
                label="Relationships"
                value={statistics.relationshipStats.totalParentChildRelationships}
              />
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="space-y-4 pt-2 border-t" data-testid="expanded-stats">
                {/* Member Status */}
                <div>
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                    Member Status
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard
                      icon={<UserCircle className="h-4 w-4" />}
                      label="Living"
                      value={statistics.memberStats.livingMembers}
                    />
                    <StatCard
                      icon={<Skull className="h-4 w-4" />}
                      label="Deceased"
                      value={statistics.memberStats.deceasedMembers}
                    />
                  </div>
                </div>

                {/* Gender Breakdown */}
                <div>
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                    Gender Distribution
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      Male: {statistics.memberStats.genderBreakdown.male}
                    </Badge>
                    <Badge variant="secondary">
                      Female: {statistics.memberStats.genderBreakdown.female}
                    </Badge>
                    {statistics.memberStats.genderBreakdown.other > 0 && (
                      <Badge variant="secondary">
                        Other: {statistics.memberStats.genderBreakdown.other}
                      </Badge>
                    )}
                    {statistics.memberStats.genderBreakdown.unknown > 0 && (
                      <Badge variant="outline">
                        Unknown: {statistics.memberStats.genderBreakdown.unknown}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Age Statistics */}
                {(statistics.ageStats.oldestMember || statistics.ageStats.youngestMember) && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                      Age Statistics
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {statistics.ageStats.oldestMember && (
                        <StatCard
                          icon={<Calendar className="h-4 w-4" />}
                          label="Oldest Member"
                          value={`${statistics.ageStats.oldestMember.firstName} ${statistics.ageStats.oldestMember.lastName}`}
                          subLabel={`Age: ${statistics.ageStats.oldestMember.age}`}
                          data-testid="stat-oldest-member"
                        />
                      )}
                      {statistics.ageStats.youngestMember && (
                        <StatCard
                          icon={<Baby className="h-4 w-4" />}
                          label="Youngest Member"
                          value={`${statistics.ageStats.youngestMember.firstName} ${statistics.ageStats.youngestMember.lastName}`}
                          subLabel={`Age: ${statistics.ageStats.youngestMember.age}`}
                          data-testid="stat-youngest-member"
                        />
                      )}
                      {statistics.ageStats.averageAge !== null && (
                        <StatCard
                          icon={<Users className="h-4 w-4" />}
                          label="Average Age"
                          value={`${statistics.ageStats.averageAge} years`}
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Relationship Types */}
                <div>
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                    Relationship Types
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {statistics.relationshipStats.relationshipTypeBreakdown.biological > 0 && (
                      <Badge>
                        Biological: {statistics.relationshipStats.relationshipTypeBreakdown.biological}
                      </Badge>
                    )}
                    {statistics.relationshipStats.relationshipTypeBreakdown.adopted > 0 && (
                      <Badge variant="secondary">
                        Adopted: {statistics.relationshipStats.relationshipTypeBreakdown.adopted}
                      </Badge>
                    )}
                    {statistics.relationshipStats.relationshipTypeBreakdown.step > 0 && (
                      <Badge variant="secondary">
                        Step: {statistics.relationshipStats.relationshipTypeBreakdown.step}
                      </Badge>
                    )}
                    {statistics.relationshipStats.relationshipTypeBreakdown.foster > 0 && (
                      <Badge variant="secondary">
                        Foster: {statistics.relationshipStats.relationshipTypeBreakdown.foster}
                      </Badge>
                    )}
                    {Object.values(statistics.relationshipStats.relationshipTypeBreakdown).every(v => v === 0) && (
                      <span className="text-sm text-muted-foreground">No relationships yet</span>
                    )}
                  </div>
                </div>

                {/* Growth Timeline */}
                {statistics.growthData.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                      Recent Growth
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {statistics.growthData.slice(-6).map((data, index) => (
                        <Badge key={index} variant="outline">
                          {formatMonthYear(data.year, data.month)}: +{data.membersAdded}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center">
            No statistics available
          </p>
        )}
      </CardContent>
    </Card>
  );
}
