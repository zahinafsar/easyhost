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
}: {
  title: string;
  description: string;
  triggerLabel: string;
  placeholder: string;
  isPending: boolean;
  onSubmit: (name: string) => Promise<unknown>;
  children?: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit(name.trim());
    setName("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
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
