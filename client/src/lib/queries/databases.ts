import { queryOptions } from "@tanstack/react-query";
import { api, createKey, unwrap } from "@/lib/api";

export const databasesQuery = () => {
  const query = {
    all: ["databases"],

    list: () =>
      queryOptions({
        queryKey: createKey(...query.all, "list"),
        queryFn: () => unwrap(api.databases.$get()),
      }),

    detail: (id: string) =>
      queryOptions({
        queryKey: createKey(...query.all, "detail", id),
        queryFn: () => unwrap(api.databases[":id"].$get({ param: { id } })),
      }),

    rows: (id: string, table: string, page: number) =>
      queryOptions({
        queryKey: createKey(...query.all, "rows", id, table, { page }),
        queryFn: () =>
          unwrap(api.databases[":id"].tables[":table"].rows.$get({ param: { id, table }, query: { page: String(page) } })),
      }),
  };

  return query;
};
