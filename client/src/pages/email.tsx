import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const senders = data?.senders ?? [];
  let exampleFrom = `you@${data?.domain}`;
  if (senders.length) {
    exampleFrom = senders[0].address;
  }
  const atLimit = !!data && senders.length >= data.maxSenders;

  return (
    <>
      <PageHeader title="Email" description="Send transactional email from your apps with an API key." />
      <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Sent in the last 24 hours</CardTitle>
          </CardHeader>
          <CardContent>
            {data && (
              <p className="text-2xl font-semibold">
                {data.sentToday} <span className="text-base font-normal text-muted-foreground">/ {data.dailyLimit}</span>
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sender addresses</CardTitle>
            {data && (
              <span className="text-xs text-muted-foreground">
                {senders.length} / {data.maxSenders}
              </span>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {data && !senders.length && (
              <p className="text-sm text-muted-foreground">Add a sender address before sending email.</p>
            )}
            {senders.map((sender) => (
              <div key={sender.id} className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm">{sender.address}</span>
                <ConfirmButton
                  title={`Remove ${sender.address}?`}
                  description="Apps sending from this address will get an error until you use another sender."
                  confirmLabel="Remove"
                  onConfirm={() => removeSender.mutate(sender.id)}
                >
                  <Button variant="ghost" size="icon" className="size-8">
                    <Trash2 className="size-4" />
                  </Button>
                </ConfirmButton>
              </div>
            ))}
            {data && !atLimit && (
              <form
                className="flex gap-2 pt-1"
                onSubmit={(event) => {
                  event.preventDefault();
                  addSender.mutate(undefined);
                }}
              >
                <div className="flex flex-1 items-center border">
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
                  Add
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Send an email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <CodeBlock
            code={`curl -X POST ${API_ORIGIN}/api/v1/email/send \\
  -H "Authorization: Bearer $EASYHOST_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"from": "${exampleFrom}", "to": "user@example.com", "subject": "Hello", "html": "<p>Hi there</p>"}'`}
          />
          <p className="text-xs text-muted-foreground">
            "from" is required and must be one of your sender addresses.
          </p>
        </CardContent>
      </Card>
      <h2 className="mb-3 mt-8 font-semibold">Logs</h2>
      {isLoading && <Skeleton className="h-40 w-full" />}
      {data && (
        <Card className="py-0">
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
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
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
      )}
      {data && data.total > data.limit && (
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={page * data.limit >= data.total} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      )}
    </>
  );
};
