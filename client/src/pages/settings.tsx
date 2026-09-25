import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { api, unwrap } from "@/lib/api";
import { userQuery } from "@/lib/queries";
import { useAuth } from "@/providers/auth-provider";
import { useApiMutation } from "@/hooks/use-api-mutation";

export const SettingsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState(user?.name ?? "");

  const save = useApiMutation({
    mutationFn: () => unwrap(api.auth.me.$put({ json: { name } })),
    success: "Profile updated",
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userQuery().all }),
  });

  const resend = useApiMutation({
    mutationFn: () => unwrap(api.auth["resend-verification"].$post()),
    success: "Verification email sent",
  });

  return (
    <>
      <PageHeader title="Settings" />
      <div className="max-w-xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                save.mutate(undefined);
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(event) => setName(event.target.value)} required />
              </div>
              <Button type="submit" disabled={save.isPending}>
                Save
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Email</CardTitle>
            <CardDescription>{user?.email}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            {user?.verified && <Badge variant="secondary">Verified</Badge>}
            {!user?.verified && (
              <>
                <Badge variant="secondary">Not verified</Badge>
                <Button variant="outline" size="sm" onClick={() => resend.mutate(undefined)} disabled={resend.isPending}>
                  Resend verification
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};
