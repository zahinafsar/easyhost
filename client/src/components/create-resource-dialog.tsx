import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Stack } from "@/components/ui/stack";
import { Text } from "@/components/ui/text";

export const CreateResourceDialog = ({
  title,
  triggerLabel,
  placeholder,
  isPending,
  onSubmit,
  children,
  usage,
}: {
  title: string;
  triggerLabel: string;
  placeholder: string;
  isPending: boolean;
  onSubmit: (name: string) => Promise<unknown>;
  children?: React.ReactNode;
  usage?: { count: number; limit: number };
}) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const submit = async () => {
    await onSubmit(name.trim());
    setName("");
    setOpen(false);
  };

  const atLimit = !!usage && usage.count >= usage.limit;
  let limitTitle: string | undefined;
  if (atLimit) {
    limitTitle = `Limit of ${usage?.limit} reached`;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Stack direction="row" align="center" gap={3}>
        {usage && (
          <Text as="span" size="sm" tone="muted" mono tabular>
            {usage.count} / {usage.limit}
          </Text>
        )}
        <DialogTrigger asChild>
          <Button disabled={atLimit} title={limitTitle}>
            <Plus />
            {triggerLabel}
          </Button>
        </DialogTrigger>
      </Stack>
      <DialogContent>
        <Form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <Field label="Name" htmlFor="resource-name">
            <Input
              id="resource-name"
              value={name}
              onChange={(event) => setName(event.target.value.toLowerCase())}
              placeholder={placeholder}
              autoFocus
              required
            />
          </Field>
          {children}
          <DialogFooter>
            <Button type="submit" loading={isPending} disabled={!name.trim()}>
              {isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
