import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { ConfirmButton } from "@/components/confirm-button";
import { CodeBlock } from "@/components/code-block";
import { CreateResourceDialog } from "@/components/create-resource-dialog";
import { api, unwrap } from "@/lib/api";
import { apiKeysQuery, userQuery } from "@/lib/queries";
import { formatDate } from "@/lib/format";
import { useApiMutation } from "@/hooks/use-api-mutation";

export const ApiKeysPage = () => {
  const { data, isLoading } = useQuery(apiKeysQuery().list());
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const invalidate = [apiKeysQuery().all, userQuery().all];

  const createKey = useApiMutation({
    mutationFn: (name: string) => unwrap(api["api-keys"].$post({ json: { name } })),
    invalidate,
    onSuccess: (result) => setCreatedKey(result.key),
  });

  const revokeKey = useApiMutation({
    mutationFn: (id: string) => unwrap(api["api-keys"][":id"].$delete({ param: { id } })),
    invalidate,
    success: "API key revoked",
  });

  return (
    <>
      <PageHeader
        title="API Keys"
        description="Keys for the email API. Send as a Bearer token."
        action={
          <CreateResourceDialog
            title="Create API key"
            description="Give the key a name so you know where it is used."
            triggerLabel="New key"
            placeholder="production"
            isPending={createKey.isPending}
            onSubmit={(name) => createKey.mutateAsync(name)}
          />
        }
      />
      {isLoading && <Skeleton className="h-40 w-full" />}
      {data && (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data.apiKeys.length && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    No API keys yet.
                  </TableCell>
                </TableRow>
              )}
              {data.apiKeys.map((apiKey) => (
                <TableRow key={apiKey.id}>
                  <TableCell className="font-medium">{apiKey.name}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">{apiKey.prefix}...</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(apiKey.lastUsedAt)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(apiKey.createdAt)}</TableCell>
                  <TableCell>
                    <ConfirmButton
                      title={`Revoke ${apiKey.name}?`}
                      description="Apps using this key will stop working immediately."
                      confirmLabel="Revoke"
                      onConfirm={() => revokeKey.mutate(apiKey.id)}
                    >
                      <Button variant="ghost" size="icon">
                        <Trash2 className="size-4" />
                      </Button>
                    </ConfirmButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
      <Dialog open={!!createdKey} onOpenChange={(open) => !open && setCreatedKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your new API key</DialogTitle>
            <DialogDescription>Copy it now. You will not be able to see it again.</DialogDescription>
          </DialogHeader>
          {createdKey && <CodeBlock code={createdKey} />}
          <DialogFooter>
            <Button onClick={() => setCreatedKey(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
