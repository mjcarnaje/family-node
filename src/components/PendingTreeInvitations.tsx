import { Check, X, TreePine } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import {
  usePendingInvitations,
  useAcceptInvitation,
  useDeclineInvitation,
} from "~/hooks/useTreePrivacy";

export function PendingTreeInvitations() {
  const { data: invitations, isLoading } = usePendingInvitations();
  const acceptInvitation = useAcceptInvitation();
  const declineInvitation = useDeclineInvitation();

  if (isLoading) {
    return null;
  }

  if (!invitations || invitations.length === 0) {
    return null;
  }

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TreePine className="size-5 text-amber-600" />
          Pending Invitations
        </CardTitle>
        <CardDescription>
          You have been invited to collaborate on family trees
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {invitations.map((inv) => (
          <div
            key={inv.invitation.id}
            className="flex items-center justify-between rounded-lg border bg-background p-3"
          >
            <div>
              <div className="font-medium">{inv.tree.name}</div>
              <div className="text-sm text-muted-foreground">
                Invited by {inv.invitedBy.name}
              </div>
              {inv.tree.description && (
                <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                  {inv.tree.description}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => declineInvitation.mutate(inv.invitation.id)}
                disabled={declineInvitation.isPending || acceptInvitation.isPending}
              >
                <X className="size-4 mr-1" />
                Decline
              </Button>
              <Button
                size="sm"
                onClick={() => acceptInvitation.mutate(inv.invitation.id)}
                disabled={acceptInvitation.isPending || declineInvitation.isPending}
              >
                <Check className="size-4 mr-1" />
                Accept
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
