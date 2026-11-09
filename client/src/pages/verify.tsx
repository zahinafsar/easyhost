import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
      <div className="mb-8 flex items-center gap-2 text-lg font-semibold">
        <img src="/logo.svg" alt="" className="h-6 w-auto" />
        EasyHost
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Verify your email</CardTitle>
          <CardDescription>
            Enter the 6-digit code we sent to <span className="font-medium text-foreground">{email}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
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
              className="h-12 text-center font-mono text-2xl tracking-[0.5em]"
              aria-label="Verification code"
              autoFocus
            />
            <Button type="submit" className="w-full" disabled={code.length !== 6 || verify.isPending}>
              {verify.isPending ? "Verifying..." : "Verify"}
            </Button>
          </form>
          <div className="mt-4 flex items-center justify-between text-sm">
            <Button variant="link" className="h-auto p-0" disabled={resend.isPending} onClick={() => resend.mutate(undefined)}>
              Send a new code
            </Button>
            <Button variant="link" className="h-auto p-0 text-muted-foreground" onClick={logout}>
              Log out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
