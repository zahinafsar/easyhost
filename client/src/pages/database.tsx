import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Play, Table2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { ConfirmButton } from "@/components/confirm-button";
import { CodeBlock } from "@/components/code-block";
import { api, unwrap } from "@/lib/api";
import { databasesQuery, userQuery } from "@/lib/queries";
import { API_ORIGIN, formatBytes } from "@/lib/format";
import { useApiMutation } from "@/hooks/use-api-mutation";

const formatCell = (value: unknown) => {
  if (value === null || value === undefined) {
    return "NULL";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
};

export const DatabasePage = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [sql, setSql] = useState("SELECT name FROM sqlite_master WHERE type = 'table';");
  const { data, isLoading } = useQuery(databasesQuery().detail(id));

  const run = useApiMutation({
    mutationFn: () => unwrap(api.databases[":id"].query.$post({ param: { id }, json: { sql } })),
    invalidate: [databasesQuery().detail(id).queryKey],
  });

  const remove = useApiMutation({
    mutationFn: () => unwrap(api.databases[":id"].$delete({ param: { id } })),
    invalidate: [databasesQuery().all, userQuery().all],
    success: "Database deleted",
    onSuccess: () => navigate("/databases"),
  });

  if (isLoading || !data) {
    return <Skeleton className="h-64 w-full" />;
  }

  const { database, tables } = data;
  const result = run.data?.result;
  const rows = (result?.rows ?? []) as Record<string, unknown>[];

  return (
    <>
      <PageHeader
        title={database.name}
        description={`SQLite, ${formatBytes(database.sizeBytes)}`}
        action={
          <ConfirmButton
            title={`Delete ${database.name}?`}
            description="The database file and all its data will be permanently deleted."
            onConfirm={() => remove.mutate(undefined)}
          >
            <Button variant="destructive">
              <Trash2 className="size-4" />
              Delete
            </Button>
          </ConfirmButton>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-sm">Tables</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {!tables.length && <p className="text-sm text-muted-foreground">No tables yet.</p>}
            {tables.map((table) => (
              <button
                key={table.name}
                onClick={() => setSql(`SELECT * FROM "${table.name}" LIMIT 100;`)}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                <Table2 className="size-4 text-muted-foreground" />
                {table.name}
              </button>
            ))}
          </CardContent>
        </Card>
        <div className="min-w-0 space-y-4">
          <Textarea
            value={sql}
            onChange={(event) => setSql(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                run.mutate(undefined);
              }
            }}
            className="min-h-40 font-mono text-sm"
          />
          <div className="flex items-center gap-3">
            <Button onClick={() => run.mutate(undefined)} disabled={run.isPending}>
              <Play className="size-4" />
              Run
            </Button>
            <span className="text-xs text-muted-foreground">Cmd/Ctrl + Enter</span>
          </div>
          {result && result.changes !== null && (
            <p className="text-sm text-muted-foreground">{result.changes} row(s) affected.</p>
          )}
          {result && result.changes === null && !result.columns.length && (
            <p className="text-sm text-muted-foreground">Statement executed.</p>
          )}
          {result && !!result.columns.length && (
            <Card className="overflow-auto py-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    {result.columns.map((column) => (
                      <TableHead key={column} className="font-mono">
                        {column}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow key={index}>
                      {result.columns.map((column) => (
                        <TableCell key={column} className="font-mono text-xs">
                          {formatCell(row[column])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {result.truncated && <p className="p-3 text-xs text-muted-foreground">Showing the first 1000 rows.</p>}
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Query over HTTP</CardTitle>
            </CardHeader>
            <CardContent>
              <CodeBlock
                code={`curl -X POST ${API_ORIGIN}/api/v1/databases/${database.name}/query \\
  -H "Authorization: Bearer $EASYHOST_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"sql": "SELECT * FROM users WHERE id = ?", "params": [1]}'`}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};
