import { useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Copy, LogOut, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Form,
  HStack,
  IconButton,
  Input,
  Section,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import { ConfirmButton } from "@/components/confirm-button";
import { api, unwrap } from "@/lib/api";
import { membersQuery, projectsQuery } from "@/lib/queries";
import { formatDate } from "@/lib/format";
import { clearSelectedProject } from "@/lib/project";
import { useAuth } from "@/providers/auth-provider";
import { useApiMutation } from "@/hooks/use-api-mutation";

export const MembersPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery(membersQuery().list());
  const [email, setEmail] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const invalidate = [membersQuery().all];

  const invite = useApiMutation({
    mutationFn: () => unwrap(api.members.invites.$post({ json: { email: email.trim() } })),
    invalidate,
    onSuccess: (result) => {
      toast.success(result.message);
      setInviteLink(result.url);
      setEmail("");
    },
  });

  const revoke = useApiMutation({
    mutationFn: (id: string) => unwrap(api.members.invites[":id"].$delete({ param: { id } })),
    invalidate,
    success: "Invite revoked",
  });

  const remove = useApiMutation({
    mutationFn: (userId: string) => unwrap(api.members[":userId"].$delete({ param: { userId } })),
    invalidate,
    success: "Member removed",
  });

  const leave = useApiMutation({
    mutationFn: () => unwrap(api.members[":userId"].$delete({ param: { userId: user?.id ?? "" } })),
    invalidate: [projectsQuery().all],
    success: "You left the project",
    onSuccess: () => {
      clearSelectedProject();
      navigate("/apps");
    },
  });

  if (isLoading || !data) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  const isOwner = data.role === "owner";
  const used = data.members.length + data.invites.length;
  const people = [
    { ...data.owner, role: "Owner", joinedAt: null },
    ...data.members.map((member) => ({ ...member, role: "Member" })),
  ];

  const copyLink = async (link: string) => {
    await navigator.clipboard.writeText(link);
    toast.success("Invite link copied");
  };

  let inviteLabel = "Send invite";
  if (invite.isPending) {
    inviteLabel = "Sending...";
  }

  return (
    <>
      <PageHeader
        title="Members"
        action={
          <>
            <Text as="span" size="sm" tone="muted" tabular>
              {used} / {data.limit} seats
            </Text>
            {!isOwner && (
              <ConfirmButton
                title="Leave this project?"
                description="You lose access to everything in it until the owner invites you again."
                confirmLabel="Leave project"
                confirmVariant="destructive"
                onConfirm={() => leave.mutate(undefined)}
              >
                <Button variant="secondary" disabled={leave.isPending}>
                  <LogOut />
                  Leave project
                </Button>
              </ConfirmButton>
            )}
          </>
        }
      />
      <Stack gap={6}>
        {isOwner && (
          <Card>
            <CardHeader>
              <CardTitle>Invite member</CardTitle>
            </CardHeader>
            <CardContent>
              <Stack gap={4}>
                <Form gap="sm" className="sm:flex-row" onSubmit={() => invite.mutate(undefined)}>
                  <Input
                    type="email"
                    aria-label="Email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Email address"
                    required
                  />
                  <Button type="submit" loading={invite.isPending} disabled={!email.trim() || used >= data.limit} className="shrink-0">
                    {!invite.isPending && <Send />}
                    {inviteLabel}
                  </Button>
                </Form>
                {inviteLink && (
                  <Alert
                    variant="success"
                    title="Invite link"
                    action={
                      <Button variant="secondary" size="sm" onClick={() => copyLink(inviteLink)}>
                        <Copy />
                        Copy link
                      </Button>
                    }
                  >
                    <Text as="span" size="xs" mono truncate tone="inherit" className="block">
                      {inviteLink}
                    </Text>
                  </Alert>
                )}
              </Stack>
            </CardContent>
          </Card>
        )}

        <Section title="People" spacing="sm">
          <Table framed>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {people.map((person) => (
                <TableRow key={person.id}>
                  <TableCell>
                    <HStack gap={3}>
                      <Avatar name={person.name} size="sm" />
                      <Text as="span" weight="medium">
                        {person.name}
                      </Text>
                      {person.id === user?.id && (
                        <Text as="span" size="xs" tone="muted">
                          (you)
                        </Text>
                      )}
                    </HStack>
                  </TableCell>
                  <TableCell>
                    <Text as="span" size="sm" tone="muted">
                      {person.email}
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{person.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Text as="span" size="sm" tone="muted">
                      {person.joinedAt && formatDate(person.joinedAt)}
                    </Text>
                  </TableCell>
                  <TableCell>
                    {isOwner && person.role === "Member" && (
                      <ConfirmButton
                        title={`Remove ${person.name}?`}
                        description="They lose access to this project immediately."
                        confirmLabel="Remove"
                        onConfirm={() => remove.mutate(person.id)}
                      >
                        <IconButton icon={Trash2} label="Remove member" variant="ghost" size="sm" tooltip={false} />
                      </ConfirmButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>

        {data.invites.length > 0 && (
          <Section title="Pending invites" spacing="sm">
            <Table framed>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Invited by</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.invites.map((pending) => (
                  <TableRow key={pending.id}>
                    <TableCell>
                      <Text as="span" weight="medium">
                        {pending.email}
                      </Text>
                    </TableCell>
                    <TableCell>
                      <Text as="span" size="sm" tone="muted">
                        {pending.invitedBy}
                      </Text>
                    </TableCell>
                    <TableCell>
                      {pending.expired && <Badge variant="warning">Expired</Badge>}
                      {!pending.expired && (
                        <Text as="span" size="sm" tone="muted">
                          {formatDate(pending.expiresAt)}
                        </Text>
                      )}
                    </TableCell>
                    <TableCell>
                      {isOwner && (
                        <ConfirmButton
                          title={`Revoke the invite for ${pending.email}?`}
                          description="The invite link stops working."
                          confirmLabel="Revoke"
                          onConfirm={() => revoke.mutate(pending.id)}
                        >
                          <IconButton icon={Trash2} label="Revoke invite" variant="ghost" size="sm" tooltip={false} />
                        </ConfirmButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>
        )}
      </Stack>
    </>
  );
};
