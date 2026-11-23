import { useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Project = { id: string; name: string };

export const ProjectSwitcher = ({
  projects,
  selectedId,
  isCreating,
  onSelect,
  onCreate,
}: {
  projects: Project[];
  selectedId?: string;
  isCreating: boolean;
  onSelect: (projectId: string) => void;
  onCreate: (name: string) => Promise<unknown>;
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const selectedProject = projects.find((project) => project.id === selectedId);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onCreate(name.trim());
    setName("");
    setCreateOpen(false);
  };

  return (
    <>
      <div className="space-y-2 border-t p-3">
        <PopoverPrimitive.Root open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverPrimitive.Trigger asChild>
            <button
              type="button"
              aria-label="Select project"
              className="flex h-10 w-full items-center gap-3 border bg-background px-3 text-left outline-none transition-colors hover:bg-muted/60 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
            >
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{selectedProject?.name ?? "No projects"}</span>
              <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${pickerOpen ? "rotate-180" : ""}`} />
            </button>
          </PopoverPrimitive.Trigger>
          <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
              align="start"
              side="top"
              sideOffset={8}
              className="z-50 w-[var(--radix-popover-trigger-width)] border bg-popover p-1 text-popover-foreground shadow-lg outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom-1 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-1"
            >
              <div role="listbox" aria-label="Projects" className="max-h-72 space-y-1 overflow-y-auto">
                {!projects.length && <p className="px-3 py-4 text-center text-sm text-muted-foreground">No projects yet</p>}
                {projects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    role="option"
                    aria-selected={project.id === selectedId}
                    className={`w-full truncate px-3 py-2 text-left text-sm font-medium outline-none transition-colors hover:bg-muted focus-visible:bg-muted ${project.id === selectedId ? "bg-muted" : ""}`}
                    onClick={() => {
                      onSelect(project.id);
                      setPickerOpen(false);
                    }}
                  >
                    {project.name}
                  </button>
                ))}
              </div>
              <div className="mt-2 border-t pt-2">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium outline-none transition-colors hover:bg-muted focus-visible:bg-muted"
                  onClick={() => {
                    setPickerOpen(false);
                    setCreateOpen(true);
                  }}
                >
                  <Plus className="size-4" />
                  Create project
                </button>
              </div>
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
      </div>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>New project</DialogTitle>
              <DialogDescription>Create a workspace for up to 2 apps, a database and storage.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="project-name">Project name</Label>
              <Input
                id="project-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="My next project"
                autoFocus
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isCreating || !name.trim()}>
                {isCreating ? "Creating..." : "Create project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
