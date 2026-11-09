import { queryOptions } from "@tanstack/react-query";
import { api, createKey, unwrap } from "@/lib/api";

export const adminQuery = () => {
  const query = {
    all: ["admin"],

    health: () =>
      queryOptions({
        queryKey: createKey(...query.all, "health"),
        queryFn: () => unwrap(api.admin.health.$get()),
        refetchInterval: 15 * 1000,
      }),

    analytics: (days: number) =>
      queryOptions({
        queryKey: createKey(...query.all, "analytics", { days }),
        queryFn: () => unwrap(api.admin.analytics.$get({ query: { days: String(days) } })),
      }),

    usage: () =>
      queryOptions({
        queryKey: createKey(...query.all, "usage"),
        queryFn: () => unwrap(api.admin.usage.$get()),
      }),

    cleanup: () =>
      queryOptions({
        queryKey: createKey(...query.all, "cleanup"),
        queryFn: () => unwrap(api.admin.cleanup.$get()),
      }),

    users: (page: number, search: string) =>
      queryOptions({
        queryKey: createKey(...query.all, "users", { page, search }),
        queryFn: () => unwrap(api.admin.users.$get({ query: { page: String(page), search } })),
      }),
  };

  return query;
};
