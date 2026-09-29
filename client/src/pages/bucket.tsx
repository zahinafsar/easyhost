import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Copy, ExternalLink, Eye, EyeOff, File, Folder, KeyRound, Link2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { ConfirmButton } from "@/components/confirm-button";
import { CodeBlock } from "@/components/code-block";
import { api, unwrap, upload } from "@/lib/api";
import { storageQuery, userQuery } from "@/lib/queries";
import { formatBytes, formatDate } from "@/lib/format";
import { useApiMutation } from "@/hooks/use-api-mutation";

export const BucketPage = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [prefix, setPrefix] = useState("");
  const [revealed, setRevealed] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const { data, isLoading } = useQuery(storageQuery().objects(id, prefix));

  const invalidate = [storageQuery().all];

  const uploadFiles = useApiMutation({
    mutationFn: async (files: File[]) => {
      for (const file of files) {
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

  const rotateKeys = useApiMutation({
    mutationFn: () => unwrap(api.storage.buckets[":id"]["rotate-keys"].$post({ param: { id } })),
    invalidate,
    success: "Keys rotated. Update the credentials in your apps.",
  });

  const removeBucket = useApiMutation({
    mutationFn: () => unwrap(api.storage.buckets[":id"].$delete({ param: { id } })),
    invalidate: [storageQuery().all, userQuery().all],
    success: "Bucket deleted",
    onSuccess: () => navigate("/storage"),
  });

  const copy = async (value: string, message: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(message);
  };

  if (isLoading || !data) {
    return <Skeleton className="h-64 w-full" />;
  }

  const { bucket, objects } = data;
  const parentPrefix = prefix.split("/").slice(0, -2).join("/");
  const { s3 } = bucket;

  const credentials = [
    { label: "Endpoint", value: s3.endpoint, secret: false },
    { label: "Region", value: s3.region, secret: false },
    { label: "Bucket", value: s3.bucket, secret: false },
    { label: "Access key ID", value: s3.accessKeyId, secret: false },
    { label: "Secret access key", value: s3.secretAccessKey, secret: true },
  ];

  const displayValue = (credential: { value: string; secret: boolean }) => {
    if (credential.secret && !revealed) {
      return "*".repeat(credential.value.length);
    }
    return credential.value;
  };

  return (
    <>
      <PageHeader
        title={bucket.name}
        description={prefix || "Root"}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInput}
              type="file"
              multiple
              className="hidden"
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                event.target.value = "";
                if (files.length) {
                  uploadFiles.mutate(files);
                }
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
              <TableHead className="w-32" />
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
                      {object.url && (
                        <>
                          <Button variant="ghost" size="icon" asChild>
                            <a href={object.url} target="_blank" rel="noreferrer">
                              <ExternalLink className="size-4" />
                            </a>
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => copy(object.url as string, "Link copied")}>
                            <Link2 className="size-4" />
                          </Button>
                        </>
                      )}
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">S3 credentials</CardTitle>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setRevealed(!revealed)}>
              {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              {revealed ? "Hide" : "Show"}
            </Button>
            <ConfirmButton
              title="Rotate keys?"
              description="The current access key stops working immediately. Apps using it must be updated."
              confirmLabel="Rotate"
              onConfirm={() => rotateKeys.mutate(undefined)}
            >
              <Button variant="outline" size="sm" disabled={rotateKeys.isPending}>
                <KeyRound className="size-4" />
                Rotate keys
              </Button>
            </ConfirmButton>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {credentials.map((credential) => (
              <div key={credential.label} className="min-w-0 space-y-1.5">
                <p className="text-xs text-muted-foreground">{credential.label}</p>
                <div className="flex items-stretch border bg-muted/40">
                  <pre className="min-w-0 flex-1 overflow-x-auto p-3 font-mono text-xs">{displayValue(credential)}</pre>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-auto rounded-none border-l"
                    onClick={() => copy(credential.value, "Copied")}
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Works with any S3 client (AWS SDK, rclone, s3cmd, Cyberduck). Use path-style addressing. Files are publicly
            readable at {bucket.baseUrl}/&lt;key&gt;.
          </p>
          <CodeBlock
            code={`import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: "${s3.region}",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
});

await s3.send(
  new PutObjectCommand({ Bucket: "${s3.bucket}", Key: "avatars/me.png", Body: file, ContentType: "image/png" }),
);

const url = "${bucket.baseUrl}/avatars/me.png";`}
          />
        </CardContent>
      </Card>
    </>
  );
};
