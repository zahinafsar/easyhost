import { queryOptions } from "@tanstack/react-query";
import { selectedProjectId } from "@/lib/project";
import { api, createKey, unwrap } from "@/lib/api";

const ACTIVE_STATUSES = ["QUEUED", "BUILDING"];

export const appsQuery = () => {
  const query = {
    all: ["apps", selectedProjectId()],

    list: () =>
      queryOptions({
        queryKey: createKey(...query.all, "list"),
        queryFn: () => unwrap(api.apps.$get()),
      }),

    detail: (id: string) =>
      queryOptions({
        queryKey: createKey(...query.all, "detail", id),
        queryFn: () => unwrap(api.apps[":id"].$get({ param: { id } })),
        refetchInterval: (state) => {
          const building = state.state.data?.deployments.some((deployment) => ACTIVE_STATUSES.includes(deployment.status));
          if (building) {
            return 2000;
          }
          return false;
        },
      }),

    deployment: (id: string, deploymentId: string) =>
      queryOptions({
        queryKey: createKey(...query.all, "deployment", id, deploymentId),
        queryFn: () => unwrap(api.apps[":id"].deployments[":deploymentId"].$get({ param: { id, deploymentId } })),
        refetchInterval: (state) => {
          if (state.state.data && ACTIVE_STATUSES.includes(state.state.data.deployment.status)) {
            return 1500;
          }
          return false;
        },
      }),

    logs: (id: string) =>
      queryOptions({
        queryKey: createKey(...query.all, "logs", id),
        queryFn: () => unwrap(api.apps[":id"].logs.$get({ param: { id }, query: { tail: "300" } })),
      }),
  };

  return query;
};
