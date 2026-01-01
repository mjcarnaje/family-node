import { Eye, Pencil, Shield, Crown, Check, X } from "lucide-react";
import {
  ROLE_INFO,
  COLLABORATOR_ROLES,
  getRolePermissions,
  PERMISSION_CATEGORIES,
  getPermissionLabel,
  hasPermission,
  type TreeRole,
  type Permission,
} from "~/lib/role-permissions";
import type { TreeCollaboratorRole } from "~/db/schema";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

const ROLE_ICONS: Record<TreeRole, React.ReactNode> = {
  viewer: <Eye className="h-4 w-4" />,
  editor: <Pencil className="h-4 w-4" />,
  admin: <Shield className="h-4 w-4" />,
  owner: <Crown className="h-4 w-4" />,
};

const ROLE_COLORS: Record<TreeRole, string> = {
  viewer: "text-gray-500",
  editor: "text-green-500",
  admin: "text-blue-500",
  owner: "text-yellow-500",
};

interface RolePermissionsInfoProps {
  /**
   * If provided, only show info for this specific role
   */
  role?: TreeRole;
  /**
   * Show a comparison table of all roles
   */
  showComparison?: boolean;
  /**
   * Whether to show the compact version
   */
  compact?: boolean;
  /**
   * Custom class name for the container
   */
  className?: string;
}

/**
 * Component to display role permissions information
 * Can show a single role's permissions or a comparison table of all roles
 */
export function RolePermissionsInfo({
  role,
  showComparison = false,
  compact = false,
  className = "",
}: RolePermissionsInfoProps) {
  if (showComparison) {
    return <RoleComparisonTable className={className} />;
  }

  if (role) {
    return <SingleRoleInfo role={role} compact={compact} className={className} />;
  }

  return <AllRolesInfo compact={compact} className={className} />;
}

/**
 * Display information for a single role
 */
function SingleRoleInfo({
  role,
  compact,
  className,
}: {
  role: TreeRole;
  compact: boolean;
  className: string;
}) {
  const info = ROLE_INFO[role];
  const permissions = getRolePermissions(role);

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className={ROLE_COLORS[role]}>{ROLE_ICONS[role]}</span>
        <span className="font-medium">{info.label}</span>
        <span className="text-muted-foreground text-sm">- {info.shortDescription}</span>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <span className={ROLE_COLORS[role]}>{ROLE_ICONS[role]}</span>
        <span className="font-semibold text-lg">{info.label}</span>
      </div>
      <p className="text-muted-foreground text-sm">{info.description}</p>
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Capabilities:</h4>
        <div className="grid grid-cols-2 gap-1">
          {permissions.slice(0, 12).map((permission) => (
            <div key={permission} className="flex items-center gap-1 text-xs text-muted-foreground">
              <Check className="h-3 w-3 text-green-500" />
              <span>{getPermissionLabel(permission)}</span>
            </div>
          ))}
          {permissions.length > 12 && (
            <div className="text-xs text-muted-foreground">
              +{permissions.length - 12} more
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Display information for all roles
 */
function AllRolesInfo({
  compact,
  className,
}: {
  compact: boolean;
  className: string;
}) {
  const allRoles: TreeRole[] = [...COLLABORATOR_ROLES, "owner"];

  if (compact) {
    return (
      <div className={`space-y-2 ${className}`}>
        {allRoles.map((role) => (
          <SingleRoleInfo key={role} role={role} compact={true} className="" />
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="font-semibold">Role Permissions</h3>
      <div className="grid gap-4 md:grid-cols-2">
        {allRoles.map((role) => (
          <div key={role} className="rounded-lg border p-4">
            <SingleRoleInfo role={role} compact={false} className="" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Display a comparison table of all roles and their permissions
 */
function RoleComparisonTable({ className }: { className: string }) {
  const allRoles: TreeRole[] = ["viewer", "editor", "admin", "owner"];

  return (
    <div className={`overflow-auto ${className}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 pr-4 font-medium">Permission</th>
            {allRoles.map((role) => (
              <th key={role} className="text-center py-2 px-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex flex-col items-center gap-1 cursor-help">
                      <span className={ROLE_COLORS[role]}>{ROLE_ICONS[role]}</span>
                      <span className="font-medium text-xs">{ROLE_INFO[role].label}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{ROLE_INFO[role].description}</TooltipContent>
                </Tooltip>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PERMISSION_CATEGORIES.map((category) => (
            <>
              <tr key={category.name} className="bg-muted/50">
                <td colSpan={5} className="py-2 px-2 font-medium text-xs uppercase tracking-wide">
                  {category.name}
                </td>
              </tr>
              {category.permissions.map((permission) => (
                <tr key={permission} className="border-b border-muted">
                  <td className="py-1.5 pr-4 text-muted-foreground">
                    {getPermissionLabel(permission)}
                  </td>
                  {allRoles.map((role) => (
                    <td key={role} className="text-center py-1.5 px-2">
                      {hasPermission(role, permission) ? (
                        <Check className="h-4 w-4 text-green-500 mx-auto" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Compact role badge component
 */
export function RoleBadge({
  role,
  showLabel = true,
  size = "sm",
}: {
  role: TreeRole;
  showLabel?: boolean;
  size?: "xs" | "sm" | "md";
}) {
  const info = ROLE_INFO[role];

  const sizeClasses = {
    xs: "text-xs px-1.5 py-0.5 gap-1",
    sm: "text-sm px-2 py-1 gap-1.5",
    md: "text-base px-3 py-1.5 gap-2",
  };

  const iconSizes = {
    xs: "h-3 w-3",
    sm: "h-4 w-4",
    md: "h-5 w-5",
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`inline-flex items-center rounded-full bg-muted cursor-help ${sizeClasses[size]}`}
        >
          <span className={ROLE_COLORS[role]}>
            {role === "viewer" && <Eye className={iconSizes[size]} />}
            {role === "editor" && <Pencil className={iconSizes[size]} />}
            {role === "admin" && <Shield className={iconSizes[size]} />}
            {role === "owner" && <Crown className={iconSizes[size]} />}
          </span>
          {showLabel && <span>{info.label}</span>}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {info.label}: {info.shortDescription}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Role selector component for forms
 */
export function RoleSelector({
  value,
  onChange,
  disabled = false,
  excludeOwner = true,
  showDescriptions = true,
}: {
  value: TreeCollaboratorRole;
  onChange: (role: TreeCollaboratorRole) => void;
  disabled?: boolean;
  excludeOwner?: boolean;
  showDescriptions?: boolean;
}) {
  const roles = excludeOwner ? COLLABORATOR_ROLES : [...COLLABORATOR_ROLES];

  return (
    <div className="space-y-2">
      {roles.map((role) => {
        const info = ROLE_INFO[role];
        const isSelected = value === role;

        return (
          <button
            key={role}
            type="button"
            disabled={disabled}
            onClick={() => onChange(role)}
            className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
              isSelected
                ? "border-primary bg-primary/5"
                : "border-muted hover:border-muted-foreground/20"
            } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <span className={`mt-0.5 ${ROLE_COLORS[role]}`}>{ROLE_ICONS[role]}</span>
            <div className="flex-1">
              <div className="font-medium">{info.label}</div>
              {showDescriptions && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {info.shortDescription}
                </div>
              )}
            </div>
            {isSelected && (
              <Check className="h-4 w-4 text-primary mt-0.5" />
            )}
          </button>
        );
      })}
    </div>
  );
}
