import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";

export const useApiMutation = <TVariables, TData>({
  mutationFn,
  invalidate = [],
  success,
  onSuccess,
}: {
  mutationFn: (variables: TVariables) => Promise<TData>;
  invalidate?: QueryKey[];
  success?: string;
  onSuccess?: (data: TData) => void;
}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: async (data) => {
      await Promise.all(invalidate.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      if (success) {
        toast.success(success);
      }
      onSuccess?.(data);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};
