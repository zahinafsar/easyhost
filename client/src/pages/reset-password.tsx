import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, unwrap } from "@/lib/api";
import { useApiMutation } from "@/hooks/use-api-mutation";

export const ResetPasswordPage = () => {
  const [password, setPassword] = useState("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";

  const reset = useApiMutation({
    mutationFn: () => unwrap(api.auth["reset-password"].$post({ json: { token, password } })),
    success: "Password updated. Log in with your new password.",
    onSuccess: () => navigate("/login"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose a new password</CardTitle>
        <CardDescription>Use at least 6 characters.</CardDescription>
      </CardHeader>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          reset.mutate(undefined);
        }}
      >
        <CardContent className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required />
        </CardContent>
        <CardFooter className="mt-6">
          <Button type="submit" className="w-full" disabled={reset.isPending || !token}>
            {reset.isPending ? "Saving..." : "Reset password"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};
