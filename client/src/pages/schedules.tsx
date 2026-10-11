import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { InferRequestType } from "hono/client";
import { Clock3, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmButton } from "@/components/confirm-button";
import { PageHeader } from "@/components/page-header";
import { api, unwrap } from "@/lib/api";
import { schedulesQuery } from "@/lib/queries";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { formatDate } from "@/lib/format";

type Payload = InferRequestType<typeof api.schedules.$post>["json"];
const emptyForm = { name: "", url: "", method: "GET" as Payload["method"], intervalMinutes: "60", headers: "{}", body: "", enabled: true };
const selectClass = "h-9 w-full border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export const SchedulesPage = () => {
  const { data, isLoading, error } = useQuery(schedulesQuery().list());
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const invalidate = [schedulesQuery().all];

  const save = useApiMutation({
    mutationFn: async () => {
      let headers: unknown;
      try {
        headers = JSON.parse(form.headers);
      } catch {
        throw new Error("Headers must be a JSON object containing string values");
      }
      if (!headers || typeof headers !== "object" || Array.isArray(headers) || Object.values(headers).some((value) => typeof value !== "string")) {
        throw new Error("Headers must be a JSON object containing string values");
      }
      const payload: Payload = { ...form, name: form.name.trim(), url: form.url.trim(), intervalMinutes: Number(form.intervalMinutes), headers: headers as Record<string, string>, body: form.body || null };
      if (editingId) {
        await unwrap(api.schedules[":id"].$put({ param: { id: editingId }, json: payload }));
      } else {
        await unwrap(api.schedules.$post({ json: payload }));
      }
    },
    invalidate,
    success: "Schedule saved",
    onSuccess: () => setOpen(false),
  });
  const toggle = useApiMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => unwrap(api.schedules[":id"].$patch({ param: { id }, json: { enabled } })),
    invalidate,
    success: "Schedule updated",
  });
  const remove = useApiMutation({
    mutationFn: (id: string) => unwrap(api.schedules[":id"].$delete({ param: { id } })),
    invalidate,
    success: "Schedule deleted",
  });
  const create = () => { setEditingId(null); setForm(emptyForm); setOpen(true); };

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (error) {
    return <p role="alert" className="text-destructive">{error.message}</p>;
  }
  if (!data) {
    return null;
  }

  return (
    <>
      <PageHeader title="Schedules" description="Call an API automatically at a fixed interval, starting from when you save." action={<Button disabled={data.schedules.length >= data.limit} onClick={create}><Plus className="size-4" />Create schedule</Button>} />
      <div className="mb-6 flex items-center justify-between border-b pb-3 text-sm"><span className="text-muted-foreground">Schedules in this project</span><span className="font-mono tabular-nums">{data.schedules.length} / {data.limit}</span></div>
      {!data.schedules.length && (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 border border-dashed p-8 text-center">
          <Clock3 className="size-7 text-muted-foreground" /><p className="font-medium">Put recurring tasks on a schedule</p><p className="max-w-md text-sm text-muted-foreground">Trigger a cleanup, sync data, or refresh a report by calling your API every few minutes.</p><Button variant="outline" onClick={create}>Create schedule</Button>
        </div>
      )}
      {data.schedules.length > 0 && (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Request</TableHead>
                <TableHead>Interval</TableHead>
                <TableHead>Next run</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.schedules.map((schedule) => {
                return (
                  <TableRow key={schedule.id}>
                    <TableCell>
                      <div className="flex items-center gap-2"><span className="font-medium">{schedule.name}</span><span className={`border px-2 py-0.5 text-xs ${schedule.enabled ? "text-emerald-700" : "text-muted-foreground"}`}>{schedule.enabled ? "Active" : "Paused"}</span></div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate font-mono text-xs text-muted-foreground" title={schedule.url}>{schedule.method} {schedule.url}</TableCell>
                    <TableCell className="text-sm">{schedule.intervalMinutes} min</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{schedule.enabled ? formatDate(schedule.nextRunAt) : "Paused"}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="outline" size="sm" disabled={toggle.isPending} onClick={() => toggle.mutate({ id: schedule.id, enabled: !schedule.enabled })}>{schedule.enabled ? "Pause" : "Resume"}</Button>
                        <Button variant="ghost" size="icon-sm" aria-label={`Edit ${schedule.name}`} onClick={() => { setEditingId(schedule.id); setForm({ name: schedule.name, url: schedule.url, method: schedule.method as Payload["method"], intervalMinutes: String(schedule.intervalMinutes), headers: JSON.stringify(schedule.headers, null, 2), body: schedule.body ?? "", enabled: schedule.enabled }); setOpen(true); }}><Pencil className="size-4" /></Button>
                        <ConfirmButton title={`Delete ${schedule.name}?`} description="Future calls will stop and this schedule's run history will be removed. A call already in progress may finish." confirmLabel="Delete schedule" onConfirm={() => remove.mutate(schedule.id)}><Button variant="ghost" size="icon-sm" aria-label={`Delete ${schedule.name}`} disabled={remove.isPending}><Trash2 className="size-4" /></Button></ConfirmButton>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); save.mutate(undefined); }}>
            <DialogHeader><DialogTitle>{editingId ? "Edit schedule" : "New schedule"}</DialogTitle><DialogDescription>Call a public HTTP or HTTPS API every 1 minute to 30 days. Saving restarts the interval.</DialogDescription></DialogHeader>
            <div className="space-y-2"><Label htmlFor="schedule-name">Name</Label><Input id="schedule-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Sync inventory" minLength={2} maxLength={60} required /></div>
            <div className="space-y-2"><Label htmlFor="schedule-url">API URL</Label><Input id="schedule-url" type="url" value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} placeholder="https://my-api.example.com/tasks/sync" required /></div>
            <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="schedule-method">Method</Label><select id="schedule-method" className={selectClass} value={form.method} onChange={(event) => setForm({ ...form, method: event.target.value as Payload["method"], body: ["GET", "HEAD"].includes(event.target.value) ? "" : form.body })}>{["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"].map((method) => <option key={method}>{method}</option>)}</select></div><div className="space-y-2"><Label htmlFor="schedule-interval">Interval in minutes</Label><Input id="schedule-interval" type="number" min={1} max={43200} step={1} value={form.intervalMinutes} onChange={(event) => setForm({ ...form, intervalMinutes: event.target.value })} required /></div></div>
            <div className="space-y-2"><Label htmlFor="schedule-headers">Headers as JSON</Label><Textarea id="schedule-headers" className="font-mono text-xs" value={form.headers} onChange={(event) => setForm({ ...form, headers: event.target.value })} spellCheck={false} /><p className="text-xs text-muted-foreground">Add Authorization or Content-Type headers if your API needs them.</p></div>
            {!["GET", "HEAD"].includes(form.method) && <div className="space-y-2"><Label htmlFor="schedule-body">Request body</Label><Textarea id="schedule-body" className="font-mono text-xs" value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} maxLength={16384} spellCheck={false} /></div>}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} />Enable schedule</label>
            <DialogFooter><Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving..." : "Save schedule"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
