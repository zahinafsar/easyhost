import { queryOptions } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api";
import { selectedProjectId } from "@/lib/project";

export const schedulesQuery = () => {
  const all = ["schedules", selectedProjectId()];
  return {
    all,
    list: () => queryOptions({ queryKey: [...all, "list"], queryFn: () => unwrap(api.schedules.$get()), refetchInterval: 15_000 }),
  };
};
