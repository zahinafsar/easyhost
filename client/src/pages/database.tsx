import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Copy, Eye, EyeOff, KeyRound, Play, Table2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { ConfirmButton } from "@/components/confirm-button";
import { api, unwrap } from "@/lib/api";
import { databasesQuery, userQuery } from "@/lib/queries";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
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

const maskPassword = (url: string) => url.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:********@");

const EditableCell = ({
  value,
  nullable,
  editable,
  onSave,
}: {
  value: string | null;
  nullable: boolean;
  editable: boolean;
  onSave: (value: string | null) => void;
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const start = () => {
    if (!editable) {
      return;
    }
    setDraft(value ?? "");
    setEditing(true);
  };

  const commit = (next: string | null) => {
    setEditing(false);
    if (next !== value) {
      onSave(next);
    }
  };

  if (editing) {
    return (
      <div className="flex min-w-48 items-center gap-1">
        <Input
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => commit(draft)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              commit(draft);
            }
            if (event.key === "Escape") {
              setEditing(false);
            }
          }}
          className="h-7 font-mono text-xs"
        />
        {nullable && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => commit(null)}
          >
            NULL
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={start}
      className={cn(
        "max-w-xs truncate",
        editable && "cursor-text hover:bg-muted/60",
        value === null && "italic text-muted-foreground",
      )}
      title={value ?? "NULL"}
    >
      {value ?? "NULL"}
    </div>
  );
};

const BlockedTables = ({ databaseId, tables }: { databaseId: string; tables: { name: string }[] }) => {
  const clear = useApiMutation({
    mutationFn: (input: { table: string; mode: "truncate" | "drop" }) =>
      unwrap(api.databases[":id"].tables[":table"].clear.$post({ param: { id: databaseId, table: input.table }, json: { mode: input.mode } })),
    invalidate: [databasesQuery().all],
    success: "Table cleared",
  });

  return (
    <Card className="border-red-300">
      <CardHeader>
        <CardTitle className="text-base">Database is blocked</CardTitle>
        <p className="text-sm text-muted-foreground">
          This database is larger than its size limit, so connections are blocked and the project's apps are stopped. Truncate or drop tables to get under the limit.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {!tables.length && <p className="text-sm text-muted-foreground">No tables.</p>}
        {tables.map((table) => (
          <div key={table.name} className="flex items-center justify-between gap-3 border p-3">
            <span className="font-mono text-sm">{table.name}</span>
            <div className="flex gap-2">
              <ConfirmButton
                title={`Truncate ${table.name}?`}
                description="Every row in this table will be permanently deleted. The table itself stays."
                confirmLabel="Truncate"
                onConfirm={() => clear.mutate({ table: table.name, mode: "truncate" })}
              >
                <Button variant="outline" size="sm" disabled={clear.isPending}>Truncate</Button>
              </ConfirmButton>
              <ConfirmButton
                title={`Drop ${table.name}?`}
                description="The table and all its rows will be permanently deleted."
                confirmLabel="Drop"
                onConfirm={() => clear.mutate({ table: table.name, mode: "drop" })}
              >
                <Button variant="destructive" size="sm" disabled={clear.isPending}>Drop</Button>
              </ConfirmButton>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

const TableEditor = ({ databaseId, tables }: { databaseId: string; tables: { name: string }[] }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const table = selected ?? tables[0]?.name ?? null;

  const rows = useQuery({
    ...databasesQuery().rows(databaseId, table ?? "", page),
    enabled: !!table,
  });

  const save = useApiMutation({
    mutationFn: (input: { key: Record<string, string | null>; column: string; value: string | null }) =>
      unwrap(api.databases[":id"].tables[":table"].rows.$patch({ param: { id: databaseId, table: table ?? "" }, json: input })),
    invalidate: [["databases", "rows", databaseId]],
    success: "Saved",
  });

  if (!tables.length) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No tables yet. Create them with your ORM migrations or the SQL console.
        </CardContent>
      </Card>
    );
  }

  const data = rows.data;
  const editable = !!data?.primaryKey.length;
  let lastRow = 0;
  if (data && data.total) {
    lastRow = Math.min(data.page * data.pageSize, data.total);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <Card className="h-fit gap-0 py-2">
        {tables.map((item) => (
          <button
            key={item.name}
            onClick={() => {
              setSelected(item.name);
              setPage(1);
            }}
            className={cn(
              "flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-muted",
              item.name === table && "bg-muted font-medium",
            )}
          >
            <Table2 className="size-4 text-muted-foreground" />
            <span className="truncate">{item.name}</span>
          </button>
        ))}
      </Card>
      <div className="min-w-0 space-y-3">
        {rows.isLoading && <Skeleton className="h-64 w-full" />}
        {rows.isError && <p className="text-sm text-destructive">{rows.error.message}</p>}
        {data && (
          <>
            <Card className="overflow-auto py-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    {data.columns.map((column) => (
                      <TableHead key={column.name} className="whitespace-nowrap">
                        <span className="font-mono">{column.name}</span>
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          {column.type}
                          {column.isPrimaryKey && " PK"}
                        </span>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!data.rows.length && (
                    <TableRow>
                      <TableCell colSpan={data.columns.length} className="py-10 text-center text-sm text-muted-foreground">
                        This table is empty.
                      </TableCell>
                    </TableRow>
                  )}
                  {data.rows.map((row, index) => {
                    const key = Object.fromEntries(data.primaryKey.map((name) => [name, row[name]]));
                    return (
                      <TableRow key={`${page}-${index}`}>
                        {data.columns.map((column) => (
                          <TableCell key={column.name} className="font-mono text-xs">
                            <EditableCell
                              value={row[column.name]}
                              nullable={column.nullable}
                              editable={editable}
                              onSave={(value) => save.mutate({ key, column: column.name, value })}
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={lastRow >= data.total} onClick={() => setPage(page + 1)}>
                Next
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const SqlConsole = ({ databaseId }: { databaseId: string }) => {
  const [sql, setSql] = useState("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';");

  const run = useApiMutation({
    mutationFn: () => unwrap(api.databases[":id"].query.$post({ param: { id: databaseId }, json: { sql } })),
    invalidate: [databasesQuery().detail(databaseId).queryKey, ["databases", "rows", databaseId]],
  });

  const result = run.data?.result;
  const rows = (result?.rows ?? []) as Record<string, unknown>[];

  return (
    <div className="space-y-4">
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
      {result && !result.columns.length && (
        <p className="text-sm text-muted-foreground">
          {result.command} {result.rowCount ?? 0} row(s).
        </p>
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
    </div>
  );
};

export const DatabasePage = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [revealed, setRevealed] = useState(false);
  const { data, isLoading } = useQuery(databasesQuery().detail(id));

  const resetPassword = useApiMutation({
    mutationFn: () => unwrap(api.databases[":id"]["reset-password"].$post({ param: { id } })),
    invalidate: [databasesQuery().detail(id).queryKey],
    success: "Password reset. Update the connection string in your apps.",
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

  const connections = [
    { label: "Database URL", value: database.connectionString },
    { label: "Shadow database URL (for migration)", value: database.shadowConnectionString },
  ];

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success("Copied");
  };

  return (
    <>
      <PageHeader
        title={database.name}
        description={`Postgres, ${formatBytes(database.sizeBytes)} of ${formatBytes(database.limitBytes)} used`}
        action={
          <ConfirmButton
            title={`Delete ${database.name}?`}
            description="The database and all its data will be permanently deleted."
            onConfirm={() => remove.mutate(undefined)}
          >
            <Button variant="destructive">
              <Trash2 className="size-4" />
              Delete
            </Button>
          </ConfirmButton>
        }
      />

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Connection</CardTitle>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setRevealed(!revealed)}>
              {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              {revealed ? "Hide" : "Show"}
            </Button>
            <ConfirmButton
              title="Reset password?"
              description="The current connection string stops working immediately. Apps using it must be updated."
              confirmLabel="Reset"
              onConfirm={() => resetPassword.mutate(undefined)}
            >
              <Button variant="outline" size="sm" disabled={resetPassword.isPending}>
                <KeyRound className="size-4" />
                Reset password
              </Button>
            </ConfirmButton>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {connections.map((connection) => (
            <div key={connection.label} className="space-y-1.5">
              <p className="text-xs text-muted-foreground">{connection.label}</p>
              <div className="flex items-stretch border bg-muted/40">
                <pre className="min-w-0 flex-1 overflow-x-auto p-3 font-mono text-xs">
                  {revealed ? connection.value : maskPassword(connection.value)}
                </pre>
                <Button variant="ghost" size="icon" className="h-auto rounded-none border-l" onClick={() => copy(connection.value)}>
                  <Copy className="size-4" />
                </Button>
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Using psql or a GUI client like TablePlus? Change the sslmode parameter to sslmode=require.
          </p>
        </CardContent>
      </Card>

      {database.blocked && <BlockedTables databaseId={database.id} tables={tables} />}

      {!database.blocked && <Tabs defaultValue="tables">
        <TabsList>
          <TabsTrigger value="tables">Table editor</TabsTrigger>
          <TabsTrigger value="sql">SQL console</TabsTrigger>
        </TabsList>
        <TabsContent value="tables" className="mt-4">
          <TableEditor databaseId={database.id} tables={tables} />
        </TabsContent>
        <TabsContent value="sql" className="mt-4">
          <SqlConsole databaseId={database.id} />
        </TabsContent>
      </Tabs>}
    </>
  );
};
