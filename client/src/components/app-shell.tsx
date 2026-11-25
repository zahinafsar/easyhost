import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, Database, FolderKanban, HardDrive, LogOut, Menu, Plus, Rocket, Settings, ShieldCheck, Sparkles, Users } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { Avatar } from "@/components/ui/avatar";
import { Banner } from "@/components/ui/alert";
import { Box } from "@/components/ui/box";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { Logo } from "@/components/ui/image";
import { Link, NavItem } from "@/components/ui/link";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Stack } from "@/components/ui/stack";
import { Strong, Text } from "@/components/ui/text";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { CreateProjectDialog, ProjectSwitcher } from "@/components/project-switcher";
import { api, unwrap } from "@/lib/api";
import { projectsQuery } from "@/lib/queries";
import { clearSelectedProject, selectedProjectId, selectProject } from "@/lib/project";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { VerifyEmailScreen } from "@/pages/verify";

const navItems = [
  { to: "/apps", label: "Apps", icon: Rocket },
  { to: "/builder", label: "Builder", icon: Sparkles },
  { to: "/storage", label: "Storage", icon: HardDrive },
  { to: "/databases", label: "Databases", icon: Database },
  { to: "/members", label: "Members", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings },
];

const sectionLabel = (pathname: string) => {
  const item = navItems.find((entry) => pathname === entry.to || pathname.startsWith(`${entry.to}/`));
  if (item) {
    return item.label;
  }
  if (pathname.startsWith("/subscription")) {
    return "Subscription";
  }
  if (pathname.startsWith("/invite")) {
    return "Invite";
  }
  return "Dashboard";
};

type ShellUser = {
  name: string;
  email: string;
  role: string;
  impersonatorId?: string | null;
};

const SidebarBody = ({
  user,
  projectSwitcher,
  onNavigate,
  onLogout,
}: {
  user: ShellUser;
  projectSwitcher: React.ReactNode;
  onNavigate?: () => void;
  onLogout: () => void;
}) => {
  return (
    <Stack gap={6} className="h-full">
      <Stack direction="row" align="center" justify="between" gap={2} className="px-1.5 pt-1">
        <Link to="/apps" variant="plain" aria-label="Reverhost home" onClick={onNavigate}>
          <Logo beta />
        </Link>
      </Stack>
      <Stack as="nav" gap={1} aria-label="Main">
        {navItems.map((item) => (
          <NavItem key={item.to} to={item.to} icon={item.icon} onClick={onNavigate}>
            {item.label}
          </NavItem>
        ))}
        <NavItem to="/subscription" icon={CreditCard} onClick={onNavigate}>
          Subscription
        </NavItem>
        {user.role === "ADMIN" && !user.impersonatorId && (
          <NavItem to="/admin" icon={ShieldCheck} onClick={onNavigate}>
            Admin
          </NavItem>
        )}
      </Stack>
      <Stack gap={3} className="mt-auto">
        {projectSwitcher}
        <Box className="rounded-2xl border border-border bg-surface-2 p-3">
          <Stack direction="row" align="center" gap={3}>
            <Avatar name={user.name} size="sm" />
            <Stack gap={0} className="flex-1">
              <Text as="span" size="sm" weight="medium" truncate>
                {user.name}
              </Text>
              <Text as="span" size="xs" tone="muted" truncate>
                {user.email}
              </Text>
            </Stack>
          </Stack>
          <Stack direction="row" align="center" justify="between" gap={2} className="mt-3">
            <ThemeToggle variant="segmented" />
            <Button variant="ghost" size="sm" onClick={onLogout}>
              <LogOut />
              Log out
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Stack>
  );
};

export const AppShell = () => {
  const { user, isLoading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState(() => selectedProjectId());
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const needsVerification = !!user && !user.verified && !user.impersonatorId;
  const projects = useQuery({ ...projectsQuery().list(), enabled: !!user && !needsVerification });
  let routeAppId: string | undefined;
  if (location.pathname.startsWith("/apps/")) {
    routeAppId = location.pathname.split("/")[2];
  }
  const activeProject =
    projects.data?.projects.find((project) => project.appIds.includes(routeAppId ?? "")) ??
    projects.data?.projects.find((project) => project.id === projectId) ??
    projects.data?.projects[0];
  const hasNoProjects = projects.data?.projects.length === 0;

  useEffect(() => {
    if (hasNoProjects && projectId) {
      clearSelectedProject();
      setProjectId(null);
      return;
    }
    if (!activeProject || activeProject.id === projectId) {
      return;
    }
    selectProject(activeProject.id);
    setProjectId(activeProject.id);
  }, [activeProject, hasNoProjects, projectId]);

  const openProject = (nextProjectId: string) => {
    selectProject(nextProjectId);
    setProjectId(nextProjectId);
    setMobileNavOpen(false);
    const section = location.pathname.split("/")[1];
    if (section === "apps") {
      navigate("/apps");
      return;
    }
    if (section === "storage" || section === "databases" || section === "builder") {
      navigate(`/${section}`);
    }
  };

  const createProject = useApiMutation({
    mutationFn: (name: string) => unwrap(api.projects.$post({ json: { name } })),
    invalidate: [projectsQuery().all],
    success: "Project created",
    onSuccess: ({ project }) => {
      selectProject(project.id);
      setProjectId(project.id);
      setMobileNavOpen(false);
      navigate("/apps");
    },
  });

  const stopImpersonating = useApiMutation({
    mutationFn: () => unwrap(api.auth["stop-impersonating"].$post()),
    onSuccess: () => {
      clearSelectedProject();
      window.location.href = "/admin";
    },
  });

  if (user && needsVerification) {
    if (location.pathname.startsWith("/invite/")) {
      return (
        <Container className="py-6 md:py-8">
          <Outlet />
        </Container>
      );
    }
    return <VerifyEmailScreen email={user.email} />;
  }

  if (isLoading || (user && projects.isLoading)) {
    return (
      <Box className="flex min-h-dvh gap-3 p-3">
        <Skeleton className="hidden h-[calc(100dvh-1.5rem)] w-64 shrink-0 rounded-3xl md:block" />
        <Stack gap={3} className="flex-1">
          <Skeleton className="h-14 w-full rounded-md" />
          <Skeleton className="h-[calc(100dvh-6rem)] w-full rounded-3xl" />
        </Stack>
      </Box>
    );
  }

  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  const projectSwitcher = (
    <ProjectSwitcher
      projects={projects.data?.projects ?? []}
      selectedId={activeProject?.id}
      isCreating={createProject.isPending}
      onSelect={openProject}
      onCreate={(name) => createProject.mutateAsync(name)}
      onCreateRequest={() => setCreateProjectOpen(true)}
    />
  );

  const projectReady = !!activeProject && selectedProjectId() === activeProject.id;

  if (/^\/builder\/[^/]+/.test(location.pathname)) {
    return <Box className="h-dvh overflow-hidden">{projectReady && <Outlet key={activeProject?.id} />}</Box>;
  }

  const breadcrumbs = [{ label: activeProject?.name ?? "No project" }, { label: sectionLabel(location.pathname) }];

  return (
    <Box className="flex min-h-dvh gap-3 p-2 md:p-3">
      <Box as="aside" className="sticky top-3 hidden h-[calc(100dvh-1.5rem)] w-64 shrink-0 overflow-y-auto rounded-3xl border border-border bg-surface p-3 scrollbar-thin md:block">
        <SidebarBody user={user} projectSwitcher={projectSwitcher} onLogout={logout} />
      </Box>
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="bg-surface p-3">
          <VisuallyHidden>
            <SheetHeader>
              <SheetTitle>Navigation</SheetTitle>
              <SheetDescription>Switch project and section</SheetDescription>
            </SheetHeader>
          </VisuallyHidden>
          <SidebarBody user={user} projectSwitcher={projectSwitcher} onNavigate={() => setMobileNavOpen(false)} onLogout={logout} />
        </SheetContent>
      </Sheet>
      <CreateProjectDialog open={createProjectOpen} onOpenChange={setCreateProjectOpen} isCreating={createProject.isPending} onCreate={(name) => createProject.mutateAsync(name)} />
      <Stack gap={3} className="min-w-0 flex-1">
        <Stack
          as="header"
          direction="row"
          align="center"
          justify="between"
          gap={3}
          className="sticky top-2 z-30 h-14 rounded-md border border-border bg-surface pr-2 pl-2 md:top-3 md:pl-5"
        >
          <Stack direction="row" align="center" gap={2} className="flex-1">
            <IconButton icon={Menu} label="Open navigation" variant="ghost" size="default" className="md:hidden" tooltip={false} onClick={() => setMobileNavOpen(true)} />
            <Stack direction="row" align="center" gap={2} className="h-9 min-w-0 rounded-md bg-surface-2 px-3.5 md:bg-transparent md:px-0">
              <FolderKanban className="size-4 shrink-0 text-muted-foreground" />
              <Breadcrumb items={breadcrumbs} />
            </Stack>
          </Stack>
          <Stack direction="row" align="center" gap={2}>
            <ThemeToggle className="md:hidden" />
          </Stack>
        </Stack>
        {user.impersonatorId && (
          <Banner
            variant="danger"
            className="rounded-2xl border"
            action={
              <Button size="sm" variant="secondary" loading={stopImpersonating.isPending} onClick={() => stopImpersonating.mutate(undefined)}>
                Stop impersonating
              </Button>
            }
          >
            You are impersonating <Strong>{user.email}</Strong>. Everything you do here happens in their account.
          </Banner>
        )}
        <Box as="main" className="min-w-0 flex-1 rounded-3xl border border-border bg-surface">
          <Container size="full" className="py-6 md:px-8 md:py-8">
            {projectReady && <Outlet key={activeProject.id} />}
            {!activeProject && (
              <EmptyState
                size="lg"
                icon={FolderKanban}
                title="Create your first project"
                action={
                  <Button onClick={() => setCreateProjectOpen(true)}>
                    <Plus />
                    New project
                  </Button>
                }
              />
            )}
          </Container>
        </Box>
      </Stack>
    </Box>
  );
};
