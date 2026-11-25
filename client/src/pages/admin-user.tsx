import { Link, useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { adminQuery } from "@/lib/queries";
import { formatDate } from "@/lib/format";
import { AdminHeader, EmptyRow, PageSkeleton, Stat, StatGrid, formatMoney, formatNumber, formatRelative, formatSeconds } from "@/components/admin-layout";
import { UserActions } from "@/pages/admin-users";

const durationOf = (startedAt: string | null, finishedAt: string | null) => {
  if (!startedAt || !finishedAt) {
    return null;
  }
  return (new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000;
};

const Detail = ({ label, children }: { label: string; children: React.ReactNode }) => {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
};

export const AdminUserPage = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data, isError } = useQuery(adminQuery().user(id));

  const back = (
    <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
      <Link to="/admin/users">
        <ArrowLeft className="size-4" />
        Users
      </Link>
    </Button>
  );

  if (isError) {
    return (
      <div>
        {back}
        <p className="text-sm text-muted-foreground">This user does not exist anymore.</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div>
        {back}
        <PageSkeleton />
      </div>
    );
  }

  const { user } = data;
  const failed = data.deploymentStats.find((row) => row.status === "FAILED")?.count ?? 0;
  const totalDeploys = data.deploymentStats.reduce((sum, row) => sum + row.count, 0);

  return (
    <div className="space-y-6">
      <div>
        {back}
        <AdminHeader
          title={user.name}
          description={user.email}
          action={
            <UserActions
              variant="button"
              user={{ id: user.id, email: user.email, role: user.role, blocked: user.blocked, projects: data.projects.length }}
              onDeleted={() => navigate("/admin/users")}
            />
          }
        />
        <div className="-mt-3 flex flex-wrap gap-1">
          {user.role === "ADMIN" && <Badge>Admin</Badge>}
          {user.blocked && <Badge variant="destructive">Blocked</Badge>}
          <Badge variant="secondary">{user.plan}</Badge>
          <Badge variant="outline">{user.verified ? "Verified" : "Unverified"}</Badge>
        </div>
      </div>
      <StatGrid>
        <Stat label="Projects" value={`${data.projects.length} / ${user.projectLimit}`} hint={`${data.memberships.length} memberships`} />
        <Stat label="Deployments" value={formatNumber(totalDeploys)} hint={`${failed} failed`} />
        <Stat label="Token balance" value={formatNumber(user.tokenBalance)} hint={`${formatNumber(data.tokens.total)} used in ${data.tokens.runs} runs`} />
        <Stat label="Last active" value={formatRelative(user.lastActiveAt)} hint={`Joined ${formatDate(user.createdAt)}`} />
      </StatGrid>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            <Detail label="User ID">
              <span className="font-mono text-xs">{user.id}</span>
            </Detail>
            <Detail label="Joined">{formatDate(user.createdAt)}</Detail>
            <Detail label="Last active">{formatDate(user.lastActiveAt)}</Detail>
            <Detail label="Free AI app used">{user.freeAiAppUsed ? "Yes" : "No"}</Detail>
            <Detail label="Free AI build used">{user.freeAiBuildUsed ? "Yes" : "No"}</Detail>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {!data.subscription && <p className="py-2 text-sm text-muted-foreground">Never subscribed</p>}
            {data.subscription && (
              <>
                <Detail label="Status">
                  <StatusBadge status={data.subscription.status} />
                </Detail>
                <Detail label="Provider">{data.subscription.provider}</Detail>
                <Detail label="Since">{formatDate(data.subscription.createdAt)}</Detail>
                <Detail label="Renews">{formatDate(data.subscription.renewsAt)}</Detail>
                <Detail label="Ends">{formatDate(data.subscription.endsAt)}</Detail>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Billing events</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {data.billingEvents.length === 0 && <p className="py-2 text-sm text-muted-foreground">No billing events</p>}
            {data.billingEvents.map((event) => (
              <Detail key={event.id} label={event.type.replace("_", " ").toLowerCase()}>
                <span className="tabular-nums">{event.amount > 0 ? formatMoney(event.amount) : ""}</span>
                <span className="ml-2 text-xs text-muted-foreground">{formatDate(event.createdAt)}</span>
              </Detail>
            ))}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardDescription>Projects owned</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead className="text-right">Apps</TableHead>
                <TableHead>Resources</TableHead>
                <TableHead className="text-right">Members</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.projects.length === 0 && <EmptyRow colSpan={5}>No projects</EmptyRow>}
              {data.projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <Link to={`/admin/projects/${project.id}`} className="font-medium hover:underline">
                      {project.name}
                    </Link>
                    <p className="font-mono text-xs text-muted-foreground">{project.slug}</p>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {project.runningApps} / {project.apps} running
                    {project.suspended && (
                      <Badge variant="destructive" className="ml-2">
                        Suspended
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {[project.hasDatabase && "Database", project.hasBucket && "Storage"].filter(Boolean).join(", ") || "-"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{project.members}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(project.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {data.memberships.length > 0 && (
        <Card>
          <CardHeader>
            <CardDescription>Member of</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.memberships.map((membership) => (
                  <TableRow key={membership.id}>
                    <TableCell>
                      <Link to={`/admin/projects/${membership.id}`} className="font-medium hover:underline">
                        {membership.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{membership.ownerEmail}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(membership.joinedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Recent deployments</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>App</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.deployments.length === 0 && <EmptyRow colSpan={4}>No deployments</EmptyRow>}
                {data.deployments.map((deployment) => (
                  <TableRow key={deployment.id}>
                    <TableCell className="font-mono text-sm">{deployment.slug}</TableCell>
                    <TableCell>
                      <StatusBadge status={deployment.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatSeconds(durationOf(deployment.startedAt, deployment.finishedAt))}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatRelative(deployment.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Recent AI usage</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>App</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.tokens.recent.length === 0 && <EmptyRow colSpan={3}>No AI usage</EmptyRow>}
                {data.tokens.recent.map((usage) => (
                  <TableRow key={usage.id}>
                    <TableCell className="font-mono text-sm">{usage.appName}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(usage.tokens)}
                      {usage.free && (
                        <Badge variant="outline" className="ml-2">
                          Free
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatRelative(usage.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardDescription>Admin actions on this account</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.audit.length === 0 && <EmptyRow colSpan={3}>No admin actions</EmptyRow>}
              {data.audit.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-mono text-sm">{entry.action}</TableCell>
                  <TableCell className="text-sm">{entry.adminEmail}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(entry.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
