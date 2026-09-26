import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const CreateResourceDialog = ({
  title,
  description,
  triggerLabel,
  placeholder,
  isPending,
  onSubmit,
  children,
  usage,
}: {
  title: string;
  description: string;
  triggerLabel: string;
  placeholder: string;
  isPending: boolean;
  onSubmit: (name: string) => Promise<unknown>;
  children?: React.ReactNode;
  usage?: { count: number; limit: number };
}) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit(name.trim());
    setName("");
    setOpen(false);
  };

  const atLimit = !!usage && usage.count >= usage.limit;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-3">
        {usage && (
          <span className="text-sm text-muted-foreground">
            {usage.count} / {usage.limit}
          </span>
        )}
        <DialogTrigger asChild>
          <Button disabled={atLimit} title={atLimit ? `Limit of ${usage?.limit} reached` : undefined}>
            <Plus className="size-4" />
            {triggerLabel}
          </Button>
        </DialogTrigger>
      </div>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="resource-name">Name</Label>
            <Input
              id="resource-name"
              value={name}
              onChange={(event) => setName(event.target.value.toLowerCase())}
              placeholder={placeholder}
              autoFocus
              required
            />
            <p className="text-xs text-muted-foreground">Lowercase letters, numbers and dashes.</p>
          </div>
          {children}
          <DialogFooter>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
