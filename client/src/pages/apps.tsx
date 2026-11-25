import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Boxes, Plus } from "lucide-react";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Field,
  Form,
  HStack,
  Input,
  Link,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text,
  UsageMeter,
} from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { api, unwrap } from "@/lib/api";
import { appsQuery, projectsQuery } from "@/lib/queries";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { formatDate } from "@/lib/format";

export const AppsPage = () => {
  const { data, isLoading, error } = useQuery(appsQuery().list());
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const create = useApiMutation({
    mutationFn: () => unwrap(api.apps.$post({ json: { name: name.trim() } })),
    invalidate: [appsQuery().all, projectsQuery().all],
    success: "App created",
    onSuccess: () => {
      setOpen(false);
      setName("");
    },
  });

  if (isLoading) {
    return (
      <Stack gap={6}>
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </Stack>
    );
  }
  if (error) {
    return <Alert variant="danger">{error.message}</Alert>;
  }
  if (!data) {
    return null;
  }

  const atLimit = data.apps.length >= data.limit;

  return (
    <>
      <PageHeader
        title="Apps"
        description="Deploy any service from a Dockerfile, each with its own build, environment, and domains."
        action={
          <Button disabled={atLimit} onClick={() => setOpen(true)}>
            <Plus />
            Create app
          </Button>
        }
      />
      <Stack gap={6}>
        <Card className="py-5">
          <CardContent className="px-5">
            <UsageMeter label="Apps in this project" used={data.apps.length} limit={data.limit} />
          </CardContent>
        </Card>
        {!data.apps.length && (
          <Card className="py-0">
            <EmptyState
              icon={Boxes}
              title="No apps yet"
              description="Create an app to deploy your first service."
              action={
                <Button disabled={atLimit} onClick={() => setOpen(true)}>
                  <Plus />
                  Create app
                </Button>
              }
            />
          </Card>
        )}
        {!!data.apps.length && (
          <Table framed>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.apps.map((app) => (
                <TableRow key={app.id}>
                  <TableCell>
                    <HStack gap={2}>
                      <Link to={`/apps/${app.id}`}>{app.name}</Link>
                      {app.kind === "AI" && <Badge variant="secondary">AI</Badge>}
                    </HStack>
                  </TableCell>
                  <TableCell>
                    <Text as="span" size="xs" tone="muted" mono>
                      {app.url}
                    </Text>
                  </TableCell>
                  <TableCell>
                    <HStack gap={2}>
                      <StatusBadge status={app.status} />
                      {app.suspended && <Badge variant="destructive">Paused</Badge>}
                    </HStack>
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
        )}
      </Stack>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <Form onSubmit={() => create.mutate(undefined)}>
            <DialogHeader>
              <DialogTitle>New app</DialogTitle>
              <DialogDescription>Create an app in this project. You can deploy its source with the CLI.</DialogDescription>
            </DialogHeader>
            <Field label="App name" htmlFor="app-name">
              <Input id="app-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="My API" minLength={2} maxLength={40} required autoFocus />
            </Field>
            <DialogFooter>
              <Button type="submit" loading={create.isPending} disabled={name.trim().length < 2}>
                {create.isPending ? "Creating..." : "Create app"}
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
};
