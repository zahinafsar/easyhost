import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, File, Folder, Link2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { ConfirmButton } from "@/components/confirm-button";
import { CodeBlock } from "@/components/code-block";
import { api, unwrap, upload } from "@/lib/api";
import { storageQuery, userQuery } from "@/lib/queries";
import { API_ORIGIN, formatBytes, formatDate } from "@/lib/format";
import { useApiMutation } from "@/hooks/use-api-mutation";

export const BucketPage = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [prefix, setPrefix] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const { data, isLoading } = useQuery(storageQuery().objects(id, prefix));

  const invalidate = [storageQuery().all];

  const uploadFiles = useApiMutation({
    mutationFn: async (files: FileList) => {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        form.append("prefix", prefix);
        await upload(`/api/storage/buckets/${id}/objects`, form);
      }
    },
    invalidate,
    success: "Upload complete",
  });

  const removeObject = useApiMutation({
    mutationFn: (key: string) => unwrap(api.storage.buckets[":id"].objects.$delete({ param: { id }, query: { key } })),
    invalidate,
    success: "File deleted",
  });

  const togglePublic = useApiMutation({
    mutationFn: (isPublic: boolean) => unwrap(api.storage.buckets[":id"].$patch({ param: { id }, json: { isPublic } })),
    invalidate,
    success: "Access updated",
  });

  const removeBucket = useApiMutation({
    mutationFn: () => unwrap(api.storage.buckets[":id"].$delete({ param: { id } })),
    invalidate: [storageQuery().all, userQuery().all],
    success: "Bucket deleted",
    onSuccess: () => navigate("/storage"),
  });

  const copyLink = async (key: string) => {
    try {
      const { url } = await unwrap(api.storage.buckets[":id"].objects.url.$get({ param: { id }, query: { key } }));
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  if (isLoading || !data) {
    return <Skeleton className="h-64 w-full" />;
  }

  const { bucket, objects } = data;
  const parentPrefix = prefix.split("/").slice(0, -2).join("/");

  return (
    <>
      <PageHeader
        title={bucket.name}
        description={prefix || "Root"}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch id="public" checked={bucket.isPublic} onCheckedChange={(value) => togglePublic.mutate(value)} />
              <Label htmlFor="public">Public</Label>
            </div>
            <input
              ref={fileInput}
              type="file"
              multiple
              className="hidden"
              onChange={(event) => {
                if (event.target.files?.length) {
                  uploadFiles.mutate(event.target.files);
                }
                event.target.value = "";
              }}
            />
            <Button onClick={() => fileInput.current?.click()} disabled={uploadFiles.isPending}>
              <Upload className="size-4" />
              {uploadFiles.isPending ? "Uploading..." : "Upload"}
            </Button>
            <ConfirmButton
              title={`Delete ${bucket.name}?`}
              description="All files in this bucket will be permanently deleted."
              onConfirm={() => removeBucket.mutate(undefined)}
            >
              <Button variant="destructive" size="icon">
                <Trash2 className="size-4" />
              </Button>
            </ConfirmButton>
          </div>
        }
      />
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Modified</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {prefix && (
              <TableRow className="cursor-pointer" onClick={() => setPrefix(parentPrefix && `${parentPrefix}/`)}>
                <TableCell colSpan={4}>
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ChevronLeft className="size-4" />
                    Back
                  </span>
                </TableCell>
              </TableRow>
            )}
            {!objects.length && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                  No files here yet.
                </TableCell>
              </TableRow>
            )}
            {objects.map((object) => {
              const name = object.key.slice(prefix.length);
              if (object.isFolder) {
                return (
                  <TableRow key={object.key} className="cursor-pointer" onClick={() => setPrefix(object.key)}>
                    <TableCell colSpan={4}>
                      <span className="flex items-center gap-2 font-medium">
                        <Folder className="size-4 text-muted-foreground" />
                        {name}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              }
              return (
                <TableRow key={object.key}>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      <File className="size-4 text-muted-foreground" />
                      {name}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatBytes(object.size)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(object.lastModified)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => copyLink(object.key)}>
                        <Link2 className="size-4" />
                      </Button>
                      <ConfirmButton
                        title="Delete file?"
                        description={object.key}
                        onConfirm={() => removeObject.mutate(object.key)}
                      >
                        <Button variant="ghost" size="icon">
                          <Trash2 className="size-4" />
                        </Button>
                      </ConfirmButton>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Use from your app</CardTitle>
        </CardHeader>
        <CardContent>
          <CodeBlock
            code={`curl -X PUT ${API_ORIGIN}/api/v1/storage/${bucket.name}/avatars/me.png \\
  -H "Authorization: Bearer $EASYHOST_API_KEY" \\
  -H "Content-Type: image/png" \\
  --data-binary @me.png

curl ${API_ORIGIN}/api/v1/storage/${bucket.name}/avatars/me.png \\
  -H "Authorization: Bearer $EASYHOST_API_KEY" -o me.png`}
          />
        </CardContent>
      </Card>
    </>
  );
};
