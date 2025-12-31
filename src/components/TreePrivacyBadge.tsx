import { Lock, Users, Globe } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import type { TreePrivacyLevel } from "~/db/schema";

interface TreePrivacyBadgeProps {
  privacyLevel: TreePrivacyLevel;
  size?: "sm" | "default";
  showLabel?: boolean;
  className?: string;
}

const PRIVACY_CONFIG: Record<
  TreePrivacyLevel,
  {
    label: string;
    icon: React.ReactNode;
    variant: "default" | "secondary" | "outline";
    className: string;
  }
> = {
  private: {
    label: "Private",
    icon: <Lock className="size-3" />,
    variant: "secondary",
    className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  family: {
    label: "Family Only",
    icon: <Users className="size-3" />,
    variant: "secondary",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  },
  public: {
    label: "Public",
    icon: <Globe className="size-3" />,
    variant: "secondary",
    className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  },
};

export function TreePrivacyBadge({
  privacyLevel,
  size = "default",
  showLabel = true,
  className,
}: TreePrivacyBadgeProps) {
  const config = PRIVACY_CONFIG[privacyLevel];

  return (
    <Badge
      variant={config.variant}
      className={cn(
        "gap-1 font-normal",
        size === "sm" && "text-xs px-1.5 py-0",
        config.className,
        className
      )}
    >
      {config.icon}
      {showLabel && <span>{config.label}</span>}
    </Badge>
  );
}
