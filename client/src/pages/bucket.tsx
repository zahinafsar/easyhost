import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ExternalLink, Eye, EyeOff, File, Folder, KeyRound, Link2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  buttonVariants,
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Code,
  Grid,
  HStack,
  Icon,
  IconButton,
  Input,
  Link,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
  Text,
  UsageMeter,
} from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import { ConfirmButton } from "@/components/confirm-button";
import { CodeBlock } from "@/components/code-block";
import { SecretField } from "@/components/resources/secret-field";
import { api, unwrap, upload } from "@/lib/api";
import { storageQuery, userQuery } from "@/lib/queries";
import { formatBytes, formatDate } from "@/lib/format";
import { useApiMutation } from "@/hooks/use-api-mutation";

const usageDescription = (location: string, usage: { usedBytes: number; limitBytes: number } | undefined) => {
  if (!usage) {
    return location;
  }
  return `${location}, ${formatBytes(usage.usedBytes)} of ${formatBytes(usage.limitBytes)} used`;
};

export const BucketPage = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [prefix, setPrefix] = useState("");
  const [revealed, setRevealed] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const { data, isLoading } = useQuery(storageQuery().objects(id, prefix));
  const usage = useQuery(storageQuery().buckets());

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
    return (
      <Stack gap={6}>
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </Stack>
    );
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

  let revealLabel = "Show";
  let RevealIcon = Eye;
  if (revealed) {
    revealLabel = "Hide";
    RevealIcon = EyeOff;
  }

  return (
    <>
      <PageHeader
        title={bucket.name}
        description={usageDescription(prefix || "Root", usage.data)}
        action={
          <>
            <Input
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
            <Button onClick={() => fileInput.current?.click()} loading={uploadFiles.isPending}>
              {!uploadFiles.isPending && <Upload />}
              {uploadFiles.isPending ? "Uploading..." : "Upload"}
            </Button>
            <ConfirmButton
              title={`Delete ${bucket.name}?`}
              description="All files in this bucket will be permanently deleted."
              onConfirm={() => removeBucket.mutate(undefined)}
            >
              <IconButton icon={Trash2} label="Delete bucket" variant="destructive" size="default" tooltip={false} />
            </ConfirmButton>
          </>
        }
      />
      <Stack gap={6}>
        {usage.data && (
          <Card className="py-5">
            <CardContent className="px-5">
              <UsageMeter label="Storage used" used={usage.data.usedBytes} limit={usage.data.limitBytes} format={formatBytes} />
            </CardContent>
          </Card>
        )}
        <Table framed>
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
                  <HStack gap={2}>
                    <Icon icon={ChevronLeft} tone="muted" />
                    <Text as="span" size="sm" tone="muted">
                      Back
                    </Text>
                  </HStack>
                </TableCell>
              </TableRow>
            )}
            {!objects.length && <TableEmpty colSpan={4}>No files here yet.</TableEmpty>}
            {objects.map((object) => {
              const name = object.key.slice(prefix.length);
              if (object.isFolder) {
                return (
                  <TableRow key={object.key} className="cursor-pointer" onClick={() => setPrefix(object.key)}>
                    <TableCell colSpan={4}>
                      <HStack gap={2}>
                        <Icon icon={Folder} tone="muted" />
                        <Text as="span" weight="medium">
                          {name}
                        </Text>
                      </HStack>
                    </TableCell>
                  </TableRow>
                );
              }
              return (
                <TableRow key={object.key}>
                  <TableCell>
                    <HStack gap={2}>
                      <Icon icon={File} tone="muted" />
                      <Text as="span">{name}</Text>
                    </HStack>
                  </TableCell>
                  <TableCell>
                    <Text as="span" size="sm" tone="muted" tabular>
                      {formatBytes(object.size)}
                    </Text>
                  </TableCell>
                  <TableCell>
                    <Text as="span" size="sm" tone="muted">
                      {formatDate(object.lastModified)}
                    </Text>
                  </TableCell>
                  <TableCell>
                    <HStack gap={1} justify="end">
                      {object.url && (
                        <>
                          <Link href={object.url} variant="plain" inline={false} aria-label="Open file" className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
                            <ExternalLink />
                          </Link>
                          <IconButton icon={Link2} label="Copy link" onClick={() => copy(object.url as string, "Link copied")} />
                        </>
                      )}
                      <ConfirmButton title="Delete file?" description={object.key} onConfirm={() => removeObject.mutate(object.key)}>
                        <IconButton icon={Trash2} label="Delete file" tooltip={false} />
                      </ConfirmButton>
                    </HStack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <Card>
          <CardHeader>
            <CardTitle>S3 credentials</CardTitle>
            <CardDescription>Works with any S3 client (AWS SDK, rclone, s3cmd, Cyberduck). Use path-style addressing.</CardDescription>
            <CardAction>
              <HStack gap={2}>
                <Button variant="ghost" size="sm" onClick={() => setRevealed(!revealed)}>
                  <RevealIcon />
                  {revealLabel}
                </Button>
                <ConfirmButton
                  title="Rotate keys?"
                  description="The current access key stops working immediately. Apps using it must be updated."
                  confirmLabel="Rotate"
                  onConfirm={() => rotateKeys.mutate(undefined)}
                >
                  <Button variant="secondary" size="sm" disabled={rotateKeys.isPending}>
                    <KeyRound />
                    Rotate keys
                  </Button>
                </ConfirmButton>
              </HStack>
            </CardAction>
          </CardHeader>
          <CardContent>
            <Stack gap={5}>
              <Grid cols={2} gap={4}>
                {credentials.map((credential) => (
                  <SecretField key={credential.label} label={credential.label} display={displayValue(credential)} onCopy={() => copy(credential.value, "Copied")} />
                ))}
              </Grid>
              <Text size="sm" tone="muted">
                Files are publicly readable at <Code>{bucket.baseUrl}/&lt;key&gt;</Code>.
              </Text>
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
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </>
  );
};
