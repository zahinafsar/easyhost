import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { api, unwrap } from "@/lib/api";
import { billingQuery } from "@/lib/queries";
import { formatBytes, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useApiMutation } from "@/hooks/use-api-mutation";

type PlanInfo = { id: string; name: string; price: number; projects: number; apps: number; dbBytes: number; storageBytes: number; monthlyTokens: number };

const planFeatures = (plan: PlanInfo) => {
  const features = [
    `${plan.projects} projects`,
    `${plan.apps} apps per project`,
    `${formatBytes(plan.dbBytes)} Postgres database per project`,
    `${formatBytes(plan.storageBytes)} storage per project`,
  ];
  if (plan.monthlyTokens > 0) {
    features.push(`${plan.monthlyTokens.toLocaleString("en-US")} AI tokens every month`);
  } else {
    features.push("First AI app and first build free");
  }
  return features;
};

const usageText = (used: number, limit: number) => `${formatBytes(used)} / ${formatBytes(limit)}`;

export const SubscriptionPage = () => {
  const { data, isLoading, error } = useQuery(billingQuery().overview());

  const checkout = useApiMutation({
    mutationFn: () => unwrap(api.billing.checkout.$post()),
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
  });

  const portal = useApiMutation({
    mutationFn: () => unwrap(api.billing.portal.$get()),
    onSuccess: ({ url }) => {
      window.open(url, "_blank", "noopener");
    },
  });

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (error) {
    return <p role="alert" className="text-destructive">{error.message}</p>;
  }
  if (!data) {
    return null;
  }

  const plans = [data.plans.free, data.plans.pro];

  return (
    <>
      <PageHeader
        title="Subscription"
        description="Start free. Upgrade to Pro for more projects and monthly AI tokens."
        action={
          data.subscription && (
            <Button variant="outline" disabled={portal.isPending} onClick={() => portal.mutate(undefined)}>
              Manage billing
            </Button>
          )
        }
      />

      {data.subscription?.status === "PAST_DUE" && (
        <Card className="mb-8 border-red-300 bg-red-50">
          <CardContent className="text-sm text-red-900">
            Your last payment failed, so your account is on the Free plan and projects beyond {data.plans.free.projects} are paused. Update your payment method in Manage billing.
          </CardContent>
        </Card>
      )}

      <div className="mb-10 grid gap-4 md:grid-cols-2">
        {plans.map((plan) => {
          const current = plan.id === data.plan.id;
          return (
            <Card key={plan.id} className={cn(current && "border-foreground")}>
              <CardHeader>
                <CardDescription className="flex items-center justify-between">
                  {plan.name}
                  {current && <Badge>Current plan</Badge>}
                </CardDescription>
                <CardTitle className="text-3xl tabular-nums">
                  ${plan.price}
                  <span className="text-base font-normal text-muted-foreground">/month</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-2 text-sm">
                  {planFeatures(plan).map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="size-4 text-muted-foreground" />
                      {feature}
                    </li>
                  ))}
                </ul>
                {plan.id === "PRO" && !data.subscription && (
                  <Button className="w-full" disabled={checkout.isPending} onClick={() => checkout.mutate(undefined)}>
                    Upgrade to Pro
                  </Button>
                )}
                {plan.id === "PRO" && current && data.subscription?.status === "ACTIVE" && data.subscription.renewsAt && (
                  <p className="text-sm text-muted-foreground">Renews {formatDate(data.subscription.renewsAt)}</p>
                )}
                {plan.id === "PRO" && data.subscription?.status === "CANCELLED" && data.subscription.endsAt && (
                  <p className="text-sm text-muted-foreground">Cancelled, ends {formatDate(data.subscription.endsAt)}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Usage</h2>
        <span className="text-sm text-muted-foreground tabular-nums">
          {data.projects.length} / {data.plan.projects} projects, {data.tokenBalance.toLocaleString("en-US")} AI tokens
        </span>
      </div>
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Apps</TableHead>
              <TableHead>Database</TableHead>
              <TableHead>Storage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!data.projects.length && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                  No projects yet.
                </TableCell>
              </TableRow>
            )}
            {data.projects.map((project) => (
              <TableRow key={project.id}>
                <TableCell className="font-medium">
                  {project.name}
                  {!project.allowed && <Badge variant="destructive" className="ml-2">Paused</Badge>}
                </TableCell>
                <TableCell className="tabular-nums">
                  {project.usage.apps} / {data.plan.apps}
                </TableCell>
                <TableCell className="tabular-nums">{usageText(project.usage.dbBytes, data.plan.dbBytes)}</TableCell>
                <TableCell className="tabular-nums">{usageText(project.usage.storageBytes, data.plan.storageBytes)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
};
