import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ChevronDown, ExternalLink, FileText, Globe, List as ListIcon, Play, Plus, RefreshCw, Rocket, Sparkles, Square, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Alert,
  Button,
  buttonVariants,
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
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
  Pre,
  SegmentedControl,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmButton } from "@/components/confirm-button";
import { Facts } from "@/components/facts";
import { SelectableList, SelectableListItem } from "@/components/ui/selectable-list";
import { Box } from "@/components/ui/box";
import { MonacoEditor } from "@/components/monaco-editor";
import { api, unwrap } from "@/lib/api";
import { appsQuery, projectsQuery, userQuery } from "@/lib/queries";
import { formatDate } from "@/lib/format";
import { mergeEnv, parseEnv, stringifyEnv, type EnvRow } from "@/lib/dotenv";
import { useApiMutation } from "@/hooks/use-api-mutation";

const DeploymentLog = ({ appId, deploymentId }: { appId: string; deploymentId: string }) => {
  const { data } = useQuery(appsQuery().deployment(appId, deploymentId));
  return (
    <Pre tone="terminal" className="h-[32rem] overflow-auto">
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Environment variables</CardTitle>
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
              placeholder="KEY=value"
              className="min-h-72 font-mono text-xs"
              spellCheck={false}
              autoFocus
            />
          )}
          {mode === "table" && (
            <Stack gap={2}>
              {!rows.length && (
                <EmptyState size="sm" bordered title="No variables" />
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

type Template = { id: string; group: string; label: string; content: string };

const TEMPLATE_ICONS: Record<string, string> = {
  node: "nodejs",
  static: "html5",
  "Node.js": "nodejs",
  Bun: "bun",
  Python: "python",
  Ruby: "ruby",
  PHP: "php",
  Go: "go",
  Rust: "rust",
  Zig: "zig",
  Static: "html5",
};

const DARK_ICONS = ["bun", "django", "elysia", "express", "fastify", "flask", "nextjs", "rust"];

const TemplateIcon = ({ name }: { name: string }) => {
  const icon = TEMPLATE_ICONS[name] ?? name;
  return <img src={`/templates/${icon}.svg`} alt="" className={cn("size-4 shrink-0", DARK_ICONS.includes(icon) && "dark:invert")} />;
};

const BuildSettings = ({ appId, initial }: { appId: string; initial: { rootDir: string | null; dockerfile: string | null } }) => {
  const [rootDir, setRootDir] = useState(initial.rootDir ?? "");
  const [dockerfile, setDockerfile] = useState(initial.dockerfile ?? "");
  const templates = useQuery(appsQuery().dockerfileTemplates());

  const save = useApiMutation({
    mutationFn: () => {
      return unwrap(api.apps[":id"].build.$put({ param: { id: appId }, json: { rootDir, dockerfile } }));
    },
    invalidate: [appsQuery().all],
    success: "Build settings saved. Redeploy to apply.",
  });

  const [selected, setSelected] = useState<Template | null>(null);

  const groups: { name: string; items: Template[] }[] = [];
  for (const template of templates.data?.templates ?? []) {
    const group = groups.find((item) => item.name === template.group);
    if (group) {
      group.items.push(template);
    } else {
      groups.push({ name: template.group, items: [template] });
    }
  }

  const applyTemplate = (template: Template) => {
    setDockerfile(template.content);
    setSelected(template);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Build</CardTitle>
        <CardAction>
          <Button size="sm" loading={save.isPending} onClick={() => save.mutate(undefined)}>
            Save
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Form onSubmit={() => save.mutate(undefined)}>
          <Grid cols={2} gap={4}>
            <Field label="Root directory" htmlFor="rootDir">
              <Input id="rootDir" className="font-mono" placeholder="/" value={rootDir} onChange={(event) => setRootDir(event.target.value)} spellCheck={false} />
            </Field>
            <Field label="Template" htmlFor="template">
              <DropdownMenu>
                <DropdownMenuTrigger asChild disabled={!templates.data}>
                  <button
                    id="template"
                    type="button"
                    className="flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-input bg-surface px-3.5 text-sm text-foreground outline-none transition-[border-color,box-shadow] focus-visible:border-accent-green/60 focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-surface-2"
                  >
                    {selected ? (
                      <span className="flex items-center gap-2.5">
                        <TemplateIcon name={selected.id} />
                        {selected.label}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Select</span>
                    )}
                    <ChevronDown className="size-4 text-muted-foreground opacity-60" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-(--radix-dropdown-menu-trigger-width)">
                  {groups.map((group) => {
                    if (group.items.length === 1) {
                      const template = group.items[0];
                      return (
                        <DropdownMenuItem key={template.id} onSelect={() => applyTemplate(template)}>
                          <TemplateIcon name={template.id} />
                          {template.label}
                        </DropdownMenuItem>
                      );
                    }
                    return (
                      <DropdownMenuSub key={group.name}>
                        <DropdownMenuSubTrigger>
                          <TemplateIcon name={group.name} />
                          {group.name}
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          {group.items.map((template) => (
                            <DropdownMenuItem key={template.id} onSelect={() => applyTemplate(template)}>
                              <TemplateIcon name={template.id} />
                              {template.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </Field>
          </Grid>
          <Field label="Dockerfile">
            <Box className="h-[560px] overflow-hidden rounded-lg border border-input">
              <MonacoEditor path="Dockerfile" value={dockerfile} readOnly={false} onChange={setDockerfile} onSave={() => save.mutate(undefined)} />
            </Box>
          </Field>
        </Form>
      </CardContent>
    </Card>
  );
};

type Domain = { id: string; hostname: string; status: string; error: string | null };

const DnsRecords = ({ hostname, dnsTarget }: { hostname: string; dnsTarget: { cname: string; ip: string } }) => {
  return (
    <Table framed>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Value</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell className="font-mono text-xs">CNAME</TableCell>
          <TableCell className="font-mono text-xs">{hostname}</TableCell>
          <TableCell className="font-mono text-xs">{dnsTarget.cname}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-mono text-xs">A</TableCell>
          <TableCell className="font-mono text-xs">{hostname}</TableCell>
          <TableCell className="font-mono text-xs">{dnsTarget.ip}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
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
      </CardHeader>
      <CardContent>
        <Stack gap={4}>
          <Form gap="sm" onSubmit={() => add.mutate(undefined)}>
            <HStack gap={2}>
              <Input
                aria-label="Hostname"
                value={hostname}
                onChange={(event) => setHostname(event.target.value.toLowerCase())}
                placeholder="Hostname"
                className="font-mono"
              />
              <Button type="submit" loading={add.isPending} disabled={!hostname.trim()}>
                <Plus />
                Add domain
              </Button>
            </HStack>
          </Form>
          {!domains.length && <EmptyState size="sm" bordered icon={Globe} title="No custom domains" />}
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
                  {domain.status !== "ACTIVE" && <DnsRecords hostname={domain.hostname} dnsTarget={dnsTarget} />}
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
  let appType = "Docker";
  if (isAi) {
    defaultTab = "logs";
    appType = "AI app";
  }
  let lastDeploy = "Never";
  if (deployments[0]) {
    lastDeploy = formatDate(deployments[0].createdAt);
  }

  return (
    <>
      <PageHeader
        title={
          <HStack gap={3}>
            {app.name}
            <StatusBadge status={app.status} />
          </HStack>
        }
        action={
          <>
            <Link href={app.url} variant="plain" inline={false} data-slot="button" className={buttonVariants({ variant: "secondary" })}>
              <ExternalLink />
              Visit
            </Link>
            {isAi && (
              <Link to={`/builder/${app.id}`} variant="plain" inline={false} data-slot="button" className={buttonVariants({ variant: "secondary" })}>
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
      <Facts
        className="mb-6"
        items={[
          {
            label: "Domain",
            value: (
              <Link href={app.url} className="font-mono text-[13px]">
                {app.url.replace(/^https?:\/\//, "")}
              </Link>
            ),
          },
          { label: "Type", value: appType },
          { label: "Last deploy", value: lastDeploy },
          { label: "Custom domains", value: data.domains.length },
          { label: "Updated", value: formatDate(app.updatedAt) },
        ]}
      />
      <Tabs defaultValue={defaultTab}>
        <TabsList variant="line" className="mb-2 w-full justify-start">
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
              <EmptyState icon={Rocket} title="No deployments" />
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
            <HStack justify="end" gap={3}>
              <Button variant="secondary" size="sm" onClick={() => logs.refetch()} loading={logs.isFetching}>
                <RefreshCw />
                Refresh
              </Button>
            </HStack>
            <Pre tone="terminal" className="h-[36rem] overflow-auto">
              {logs.data?.logs || "No logs"}
            </Pre>
          </Stack>
        </TabsContent>
        <TabsContent value="env">
          <EnvEditor key={app.id} appId={app.id} initial={app.env as Record<string, string>} />
        </TabsContent>
        <TabsContent value="build">
          <BuildSettings key={app.id} appId={app.id} initial={app} />
        </TabsContent>
        <TabsContent value="domains">
          <DomainsPanel appId={app.id} domains={data.domains} dnsTarget={data.dnsTarget} />
        </TabsContent>
      </Tabs>
    </>
  );
};
