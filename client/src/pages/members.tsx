import { useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Copy, LogOut, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    return <Skeleton className="h-64 w-full" />;
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

  return (
    <>
      <PageHeader
        title="Members"
        description="People who can manage this project's apps, deploys, storage, database, email and API keys."
        action={
          !isOwner && (
            <ConfirmButton
              title="Leave this project?"
              description="You lose access to everything in it until the owner invites you again."
              confirmLabel="Leave project"
              confirmVariant="destructive"
              onConfirm={() => leave.mutate(undefined)}
            >
              <Button variant="outline" disabled={leave.isPending}>
                <LogOut className="size-4" />
                Leave project
              </Button>
            </ConfirmButton>
          )
        }
      />
      <div className="space-y-8">
        {isOwner && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Invite a member</CardTitle>
              <CardDescription>
                They get an email with a link that works for 7 days. {used} / {data.limit} members and invites used.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  invite.mutate(undefined);
                }}
              >
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="teammate@example.com"
                  required
                />
                <Button type="submit" disabled={invite.isPending || !email.trim() || used >= data.limit}>
                  <Send className="size-4" />
                  {invite.isPending ? "Sending..." : "Send invite"}
                </Button>
              </form>
              {inviteLink && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="truncate font-mono text-xs">{inviteLink}</span>
                  <Button variant="ghost" size="sm" onClick={() => copyLink(inviteLink)}>
                    <Copy className="size-4" />
                    Copy link
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="py-0">
          <Table>
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
                  <TableCell className="font-medium">
                    {person.name}
                    {person.id === user?.id && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{person.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{person.role}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{person.joinedAt && formatDate(person.joinedAt)}</TableCell>
                  <TableCell>
                    {isOwner && person.role === "Member" && (
                      <ConfirmButton
                        title={`Remove ${person.name}?`}
                        description="They lose access to this project immediately."
                        confirmLabel="Remove"
                        onConfirm={() => remove.mutate(person.id)}
                      >
                        <Button variant="ghost" size="icon">
                          <Trash2 className="size-4" />
                        </Button>
                      </ConfirmButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {data.invites.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">Pending invites</h2>
            <Card className="py-0">
              <Table>
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
                      <TableCell className="font-medium">{pending.email}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{pending.invitedBy}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {pending.expired ? "Expired" : formatDate(pending.expiresAt)}
                      </TableCell>
                      <TableCell>
                        {isOwner && (
                          <ConfirmButton
                            title={`Revoke the invite for ${pending.email}?`}
                            description="The invite link stops working."
                            confirmLabel="Revoke"
                            onConfirm={() => revoke.mutate(pending.id)}
                          >
                            <Button variant="ghost" size="icon">
                              <Trash2 className="size-4" />
                            </Button>
                          </ConfirmButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}
      </div>
    </>
  );
};
