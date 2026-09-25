import { queryOptions } from "@tanstack/react-query";
import { api, createKey, unwrap } from "@/lib/api";

export const apiKeysQuery = () => {
  const query = {
    all: ["api-keys"],

    list: () =>
      queryOptions({
        queryKey: createKey(...query.all, "list"),
        queryFn: () => unwrap(api["api-keys"].$get()),
      }),
  };

  return query;
};
