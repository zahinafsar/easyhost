import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Coins, Plus, Sparkles } from "lucide-react";
import {
  Alert,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  Form,
  Input,
  Link,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
  Text,
} from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { api, unwrap } from "@/lib/api";
import { aiAppsQuery, appsQuery, projectsQuery, tokensQuery } from "@/lib/queries";
import { formatDate } from "@/lib/format";
import { useApiMutation } from "@/hooks/use-api-mutation";

const useDebounced = (value: string, delay: number) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);
  return debounced;
};

const displayStatus = (app: { aiStatus: string; status: string }) => {
  if (app.aiStatus === "GENERATING" || app.aiStatus === "FAILED") {
    return app.aiStatus;
  }
  return app.status;
};

export const BuilderPage = () => {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery(aiAppsQuery().list());
  const projectApps = useQuery(appsQuery().list());
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const debouncedName = useDebounced(name.trim(), 300);
  const availability = useQuery(aiAppsQuery().availability(debouncedName));
  const tokens = useQuery(tokensQuery().summary());

  const create = useApiMutation({
    mutationFn: () => unwrap(api["ai-apps"].$post({ json: { name: name.trim() } })),
    invalidate: [aiAppsQuery().all, appsQuery().all, projectsQuery().all, tokensQuery().all],
    success: "App created",
    onSuccess: ({ app }) => navigate(`/builder/${app.id}`),
  });

  if (isLoading || projectApps.isLoading) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }
  if (error) {
    return <Alert variant="danger">{error.message}</Alert>;
  }
  if (!data || !projectApps.data) {
    return null;
  }

  const used = projectApps.data.apps.length;
  const limit = projectApps.data.limit;
  const checked = !!availability.data && availability.data.name === debouncedName && debouncedName === name.trim();
  const available = checked && !!availability.data?.available;
  const needsTokens = !!tokens.data && !tokens.data.freeAppAvailable && tokens.data.balance < tokens.data.minTokensToBuild;

  let nameError: string | undefined = undefined;
  if (checked && !availability.data?.available) {
    nameError = availability.data?.reason ?? undefined;
  }
  let nameAside: React.ReactNode = null;
  if (checked && availability.data?.available) {
    nameAside = (
      <Text as="span" size="xs" tone="success" mono truncate>
        {availability.data.url} is available
      </Text>
    );
  }

  return (
    <>
      <PageHeader
        title="Builder"
        action={
          <>
            <Text as="span" size="sm" tone="muted" tabular>
              {used} / {limit} apps
            </Text>
            <Button asChild variant="secondary">
              <Link to="/subscription" variant="plain">
                <Coins />
                {tokens.data?.balance.toLocaleString("en-US") ?? 0} tokens
              </Link>
            </Button>
            <Button disabled={used >= limit || needsTokens} onClick={() => setOpen(true)}>
              <Plus />
              Create app
            </Button>
          </>
        }
      />
      <Stack gap={5}>
        {needsTokens && (
          <Alert
            variant="warning"
            icon={Sparkles}
            action={
              <Button asChild size="sm">
                <Link to="/subscription" variant="plain">Upgrade</Link>
              </Button>
            }
          >
            Your free AI app is used. Upgrade to Pro for 500 tokens every month.
          </Alert>
        )}
        <Table framed>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!data.apps.length && <TableEmpty colSpan={4}>No AI apps</TableEmpty>}
            {data.apps.map((app) => (
              <TableRow key={app.id} className="relative cursor-pointer">
                <TableCell>
                  <Link to={`/builder/${app.id}`} variant="plain" className="font-medium after:absolute after:inset-0">
                    {app.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Text as="span" size="xs" tone="muted" mono>
                    {app.url.replace(/^https?:\/\//, "")}
                  </Text>
                </TableCell>
                <TableCell>
                  <StatusBadge status={displayStatus(app)} />
                </TableCell>
                <TableCell className="text-right">
                  <Text as="span" size="sm" tone="muted">
                    {formatDate(app.updatedAt)}
                  </Text>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Stack>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <Form
            onSubmit={() => {
              if (available) {
                create.mutate(undefined);
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>New AI app</DialogTitle>
            </DialogHeader>
            <Field label="App name" htmlFor="ai-app-name" error={nameError} labelAside={nameAside}>
              <Input
                id="ai-app-name"
                value={name}
                onChange={(event) => setName(event.target.value.toLowerCase())}
                placeholder="my-app"
                maxLength={40}
                className="font-mono"
                aria-invalid={!!nameError || undefined}
                required
                autoFocus
              />
            </Field>
            <DialogFooter>
              <Button type="submit" loading={create.isPending} disabled={!available}>
                Create app
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};
