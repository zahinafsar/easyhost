import { useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleCheck, Coins, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { api, unwrap } from "@/lib/api";
import { PURCHASE_POLLS, tokensQuery } from "@/lib/queries";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useApiMutation } from "@/hooks/use-api-mutation";

const formatTokens = (tokens: number) => tokens.toLocaleString("en-US");

const formatUsd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const PurchaseStatus = ({ id }: { id: string }) => {
  const queryClient = useQueryClient();
  const purchaseQuery = tokensQuery().purchase(id);
  const { data } = useQuery(purchaseQuery);
  const gaveUp = (queryClient.getQueryState(purchaseQuery.queryKey)?.dataUpdateCount ?? 0) >= PURCHASE_POLLS;
  const paid = data?.purchase.status === "PAID";

  useEffect(() => {
    if (paid) {
      queryClient.invalidateQueries({ queryKey: tokensQuery().all });
    }
  }, [paid, queryClient]);

  if (!data) {
    return null;
  }

  return (
    <Card className={cn("mb-8", paid && "border-emerald-300 bg-emerald-50")}>
      <CardContent className="flex items-center gap-3 text-sm">
        {paid && <CircleCheck className="size-5 text-emerald-700" />}
        {!paid && !gaveUp && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
        {paid && <span>Payment received. {formatTokens(data.purchase.tokens)} tokens were added to your balance.</span>}
        {!paid && !gaveUp && <span>Waiting for payment confirmation. This usually takes a few seconds.</span>}
        {!paid && gaveUp && <span>We could not confirm this payment. If you were charged, refresh this page in a minute.</span>}
      </CardContent>
    </Card>
  );
};

export const TokensPage = () => {
  const [searchParams] = useSearchParams();
  const purchaseId = searchParams.get("purchase");
  const { data, isLoading, error } = useQuery(tokensQuery().summary());

  const checkout = useApiMutation({
    mutationFn: (pack: string) => unwrap(api.tokens.checkout.$post({ json: { pack } })),
    onSuccess: ({ url }) => {
      window.location.href = url;
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

  const baseTokensPerCent = data.packs[0].tokens / data.packs[0].cents;

  return (
    <>
      <PageHeader title="Tokens" description="Tokens pay for the AI builder. They are charged by how much work each request takes and never expire." />

      {purchaseId && <PurchaseStatus id={purchaseId} />}

      <Card className="mb-8">
        <CardHeader>
          <CardDescription>Balance</CardDescription>
          <CardTitle className="flex items-center gap-2 text-3xl tabular-nums">
            <Coins className="size-6 text-muted-foreground" />
            {formatTokens(data.balance)}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          A request needs at least {data.minTokensToBuild} tokens to start.
        </CardContent>
      </Card>

      <h2 className="mb-3 text-lg font-semibold">Buy tokens</h2>
      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.packs.map((pack) => {
          const bonus = Math.round((pack.tokens / (pack.cents * baseTokensPerCent) - 1) * 100);
          return (
            <Card key={pack.id}>
              <CardHeader>
                <CardDescription className="flex items-center justify-between">
                  {pack.name}
                  {bonus > 0 && <Badge variant="secondary">+{bonus}% bonus</Badge>}
                </CardDescription>
                <CardTitle className="text-2xl tabular-nums">{formatTokens(pack.tokens)}</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  disabled={checkout.isPending}
                  onClick={() => checkout.mutate(pack.id)}
                >
                  Buy for {formatUsd(pack.cents)}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-semibold">Usage</h2>
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>App</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data.usage.length && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                      No AI requests yet.
                    </TableCell>
                  </TableRow>
                )}
                {data.usage.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      {row.appId && (
                        <Link to={`/builder/${row.appId}`} className="hover:underline">
                          {row.appName}
                        </Link>
                      )}
                      {!row.appId && row.appName}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(row.createdAt)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.free && <Badge variant="secondary">Free</Badge>}
                      {!row.free && `-${formatTokens(row.tokens)}`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
        <div>
          <h2 className="mb-3 text-lg font-semibold">Purchases</h2>
          <Card className="py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data.purchases.length && (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">
                      No purchases yet.
                    </TableCell>
                  </TableRow>
                )}
                {data.purchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(purchase.paidAt)}</TableCell>
                    <TableCell className="tabular-nums">{formatUsd(purchase.amountCents)}</TableCell>
                    <TableCell className="text-right tabular-nums">+{formatTokens(purchase.tokens)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </>
  );
};
