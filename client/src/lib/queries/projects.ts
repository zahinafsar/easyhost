import { queryOptions } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api";

export const projectsQuery = () => ({
  all: ["projects"],
  list: () => queryOptions({ queryKey: ["projects", "list"], queryFn: () => unwrap(api.projects.$get()) }),
});
