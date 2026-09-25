import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Database, HardDrive, KeyRound, Mail, Rocket } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { CodeBlock } from "@/components/code-block";
import { userQuery } from "@/lib/queries";
import { useAuth } from "@/providers/auth-provider";

export const OverviewPage = () => {
  const { user } = useAuth();
  const { data, isLoading } = useQuery(userQuery().overview());

  const stats = [
    { label: "Apps", value: data && `${data.runningApps} / ${data.apps} running`, icon: Rocket, to: "/apps" },
    { label: "Buckets", value: data?.buckets, icon: HardDrive, to: "/storage" },
    { label: "Databases", value: data?.databases, icon: Database, to: "/databases" },
    { label: "Emails today", value: data?.emailsToday, icon: Mail, to: "/email" },
    { label: "API keys", value: data?.apiKeys, icon: KeyRound, to: "/api-keys" },
  ];

  return (
    <>
      <PageHeader title={`Hi, ${user?.name}`} description="Everything you run on EasyHost at a glance." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <Link key={stat.label} to={stat.to}>
            <Card className="h-full transition-colors hover:bg-muted/40">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <stat.icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading && <Skeleton className="h-7 w-16" />}
                {!isLoading && <p className="text-2xl font-semibold">{stat.value}</p>}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Deploy a Next.js app</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>No config changes needed. Run the CLI from your project folder and EasyHost installs, builds and starts it.</p>
          <CodeBlock code={"npx ezhst login\nnpx ezhst deploy"} />
        </CardContent>
      </Card>
    </>
  );
};
