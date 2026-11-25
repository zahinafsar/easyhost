import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, Form, Heading, Input, Strong } from "@/components/ui";
import { AuthScreen } from "@/components/auth-layout";
import { api, unwrap } from "@/lib/api";
import { userQuery } from "@/lib/queries";
import { useAuth } from "@/providers/auth-provider";
import { useApiMutation } from "@/hooks/use-api-mutation";

export const VerifyEmailScreen = ({ email }: { email: string }) => {
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");

  const verify = useApiMutation({
    mutationFn: () => unwrap(api.auth["verify-email"].$post({ json: { code } })),
    success: "Email verified",
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userQuery().all });
    },
  });

  const resend = useApiMutation({
    mutationFn: () => unwrap(api.auth["resend-verification"].$post()),
    onSuccess: (result) => {
      toast.success(result.message);
      setCode("");
    },
  });

  let submitLabel = "Verify";
  if (verify.isPending) {
    submitLabel = "Verifying...";
  }

  return (
    <AuthScreen>
      <Card variant="frosted">
        <CardHeader className="gap-2">
          <Heading level={1}>Verify your email</Heading>
          <CardDescription>
            Enter the 6-digit code we sent to <Strong>{email}</Strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form
            onSubmit={() => {
              if (code.length === 6) {
                verify.mutate(undefined);
              }
            }}
          >
            <Input
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              className="h-14 text-center font-mono text-2xl tracking-[0.5em]"
              aria-label="Verification code"
              autoFocus
            />
            <Button type="submit" block loading={verify.isPending} disabled={code.length !== 6}>
              {submitLabel}
            </Button>
          </Form>
        </CardContent>
        <CardFooter className="justify-between">
          <Button variant="link" size="xs" className="px-0" disabled={resend.isPending} onClick={() => resend.mutate(undefined)}>
            Send a new code
          </Button>
          <Button variant="ghost" size="xs" onClick={logout}>
            Log out
          </Button>
        </CardFooter>
      </Card>
    </AuthScreen>
  );
};
