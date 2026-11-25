import { useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, UserRound } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DescriptionItem, DescriptionList } from "@/components/ui/description-list";
import { EmptyState } from "@/components/ui/empty-state";
import { Grid } from "@/components/ui/grid";
import { Link } from "@/components/ui/link";
import { Stack } from "@/components/ui/stack";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Text } from "@/components/ui/text";
import { StatusBadge } from "@/components/status-badge";
import { adminQuery } from "@/lib/queries";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  AdminHeader,
  ChartGrid,
  EmptyRow,
  PageSkeleton,
  Stat,
  StatGrid,
  TableCard,
  formatMoney,
  formatNumber,
  formatRelative,
  formatSeconds,
} from "@/components/admin-layout";
import { UserActions } from "@/pages/admin-users";

const durationOf = (startedAt: string | null, finishedAt: string | null) => {
  if (!startedAt || !finishedAt) {
    return null;
  }
  return (new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000;
};

const yesNo = (value: boolean) => {
  if (value) {
    return "Yes";
  }
  return "No";
};

const BackLink = () => {
  return (
    <Link to="/admin/users" variant="plain" inline={false} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 self-start")}>
      <ArrowLeft />
      Users
    </Link>
  );
};

export const AdminUserPage = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data, isError } = useQuery(adminQuery().user(id));

  if (isError) {
    return (
      <Stack gap={4}>
        <BackLink />
        <EmptyState icon={UserRound} title="User not found" description="This user does not exist anymore." bordered />
      </Stack>
    );
  }
  if (!data) {
    return (
      <Stack gap={4}>
        <BackLink />
        <PageSkeleton />
      </Stack>
    );
  }

  const { user } = data;
  const failed = data.deploymentStats.find((row) => row.status === "FAILED")?.count ?? 0;
  const totalDeploys = data.deploymentStats.reduce((sum, row) => sum + row.count, 0);

  return (
    <Stack gap={6}>
      <Stack gap={4}>
        <BackLink />
        <Stack direction="row" align="center" gap={4}>
          <Avatar name={user.name} size="lg" />
          <Stack gap={3} className="flex-1">
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
          </Stack>
        </Stack>
        <Stack direction="row" wrap gap={1}>
          {user.role === "ADMIN" && <Badge>Admin</Badge>}
          {user.blocked && <Badge variant="destructive">Blocked</Badge>}
          <Badge variant={user.plan === "Pro" ? "success" : "secondary"}>{user.plan}</Badge>
          <Badge variant="outline">{user.verified ? "Verified" : "Unverified"}</Badge>
        </Stack>
      </Stack>
      <StatGrid>
        <Stat label="Projects" value={`${data.projects.length} / ${user.projectLimit}`} hint={`${data.memberships.length} memberships`} />
        <Stat label="Deployments" value={formatNumber(totalDeploys)} hint={`${failed} failed`} />
        <Stat label="Token balance" value={formatNumber(user.tokenBalance)} hint={`${formatNumber(data.tokens.total)} used in ${data.tokens.runs} runs`} />
        <Stat label="Last active" value={formatRelative(user.lastActiveAt)} hint={`Joined ${formatDate(user.createdAt)}`} />
      </StatGrid>
      <Grid cols={3}>
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent>
            <DescriptionList layout="stacked">
              <DescriptionItem term="User ID" mono layout="stacked">
                {user.id}
              </DescriptionItem>
              <DescriptionItem term="Joined" layout="stacked">
                {formatDate(user.createdAt)}
              </DescriptionItem>
              <DescriptionItem term="Last active" layout="stacked">
                {formatDate(user.lastActiveAt)}
              </DescriptionItem>
              <DescriptionItem term="Free AI app used" layout="stacked">
                {yesNo(user.freeAiAppUsed)}
              </DescriptionItem>
              <DescriptionItem term="Free AI build used" layout="stacked">
                {yesNo(user.freeAiBuildUsed)}
              </DescriptionItem>
            </DescriptionList>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            {!data.subscription && (
              <Text size="sm" tone="muted">
                Never subscribed
              </Text>
            )}
            {data.subscription && (
              <DescriptionList layout="stacked">
                <DescriptionItem term="Status" layout="stacked">
                  <StatusBadge status={data.subscription.status} />
                </DescriptionItem>
                <DescriptionItem term="Provider" layout="stacked">
                  {data.subscription.provider}
                </DescriptionItem>
                <DescriptionItem term="Since" layout="stacked">
                  {formatDate(data.subscription.createdAt)}
                </DescriptionItem>
                <DescriptionItem term="Renews" layout="stacked">
                  {formatDate(data.subscription.renewsAt)}
                </DescriptionItem>
                <DescriptionItem term="Ends" layout="stacked">
                  {formatDate(data.subscription.endsAt)}
                </DescriptionItem>
              </DescriptionList>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Billing events</CardTitle>
          </CardHeader>
          <CardContent>
            {data.billingEvents.length === 0 && (
              <Text size="sm" tone="muted">
                No billing events
              </Text>
            )}
            {data.billingEvents.length > 0 && (
              <DescriptionList layout="stacked">
                {data.billingEvents.map((event) => {
                  let amount = "";
                  if (event.amount > 0) {
                    amount = formatMoney(event.amount);
                  }
                  return (
                    <DescriptionItem key={event.id} term={event.type.replace("_", " ").toLowerCase()} layout="stacked">
                      <Stack direction="row" align="baseline" justify="between" gap={2}>
                        <Text as="span" size="sm" tabular>
                          {amount}
                        </Text>
                        <Text as="span" size="xs" tone="muted">
                          {formatDate(event.createdAt)}
                        </Text>
                      </Stack>
                    </DescriptionItem>
                  );
                })}
              </DescriptionList>
            )}
          </CardContent>
        </Card>
      </Grid>
      <TableCard title="Projects owned">
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
                  <Link to={`/admin/projects/${project.id}`}>{project.name}</Link>
                  <Text size="xs" tone="muted" mono>
                    {project.slug}
                  </Text>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  <Stack direction="row" align="center" justify="end" gap={2}>
                    {project.runningApps} / {project.apps} running
                    {project.suspended && <Badge variant="destructive">Suspended</Badge>}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Text as="span" size="sm" tone="muted">
                    {[project.hasDatabase && "Database", project.hasBucket && "Storage"].filter(Boolean).join(", ") || "-"}
                  </Text>
                </TableCell>
                <TableCell className="text-right tabular-nums">{project.members}</TableCell>
                <TableCell>
                  <Text as="span" size="sm" tone="muted">
                    {formatDate(project.createdAt)}
                  </Text>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableCard>
      {data.memberships.length > 0 && (
        <TableCard title="Member of">
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
                    <Link to={`/admin/projects/${membership.id}`}>{membership.name}</Link>
                  </TableCell>
                  <TableCell>
                    <Text as="span" size="sm">
                      {membership.ownerEmail}
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Text as="span" size="sm" tone="muted">
                      {formatDate(membership.joinedAt)}
                    </Text>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>
      )}
      <ChartGrid>
        <TableCard title="Recent deployments">
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
                  <TableCell>
                    <Text as="span" size="sm" mono>
                      {deployment.slug}
                    </Text>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={deployment.status} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatSeconds(durationOf(deployment.startedAt, deployment.finishedAt))}</TableCell>
                  <TableCell>
                    <Text as="span" size="sm" tone="muted">
                      {formatRelative(deployment.createdAt)}
                    </Text>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>
        <TableCard title="Recent AI usage">
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
                  <TableCell>
                    <Text as="span" size="sm" mono>
                      {usage.appName}
                    </Text>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <Stack direction="row" align="center" justify="end" gap={2}>
                      {formatNumber(usage.tokens)}
                      {usage.free && <Badge variant="outline">Free</Badge>}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Text as="span" size="sm" tone="muted">
                      {formatRelative(usage.createdAt)}
                    </Text>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>
      </ChartGrid>
      <TableCard title="Admin actions on this account">
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
                <TableCell>
                  <Text as="span" size="sm" mono>
                    {entry.action}
                  </Text>
                </TableCell>
                <TableCell>
                  <Text as="span" size="sm">
                    {entry.adminEmail}
                  </Text>
                </TableCell>
                <TableCell>
                  <Text as="span" size="sm" tone="muted">
                    {formatDate(entry.createdAt)}
                  </Text>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableCard>
    </Stack>
  );
};
