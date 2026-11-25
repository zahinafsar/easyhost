import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Ban, Ellipsis, MailX, Trash2, UserRound, UserRoundCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmButton } from "@/components/confirm-button";
import { api, unwrap } from "@/lib/api";
import { adminQuery, type AdminUserFilters } from "@/lib/queries/admin";
import { clearSelectedProject } from "@/lib/project";
import { formatDate } from "@/lib/format";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { AdminHeader, EmptyRow, IMPERSONATE_NOTICE, Paginator, formatNumber, formatRelative } from "@/components/admin-layout";

type UserActionKind = "impersonate" | "delete" | "blockEmail" | "block" | "unblock";

type ActionUser = { id: string; email: string; projects: number; role: string; blocked: boolean };

const actionDialog = (kind: UserActionKind, user: ActionUser) => {
  const deleted = `all ${user.projects} of its projects, including apps, deployments, domains, storage, databases, memberships and AI tokens. The user is emailed that the account was closed due to unusual activity. This cannot be undone.`;
  if (kind === "impersonate") {
    return { title: `Impersonate ${user.email}?`, description: IMPERSONATE_NOTICE, confirmLabel: "Impersonate", destructive: false };
  }
  if (kind === "delete") {
    return { title: `Delete ${user.email}?`, description: `This permanently deletes the account and ${deleted}`, confirmLabel: "Delete user", destructive: true };
  }
  if (kind === "blockEmail") {
    const domain = user.email.split("@").pop();
    return {
      title: `Block the email domain ${domain}?`,
      description: `No one can register with an @${domain} address again. Existing accounts on this domain are not affected. It also permanently deletes this account and ${deleted}`,
      confirmLabel: "Block domain and delete",
      destructive: true,
    };
  }
  if (kind === "block") {
    return {
      title: `Block ${user.email}?`,
      description: "The user is signed out and cannot log in, and every running app they own is stopped. Their data is kept and you can unblock them later.",
      confirmLabel: "Block user",
      destructive: true,
    };
  }
  return {
    title: `Unblock ${user.email}?`,
    description: "The user can log in again. Apps stopped by the block stay stopped until the user starts them.",
    confirmLabel: "Unblock user",
    destructive: false,
  };
};

export const useImpersonate = () => {
  return useApiMutation({
    mutationFn: (id: string) => unwrap(api.admin.users[":id"].impersonate.$post({ param: { id } })),
    onSuccess: () => {
      clearSelectedProject();
      window.location.href = "/";
    },
  });
};

const runUserAction = async (kind: UserActionKind, id: string): Promise<{ warning: boolean; message: string }> => {
  const param = { id };
  if (kind === "delete" || kind === "blockEmail") {
    let result;
    let done;
    if (kind === "delete") {
      result = await unwrap(api.admin.users[":id"].$delete({ param }));
      done = "User deleted";
    } else {
      result = await unwrap(api.admin.users[":id"]["block-domain"].$post({ param }));
      done = "Domain blocked and user deleted";
    }
    if (result.emailSent) {
      return { warning: false, message: `${done}, user notified by email` };
    }
    return { warning: true, message: `${done}, but the email to the user failed` };
  }
  if (kind === "block") {
    const result = await unwrap(api.admin.users[":id"].block.$post({ param }));
    if (result.failed > 0) {
      return { warning: true, message: `User blocked, ${result.stopped} apps stopped, ${result.failed} could not be stopped` };
    }
    return { warning: false, message: `User blocked, ${result.stopped} apps stopped` };
  }
  await unwrap(api.admin.users[":id"].unblock.$post({ param }));
  return { warning: false, message: "User unblocked" };
};

export const UserActions = ({ user, onDeleted, variant = "icon" }: { user: ActionUser; onDeleted?: () => void; variant?: "icon" | "button" }) => {
  const { user: current } = useAuth();
  const [kind, setKind] = useState<UserActionKind | null>(null);
  const impersonate = useImpersonate();
  const action = useApiMutation({
    mutationFn: async (next: UserActionKind) => {
      const result = await runUserAction(next, user.id);
      return { ...result, kind: next };
    },
    invalidate: [adminQuery().all],
    onSuccess: (result) => {
      if (result.warning) {
        toast.warning(result.message);
      } else {
        toast.success(result.message);
      }
      if (result.kind === "delete" || result.kind === "blockEmail") {
        onDeleted?.();
      }
    },
  });

  if (!current || current.id === user.id) {
    return null;
  }

  let dialog = null;
  if (kind) {
    dialog = actionDialog(kind, user);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {variant === "icon" ? (
            <Button size="icon-sm" variant="outline" aria-label="User actions" disabled={action.isPending || impersonate.isPending}>
              <Ellipsis className="size-4" />
            </Button>
          ) : (
            <Button variant="outline" disabled={action.isPending || impersonate.isPending}>
              <Ellipsis className="size-4" />
              Actions
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!user.blocked && (
            <DropdownMenuItem onSelect={() => setKind("impersonate")}>
              <UserRound />
              Impersonate
            </DropdownMenuItem>
          )}
          {user.role !== "ADMIN" && (
            <>
              {!user.blocked && <DropdownMenuSeparator />}
              {user.blocked ? (
                <DropdownMenuItem onSelect={() => setKind("unblock")}>
                  <UserRoundCheck />
                  Unblock (User)
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={() => setKind("block")}>
                  <Ban />
                  Block (User)
                </DropdownMenuItem>
              )}
              <DropdownMenuItem variant="destructive" onSelect={() => setKind("blockEmail")}>
                <MailX />
                Block (Domain)
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={() => setKind("delete")}>
                <Trash2 />
                Delete (Full)
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog
        open={kind !== null}
        onOpenChange={(open) => {
          if (!open) {
            setKind(null);
          }
        }}
      >
        {dialog && kind && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{dialog.title}</AlertDialogTitle>
              <AlertDialogDescription>{dialog.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant={dialog.destructive ? "destructive" : "default"}
                onClick={() => {
                  if (kind === "impersonate") {
                    impersonate.mutate(user.id);
                  } else {
                    action.mutate(kind);
                  }
                }}
              >
                {dialog.confirmLabel}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </>
  );
};

const FILTER_DEFAULTS: Omit<AdminUserFilters, "page" | "search"> = { plan: "all", state: "all", sort: "newest" };

const useUserFilters = () => {
  const [params, setParams] = useSearchParams();
  const filters: AdminUserFilters = {
    page: Math.max(1, Number(params.get("page")) || 1),
    search: params.get("search") ?? "",
    plan: (params.get("plan") as AdminUserFilters["plan"]) ?? FILTER_DEFAULTS.plan,
    state: (params.get("state") as AdminUserFilters["state"]) ?? FILTER_DEFAULTS.state,
    sort: (params.get("sort") as AdminUserFilters["sort"]) ?? FILTER_DEFAULTS.sort,
  };
  const update = (changes: Partial<AdminUserFilters>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries({ page: 1, ...changes })) {
      next.set(key, String(value));
    }
    setParams(next, { replace: true });
  };
  return { filters, update };
};

const UsersTable = () => {
  const { filters, update } = useUserFilters();
  const [draft, setDraft] = useState(filters.search);
  const { data } = useQuery(adminQuery().users(filters));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <form
          className="flex min-w-64 flex-1 gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            update({ search: draft.trim() });
          }}
        >
          <Input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Search by name or email" />
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>
        <Select value={filters.plan} onValueChange={(value) => update({ plan: value as AdminUserFilters["plan"] })}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All plans</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.state} onValueChange={(value) => update({ state: value as AdminUserFilters["state"] })}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All users</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="unverified">Unverified</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.sort} onValueChange={(value) => update({ sort: value as AdminUserFilters["sort"] })}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="active">Recently active</SelectItem>
            <SelectItem value="projects">Most projects</SelectItem>
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
                  <TableHead>User</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead className="text-right">Projects</TableHead>
                  <TableHead className="text-right">Running</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead>Last active</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.users.length === 0 && <EmptyRow colSpan={8}>No users match these filters</EmptyRow>}
                {data.users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Link to={`/admin/users/${user.id}`} className="font-medium hover:underline">
                        {user.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.role === "ADMIN" && <Badge>Admin</Badge>}
                        {user.blocked && <Badge variant="destructive">Blocked</Badge>}
                        {user.plan === "Pro" && <Badge variant="secondary">Pro</Badge>}
                        <Badge variant="outline">{user.verified ? "Verified" : "Unverified"}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {user.projects} / {user.projectLimit}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{user.runningApps}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(user.tokenBalance)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatRelative(user.lastActiveAt)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <UserActions user={user} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Paginator page={data.page} pages={data.pages} total={data.total} label="users" onPage={(page) => update({ page })} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const BlockedDomains = () => {
  const { data } = useQuery(adminQuery().blockedDomains());
  const unblock = useApiMutation({
    mutationFn: (domain: string) => unwrap(api.admin["blocked-domains"][":domain"].$delete({ param: { domain } })),
    invalidate: [adminQuery().all],
    success: "Domain unblocked",
  });
  if (!data) {
    return <Skeleton className="h-64 w-full" />;
  }
  return (
    <Card>
      <CardHeader>
        <CardDescription>Nobody can register with an address on these domains.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Domain</TableHead>
              <TableHead>Blocked</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.domains.length === 0 && <EmptyRow colSpan={3}>No blocked domains</EmptyRow>}
            {data.domains.map((row) => (
              <TableRow key={row.domain}>
                <TableCell className="font-mono text-sm">{row.domain}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(row.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <ConfirmButton
                    title={`Unblock ${row.domain}?`}
                    description={`People can register with @${row.domain} addresses again.`}
                    confirmLabel="Unblock"
                    onConfirm={() => unblock.mutate(row.domain)}
                  >
                    <Button size="sm" variant="outline" disabled={unblock.isPending}>
                      Unblock
                    </Button>
                  </ConfirmButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export const AdminUsersPage = () => {
  return (
    <div className="space-y-6">
      <AdminHeader title="Users" description="Search, filter and manage accounts." />
      <Tabs defaultValue="users" className="gap-4">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="domains">Blocked domains</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <UsersTable />
        </TabsContent>
        <TabsContent value="domains">
          <BlockedDomains />
        </TabsContent>
      </Tabs>
    </div>
  );
};
