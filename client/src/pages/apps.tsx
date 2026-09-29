import { Navigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { appsQuery } from "@/lib/queries";
import { selectedProjectId } from "@/lib/project";

export const AppsPage = () => {
  const { data, isLoading } = useQuery(appsQuery().list());

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  const selected = data?.apps.find((project) => project.id === selectedProjectId()) ?? data?.apps[0];
  if (!selected) {
    return null;
  }

  return <Navigate to={`/apps/${selected.id}`} replace />;
};
