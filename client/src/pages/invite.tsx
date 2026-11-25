import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { LogOut, UserPlus, UserX } from "lucide-react";
import { Alert, Button, Card, CardContent, CardDescription, CardFooter, CardHeader, Heading, IconBadge, Skeleton, Text } from "@/components/ui";
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
    return <Skeleton className="mx-auto mt-10 h-64 w-full max-w-md rounded-xl" />;
  }

  if (error || !data) {
    return (
      <Card className="mx-auto mt-10 w-full max-w-md">
        <CardHeader className="gap-3">
          <IconBadge icon={UserX} tone="danger" size="lg" />
          <Heading level={1} size="lg">
            Invite not found
          </Heading>
          <CardDescription>{error?.message ?? "This invite is invalid or was revoked."}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { invite } = data;
  const wrongAccount = user?.email.toLowerCase() !== invite.email;

  let acceptLabel = "Accept invite";
  if (accept.isPending) {
    acceptLabel = "Joining...";
  }

  return (
    <Card className="mx-auto mt-10 w-full max-w-md">
      <CardHeader className="gap-3">
        <IconBadge icon={UserPlus} tone="success" size="lg" />
        <Heading level={1} size="lg">
          Join {invite.projectName}
        </Heading>
        <CardDescription>
          {invite.invitedBy} invited {invite.email} to this project on Reverhost.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {invite.expired && <Alert variant="danger">This invite has expired. Ask the project owner to send a new one.</Alert>}
        {!invite.expired && wrongAccount && (
          <Alert variant="warning">
            You are logged in as {user?.email}. Log out and sign in or sign up with {invite.email} to accept.
          </Alert>
        )}
        {!invite.expired && !wrongAccount && (
          <Text size="sm" tone="muted">
            You will be able to manage its apps, deploys, storage and database.
          </Text>
        )}
      </CardContent>
      {!invite.expired && (
        <CardFooter className="gap-2">
          {!wrongAccount && (
            <Button block loading={accept.isPending} onClick={() => accept.mutate(undefined)}>
              {acceptLabel}
            </Button>
          )}
          {wrongAccount && (
            <Button variant="outline" block onClick={() => logout()}>
              <LogOut />
              Log out
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
};
