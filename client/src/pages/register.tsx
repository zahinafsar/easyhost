import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>Host apps, store files, run databases and send email.</CardDescription>
      </CardHeader>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          register.mutate(undefined);
        }}
      >
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={form.name} onChange={update("name")} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={update("email")} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={form.password} onChange={update("password")} minLength={6} required />
          </div>
          <div className="flex items-start gap-2">
            <input id="terms" type="checkbox" className="mt-0.5 size-4 accent-primary" required />
            <Label htmlFor="terms" className="text-sm font-normal leading-snug text-muted-foreground">
              <span>
                I agree to the{" "}
                <a href={`${env.marketingUrl}/terms`} target="_blank" rel="noreferrer" className="text-foreground hover:underline">
                  Terms and Conditions
                </a>{" "}
                and{" "}
                <a href={`${env.marketingUrl}/privacy`} target="_blank" rel="noreferrer" className="text-foreground hover:underline">
                  Privacy Policy
                </a>
              </span>
            </Label>
          </div>
        </CardContent>
        <CardFooter className="mt-6 flex-col gap-3">
          <Button type="submit" className="w-full" disabled={register.isPending}>
            {register.isPending ? "Creating account..." : "Sign up"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to={loginHref} className="text-foreground hover:underline">
              Log in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
};
