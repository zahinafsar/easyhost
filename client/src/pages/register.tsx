import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, Checkbox, Field, Form, Heading, Input, Link, Text } from "@/components/ui";
import { api, unwrap } from "@/lib/api";
import { env } from "@/lib/env";
import { userQuery } from "@/lib/queries";
import { useApiMutation } from "@/hooks/use-api-mutation";

export const RegisterPage = () => {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect");
  const queryClient = useQueryClient();

  const register = useApiMutation({
    mutationFn: () => unwrap(api.auth.register.$post({ json: form })),
    success: "Account created. Check your email for the verification code.",
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: userQuery().all });
      navigate(redirect || "/");
    },
  });

  const update = (field: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [field]: event.target.value });
  };

  let loginHref = "/login";
  if (redirect) {
    loginHref = `/login?redirect=${encodeURIComponent(redirect)}`;
  }

  let submitLabel = "Sign up";
  if (register.isPending) {
    submitLabel = "Creating account...";
  }

  return (
    <Card variant="frosted">
      <CardHeader className="gap-2">
        <Heading level={1}>Create your account</Heading>
        <CardDescription>Host apps, store files and run databases.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form onSubmit={() => register.mutate(undefined)}>
          <Field label="Name" htmlFor="name">
            <Input id="name" value={form.name} onChange={update("name")} required />
          </Field>
          <Field label="Email" htmlFor="email">
            <Input id="email" type="email" value={form.email} onChange={update("email")} required />
          </Field>
          <Field label="Password" htmlFor="password">
            <Input id="password" type="password" value={form.password} onChange={update("password")} minLength={6} required />
          </Field>
          <Field
            orientation="horizontal"
            htmlFor="terms"
            label={
              <Text as="span" size="sm" tone="muted">
                I agree to the{" "}
                <Link href={`${env.marketingUrl}/terms`} external>
                  Terms and Conditions
                </Link>{" "}
                and{" "}
                <Link href={`${env.marketingUrl}/privacy`} external>
                  Privacy Policy
                </Link>
              </Text>
            }
          >
            <Checkbox id="terms" required className="mt-0.5" />
          </Field>
          <Button type="submit" block loading={register.isPending} className="mt-1">
            {submitLabel}
          </Button>
        </Form>
      </CardContent>
      <CardFooter className="justify-center">
        <Text size="sm" tone="muted">
          Already have an account? <Link to={loginHref}>Log in</Link>
        </Text>
      </CardFooter>
    </Card>
  );
};
