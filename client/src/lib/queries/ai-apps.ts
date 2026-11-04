import { queryOptions } from "@tanstack/react-query";
import { api, createKey, unwrap } from "@/lib/api";
import { selectedProjectId } from "@/lib/project";

export const aiAppsQuery = () => {
  const query = {
    all: ["ai-apps", selectedProjectId()],

    list: () =>
      queryOptions({
        queryKey: createKey(...query.all, "list"),
        queryFn: () => unwrap(api["ai-apps"].$get()),
      }),

    availability: (name: string) =>
      queryOptions({
        queryKey: createKey(...query.all, "availability", name),
        queryFn: () => unwrap(api["ai-apps"].availability.$get({ query: { name } })),
        enabled: name.length >= 2,
      }),

    detail: (id: string) =>
      queryOptions({
        queryKey: createKey(...query.all, "detail", id),
        queryFn: () => unwrap(api["ai-apps"][":id"].$get({ param: { id } })),
        refetchInterval: (state) => {
          if (state.state.data?.app.aiStatus === "GENERATING") {
            return 1500;
          }
          return false;
        },
      }),

    file: (id: string, path: string) =>
      queryOptions({
        queryKey: createKey(...query.all, "file", id, path),
        queryFn: () => unwrap(api["ai-apps"][":id"].file.$get({ param: { id }, query: { path } })),
        enabled: !!path,
      }),
  };

  return query;
};
