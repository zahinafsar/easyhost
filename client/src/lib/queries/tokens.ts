import { queryOptions } from "@tanstack/react-query";
import { api, createKey, unwrap } from "@/lib/api";

export const PURCHASE_POLLS = 40;

export const tokensQuery = () => {
  const query = {
    all: ["tokens"],

    summary: () =>
      queryOptions({
        queryKey: createKey(...query.all, "summary"),
        queryFn: () => unwrap(api.tokens.$get()),
      }),

    purchase: (id: string) =>
      queryOptions({
        queryKey: createKey(...query.all, "purchase", id),
        queryFn: () => unwrap(api.tokens.purchases[":id"].$get({ param: { id } })),
        refetchInterval: (state) => {
          if (state.state.data?.purchase.status === "PAID" || state.state.dataUpdateCount >= PURCHASE_POLLS) {
            return false;
          }
          return 3000;
        },
      }),
  };

  return query;
};
