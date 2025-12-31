import { useCompareVersions } from "~/hooks/useTreeVersions";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { GitCompare, Plus, Minus, Edit, Users, Heart, Link2 } from "lucide-react";

interface TreeVersionDiffProps {
  versionId1: string;
  versionId2: string;
}

export function TreeVersionDiff({ versionId1, versionId2 }: TreeVersionDiffProps) {
  const { data, isLoading, error } = useCompareVersions({
    versionId1,
    versionId2,
  });

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Comparing Versions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            Version Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Failed to load version comparison
          </p>
        </CardContent>
      </Card>
    );
  }

  const {
    version1,
    version2,
    membersAdded,
    membersRemoved,
    membersModified,
    relationshipsAdded,
    relationshipsRemoved,
    marriagesAdded,
    marriagesRemoved,
  } = data;

  const hasChanges =
    membersAdded.length > 0 ||
    membersRemoved.length > 0 ||
    membersModified.length > 0 ||
    relationshipsAdded.length > 0 ||
    relationshipsRemoved.length > 0 ||
    marriagesAdded.length > 0 ||
    marriagesRemoved.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitCompare className="h-5 w-5" />
          Version Comparison
        </CardTitle>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
          <span>
            v{version1.versionNumber} ({formatDate(version1.createdAt)})
          </span>
          <span>→</span>
          <span>
            v{version2.versionNumber} ({formatDate(version2.createdAt)})
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {!hasChanges ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            No differences found between these versions
          </p>
        ) : (
          <div className="space-y-6">
            {/* Members Changes */}
            {(membersAdded.length > 0 ||
              membersRemoved.length > 0 ||
              membersModified.length > 0) && (
              <div>
                <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4" />
                  Family Members
                </h4>
                <div className="space-y-2">
                  {membersAdded.map((member) => (
                    <DiffItem
                      key={member.id}
                      type="added"
                      label={`${member.firstName} ${member.lastName}`}
                    />
                  ))}
                  {membersRemoved.map((member) => (
                    <DiffItem
                      key={member.id}
                      type="removed"
                      label={`${member.firstName} ${member.lastName}`}
                    />
                  ))}
                  {membersModified.map(({ before, after }) => (
                    <DiffItem
                      key={after.id}
                      type="modified"
                      label={`${after.firstName} ${after.lastName}`}
                      details={getModifiedFields(before, after)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Relationships Changes */}
            {(relationshipsAdded.length > 0 || relationshipsRemoved.length > 0) && (
              <div>
                <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                  <Link2 className="h-4 w-4" />
                  Parent-Child Relationships
                </h4>
                <div className="space-y-2">
                  {relationshipsAdded.map((rel) => (
                    <DiffItem
                      key={rel.id}
                      type="added"
                      label={`Relationship (${rel.relationshipType})`}
                    />
                  ))}
                  {relationshipsRemoved.map((rel) => (
                    <DiffItem
                      key={rel.id}
                      type="removed"
                      label={`Relationship (${rel.relationshipType})`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Marriages Changes */}
            {(marriagesAdded.length > 0 || marriagesRemoved.length > 0) && (
              <div>
                <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                  <Heart className="h-4 w-4" />
                  Marriage Connections
                </h4>
                <div className="space-y-2">
                  {marriagesAdded.map((marriage) => (
                    <DiffItem
                      key={marriage.id}
                      type="added"
                      label={`Marriage (${marriage.status})`}
                    />
                  ))}
                  {marriagesRemoved.map((marriage) => (
                    <DiffItem
                      key={marriage.id}
                      type="removed"
                      label={`Marriage (${marriage.status})`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="flex flex-wrap gap-2 pt-4 border-t">
              {membersAdded.length > 0 && (
                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                  <Plus className="h-3 w-3 mr-1" />
                  {membersAdded.length} member{membersAdded.length !== 1 ? "s" : ""} added
                </Badge>
              )}
              {membersRemoved.length > 0 && (
                <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                  <Minus className="h-3 w-3 mr-1" />
                  {membersRemoved.length} member{membersRemoved.length !== 1 ? "s" : ""} removed
                </Badge>
              )}
              {membersModified.length > 0 && (
                <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">
                  <Edit className="h-3 w-3 mr-1" />
                  {membersModified.length} member{membersModified.length !== 1 ? "s" : ""} modified
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface DiffItemProps {
  type: "added" | "removed" | "modified";
  label: string;
  details?: string;
}

function DiffItem({ type, label, details }: DiffItemProps) {
  const styles = {
    added: {
      bg: "bg-green-50 dark:bg-green-950/50",
      border: "border-green-200 dark:border-green-800",
      text: "text-green-700 dark:text-green-400",
      icon: <Plus className="h-4 w-4" />,
    },
    removed: {
      bg: "bg-red-50 dark:bg-red-950/50",
      border: "border-red-200 dark:border-red-800",
      text: "text-red-700 dark:text-red-400",
      icon: <Minus className="h-4 w-4" />,
    },
    modified: {
      bg: "bg-yellow-50 dark:bg-yellow-950/50",
      border: "border-yellow-200 dark:border-yellow-800",
      text: "text-yellow-700 dark:text-yellow-400",
      icon: <Edit className="h-4 w-4" />,
    },
  };

  const style = styles[type];

  return (
    <div
      className={`flex items-start gap-2 p-2 rounded-lg border ${style.bg} ${style.border}`}
    >
      <span className={style.text}>{style.icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${style.text}`}>{label}</p>
        {details && (
          <p className="text-xs text-muted-foreground mt-0.5">{details}</p>
        )}
      </div>
    </div>
  );
}

function getModifiedFields(before: Record<string, unknown>, after: Record<string, unknown>): string {
  const changedFields: string[] = [];
  const fieldsToCheck = [
    "firstName",
    "lastName",
    "middleName",
    "nickname",
    "gender",
    "birthDate",
    "birthPlace",
    "deathDate",
    "deathPlace",
    "bio",
    "profileImageUrl",
  ];

  for (const field of fieldsToCheck) {
    if (before[field] !== after[field]) {
      changedFields.push(field.replace(/([A-Z])/g, " $1").toLowerCase());
    }
  }

  return changedFields.length > 0
    ? `Changed: ${changedFields.join(", ")}`
    : "Fields modified";
}
