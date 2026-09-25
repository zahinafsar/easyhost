import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, FileText, List, Play, Plus, RefreshCw, Square, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmButton } from "@/components/confirm-button";
import { CodeBlock } from "@/components/code-block";
import { api, unwrap } from "@/lib/api";
import { appsQuery, userQuery } from "@/lib/queries";
import { formatDate } from "@/lib/format";
import { mergeEnv, parseEnv, stringifyEnv, type EnvRow } from "@/lib/dotenv";
import { cn } from "@/lib/utils";
import { useApiMutation } from "@/hooks/use-api-mutation";

const DeploymentLog = ({ appId, deploymentId }: { appId: string; deploymentId: string }) => {
  const { data } = useQuery(appsQuery().deployment(appId, deploymentId));
  return (
    <pre className="max-h-96 overflow-auto bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-100">
      {data?.deployment.log || "Waiting for logs..."}
    </pre>
  );
};

const EnvEditor = ({ appId, initial }: { appId: string; initial: Record<string, string> }) => {
  const [rows, setRows] = useState<EnvRow[]>(() => Object.entries(initial).map(([key, value]) => ({ key, value })));
  const [mode, setMode] = useState<"table" | "text">("table");
  const [text, setText] = useState("");

  const currentRows = () => {
    if (mode === "text") {
      return parseEnv(text);
    }
    return rows.filter((row) => row.key.trim());
  };

  const save = useApiMutation({
    mutationFn: () => {
      const env = Object.fromEntries(currentRows().map((row) => [row.key.trim(), row.value]));
      return unwrap(api.apps[":id"].env.$put({ param: { id: appId }, json: { env } }));
    },
    invalidate: [appsQuery().all],
    success: "Environment saved. Redeploy to apply.",
    onSuccess: () => {
      if (mode === "text") {
        setRows(parseEnv(text));
        setMode("table");
      }
    },
  });

  const switchMode = () => {
    if (mode === "table") {
      setText(stringifyEnv(rows));
      setMode("text");
      return;
    }
    setRows(parseEnv(text));
    setMode("table");
  };

  const update = (index: number, field: keyof EnvRow, value: string) => {
    setRows(rows.map((row, current) => {
      if (current === index) {
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  const pasteIntoKey = (index: number, event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text");
    if (!pasted.includes("=")) {
      return;
    }
    const parsed = parseEnv(pasted);
    if (!parsed.length) {
      return;
    }
    event.preventDefault();
    const remaining = rows.filter((row, current) => current !== index || row.key.trim() || row.value);
    setRows(mergeEnv(remaining, parsed));
    let label = "variables";
    if (parsed.length === 1) {
      label = "variable";
    }
    toast.success(`Added ${parsed.length} ${label}`);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Environment variables</CardTitle>
        <Button variant="ghost" size="sm" onClick={switchMode}>
          {mode === "table" ? <FileText className="size-4" /> : <List className="size-4" />}
          {mode === "table" ? "Edit as .env" : "Edit as table"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {mode === "text" && (
          <>
            <Textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={"DATABASE_URL=postgresql://...\nJWT_SECRET=...\n# Paste your whole .env here"}
              className="min-h-72 font-mono text-xs"
              spellCheck={false}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Paste a full .env file. Comments and blank lines are ignored. Saving replaces all variables with this content.
            </p>
          </>
        )}
        {mode === "table" && (
          <>
            {!rows.length && (
              <p className="text-sm text-muted-foreground">No variables yet. Add one, or paste a .env into a key field.</p>
            )}
            {rows.map((row, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  className="font-mono"
                  placeholder="KEY"
                  value={row.key}
                  onChange={(event) => update(index, "key", event.target.value)}
                  onPaste={(event) => pasteIntoKey(index, event)}
                />
                <Input className="font-mono" placeholder="value" value={row.value} onChange={(event) => update(index, "value", event.target.value)} />
                <Button variant="ghost" size="icon" onClick={() => setRows(rows.filter((_, current) => current !== index))}>
                  <X className="size-4" />
                </Button>
              </div>
            ))}
          </>
        )}
        <div className="flex gap-2">
          {mode === "table" && (
            <Button variant="outline" size="sm" onClick={() => setRows([...rows, { key: "", value: "" }])}>
              <Plus className="size-4" />
              Add variable
            </Button>
          )}
          <Button size="sm" onClick={() => save.mutate(undefined)} disabled={save.isPending}>
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export const AppDetailPage = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery(appsQuery().detail(id));
  const [selected, setSelected] = useState<string | null>(null);
  const logs = useQuery({ ...appsQuery().logs(id), enabled: false });

  const invalidate = [appsQuery().all, userQuery().all];

  const redeploy = useApiMutation({
    mutationFn: () => unwrap(api.apps[":id"].redeploy.$post({ param: { id } })),
    invalidate,
    success: "Redeploy queued",
    onSuccess: (result) => setSelected(result.deployment.id),
  });
  const stop = useApiMutation({
    mutationFn: () => unwrap(api.apps[":id"].stop.$post({ param: { id } })),
    invalidate,
    success: "App stopped",
  });
  const start = useApiMutation({
    mutationFn: () => unwrap(api.apps[":id"].start.$post({ param: { id } })),
    invalidate,
    success: "App started",
  });
  const remove = useApiMutation({
    mutationFn: () => unwrap(api.apps[":id"].$delete({ param: { id } })),
    invalidate,
    success: "App deleted",
    onSuccess: () => navigate("/apps"),
  });

  if (isLoading || !data) {
    return <Skeleton className="h-64 w-full" />;
  }

  const { app, deployments } = data;
  const activeDeployment = selected ?? deployments[0]?.id;

  return (
    <>
      <PageHeader
        title={app.name}
        description={app.url}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <a href={app.url} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" />
                Visit
              </a>
            </Button>
            <Button variant="outline" onClick={() => redeploy.mutate(undefined)} disabled={redeploy.isPending}>
              <RefreshCw className="size-4" />
              Redeploy
            </Button>
            {app.status === "STOPPED" && (
              <Button variant="outline" onClick={() => start.mutate(undefined)} disabled={start.isPending}>
                <Play className="size-4" />
                Start
              </Button>
            )}
            {app.status === "RUNNING" && (
              <Button variant="outline" onClick={() => stop.mutate(undefined)} disabled={stop.isPending}>
                <Square className="size-4" />
                Stop
              </Button>
            )}
            <ConfirmButton
              title={`Delete ${app.name}?`}
              description="This removes the container, images, deployments and routing. This cannot be undone."
              onConfirm={() => remove.mutate(undefined)}
            >
              <Button variant="destructive">
                <Trash2 className="size-4" />
                Delete
              </Button>
            </ConfirmButton>
          </div>
        }
      />
      <div className="mb-6 flex items-center gap-3">
        <StatusBadge status={app.status} />
        <span className="text-sm text-muted-foreground">Updated {formatDate(app.updatedAt)}</span>
      </div>
      <Tabs defaultValue="deployments">
        <TabsList>
          <TabsTrigger value="deployments">Deployments</TabsTrigger>
          <TabsTrigger value="logs" onClick={() => logs.refetch()}>
            Runtime logs
          </TabsTrigger>
          <TabsTrigger value="env">Environment</TabsTrigger>
        </TabsList>
        <TabsContent value="deployments" className="mt-4">
          {!deployments.length && (
            <Card>
              <CardContent className="space-y-3 py-6">
                <p className="text-sm text-muted-foreground">No deployments yet. From your Next.js project run:</p>
                <CodeBlock code={`npx ezhst deploy --app ${app.slug}`} />
              </CardContent>
            </Card>
          )}
          {!!deployments.length && (
            <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
              <Card className="gap-0 py-0">
                {deployments.map((deployment) => (
                  <button
                    key={deployment.id}
                    onClick={() => setSelected(deployment.id)}
                    className={cn(
                      "flex w-full items-center justify-between border-b px-4 py-3 text-left text-sm last:border-b-0 hover:bg-muted/50",
                      activeDeployment === deployment.id && "bg-muted",
                    )}
                  >
                    <span className="text-muted-foreground">{formatDate(deployment.createdAt)}</span>
                    <StatusBadge status={deployment.status} />
                  </button>
                ))}
              </Card>
              {activeDeployment && <DeploymentLog appId={app.id} deploymentId={activeDeployment} />}
            </div>
          )}
        </TabsContent>
        <TabsContent value="logs" className="mt-4 space-y-3">
          <Button variant="outline" size="sm" onClick={() => logs.refetch()} disabled={logs.isFetching}>
            <RefreshCw className="size-4" />
            Refresh
          </Button>
          <pre className="max-h-[32rem] overflow-auto bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-100">
            {logs.data?.logs || "No logs yet."}
          </pre>
        </TabsContent>
        <TabsContent value="env" className="mt-4">
          <EnvEditor appId={app.id} initial={app.env as Record<string, string>} />
        </TabsContent>
      </Tabs>
    </>
  );
};
