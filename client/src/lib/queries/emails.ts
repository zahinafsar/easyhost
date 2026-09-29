import { queryOptions } from "@tanstack/react-query";
import { api, createKey, unwrap } from "@/lib/api";
import { selectedProjectId } from "@/lib/project";

export const emailsQuery = () => {
  const query = {
    all: ["emails", selectedProjectId()],

    logs: (page: number) =>
      queryOptions({
        queryKey: createKey(...query.all, "logs", { page }),
        queryFn: () => unwrap(api.emails.$get({ query: { page: String(page), limit: "20" } })),
      }),
  };

  return query;
};
