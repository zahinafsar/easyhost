import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Field } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Stack } from "@/components/ui/stack";
import { Text } from "@/components/ui/text";

type Project = { id: string; name: string };

export const CreateProjectDialog = ({
  open,
  onOpenChange,
  isCreating,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isCreating: boolean;
  onCreate: (name: string) => Promise<unknown>;
}) => {
  const [name, setName] = useState("");

  const submit = async () => {
    await onCreate(name.trim());
    setName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <Form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription>Create a workspace for up to 2 apps, a database and storage.</DialogDescription>
          </DialogHeader>
          <Field label="Project name" htmlFor="project-name">
            <Input id="project-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="My next project" autoFocus required />
          </Field>
          <DialogFooter>
            <Button type="submit" loading={isCreating} disabled={!name.trim()}>
              {isCreating ? "Creating..." : "Create project"}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export const ProjectSwitcher = ({
  projects,
  selectedId,
  isCreating,
  onSelect,
  onCreate,
  onCreateRequest,
}: {
  projects: Project[];
  selectedId?: string;
  isCreating: boolean;
  onSelect: (projectId: string) => void;
  onCreate: (name: string) => Promise<unknown>;
  onCreateRequest?: () => void;
}) => {
  const [createOpen, setCreateOpen] = useState(false);
  const selectedProject = projects.find((project) => project.id === selectedId);

  const requestCreate = () => {
    if (onCreateRequest) {
      onCreateRequest();
      return;
    }
    setCreateOpen(true);
  };

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" block aria-label="Select project" className="h-14 justify-start gap-3 rounded-2xl px-2.5 has-[>svg]:px-2.5">
            <Avatar name={selectedProject?.name ?? "No projects"} size="sm" className="rounded-xl" />
            <Stack gap={0} className="flex-1 text-left">
              <Text as="span" size="base" weight="medium" truncate>
                {selectedProject?.name ?? "No projects"}
              </Text>
              <Text as="span" size="2xs" tone="muted">
                Project
              </Text>
            </Stack>
            <Icon icon={ChevronsUpDown} size="sm" tone="muted" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-(--radix-dropdown-menu-trigger-width) min-w-60">
          <DropdownMenuLabel>Projects</DropdownMenuLabel>
          {!projects.length && <DropdownMenuItem disabled>No projects yet</DropdownMenuItem>}
          {projects.map((project) => (
            <DropdownMenuItem key={project.id} aria-selected={project.id === selectedId} onSelect={() => onSelect(project.id)}>
              <Avatar name={project.name} size="xs" className="rounded-lg" />
              <Text as="span" size="base" weight="medium" truncate className="flex-1">
                {project.name}
              </Text>
              {project.id === selectedId && <Icon icon={Check} tone="success" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={requestCreate}>
            <Plus />
            Create project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {!onCreateRequest && <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} isCreating={isCreating} onCreate={onCreate} />}
    </>
  );
};
