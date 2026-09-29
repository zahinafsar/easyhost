import { queryOptions } from "@tanstack/react-query";
import { api, createKey } from "@/lib/api";

export const userQuery = () => {
  const query = {
    all: ["user"],

    me: () =>
      queryOptions({
        queryKey: createKey(...query.all, "me"),
        queryFn: async () => {
          const res = await api.auth.me.$get();
          if (!res.ok) {
            return null;
          }
          const data = await res.json();
          return data.user;
        },
        retry: false,
        staleTime: 5 * 60 * 1000,
      }),
  };

  return query;
};
