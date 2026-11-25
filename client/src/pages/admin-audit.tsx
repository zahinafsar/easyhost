import { useState } from "react";
import { useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { InputGroup } from "@/components/ui/input";
import { Link } from "@/components/ui/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Stack } from "@/components/ui/stack";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Text } from "@/components/ui/text";
import { adminQuery } from "@/lib/queries";
import { formatBytes, formatDate } from "@/lib/format";
import { AdminHeader, EmptyRow, Paginator, TableCard } from "@/components/admin-layout";

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
    return (
      <Text as="span" size="sm" tone="muted">
        {label ?? type}
      </Text>
    );
  }
  if (type === "user") {
    return <Link to={`/admin/users/${id}`}>{label ?? id}</Link>;
  }
  if (type === "project") {
    return <Link to={`/admin/projects/${id}`}>{label ?? id}</Link>;
  }
  return (
    <Text as="span" size="sm">
      {label ?? id}
    </Text>
  );
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
    <Stack gap={6}>
      <AdminHeader title="Audit log" description="Every admin action, who took it and when." />
      <Stack direction="row" align="center" wrap gap={2}>
        <Form
          gap="sm"
          className="min-w-64 flex-1 flex-row"
          onSubmit={() => {
            update({ search: draft.trim() });
          }}
        >
          <InputGroup icon={Search} className="flex-1" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Search by admin or target" />
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </Form>
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
      </Stack>
      {!data && <Skeleton className="h-96 w-full rounded-xl" />}
      {data && (
        <TableCard footer={<Paginator page={data.page} pages={data.pages} total={data.total} label="entries" onPage={(next) => update({ page: next })} />}>
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
                  <TableCell>
                    <Text as="span" size="sm" tone="muted">
                      {formatDate(entry.createdAt)}
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Text as="span" size="sm">
                      {entry.adminEmail}
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Text as="span" size="sm" mono>
                      {entry.action}
                    </Text>
                  </TableCell>
                  <TableCell>
                    <TargetLink type={entry.targetType} id={entry.targetId} label={entry.targetLabel} />
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <Text size="xs" tone="muted" truncate>
                      {describeMeta(entry.meta)}
                    </Text>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>
      )}
    </Stack>
  );
};
