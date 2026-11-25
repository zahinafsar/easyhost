import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Button, Card, CardContent, CardDescription, CardHeader, Field, Form, Heading, Input } from "@/components/ui";
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

  let submitLabel = "Reset password";
  if (reset.isPending) {
    submitLabel = "Saving...";
  }

  return (
    <Card variant="frosted">
      <CardHeader className="gap-2">
        <Heading level={1}>Choose a new password</Heading>
        <CardDescription>Use at least 6 characters.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form onSubmit={() => reset.mutate(undefined)}>
          <Field label="New password" htmlFor="password">
            <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required />
          </Field>
          <Button type="submit" block loading={reset.isPending} disabled={!token} className="mt-1">
            {submitLabel}
          </Button>
        </Form>
      </CardContent>
    </Card>
  );
};
