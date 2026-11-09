import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Coins, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    return <Skeleton className="h-64 w-full" />;
  }
  if (error) {
    return <p role="alert" className="text-destructive">{error.message}</p>;
  }
  if (!data || !projectApps.data) {
    return null;
  }

  const used = projectApps.data.apps.length;
  const limit = projectApps.data.limit;
  const checked = !!availability.data && availability.data.name === debouncedName && debouncedName === name.trim();
  const available = checked && !!availability.data?.available;
  const needsTokens = !!tokens.data && !tokens.data.freeAppAvailable && tokens.data.balance < tokens.data.minTokensToBuild;

  return (
    <>
      <PageHeader title="Builder" description="Describe an app and AI builds it, live at its own address." action={
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/tokens"><Coins className="size-4" />{tokens.data?.balance.toLocaleString("en-US") ?? 0} tokens</Link>
          </Button>
          <Button disabled={used >= limit || needsTokens} onClick={() => setOpen(true)}><Plus className="size-4" />Create app</Button>
        </div>
      } />
      {needsTokens && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span>Your free AI app is used. Buy tokens to create more AI apps.</span>
          <Button asChild size="sm"><Link to="/tokens">Buy tokens</Link></Button>
        </div>
      )}
      <div className="mb-6 flex items-center justify-between border-b pb-3 text-sm">
        <span className="text-muted-foreground">Apps in this project</span>
        <span className="font-mono tabular-nums">{used} / {limit}</span>
      </div>
      <div className="border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!data.apps.length && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                  No AI apps yet. Create one and describe what it should do.
                </TableCell>
              </TableRow>
            )}
            {data.apps.map((app) => (
              <TableRow key={app.id}>
                <TableCell className="font-medium">
                  <Link to={`/builder/${app.id}`} className="hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                    {app.name}
                  </Link>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{app.url}</TableCell>
                <TableCell><StatusBadge status={displayStatus(app)} /></TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">{formatDate(app.updatedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); if (available) { create.mutate(undefined); } }}>
            <DialogHeader><DialogTitle>New AI app</DialogTitle><DialogDescription>The name becomes the app's address, so it must be unique.</DialogDescription></DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="ai-app-name">App name</Label>
              <Input id="ai-app-name" value={name} onChange={(event) => setName(event.target.value.toLowerCase())} placeholder="my-app" maxLength={40} className="font-mono" required autoFocus />
              {checked && availability.data?.available && <p className="text-xs text-emerald-700">{availability.data.url} is available</p>}
              {checked && !availability.data?.available && <p className="text-xs text-destructive">{availability.data?.reason}</p>}
            </div>
            <DialogFooter><Button type="submit" disabled={create.isPending || !available}>{create.isPending ? "Creating..." : "Create app"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
