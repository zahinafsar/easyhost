import { useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, unwrap } from "@/lib/api";
import { useApiMutation } from "@/hooks/use-api-mutation";

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");

  const forgot = useApiMutation({
    mutationFn: () => unwrap(api.auth["forgot-password"].$post({ json: { email } })),
  });

  if (forgot.isSuccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>{forgot.data.message}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Link to="/login" className="text-sm hover:underline">
            Back to log in
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Forgot password</CardTitle>
        <CardDescription>We will email you a reset link.</CardDescription>
      </CardHeader>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          forgot.mutate(undefined);
        }}
      >
        <CardContent className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </CardContent>
        <CardFooter className="mt-6 flex-col gap-3">
          <Button type="submit" className="w-full" disabled={forgot.isPending}>
            {forgot.isPending ? "Sending..." : "Send reset link"}
          </Button>
          <Link to="/login" className="text-sm text-muted-foreground hover:underline">
            Back to log in
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
};
