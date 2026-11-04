import { queryOptions } from "@tanstack/react-query";
import { api, createKey, unwrap } from "@/lib/api";
import { selectedProjectId } from "@/lib/project";

export const membersQuery = () => {
  const query = {
    all: ["members", selectedProjectId()],

    list: () =>
      queryOptions({
        queryKey: createKey(...query.all, "list"),
        queryFn: () => unwrap(api.members.$get()),
      }),

    invite: (token: string) =>
      queryOptions({
        queryKey: ["invites", token],
        queryFn: () => unwrap(api.invites[":token"].$get({ param: { token } })),
        retry: false,
      }),
  };

  return query;
};
