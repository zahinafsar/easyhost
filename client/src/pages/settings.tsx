import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Lock, Trash2 } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Field, Form, FormActions, IconBadge, Input, Skeleton, Stack, Text } from "@/components/ui";
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
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  const unchanged = name.trim() === project.name;

  if (project.role !== "owner") {
    return (
      <>
        <PageHeader title="Settings" />
        <Card>
          <CardHeader className="grid-cols-[auto_1fr] items-center gap-x-4">
            <IconBadge icon={Lock} />
            <CardTitle>Owner only</CardTitle>
          </CardHeader>
        </Card>
      </>
    );
  }

  let saveLabel = "Save changes";
  if (rename.isPending) {
    saveLabel = "Saving...";
  }

  let deleteLabel = "Delete project";
  if (remove.isPending) {
    deleteLabel = "Deleting...";
  }

  return (
    <>
      <PageHeader title="Settings" />
      <Stack gap={6}>
        <Card>
          <CardHeader className="border-b">
            <CardTitle>General</CardTitle>
          </CardHeader>
          <CardContent>
            <Form onSubmit={() => rename.mutate(undefined)}>
              <Field label="Project name" htmlFor="project-name" className="max-w-md">
                <Input id="project-name" value={name} onChange={(event) => setName(event.target.value)} required />
              </Field>
              <FormActions align="start">
                <Button type="submit" loading={rename.isPending} disabled={!name.trim() || unchanged}>
                  {saveLabel}
                </Button>
              </FormActions>
            </Form>
          </CardContent>
        </Card>

        <Card className="border-destructive/40 shadow-none">
          <CardHeader className="border-b border-destructive/25">
            <CardTitle>Danger zone</CardTitle>
          </CardHeader>
          <CardContent>
            <Stack direction="responsive" gap={4} justify="between" className="md:items-center">
              <Text weight="medium">Delete this project</Text>
              <ConfirmButton
                title={`Delete ${project.name}?`}
                description="Every service and all data in this project will be permanently deleted. This cannot be undone."
                confirmLabel="Delete project"
                confirmVariant="destructive"
                onConfirm={() => remove.mutate(undefined)}
              >
                <Button variant="destructive" disabled={remove.isPending} className="shrink-0">
                  <Trash2 />
                  {deleteLabel}
                </Button>
              </ConfirmButton>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </>
  );
};
