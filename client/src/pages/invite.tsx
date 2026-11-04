import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, unwrap } from "@/lib/api";
import { membersQuery } from "@/lib/queries";
import { selectProject } from "@/lib/project";
import { useAuth } from "@/providers/auth-provider";
import { useApiMutation } from "@/hooks/use-api-mutation";

export const InvitePage = () => {
  const { token = "" } = useParams();
  const { user, logout } = useAuth();
  const { data, isLoading, error } = useQuery(membersQuery().invite(token));

  const accept = useApiMutation({
    mutationFn: () => unwrap(api.invites[":token"].accept.$post({ param: { token } })),
    onSuccess: ({ project }) => {
      selectProject(project.id);
      window.location.assign("/apps");
    },
  });

  if (isLoading) {
    return <Skeleton className="mx-auto h-48 w-full max-w-md" />;
  }

  if (error || !data) {
    return (
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle>Invite not found</CardTitle>
          <CardDescription>{error?.message ?? "This invite is invalid or was revoked."}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { invite } = data;
  const wrongAccount = user?.email.toLowerCase() !== invite.email;

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>Join {invite.projectName}</CardTitle>
        <CardDescription>
          {invite.invitedBy} invited {invite.email} to this project on EasyHost.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {invite.expired && <p className="text-destructive">This invite has expired. Ask the project owner to send a new one.</p>}
        {!invite.expired && wrongAccount && (
          <p>
            You are logged in as {user?.email}. Log out and sign in or sign up with {invite.email} to accept.
          </p>
        )}
        {!invite.expired && !wrongAccount && <p>You will be able to manage its apps, deploys, storage, database, email and API keys.</p>}
      </CardContent>
      <CardFooter className="gap-2">
        {!invite.expired && !wrongAccount && (
          <Button onClick={() => accept.mutate(undefined)} disabled={accept.isPending}>
            {accept.isPending ? "Joining..." : "Accept invite"}
          </Button>
        )}
        {!invite.expired && wrongAccount && (
          <Button variant="outline" onClick={() => logout()}>
            Log out
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
