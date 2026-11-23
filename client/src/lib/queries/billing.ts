import { queryOptions } from "@tanstack/react-query";
import { api, createKey, unwrap } from "@/lib/api";

export const billingQuery = () => {
  const query = {
    all: ["billing"],

    overview: () =>
      queryOptions({
        queryKey: createKey(...query.all, "overview"),
        queryFn: () => unwrap(api.billing.$get()),
      }),
  };

  return query;
};
