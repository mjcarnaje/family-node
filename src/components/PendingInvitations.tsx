import { useRouter } from "@tanstack/react-router";
import { Mail, TreeDeciduous, Crown, Edit, Eye, Check, X, Clock } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useMyPendingInvitations, useAcceptInvitation } from "~/hooks/useTreeSharing";
import { acceptInvitationByIdFn } from "~/fn/tree-sharing";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export function PendingInvitations() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: invitations, isLoading, error } = useMyPendingInvitations();

  const acceptInvitation = useMutation({
    mutationFn: (invitationId: string) =>
      acceptInvitationByIdFn({ data: { invitationId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-invitations"] });
      queryClient.invalidateQueries({ queryKey: ["family-trees"] });
      toast.success("Invitation accepted! You now have access to the tree.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to accept invitation");
    },
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="h-4 w-4 text-blue-500" />;
      case "editor":
        return <Edit className="h-4 w-4 text-green-500" />;
      case "viewer":
        return <Eye className="h-4 w-4 text-gray-500" />;
      default:
        return <Eye className="h-4 w-4 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Pending Invitations</h2>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return null;
  }

  if (!invitations || invitations.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Mail className="h-5 w-5 text-primary" />
        <h2 className="font-semibold text-gray-900 dark:text-white">
          Pending Invitations
        </h2>
        <span className="ml-auto bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded-full">
          {invitations.length}
        </span>
      </div>

      <div className="space-y-3">
        {invitations.map((invitation) => {
          const expiresAt = new Date(invitation.expiresAt);
          const timeLeft = formatDistanceToNow(expiresAt, { addSuffix: true });

          return (
            <div
              key={invitation.id}
              className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-gray-600"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
                <TreeDeciduous className="h-5 w-5 text-white" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">
                  {invitation.treeName}
                </p>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    {getRoleIcon(invitation.role)}
                    <span className="capitalize">{invitation.role}</span>
                  </span>
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <Clock className="h-3.5 w-3.5" />
                    Expires {timeLeft}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.navigate({ to: `/invitation/${invitation.token}` })}
                >
                  View
                </Button>
                <Button
                  size="sm"
                  onClick={() => acceptInvitation.mutate(invitation.id)}
                  disabled={acceptInvitation.isPending}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  {acceptInvitation.isPending ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Accept
                    </>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
