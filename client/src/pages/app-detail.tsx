import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import type { InferRequestType } from "hono/client";
import { CheckCircle2, ExternalLink, FileText, Globe, List as ListIcon, Play, Plus, RefreshCw, Rocket, Sparkles, Square, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  Alert,
  Button,
  buttonVariants,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Code,
  EmptyState,
  Field,
  Form,
  FormActions,
  Grid,
  HStack,
  Icon,
  IconButton,
  Input,
  Link,
  List,
  ListItem,
  NativeSelect,
  NativeSelectOption,
  Pre,
  SegmentedControl,
  Skeleton,
  Stack,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Text,
  Textarea,
} from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmButton } from "@/components/confirm-button";
import { CodeBlock } from "@/components/code-block";
import { SelectableList, SelectableListItem } from "@/components/ui/selectable-list";
import { api, unwrap } from "@/lib/api";
import { appsQuery, projectsQuery, userQuery } from "@/lib/queries";
import { formatDate } from "@/lib/format";
import { mergeEnv, parseEnv, stringifyEnv, type EnvRow } from "@/lib/dotenv";
import { useApiMutation } from "@/hooks/use-api-mutation";

const DeploymentLog = ({ appId, deploymentId }: { appId: string; deploymentId: string }) => {
  const { data } = useQuery(appsQuery().deployment(appId, deploymentId));
  return (
    <Pre tone="terminal" className="max-h-96 min-h-48 overflow-auto">
      {data?.deployment.log || "Waiting for logs..."}
    </Pre>
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
    onSuccess: (result) => {
      toast.success(result.message);
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

  let description = "Paste a .env into a key field to add many variables at once.";
  if (mode === "text") {
    description = "Paste a full .env file. Comments and blank lines are ignored. Saving replaces all variables with this content.";
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Environment variables</CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction>
          <SegmentedControl
            size="sm"
            aria-label="Editor mode"
            value={mode}
            onValueChange={(next) => {
              if (next !== mode) {
                switchMode();
              }
            }}
            options={[
              { value: "table", label: "Table", icon: ListIcon },
              { value: "text", label: ".env", icon: FileText },
            ]}
          />
        </CardAction>
      </CardHeader>
      <CardContent>
        <Stack gap={4}>
          {mode === "text" && (
            <Textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={"DATABASE_URL=postgresql://...\nJWT_SECRET=...\n# Paste your whole .env here"}
              className="min-h-72 font-mono text-xs"
              spellCheck={false}
              autoFocus
            />
          )}
          {mode === "table" && (
            <Stack gap={2}>
              {!rows.length && (
                <EmptyState size="sm" bordered title="No variables yet" description="Add one, or paste a .env into a key field." />
              )}
              {rows.map((row, index) => (
                <HStack key={index} gap={2}>
                  <Input
                    className="font-mono"
                    placeholder="KEY"
                    value={row.key}
                    onChange={(event) => update(index, "key", event.target.value)}
                    onPaste={(event) => pasteIntoKey(index, event)}
                  />
                  <Input className="font-mono" placeholder="value" value={row.value} onChange={(event) => update(index, "value", event.target.value)} />
                  <IconButton icon={X} label="Remove variable" size="default" onClick={() => setRows(rows.filter((_, current) => current !== index))} />
                </HStack>
              ))}
            </Stack>
          )}
          <FormActions align="between">
            {mode === "table" && (
              <Button variant="secondary" size="sm" onClick={() => setRows([...rows, { key: "", value: "" }])}>
                <Plus />
                Add variable
              </Button>
            )}
            <Button size="sm" className="ml-auto" onClick={() => save.mutate(undefined)} loading={save.isPending}>
              Save
            </Button>
          </FormActions>
        </Stack>
      </CardContent>
    </Card>
  );
};

type BuildForm = {
  nodeVersion: string;
  rootDir: string;
  installCommand: string;
  buildCommand: string;
  startCommand: string;
};

const BUILD_FIELDS: { key: Exclude<keyof BuildForm, "nodeVersion">; label: string; placeholder: string; hint: string }[] = [
  {
    key: "rootDir",
    label: "Root directory",
    placeholder: "Project root",
    hint: "Folder with the app's package.json, e.g. apps/web. Dependencies install where the lockfile is.",
  },
  {
    key: "installCommand",
    label: "Install command",
    placeholder: "Auto: from lockfile, e.g. npm ci",
    hint: "Runs in the folder with the lockfile.",
  },
  {
    key: "buildCommand",
    label: "Build command",
    placeholder: "Auto: build script, skipped if absent",
    hint: "Runs in the root directory. Environment variables are available.",
  },
  {
    key: "startCommand",
    label: "Start command",
    placeholder: "Auto: start script or Node.js entry file",
    hint: "Must listen on 0.0.0.0 and $PORT (3000).",
  },
];

type NodeVersion = NonNullable<InferRequestType<(typeof api.apps)[":id"]["build"]["$put"]>["json"]["nodeVersion"]>;

const BuildSettings = ({
  appId,
  initial,
  nodeVersions,
}: {
  appId: string;
  initial: { [K in keyof BuildForm]: string | null };
  nodeVersions: readonly NodeVersion[];
}) => {
  const [form, setForm] = useState<BuildForm>({
    nodeVersion: initial.nodeVersion ?? "",
    rootDir: initial.rootDir ?? "",
    installCommand: initial.installCommand ?? "",
    buildCommand: initial.buildCommand ?? "",
    startCommand: initial.startCommand ?? "",
  });

  const save = useApiMutation({
    mutationFn: () => {
      return unwrap(
        api.apps[":id"].build.$put({
          param: { id: appId },
          json: { ...form, nodeVersion: nodeVersions.find((version) => version === form.nodeVersion) ?? null },
        }),
      );
    },
    invalidate: [appsQuery().all],
    success: "Build settings saved. Redeploy to apply.",
  });

  return (
    <Grid cols="sidebar" gap={6} align="start">
      <Card>
        <CardHeader>
          <CardTitle>Build settings</CardTitle>
          <CardDescription>Leave a field empty to detect it automatically.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form onSubmit={() => save.mutate(undefined)}>
            <Field label="Node.js version" htmlFor="nodeVersion">
              <NativeSelect id="nodeVersion" value={form.nodeVersion} onChange={(event) => setForm({ ...form, nodeVersion: event.target.value })}>
                <NativeSelectOption value="">Auto: from engines.node, otherwise {nodeVersions[nodeVersions.length - 1]}</NativeSelectOption>
                {nodeVersions.map((version) => (
                  <NativeSelectOption key={version} value={version}>
                    Node {version}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            {BUILD_FIELDS.map((field) => (
              <Field key={field.key} label={field.label} htmlFor={field.key}>
                <Input
                  id={field.key}
                  className="font-mono"
                  placeholder={field.placeholder}
                  value={form[field.key]}
                  onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
                  spellCheck={false}
                />
              </Field>
            ))}
            <FormActions align="start">
              <Button type="submit" size="sm" loading={save.isPending}>
                Save
              </Button>
            </FormActions>
          </Form>
        </CardContent>
      </Card>
      <Card variant="inset">
        <CardHeader>
          <CardTitle>How each step runs</CardTitle>
        </CardHeader>
        <CardContent>
          <List variant="divided">
            {BUILD_FIELDS.map((field) => (
              <ListItem key={field.key}>
                <Stack gap={1}>
                  <Text size="sm" weight="medium">
                    {field.label}
                  </Text>
                  <Text size="sm" tone="muted">
                    {field.hint}
                  </Text>
                </Stack>
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    </Grid>
  );
};

type Domain = { id: string; hostname: string; status: string; error: string | null };

const DnsRecord = ({ type, name, value }: { type: string; name: string; value: string }) => {
  return (
    <Grid cols={3} gap={2}>
      <Code className="block px-3 py-2 text-xs">Type: {type}</Code>
      <Code className="block px-3 py-2 text-xs">Name: {name}</Code>
      <Code className="block px-3 py-2 text-xs">Value: {value}</Code>
    </Grid>
  );
};

const DomainsPanel = ({
  appId,
  domains,
  dnsTarget,
}: {
  appId: string;
  domains: Domain[];
  dnsTarget: { cname: string; ip: string };
}) => {
  const [hostname, setHostname] = useState("");
  const invalidate = [appsQuery().all];

  const add = useApiMutation({
    mutationFn: () => unwrap(api.apps[":id"].domains.$post({ param: { id: appId }, json: { hostname: hostname.trim() } })),
    invalidate,
    success: "Domain added. Create the DNS record, then click Verify.",
    onSuccess: () => setHostname(""),
  });

  const verify = useApiMutation({
    mutationFn: (domainId: string) => unwrap(api.apps[":id"].domains[":domainId"].verify.$post({ param: { id: appId, domainId } })),
    invalidate,
    success: "Domain is live",
  });

  const remove = useApiMutation({
    mutationFn: (domainId: string) => unwrap(api.apps[":id"].domains[":domainId"].$delete({ param: { id: appId, domainId } })),
    invalidate,
    success: "Domain removed",
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom domains</CardTitle>
        <CardDescription>Point your own hostname at this app. HTTPS certificates are issued automatically once DNS is verified.</CardDescription>
      </CardHeader>
      <CardContent>
        <Stack gap={4}>
          <Form gap="sm" onSubmit={() => add.mutate(undefined)}>
            <HStack gap={2}>
              <Input
                aria-label="Hostname"
                value={hostname}
                onChange={(event) => setHostname(event.target.value.toLowerCase())}
                placeholder="www.example.com"
                className="font-mono"
              />
              <Button type="submit" loading={add.isPending} disabled={!hostname.trim()}>
                <Plus />
                Add domain
              </Button>
            </HStack>
          </Form>
          {!domains.length && <EmptyState size="sm" bordered icon={Globe} title="No custom domains yet." />}
          {domains.map((domain) => (
            <Card key={domain.id} variant="inset" className="gap-4 py-4">
              <CardContent className="px-4">
                <Stack gap={3}>
                  <Stack direction="row" align="center" justify="between" wrap gap={2}>
                    <HStack gap={3}>
                      {domain.status === "ACTIVE" && <Icon icon={CheckCircle2} tone="success" />}
                      <Link href={`https://${domain.hostname}`} className="font-mono text-sm">
                        {domain.hostname}
                      </Link>
                      <StatusBadge status={domain.status} />
                    </HStack>
                    <HStack gap={2}>
                      {domain.status !== "ACTIVE" && (
                        <Button variant="secondary" size="sm" onClick={() => verify.mutate(domain.id)} loading={verify.isPending && verify.variables === domain.id}>
                          <RefreshCw />
                          Verify
                        </Button>
                      )}
                      <ConfirmButton
                        title={`Remove ${domain.hostname}?`}
                        description="The domain stops serving this app and its HTTPS certificate is deleted."
                        confirmLabel="Remove"
                        onConfirm={() => remove.mutate(domain.id)}
                      >
                        <IconButton icon={Trash2} label="Remove domain" tooltip={false} />
                      </ConfirmButton>
                    </HStack>
                  </Stack>
                  {domain.error && <Alert variant="danger">{domain.error}</Alert>}
                  {domain.status !== "ACTIVE" && (
                    <Stack gap={2}>
                      <Text size="sm" tone="muted">
                        Add one of these records at your DNS provider, then click Verify:
                      </Text>
                      <DnsRecord type="CNAME" name={domain.hostname} value={dnsTarget.cname} />
                      <Text size="sm" tone="muted">
                        For a root domain (example.com) use an A record instead:
                      </Text>
                      <DnsRecord type="A" name={domain.hostname} value={dnsTarget.ip} />
                    </Stack>
                  )}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
};

export const AppDetailPage = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery(appsQuery().detail(id));
  const [selected, setSelected] = useState<string | null>(null);
  const logs = useQuery({ ...appsQuery().logs(id), enabled: false });

  const invalidate = [appsQuery().all, projectsQuery().all, userQuery().all];

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

  if (error) {
    return <Alert variant="danger">{error.message}</Alert>;
  }

  if (isLoading || !data) {
    return (
      <Stack gap={6}>
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </Stack>
    );
  }

  const { app, deployments } = data;
  const activeDeployment = selected ?? deployments[0]?.id;
  const isAi = app.kind === "AI";
  let defaultTab = "deployments";
  if (isAi) {
    defaultTab = "logs";
  }

  return (
    <>
      <PageHeader
        title={app.name}
        description={
          <Link href={app.url} variant="muted" className="font-mono text-[13px]">
            {app.url}
          </Link>
        }
        action={
          <>
            <Link href={app.url} variant="plain" inline={false} className={buttonVariants({ variant: "secondary" })}>
              <ExternalLink />
              Visit
            </Link>
            {isAi && (
              <Link to={`/builder/${app.id}`} variant="plain" inline={false} className={buttonVariants({ variant: "secondary" })}>
                <Sparkles />
                Open builder
              </Link>
            )}
            {!isAi && (
              <Button variant="secondary" onClick={() => redeploy.mutate(undefined)} loading={redeploy.isPending}>
                <RefreshCw />
                Redeploy
              </Button>
            )}
            {app.status === "STOPPED" && (
              <Button variant="secondary" onClick={() => start.mutate(undefined)} loading={start.isPending}>
                <Play />
                Start
              </Button>
            )}
            {app.status === "RUNNING" && (
              <Button variant="secondary" onClick={() => stop.mutate(undefined)} loading={stop.isPending}>
                <Square />
                Stop
              </Button>
            )}
            <ConfirmButton
              title={`Delete app ${app.name}?`}
              description="This removes this app, its deployments and custom domains. Project storage and database are retained."
              onConfirm={() => remove.mutate(undefined)}
            >
              <Button variant="destructive">
                <Trash2 />
                Delete app
              </Button>
            </ConfirmButton>
          </>
        }
      />
      <HStack gap={3} className="-mt-4 mb-6">
        <StatusBadge status={app.status} />
        <Text as="span" size="sm" tone="muted">
          Updated {formatDate(app.updatedAt)}
        </Text>
      </HStack>
      <Tabs defaultValue={defaultTab}>
        <TabsList>
          {!isAi && <TabsTrigger value="deployments">Deployments</TabsTrigger>}
          <TabsTrigger value="logs" onClick={() => logs.refetch()}>
            Runtime logs
          </TabsTrigger>
          <TabsTrigger value="env">Environment</TabsTrigger>
          {!isAi && <TabsTrigger value="build">Build</TabsTrigger>}
          <TabsTrigger value="domains">Domains</TabsTrigger>
        </TabsList>
        <TabsContent value="deployments">
          {!deployments.length && (
            <Card className="py-0">
              <EmptyState
                icon={Rocket}
                title="No deployments yet"
                description="From your Node.js app folder run:"
                action={<CodeBlock tone="terminal" className="w-full max-w-xl text-left" code={`npx ezhst deploy --project ${app.projectId} --app ${app.slug}`} />}
              />
            </Card>
          )}
          {!!deployments.length && (
            <Grid cols="sidebar-left" gap={4} align="start">
              <SelectableList label="Deployments" className="max-h-[32rem]">
                {deployments.map((deployment) => (
                  <SelectableListItem
                    key={deployment.id}
                    active={activeDeployment === deployment.id}
                    onSelect={() => setSelected(deployment.id)}
                    trailing={<StatusBadge status={deployment.status} />}
                  >
                    {formatDate(deployment.createdAt)}
                  </SelectableListItem>
                ))}
              </SelectableList>
              {activeDeployment && <DeploymentLog appId={app.id} deploymentId={activeDeployment} />}
            </Grid>
          )}
        </TabsContent>
        <TabsContent value="logs">
          <Stack gap={3}>
            <HStack justify="between" gap={3}>
              <Text size="sm" tone="muted">
                Output from the running container.
              </Text>
              <Button variant="secondary" size="sm" onClick={() => logs.refetch()} loading={logs.isFetching}>
                <RefreshCw />
                Refresh
              </Button>
            </HStack>
            <Pre tone="terminal" className="max-h-[32rem] min-h-48 overflow-auto">
              {logs.data?.logs || "No logs yet."}
            </Pre>
          </Stack>
        </TabsContent>
        <TabsContent value="env">
          <EnvEditor key={app.id} appId={app.id} initial={app.env as Record<string, string>} />
        </TabsContent>
        <TabsContent value="build">
          <BuildSettings key={app.id} appId={app.id} initial={app} nodeVersions={data.nodeVersions} />
        </TabsContent>
        <TabsContent value="domains">
          <DomainsPanel appId={app.id} domains={data.domains} dnsTarget={data.dnsTarget} />
        </TabsContent>
      </Tabs>
    </>
  );
};
