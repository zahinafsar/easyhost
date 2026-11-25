import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Eye, EyeOff, KeyRound, Play, Plug, Table2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  EmptyState,
  FormActions,
  Grid,
  HStack,
  Icon,
  Input,
  Kbd,
  List,
  ListItem,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
  Textarea,
} from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import { Facts } from "@/components/facts";
import { ConfirmButton } from "@/components/confirm-button";
import { SecretField } from "@/components/resources/secret-field";
import { SelectableList, SelectableListItem } from "@/components/ui/selectable-list";
import { CellValue } from "@/components/ui/cell-value";
import { api, unwrap } from "@/lib/api";
import { databasesQuery, userQuery } from "@/lib/queries";
import { formatBytes } from "@/lib/format";
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
      <HStack gap={1} className="min-w-48">
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
          className="h-8 rounded-sm font-mono text-xs"
        />
        {nullable && (
          <Button variant="secondary" size="xs" onMouseDown={(event) => event.preventDefault()} onClick={() => commit(null)}>
            NULL
          </Button>
        )}
      </HStack>
    );
  }

  return (
    <CellValue editable={editable} empty={value === null} title={value ?? "NULL"} onEdit={start}>
      {value ?? "NULL"}
    </CellValue>
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
    <Card>
      <CardContent>
        <Stack gap={5}>
          <Alert variant="danger" title="Database is blocked">
            This database is larger than its size limit, so connections are blocked and the project's apps are stopped. Truncate or drop tables to get under the limit.
          </Alert>
          {!tables.length && <EmptyState size="sm" bordered title="No tables." />}
          {!!tables.length && (
            <List variant="divided">
              {tables.map((table) => (
                <ListItem key={table.name}>
                  <HStack justify="between" gap={3}>
                    <HStack gap={2}>
                      <Icon icon={Table2} tone="muted" />
                      <Text as="span" size="sm" mono>
                        {table.name}
                      </Text>
                    </HStack>
                    <HStack gap={2}>
                      <ConfirmButton
                        title={`Truncate ${table.name}?`}
                        description="Every row in this table will be permanently deleted. The table itself stays."
                        confirmLabel="Truncate"
                        onConfirm={() => clear.mutate({ table: table.name, mode: "truncate" })}
                      >
                        <Button variant="secondary" size="sm" disabled={clear.isPending}>
                          Truncate
                        </Button>
                      </ConfirmButton>
                      <ConfirmButton
                        title={`Drop ${table.name}?`}
                        description="The table and all its rows will be permanently deleted."
                        confirmLabel="Drop"
                        onConfirm={() => clear.mutate({ table: table.name, mode: "drop" })}
                      >
                        <Button variant="destructive" size="sm" disabled={clear.isPending}>
                          Drop
                        </Button>
                      </ConfirmButton>
                    </HStack>
                  </HStack>
                </ListItem>
              ))}
            </List>
          )}
        </Stack>
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
      <Card className="py-0">
        <EmptyState icon={Table2} title="No tables" />
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
    <Grid cols="sidebar-left" gap={6} align="start">
      <SelectableList label="Tables" className="max-h-[32rem]">
        {tables.map((item) => (
          <SelectableListItem
            key={item.name}
            icon={Table2}
            active={item.name === table}
            onSelect={() => {
              setSelected(item.name);
              setPage(1);
            }}
          >
            {item.name}
          </SelectableListItem>
        ))}
      </SelectableList>
      <Stack gap={3}>
        {rows.isLoading && <Skeleton className="h-64 w-full rounded-xl" />}
        {rows.isError && <Alert variant="danger">{rows.error.message}</Alert>}
        {data && (
          <>
            <Table framed>
              <TableHeader>
                <TableRow>
                  {data.columns.map((column) => (
                    <TableHead key={column.name}>
                      <HStack as="span" gap={2} inline>
                        <Text as="span" size="inherit" mono className="normal-case tracking-normal text-foreground">
                          {column.name}
                        </Text>
                        <Text as="span" size="2xs" tone="muted" className="normal-case tracking-normal">
                          {column.type}
                          {column.isPrimaryKey && " PK"}
                        </Text>
                      </HStack>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data.rows.length && <TableEmpty colSpan={data.columns.length}>No rows</TableEmpty>}
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
            <FormActions align="end">
              <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <Button variant="secondary" size="sm" disabled={lastRow >= data.total} onClick={() => setPage(page + 1)}>
                Next
              </Button>
            </FormActions>
          </>
        )}
      </Stack>
    </Grid>
  );
};

const SqlConsole = ({ databaseId }: { databaseId: string }) => {
  const [sql, setSql] = useState("");

  const run = useApiMutation({
    mutationFn: () => unwrap(api.databases[":id"].query.$post({ param: { id: databaseId }, json: { sql } })),
    invalidate: [databasesQuery().detail(databaseId).queryKey, ["databases", "rows", databaseId]],
  });

  const result = run.data?.result;
  const rows = (result?.rows ?? []) as Record<string, unknown>[];

  return (
    <Stack gap={4}>
      <Card>
        <CardContent>
          <Stack gap={4}>
            <Textarea
              aria-label="SQL"
              value={sql}
              onChange={(event) => setSql(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  run.mutate(undefined);
                }
              }}
              placeholder="SQL"
              className="min-h-56 font-mono text-sm"
              spellCheck={false}
            />
            <HStack gap={3}>
              <Button onClick={() => run.mutate(undefined)} loading={run.isPending} disabled={!sql.trim()}>
                {!run.isPending && <Play />}
                Run
              </Button>
              <HStack gap={1}>
                <Kbd>Cmd/Ctrl</Kbd>
                <Text as="span" size="xs" tone="muted">
                  +
                </Text>
                <Kbd>Enter</Kbd>
              </HStack>
            </HStack>
          </Stack>
        </CardContent>
      </Card>
      {result && !result.columns.length && (
        <Alert variant="success">
          {result.command} {result.rowCount ?? 0} row(s).
        </Alert>
      )}
      {result && !!result.columns.length && (
        <Stack gap={2}>
          <Table framed>
            <TableHeader>
              <TableRow>
                {result.columns.map((column) => (
                  <TableHead key={column} className="font-mono normal-case tracking-normal">
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
          {result.truncated && (
            <Text size="xs" tone="muted">
              Showing the first 1000 rows.
            </Text>
          )}
        </Stack>
      )}
    </Stack>
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
    return (
      <Stack gap={6}>
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </Stack>
    );
  }

  const { database, tables } = data;

  const connections = [
    { label: "Database URL", value: database.connectionString },
    { label: "Shadow database URL", value: database.shadowConnectionString },
  ];

  const copy = async (value: string) => {
    await navigator.clipboard.writeText(value);
    toast.success("Copied");
  };

  const display = (value: string) => {
    if (revealed) {
      return value;
    }
    return maskPassword(value);
  };

  let databaseStatus = "Active";
  if (database.blocked) {
    databaseStatus = "Blocked";
  }

  let revealLabel = "Show";
  let RevealIcon = Eye;
  if (revealed) {
    revealLabel = "Hide";
    RevealIcon = EyeOff;
  }

  return (
    <>
      <PageHeader
        title={
          <HStack gap={3}>
            {database.name}
            {database.blocked && <Badge variant="destructive">Blocked</Badge>}
          </HStack>
        }
        action={
          <>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="secondary">
                  <Plug />
                  Connect
                </Button>
              </DialogTrigger>
              <DialogContent size="xl" aria-describedby={undefined}>
                <DialogHeader>
                  <DialogTitle>Connection</DialogTitle>
                </DialogHeader>
                <Stack gap={4}>
                  {connections.map((connection) => (
                    <SecretField key={connection.label} label={connection.label} display={display(connection.value)} onCopy={() => copy(connection.value)} />
                  ))}
                </Stack>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setRevealed(!revealed)}>
                    <RevealIcon />
                    {revealLabel}
                  </Button>
                  <ConfirmButton
                    title="Reset password?"
                    description="The current connection string stops working immediately. Apps using it must be updated."
                    confirmLabel="Reset"
                    onConfirm={() => resetPassword.mutate(undefined)}
                  >
                    <Button variant="secondary" disabled={resetPassword.isPending}>
                      <KeyRound />
                      Reset password
                    </Button>
                  </ConfirmButton>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <ConfirmButton
              title={`Delete ${database.name}?`}
              description="The database and all its data will be permanently deleted."
              onConfirm={() => remove.mutate(undefined)}
            >
              <Button variant="destructive">
                <Trash2 />
                Delete
              </Button>
            </ConfirmButton>
          </>
        }
      />
      <Stack gap={6}>
        <Facts
          items={[
            { label: "Engine", value: "PostgreSQL" },
            { label: "Size", value: `${formatBytes(database.sizeBytes)} / ${formatBytes(database.limitBytes)}` },
            { label: "Tables", value: tables.length },
            { label: "Status", value: databaseStatus },
          ]}
        />

        {database.blocked && <BlockedTables databaseId={database.id} tables={tables} />}

        {!database.blocked && (
          <Tabs defaultValue="tables">
            <TabsList variant="line" className="mb-2 w-full justify-start">
              <TabsTrigger value="tables">Table editor</TabsTrigger>
              <TabsTrigger value="sql">SQL console</TabsTrigger>
            </TabsList>
            <TabsContent value="tables">
              <TableEditor databaseId={database.id} tables={tables} />
            </TabsContent>
            <TabsContent value="sql">
              <SqlConsole databaseId={database.id} />
            </TabsContent>
          </Tabs>
        )}
      </Stack>
    </>
  );
};
