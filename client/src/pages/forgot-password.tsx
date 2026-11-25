import { useState } from "react";
import { MailCheck } from "lucide-react";
import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, Field, Form, Heading, IconBadge, Input, Link } from "@/components/ui";
import { api, unwrap } from "@/lib/api";
import { useApiMutation } from "@/hooks/use-api-mutation";

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");

  const forgot = useApiMutation({
    mutationFn: () => unwrap(api.auth["forgot-password"].$post({ json: { email } })),
  });

  if (forgot.isSuccess) {
    return (
      <Card variant="frosted">
        <CardHeader className="gap-3">
          <IconBadge icon={MailCheck} tone="success" size="lg" />
          <Heading level={1}>Check your email</Heading>
          <CardDescription>{forgot.data.message}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Link to="/login">Back to log in</Link>
        </CardFooter>
      </Card>
    );
  }

  let submitLabel = "Send reset link";
  if (forgot.isPending) {
    submitLabel = "Sending...";
  }

  return (
    <Card variant="frosted">
      <CardHeader className="gap-2">
        <Heading level={1}>Forgot password</Heading>
        <CardDescription>We will email you a reset link.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form onSubmit={() => forgot.mutate(undefined)}>
          <Field label="Email" htmlFor="email">
            <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </Field>
          <Button type="submit" block loading={forgot.isPending} className="mt-1">
            {submitLabel}
          </Button>
        </Form>
      </CardContent>
      <CardFooter className="justify-center">
        <Link to="/login" variant="muted">
          Back to log in
        </Link>
      </CardFooter>
    </Card>
  );
};
