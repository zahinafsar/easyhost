import { queryOptions } from "@tanstack/react-query";
import { api, createKey, unwrap } from "@/lib/api";

export type AdminUserFilters = { page: number; search: string; plan: "all" | "free" | "pro"; state: "all" | "verified" | "unverified" | "blocked" | "admin"; sort: "newest" | "oldest" | "active" | "projects" };

export type AdminProjectFilters = { page: number; search: string; state: "all" | "running" | "stopped" | "suspended"; sort: "newest" | "oldest" | "updated" | "name" };

export type ResourceRange = "24h" | "7d" | "30d";

export const adminQuery = () => {
  const query = {
    all: ["admin"],

    health: () =>
      queryOptions({
        queryKey: createKey(...query.all, "health"),
        queryFn: () => unwrap(api.admin.health.$get()),
        refetchInterval: 15 * 1000,
      }),

    overview: (days: number) =>
      queryOptions({
        queryKey: createKey(...query.all, "overview", { days }),
        queryFn: () => unwrap(api.admin.overview.$get({ query: { days: String(days) } })),
      }),

    growth: (days: number) =>
      queryOptions({
        queryKey: createKey(...query.all, "growth", { days }),
        queryFn: () => unwrap(api.admin.growth.$get({ query: { days: String(days) } })),
      }),

    revenue: (days: number, page: number) =>
      queryOptions({
        queryKey: createKey(...query.all, "revenue", { days, page }),
        queryFn: () => unwrap(api.admin.revenue.$get({ query: { days: String(days), page: String(page) } })),
      }),

    builds: (days: number, page: number) =>
      queryOptions({
        queryKey: createKey(...query.all, "builds", { days, page }),
        queryFn: () => unwrap(api.admin.builds.$get({ query: { days: String(days), page: String(page) } })),
        refetchInterval: 15 * 1000,
      }),

    deployment: (id: string) =>
      queryOptions({
        queryKey: createKey(...query.all, "deployment", id),
        queryFn: () => unwrap(api.admin.deployments[":id"].$get({ param: { id } })),
      }),

    ai: (days: number) =>
      queryOptions({
        queryKey: createKey(...query.all, "ai", { days }),
        queryFn: () => unwrap(api.admin.ai.$get({ query: { days: String(days) } })),
      }),

    resources: (range: ResourceRange) =>
      queryOptions({
        queryKey: createKey(...query.all, "resources", { range }),
        queryFn: () => unwrap(api.admin.resources.$get({ query: { range } })),
        refetchInterval: 60 * 1000,
      }),

    users: (filters: AdminUserFilters) =>
      queryOptions({
        queryKey: createKey(...query.all, "users", filters),
        queryFn: () => unwrap(api.admin.users.$get({ query: { ...filters, page: String(filters.page) } })),
      }),

    user: (id: string) =>
      queryOptions({
        queryKey: createKey(...query.all, "user", id),
        queryFn: () => unwrap(api.admin.users[":id"].$get({ param: { id } })),
      }),

    projects: (filters: AdminProjectFilters) =>
      queryOptions({
        queryKey: createKey(...query.all, "projects", filters),
        queryFn: () => unwrap(api.admin.projects.$get({ query: { ...filters, page: String(filters.page) } })),
      }),

    project: (id: string) =>
      queryOptions({
        queryKey: createKey(...query.all, "project", id),
        queryFn: () => unwrap(api.admin.projects[":id"].$get({ param: { id } })),
        refetchInterval: 30 * 1000,
      }),

    audit: (page: number, search: string, action: string) =>
      queryOptions({
        queryKey: createKey(...query.all, "audit", { page, search, action }),
        queryFn: () => unwrap(api.admin.audit.$get({ query: { page: String(page), search, action } })),
      }),

    blockedDomains: () =>
      queryOptions({
        queryKey: createKey(...query.all, "blocked-domains"),
        queryFn: () => unwrap(api.admin["blocked-domains"].$get()),
      }),

    cleanup: () =>
      queryOptions({
        queryKey: createKey(...query.all, "cleanup"),
        queryFn: () => unwrap(api.admin.cleanup.$get()),
      }),
  };

  return query;
};
