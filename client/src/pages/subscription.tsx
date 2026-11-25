import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  Grid,
  Heading,
  HStack,
  List,
  ListItem,
  Section,
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
import { Facts } from "@/components/facts";
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
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }
  if (error) {
    return <Alert variant="danger">{error.message}</Alert>;
  }
  if (!data) {
    return null;
  }

  const plans = [data.plans.free, data.plans.pro];

  let billingLabel = "No subscription";
  if (data.subscription?.status === "ACTIVE" && data.subscription.renewsAt) {
    billingLabel = `Renews ${formatDate(data.subscription.renewsAt)}`;
  } else if (data.subscription?.status === "CANCELLED" && data.subscription.endsAt) {
    billingLabel = `Ends ${formatDate(data.subscription.endsAt)}`;
  } else if (data.subscription?.status === "PAST_DUE") {
    billingLabel = "Payment failed";
  }

  return (
    <>
      <PageHeader
        title="Subscription"
        action={
          data.subscription && (
            <Button variant="secondary" loading={portal.isPending} onClick={() => portal.mutate(undefined)}>
              Manage billing
            </Button>
          )
        }
      />

      <Stack gap={8}>
        {data.subscription?.status === "PAST_DUE" && (
          <Alert variant="danger" title="Payment failed">
            Your last payment failed, so your account is on the Free plan and projects beyond {data.plans.free.projects} are paused. Update your payment method in Manage billing.
          </Alert>
        )}

        <Facts
          items={[
            { label: "Plan", value: data.plan.name },
            { label: "Projects", value: `${data.projects.length} / ${data.plan.projects}` },
            { label: "AI tokens", value: data.tokenBalance.toLocaleString("en-US") },
            { label: "Billing", value: billingLabel },
          ]}
        />

        <Grid cols={2} gap={4}>
          {plans.map((plan) => {
            const current = plan.id === data.plan.id;
            const showRenewal = current && data.subscription?.status === "ACTIVE" && !!data.subscription.renewsAt;
            const showCancelled = data.subscription?.status === "CANCELLED" && !!data.subscription.endsAt;
            const showFooter = plan.id === "PRO" && (!data.subscription || showRenewal || showCancelled);
            return (
              <Card key={plan.id} className={cn(current && "border-accent-green/60 ring-1 ring-accent-green/30")}>
                <CardHeader className="gap-3">
                  <HStack justify="between" gap={2}>
                    <Text as="span" weight="medium">
                      {plan.name}
                    </Text>
                    {current && <Badge variant="success">Current plan</Badge>}
                  </HStack>
                  <HStack align="baseline" gap={1}>
                    <Heading level={3} size="2xl" className="tabular-nums">
                      ${plan.price}
                    </Heading>
                    <Text as="span" tone="muted">
                      /month
                    </Text>
                  </HStack>
                </CardHeader>
                <CardContent className="flex-1">
                  <List variant="check" gap={3}>
                    {planFeatures(plan).map((feature) => (
                      <ListItem key={feature} icon={Check}>
                        {feature}
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
                {showFooter && (
                  <CardFooter>
                    {!data.subscription && (
                      <Button block loading={checkout.isPending} onClick={() => checkout.mutate(undefined)}>
                        Upgrade to Pro
                      </Button>
                    )}
                    {showRenewal && data.subscription?.renewsAt && (
                      <Text size="sm" tone="muted">
                        Renews {formatDate(data.subscription.renewsAt)}
                      </Text>
                    )}
                    {showCancelled && data.subscription?.endsAt && (
                      <Text size="sm" tone="muted">
                        Cancelled, ends {formatDate(data.subscription.endsAt)}
                      </Text>
                    )}
                  </CardFooter>
                )}
              </Card>
            );
          })}
        </Grid>

        <Section title="Usage by project">
          <Table framed>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Apps</TableHead>
                <TableHead>Database</TableHead>
                <TableHead>Storage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data.projects.length && <TableEmpty colSpan={4}>No projects</TableEmpty>}
              {data.projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <HStack gap={2}>
                      <Text as="span" weight="medium">
                        {project.name}
                      </Text>
                      {!project.allowed && <Badge variant="destructive">Paused</Badge>}
                    </HStack>
                  </TableCell>
                  <TableCell>
                    <Text as="span" tabular>
                      {project.usage.apps} / {data.plan.apps}
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Text as="span" tabular>
                      {usageText(project.usage.dbBytes, data.plan.dbBytes)}
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Text as="span" tabular>
                      {usageText(project.usage.storageBytes, data.plan.storageBytes)}
                    </Text>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      </Stack>
    </>
  );
};
