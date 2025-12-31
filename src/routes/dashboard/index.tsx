import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import {
  TreeDeciduous,
  Users2,
  Mail,
  Plus,
  ArrowRight,
  Sparkles,
  Calendar,
  Eye,
} from "lucide-react";
import { authClient } from "~/lib/auth-client";
import { PendingInvitations } from "~/components/PendingInvitations";
import { Button } from "~/components/ui/button";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelContent,
} from "~/components/ui/panel";
import { getMyFamilyTreesFn } from "~/fn/family-trees";
import { getMyPendingInvitationsFn } from "~/fn/tree-sharing";

// Query options for dashboard data
const getDashboardDataQuery = () =>
  queryOptions({
    queryKey: ["dashboard-data"],
    queryFn: async () => {
      const [trees, invitations] = await Promise.all([
        getMyFamilyTreesFn(),
        getMyPendingInvitationsFn().catch(() => []),
      ]);

      const totalMembers = trees.reduce((sum, tree) => sum + tree.memberCount, 0);
      const recentTrees = [...trees]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 4);

      return {
        trees,
        invitations,
        totalMembers,
        recentTrees,
      };
    },
  });

export const Route = createFileRoute("/dashboard/")({
  component: DashboardHome,
});

function DashboardHome() {
  const { data: session } = authClient.useSession();
  const { data, isLoading } = useQuery(getDashboardDataQuery());

  const stats = [
    {
      label: "Family Trees",
      value: data?.trees.length ?? 0,
      icon: TreeDeciduous,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Family Members",
      value: data?.totalMembers ?? 0,
      icon: Users2,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Pending Invitations",
      value: data?.invitations.length ?? 0,
      icon: Mail,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-500/10",
    },
  ];

  const hasTrees = data?.trees && data.trees.length > 0;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            Welcome back, {session?.user?.name || "there"}!
          </h1>
          <p className="text-muted-foreground mt-2">
            Here's an overview of your family trees and recent activity.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Panel key={stat.label} className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {isLoading ? (
                        <span className="inline-block w-8 h-6 bg-muted animate-pulse rounded" />
                      ) : (
                        stat.value
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/dashboard/trees/new">
              <Plus className="h-4 w-4 mr-2" />
              Create New Tree
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/dashboard/trees">
              <TreeDeciduous className="h-4 w-4 mr-2" />
              View All Trees
            </Link>
          </Button>
        </div>

        {/* Pending Invitations */}
        <PendingInvitations />

        {/* Recent Trees or Getting Started */}
        {hasTrees ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Recent Family Trees</h2>
              <Button asChild variant="ghost" size="sm">
                <Link to="/dashboard/trees">
                  View all
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data?.recentTrees.map((tree) => (
                <Panel
                  key={tree.id}
                  className="hover:shadow-lg hover:border-primary/40 transition-all duration-300 group hover:-translate-y-1"
                >
                  <Link
                    to="/dashboard/trees/$treeId"
                    params={{ treeId: tree.id }}
                    className="block focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-xl"
                  >
                    <PanelHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <TreeDeciduous className="h-5 w-5" />
                          </div>
                          <PanelTitle className="text-lg group-hover:text-primary transition-colors">
                            {tree.name}
                          </PanelTitle>
                        </div>
                        <Eye className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </PanelHeader>
                    <PanelContent>
                      {tree.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          {tree.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Users2 className="h-3.5 w-3.5" />
                          <span>
                            {tree.memberCount}{" "}
                            {tree.memberCount === 1 ? "member" : "members"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>
                            Updated {new Date(tree.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </PanelContent>
                  </Link>
                </Panel>
              ))}
            </div>
          </div>
        ) : (
          !isLoading && (
            <Panel className="p-8">
              <div className="flex flex-col items-center text-center max-w-md mx-auto">
                <div className="p-4 rounded-full bg-primary/10 mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold mb-2">
                  Get Started with Family Nodes
                </h2>
                <p className="text-muted-foreground mb-6">
                  Create your first family tree to start documenting your family
                  history with interactive visualization.
                </p>
                <div className="space-y-3 w-full">
                  <div className="flex items-start gap-3 text-left p-3 rounded-lg bg-muted/50">
                    <div className="p-1.5 rounded-full bg-primary/20 text-primary text-xs font-bold">
                      1
                    </div>
                    <div>
                      <p className="font-medium text-sm">Create a family tree</p>
                      <p className="text-xs text-muted-foreground">
                        Give it a name and optional description
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-left p-3 rounded-lg bg-muted/50">
                    <div className="p-1.5 rounded-full bg-primary/20 text-primary text-xs font-bold">
                      2
                    </div>
                    <div>
                      <p className="font-medium text-sm">Add family members</p>
                      <p className="text-xs text-muted-foreground">
                        Build your tree with names, photos, and details
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 text-left p-3 rounded-lg bg-muted/50">
                    <div className="p-1.5 rounded-full bg-primary/20 text-primary text-xs font-bold">
                      3
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        Connect and share
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Define relationships and invite family to collaborate
                      </p>
                    </div>
                  </div>
                </div>
                <Button asChild className="mt-6" size="lg">
                  <Link to="/dashboard/trees/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Tree
                  </Link>
                </Button>
              </div>
            </Panel>
          )
        )}
      </div>
    </div>
  );
}
