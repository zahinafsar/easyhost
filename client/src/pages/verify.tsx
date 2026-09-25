import { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { api, unwrap } from "@/lib/api";
import { userQuery } from "@/lib/queries";

export const VerifyPage = () => {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const token = searchParams.get("token") ?? "";
  const started = useRef(false);

  const verify = useMutation({
    mutationFn: () => unwrap(api.auth["verify-email"].$post({ json: { token } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userQuery().all }),
  });

  useEffect(() => {
    if (token && !started.current) {
      started.current = true;
      verify.mutate();
    }
  }, [token, verify]);

  let title = "Verifying your email";
  let description = "One moment...";
  if (!token) {
    title = "Missing token";
    description = "The verification link is incomplete.";
  } else if (verify.isSuccess) {
    title = "Email verified";
    description = verify.data.message;
  } else if (verify.isError) {
    title = "Verification failed";
    description = verify.error.message;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardFooter>
        <Link to="/" className="text-sm hover:underline">
          Go to dashboard
        </Link>
      </CardFooter>
    </Card>
  );
};
