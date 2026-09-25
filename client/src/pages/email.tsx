import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { CodeBlock } from "@/components/code-block";
import { emailsQuery } from "@/lib/queries";
import { API_ORIGIN, formatDate } from "@/lib/format";

export const EmailPage = () => {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery(emailsQuery().logs(page));

  return (
    <>
      <PageHeader title="Email" description="Send transactional email from your apps with an API key." />
      <div className="grid gap-4 md:grid-cols-2">
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
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Sender</CardTitle>
          </CardHeader>
          <CardContent>{data && <p className="font-mono text-sm">{data.from}</p>}</CardContent>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Send an email</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock
            code={`curl -X POST ${API_ORIGIN}/api/v1/email/send \\
  -H "Authorization: Bearer $EASYHOST_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"to": "user@example.com", "subject": "Hello", "html": "<p>Hi there</p>"}'`}
          />
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
