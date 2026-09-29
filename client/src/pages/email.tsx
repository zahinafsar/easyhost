import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { CodeBlock } from "@/components/code-block";
import { ConfirmButton } from "@/components/confirm-button";
import { api, unwrap } from "@/lib/api";
import { emailsQuery } from "@/lib/queries";
import { API_ORIGIN, formatDate } from "@/lib/format";
import { useApiMutation } from "@/hooks/use-api-mutation";

export const EmailPage = () => {
  const [page, setPage] = useState(1);
  const [username, setUsername] = useState("");
  const { data, isLoading } = useQuery(emailsQuery().logs(page));

  const addSender = useApiMutation({
    mutationFn: () => unwrap(api.emails.senders.$post({ json: { username: username.trim() } })),
    invalidate: [emailsQuery().all],
    success: "Sender added",
    onSuccess: () => setUsername(""),
  });

  const removeSender = useApiMutation({
    mutationFn: (id: string) => unwrap(api.emails.senders[":id"].$delete({ param: { id } })),
    invalidate: [emailsQuery().all],
    success: "Sender removed",
  });

  const sender = data?.senders[0];
  const exampleFrom = sender?.address ?? `you@${data?.domain}`;
  const usagePercent = data ? Math.min((data.sentToday / data.dailyLimit) * 100, 100) : 0;

  return (
    <>
      <PageHeader title="Email" description="One sender address and transactional email logs for this app." />
      {isLoading && <Skeleton className="h-64 w-full" />}
      {data && (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(14rem,1fr)]">
            <Card>
              <CardHeader className="border-b">
                <CardTitle>Sender address</CardTitle>
                <CardDescription>This is the only address this app can send from.</CardDescription>
              </CardHeader>
              <CardContent>
                {sender ? (
                  <div className="flex min-h-10 items-center justify-between gap-3 border bg-muted/30 px-3">
                    <span className="truncate font-mono text-sm">{sender.address}</span>
                    <ConfirmButton
                      title={`Remove ${sender.address}?`}
                      description="This app cannot send email until you create another sender address."
                      confirmLabel="Remove"
                      confirmVariant="destructive"
                      onConfirm={() => removeSender.mutate(sender.id)}
                    >
                      <Button variant="ghost" size="icon-sm" disabled={removeSender.isPending}>
                        <Trash2 className="size-4" />
                      </Button>
                    </ConfirmButton>
                  </div>
                ) : (
                  <form
                    className="flex gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      addSender.mutate(undefined);
                    }}
                  >
                    <div className="flex min-w-0 flex-1 items-center border">
                      <Input
                        value={username}
                        onChange={(event) => setUsername(event.target.value.toLowerCase())}
                        placeholder="username"
                        className="border-0 font-mono shadow-none focus-visible:ring-0"
                      />
                      <span className="pr-3 font-mono text-sm text-muted-foreground">@{data.domain}</span>
                    </div>
                    <Button type="submit" disabled={addSender.isPending || !username.trim()}>
                      <Plus className="size-4" />
                      {addSender.isPending ? "Adding..." : "Add"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Last 24 hours</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-3xl font-semibold tracking-tight">
                  {data.sentToday}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">/ {data.dailyLimit} sent</span>
                </p>
                <div className="h-1.5 bg-muted">
                  <div className="h-full bg-primary transition-[width]" style={{ width: `${usagePercent}%` }} />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader className="border-b">
              <CardTitle>Quick start</CardTitle>
              <CardDescription>Send with an API key created for this project.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <CodeBlock
                code={`curl -X POST ${API_ORIGIN}/api/v1/email/send \\
  -H "Authorization: Bearer $EASYHOST_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"from": "${exampleFrom}", "to": "user@example.com", "subject": "Hello", "html": "<p>Hi there</p>"}'`}
              />
              <p className="text-xs text-muted-foreground">"from" must match this app&apos;s sender address.</p>
            </CardContent>
          </Card>

          <Card className="mt-8 gap-0 py-0">
            <CardHeader className="border-b py-5">
              <CardTitle>Delivery logs</CardTitle>
              <CardDescription>Recent email attempts from this app.</CardDescription>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>To</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data.logs.length && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-12 text-center text-sm text-muted-foreground">
                      No emails sent yet.
                    </TableCell>
                  </TableRow>
                )}
                {data.logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">{log.to.join(", ")}</TableCell>
                    <TableCell className="text-sm">{log.subject}</TableCell>
                    <TableCell title={log.error ?? undefined}>
                      <StatusBadge status={log.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(log.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {data.total > data.limit && (
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * data.limit >= data.total}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );
};
