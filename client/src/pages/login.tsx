import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, Field, Form, Heading, Input, Link, Text } from "@/components/ui";
import { api, unwrap } from "@/lib/api";
import { userQuery } from "@/lib/queries";
import { useApiMutation } from "@/hooks/use-api-mutation";

export const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const login = useApiMutation({
    mutationFn: () => unwrap(api.auth.login.$post({ json: { email, password } })),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: userQuery().all });
      navigate(searchParams.get("redirect") || "/");
    },
  });

  const redirect = searchParams.get("redirect");
  let registerHref = "/register";
  if (redirect) {
    registerHref = `/register?redirect=${encodeURIComponent(redirect)}`;
  }

  let submitLabel = "Log in";
  if (login.isPending) {
    submitLabel = "Logging in...";
  }

  return (
    <Card variant="frosted">
      <CardHeader className="gap-2">
        <Heading level={1}>Log in</Heading>
        <CardDescription>Welcome back to Reverhost.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form onSubmit={() => login.mutate(undefined)}>
          <Field label="Email" htmlFor="email">
            <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </Field>
          <Field
            label="Password"
            htmlFor="password"
            labelAside={
              <Link to="/forgot-password" variant="muted">
                Forgot password?
              </Link>
            }
          >
            <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </Field>
          <Button type="submit" block loading={login.isPending} className="mt-1">
            {submitLabel}
          </Button>
        </Form>
      </CardContent>
      <CardFooter className="justify-center">
        <Text size="sm" tone="muted">
          No account? <Link to={registerHref}>Sign up</Link>
        </Text>
      </CardFooter>
    </Card>
  );
};
