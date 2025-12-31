import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { authClient } from "~/lib/auth-client";
import { getInvitationByTokenFn, acceptInvitationFn } from "~/fn/tree-sharing";
import { Button } from "~/components/ui/button";
import { Users, Crown, Edit, Eye, CheckCircle, XCircle, Clock, TreeDeciduous } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/invitation/$token")({
  component: InvitationPage,
  loader: async ({ params }) => {
    const invitation = await getInvitationByTokenFn({
      data: { token: params.token },
    });
    return { invitation };
  },
});

function InvitationPage() {
  const router = useRouter();
  const { token } = Route.useParams();
  const { invitation } = Route.useLoaderData();
  const { data: session, isPending: isSessionLoading } = authClient.useSession();
  const [isAccepting, setIsAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const isAuthenticated = !!session?.user;
  const userEmail = session?.user?.email?.toLowerCase();
  const inviteeEmail = invitation?.inviteeEmail?.toLowerCase();
  const emailMatches = userEmail === inviteeEmail;

  const handleAcceptInvitation = async () => {
    if (!isAuthenticated) {
      // Redirect to sign-in with redirect back
      router.navigate({
        to: "/sign-in",
        search: { redirect: `/invitation/${token}` },
      });
      return;
    }

    if (!emailMatches) {
      toast.error("Please sign in with the email address the invitation was sent to.");
      return;
    }

    setIsAccepting(true);
    try {
      await acceptInvitationFn({ data: { token } });
      setAccepted(true);
      toast.success("Invitation accepted! You now have access to the family tree.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to accept invitation");
    } finally {
      setIsAccepting(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="h-5 w-5 text-blue-500" />;
      case "editor":
        return <Edit className="h-5 w-5 text-green-500" />;
      case "viewer":
        return <Eye className="h-5 w-5 text-gray-500" />;
      default:
        return <Eye className="h-5 w-5 text-gray-500" />;
    }
  };

  const getRoleDescription = (role: string) => {
    switch (role) {
      case "admin":
        return "view, edit, and manage collaborators";
      case "editor":
        return "view and edit family members";
      case "viewer":
        return "view the family tree";
      default:
        return "access the family tree";
    }
  };

  // Invalid or expired invitation
  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 dark:from-slate-900 dark:to-slate-800 px-4">
        <div className="max-w-md w-full text-center space-y-6 p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-xl">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Invalid or Expired Invitation
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            This invitation link is no longer valid. It may have expired or already been used.
          </p>
          <Link to="/">
            <Button className="w-full">Go to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Accepted state
  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 dark:from-slate-900 dark:to-slate-800 px-4">
        <div className="max-w-md w-full text-center space-y-6 p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-xl">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Invitation Accepted!
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            You now have access to <strong>{invitation.treeName}</strong> as a{" "}
            <span className="capitalize">{invitation.role}</span>.
          </p>
          <Link to="/dashboard/trees">
            <Button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
              <TreeDeciduous className="mr-2 h-4 w-4" />
              View My Trees
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const expiresAt = new Date(invitation.expiresAt);
  const now = new Date();
  const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 px-4 py-12">
      <div className="max-w-md w-full space-y-8 p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-xl">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
            <Users className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            You're Invited!
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            <strong>{invitation.inviterName}</strong> has invited you to collaborate on a family tree.
          </p>
        </div>

        {/* Tree info */}
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-6 space-y-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
              <TreeDeciduous className="h-4 w-4" />
              Family Tree
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {invitation.treeName}
            </p>
            {invitation.treeDescription && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {invitation.treeDescription}
              </p>
            )}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
              Your Role
            </div>
            <div className="flex items-center gap-2">
              {getRoleIcon(invitation.role)}
              <span className="capitalize font-medium text-gray-900 dark:text-white">
                {invitation.role}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                - {getRoleDescription(invitation.role)}
              </span>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4" />
              <span>
                Expires in {daysLeft} day{daysLeft !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Authentication status */}
        {!isSessionLoading && (
          <>
            {isAuthenticated ? (
              emailMatches ? (
                <div className="space-y-4">
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
                    <p className="text-sm text-green-800 dark:text-green-300">
                      Signed in as <strong>{session?.user?.email}</strong>
                    </p>
                  </div>
                  <Button
                    onClick={handleAcceptInvitation}
                    disabled={isAccepting}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                    size="lg"
                  >
                    {isAccepting ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Accepting...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-5 w-5" />
                        Accept Invitation
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-center">
                    <p className="text-sm text-amber-800 dark:text-amber-300">
                      This invitation was sent to <strong>{invitation.inviteeEmail}</strong>.
                      <br />
                      You're signed in as <strong>{session?.user?.email}</strong>.
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      authClient.signOut().then(() => {
                        router.navigate({
                          to: "/sign-in",
                          search: { redirect: `/invitation/${token}` },
                        });
                      });
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    Sign in with a different account
                  </Button>
                </div>
              )
            ) : (
              <div className="space-y-4">
                <p className="text-center text-sm text-gray-600 dark:text-gray-300">
                  Sign in or create an account to accept this invitation.
                </p>
                <div className="space-y-3">
                  <Link
                    to="/sign-in"
                    search={{ redirect: `/invitation/${token}` }}
                    className="block"
                  >
                    <Button className="w-full" variant="default" size="lg">
                      Sign In
                    </Button>
                  </Link>
                  <Link
                    to="/sign-up"
                    search={{ redirect: `/invitation/${token}` }}
                    className="block"
                  >
                    <Button className="w-full" variant="outline" size="lg">
                      Create Account
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </>
        )}

        {isSessionLoading && (
          <div className="flex justify-center py-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        )}
      </div>
    </div>
  );
}
