import { queryOptions } from "@tanstack/react-query";
import { api, createKey, unwrap } from "@/lib/api";

export const tokensQuery = () => {
  const query = {
    all: ["tokens"],

    summary: () =>
      queryOptions({
        queryKey: createKey(...query.all, "summary"),
        queryFn: () => unwrap(api.tokens.$get()),
      }),
  };

  return query;
};
