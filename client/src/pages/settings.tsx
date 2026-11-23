import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmButton } from "@/components/confirm-button";
import { PageHeader } from "@/components/page-header";
import { api, unwrap } from "@/lib/api";
import { projectsQuery } from "@/lib/queries";
import { clearSelectedProject, selectedProjectId, selectProject } from "@/lib/project";
import { useApiMutation } from "@/hooks/use-api-mutation";

export const SettingsPage = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery(projectsQuery().list());
  const project = data?.projects.find((item) => item.id === selectedProjectId());
  const [name, setName] = useState("");

  useEffect(() => {
    setName(project?.name ?? "");
  }, [project?.id, project?.name]);

  const rename = useApiMutation({
    mutationFn: () => unwrap(api.projects[":id"].$put({ param: { id: project?.id ?? "" }, json: { name: name.trim() } })),
    invalidate: [projectsQuery().all],
    success: "Project name updated",
  });

  const remove = useApiMutation({
    mutationFn: () => unwrap(api.projects[":id"].$delete({ param: { id: project?.id ?? "" } })),
    invalidate: [projectsQuery().all],
    success: "Project deleted",
    onSuccess: () => {
      const nextProject = data?.projects.find((item) => item.id !== project?.id);
      if (nextProject) {
        selectProject(nextProject.id);
        navigate("/apps");
        return;
      }
      clearSelectedProject();
      navigate("/");
    },
  });

  if (isLoading || !project) {
    return <Skeleton className="h-64 w-full" />;
  }

  const unchanged = name.trim() === project.name;

  if (project.role !== "owner") {
    return (
      <>
        <PageHeader title="Project settings" description={`Manage ${project.name} and its resources.`} />
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Owner only</CardTitle>
            <CardDescription>Only the project owner can rename or delete this project. You can leave it from the Members page.</CardDescription>
          </CardHeader>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Project settings" description={`Manage ${project.name} and its resources.`} />
      <div className="max-w-3xl space-y-8">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>General</CardTitle>
            <CardDescription>Update how this project appears in the dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                rename.mutate(undefined);
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="project-name">Project name</Label>
                <Input id="project-name" value={name} onChange={(event) => setName(event.target.value)} required />
                <p className="text-xs text-muted-foreground">App URLs stay the same when you rename this project.</p>
              </div>
              <Button type="submit" disabled={rename.isPending || !name.trim() || unchanged}>
                {rename.isPending ? "Saving..." : "Save changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-destructive/50 shadow-none">
          <CardHeader className="border-b border-destructive/30">
            <CardTitle>Danger zone</CardTitle>
            <CardDescription>Actions here permanently affect this entire project.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="font-medium">Delete this project</p>
              <p className="max-w-xl text-sm text-muted-foreground">
                Permanently delete all apps, deployments, domains, storage and files, and database.
              </p>
            </div>
            <ConfirmButton
              title={`Delete ${project.name}?`}
              description="Every service and all data in this project will be permanently deleted. This cannot be undone."
              confirmLabel="Delete project"
              confirmVariant="destructive"
              onConfirm={() => remove.mutate(undefined)}
            >
              <Button variant="destructive" disabled={remove.isPending}>
                <Trash2 className="size-4" />
                {remove.isPending ? "Deleting..." : "Delete project"}
              </Button>
            </ConfirmButton>
          </CardContent>
        </Card>
      </div>
    </>
  );
};
