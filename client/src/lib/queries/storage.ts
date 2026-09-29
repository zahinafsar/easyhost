import { queryOptions } from "@tanstack/react-query";
import { api, createKey, unwrap } from "@/lib/api";
import { selectedProjectId } from "@/lib/project";

export const storageQuery = () => {
  const query = {
    all: ["storage", selectedProjectId()],

    buckets: () =>
      queryOptions({
        queryKey: createKey(...query.all, "buckets"),
        queryFn: () => unwrap(api.storage.buckets.$get()),
      }),

    objects: (id: string, prefix: string) =>
      queryOptions({
        queryKey: createKey(...query.all, "objects", id, { prefix }),
        queryFn: () => unwrap(api.storage.buckets[":id"].objects.$get({ param: { id }, query: { prefix } })),
      }),
  };

  return query;
};
