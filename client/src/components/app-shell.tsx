import { useEffect, useState } from "react";
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Coins, Database, FolderKanban, HardDrive, LogOut, Rocket, Settings, ShieldCheck, Sparkles, Users } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectSwitcher } from "@/components/project-switcher";
import { api, unwrap } from "@/lib/api";
import { projectsQuery } from "@/lib/queries";
import { clearSelectedProject, selectedProjectId, selectProject } from "@/lib/project";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { cn } from "@/lib/utils";
import { VerifyEmailScreen } from "@/pages/verify";

const navItems = [
  { to: "/apps", label: "Apps", icon: Rocket },
  { to: "/builder", label: "Builder", icon: Sparkles },
  { to: "/storage", label: "Storage", icon: HardDrive },
  { to: "/databases", label: "Databases", icon: Database },
  { to: "/members", label: "Members", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings },
];

export const AppShell = () => {
  const { user, isLoading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState(() => selectedProjectId());
  const needsVerification = !!user && !user.verified && !user.impersonatorId;
  const projects = useQuery({ ...projectsQuery().list(), enabled: !!user && !needsVerification });
  const routeAppId = location.pathname.startsWith("/apps/") ? location.pathname.split("/")[2] : undefined;
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
        <div className="mx-auto w-full max-w-6xl p-6 md:p-8">
          <Outlet />
        </div>
      );
    }
    return <VerifyEmailScreen email={user.email} />;
  }

  if (isLoading || (user && projects.isLoading)) {
    return (
      <div className="p-8">
        <Skeleton className="h-8 w-48" />
      </div>
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
    />
  );

  const projectNavItems = navItems;
  const projectReady = !!activeProject && selectedProjectId() === activeProject.id;

  if (/^\/builder\/[^/]+/.test(location.pathname)) {
    return <div className="h-dvh overflow-hidden">{projectReady && <Outlet key={activeProject?.id} />}</div>;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-muted/30 md:flex">
        <div className="flex h-14 items-center gap-2 border-b px-5 font-semibold">
          <img src="/logo.svg" alt="" className="h-6 w-auto" />
          EasyHost
          <span className="bg-foreground px-1.5 py-0.5 text-[10px] font-medium uppercase leading-none tracking-wide text-background">Beta</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {projectNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
                  isActive && "bg-muted font-medium text-foreground",
                )
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        {projectSwitcher}
        <div className="border-t p-3">
          <p className="truncate px-3 text-sm font-medium">{user.name}</p>
          <p className="truncate px-3 text-xs text-muted-foreground">{user.email}</p>
          <Button asChild variant="ghost" size="sm" className="mt-2 w-full justify-start">
            <NavLink to="/tokens">
              <Coins className="size-4" />
              AI Token
            </NavLink>
          </Button>
          {user.role === "ADMIN" && !user.impersonatorId && (
            <Button asChild variant="ghost" size="sm" className="mt-2 w-full justify-start">
              <NavLink to="/admin">
                <ShieldCheck className="size-4" />
                Admin
              </NavLink>
            </Button>
          )}
          <Button variant="ghost" size="sm" className="mt-2 w-full justify-start" onClick={logout}>
            <LogOut className="size-4" />
            Log out
          </Button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b md:hidden">{projectSwitcher}</div>
        <nav className="flex gap-1 overflow-x-auto border-b p-2 md:hidden">
          {projectNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn("flex shrink-0 items-center gap-2 px-3 py-1.5 text-sm", isActive && "bg-muted font-medium")
              }
            >
              <item.icon className="size-4" />
              {item.label}
            </NavLink>
          ))}
          <NavLink
            to="/tokens"
            className={({ isActive }) => cn("flex shrink-0 items-center gap-2 px-3 py-1.5 text-sm", isActive && "bg-muted font-medium")}
          >
            <Coins className="size-4" />
            AI Token
          </NavLink>
        </nav>
        {user.impersonatorId && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-red-50 px-6 py-2 text-sm text-red-900">
            <span>
              You are impersonating <strong>{user.email}</strong>. Everything you do here happens in their account.
            </span>
            <Button size="sm" variant="outline" disabled={stopImpersonating.isPending} onClick={() => stopImpersonating.mutate(undefined)}>
              Stop impersonating
            </Button>
          </div>
        )}
        <main className="mx-auto w-full max-w-6xl flex-1 p-6 md:p-8">
          {activeProject && selectedProjectId() === activeProject.id ? <Outlet key={activeProject.id} /> : null}
          {!activeProject && (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-2 text-center">
              <FolderKanban className="size-8 text-muted-foreground" />
              <p className="font-medium">Create your first project</p>
              <p className="max-w-sm text-sm text-muted-foreground">Use the New project button in the sidebar to create a workspace.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
