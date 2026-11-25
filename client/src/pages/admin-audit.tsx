import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminQuery } from "@/lib/queries";
import { formatBytes, formatDate } from "@/lib/format";
import { AdminHeader, EmptyRow, Paginator } from "@/components/admin-layout";

const ALL = "all";

const describeMeta = (meta: unknown) => {
  if (!meta || typeof meta !== "object") {
    return "";
  }
  return Object.entries(meta as Record<string, unknown>)
    .map(([key, value]) => {
      if (key === "freedBytes" && typeof value === "number") {
        return `freed ${formatBytes(value)}`;
      }
      return `${key}: ${String(value)}`;
    })
    .join(", ");
};

const TargetLink = ({ type, id, label }: { type: string; id: string | null; label: string | null }) => {
  if (!id) {
    return <span className="text-muted-foreground">{label ?? type}</span>;
  }
  if (type === "user") {
    return (
      <Link to={`/admin/users/${id}`} className="hover:underline">
        {label ?? id}
      </Link>
    );
  }
  if (type === "project") {
    return (
      <Link to={`/admin/projects/${id}`} className="hover:underline">
        {label ?? id}
      </Link>
    );
  }
  return <span>{label ?? id}</span>;
};

export const AdminAuditPage = () => {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const search = params.get("search") ?? "";
  const action = params.get("action") ?? "";
  const [draft, setDraft] = useState(search);
  const { data } = useQuery(adminQuery().audit(page, search, action));

  const update = (changes: Record<string, string | number>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries({ page: 1, ...changes })) {
      next.set(key, String(value));
    }
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-6">
      <AdminHeader title="Audit log" description="Every admin action, who took it and when." />
      <div className="flex flex-wrap items-center gap-2">
        <form
          className="flex min-w-64 flex-1 gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            update({ search: draft.trim() });
          }}
        >
          <Input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Search by admin or target" />
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>
        <Select
          value={action || ALL}
          onValueChange={(value) => {
            if (value === ALL) {
              update({ action: "" });
            } else {
              update({ action: value });
            }
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All actions</SelectItem>
            {data?.actions.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {!data && <Skeleton className="h-96 w-full" />}
      {data && (
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.entries.length === 0 && <EmptyRow colSpan={5}>No admin actions recorded</EmptyRow>}
                {data.entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(entry.createdAt)}</TableCell>
                    <TableCell className="text-sm">{entry.adminEmail}</TableCell>
                    <TableCell className="font-mono text-sm">{entry.action}</TableCell>
                    <TableCell className="text-sm">
                      <TargetLink type={entry.targetType} id={entry.targetId} label={entry.targetLabel} />
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{describeMeta(entry.meta)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Paginator page={data.page} pages={data.pages} total={data.total} label="entries" onPage={(next) => update({ page: next })} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};
