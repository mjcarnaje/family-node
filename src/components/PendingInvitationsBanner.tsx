import { Mail, Check, X } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useMyPendingInvitations, useAcceptInvitation } from "~/hooks/useTreeSharing";

export function PendingInvitationsBanner() {
  const { data: invitations, isLoading } = useMyPendingInvitations();
  const acceptInvitation = useAcceptInvitation();

  if (isLoading || !invitations || invitations.length === 0) {
    return null;
  }

  const handleAccept = async (token: string) => {
    await acceptInvitation.mutateAsync(token);
  };

  return (
    <div className="space-y-2">
      {invitations.map((invitation) => (
        <div
          key={invitation.id}
          className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">
                You've been invited to "{invitation.treeName}"
              </p>
              <p className="text-sm text-muted-foreground">
                As a{" "}
                <span className="font-medium">
                  {invitation.role === "viewer"
                    ? "Viewer"
                    : invitation.role === "editor"
                      ? "Editor"
                      : "Admin"}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => handleAccept(invitation.token)}
              disabled={acceptInvitation.isPending}
            >
              <Check className="mr-2 h-4 w-4" />
              Accept
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
