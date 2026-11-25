import { createBrowserRouter, Navigate } from "react-router";
import { AppShell } from "@/components/app-shell";
import { AuthLayout } from "@/components/auth-layout";
import { LoginPage } from "@/pages/login";
import { RegisterPage } from "@/pages/register";
import { ForgotPasswordPage } from "@/pages/forgot-password";
import { ResetPasswordPage } from "@/pages/reset-password";
import { AppsPage } from "@/pages/apps";
import { AppDetailPage } from "@/pages/app-detail";
import { StoragePage } from "@/pages/storage";
import { BucketPage } from "@/pages/bucket";
import { DatabasesPage } from "@/pages/databases";
import { DatabasePage } from "@/pages/database";
import { SettingsPage } from "@/pages/settings";
import { MembersPage } from "@/pages/members";
import { BuilderPage } from "@/pages/builder";
import { BuilderAppPage } from "@/pages/builder-app";
import { InvitePage } from "@/pages/invite";
import { AdminLayout } from "@/components/admin-layout";
import { AdminOverviewPage } from "@/pages/admin-overview";
import { AdminGrowthPage } from "@/pages/admin-growth";
import { AdminRevenuePage } from "@/pages/admin-revenue";
import { AdminBuildsPage } from "@/pages/admin-builds";
import { AdminAiPage } from "@/pages/admin-ai";
import { AdminResourcesPage } from "@/pages/admin-resources";
import { AdminUsersPage } from "@/pages/admin-users";
import { AdminUserPage } from "@/pages/admin-user";
import { AdminProjectsPage } from "@/pages/admin-projects";
import { AdminProjectPage } from "@/pages/admin-project";
import { AdminAuditPage } from "@/pages/admin-audit";
import { AdminCleanupPage } from "@/pages/admin-cleanup";
import { SubscriptionPage } from "@/pages/subscription";

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
      { path: "/forgot-password", element: <ForgotPasswordPage /> },
      { path: "/reset-password", element: <ResetPasswordPage /> },
    ],
  },
  {
    path: "/admin",
    element: <AdminLayout />,
    children: [
      { index: true, element: <Navigate to="/admin/overview" replace /> },
      { path: "overview", element: <AdminOverviewPage /> },
      { path: "growth", element: <AdminGrowthPage /> },
      { path: "revenue", element: <AdminRevenuePage /> },
      { path: "builds", element: <AdminBuildsPage /> },
      { path: "ai", element: <AdminAiPage /> },
      { path: "resources", element: <AdminResourcesPage /> },
      { path: "users", element: <AdminUsersPage /> },
      { path: "users/:id", element: <AdminUserPage /> },
      { path: "projects", element: <AdminProjectsPage /> },
      { path: "projects/:id", element: <AdminProjectPage /> },
      { path: "audit", element: <AdminAuditPage /> },
      { path: "cleanup", element: <AdminCleanupPage /> },
    ],
  },
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <Navigate to="/apps" replace /> },
      { path: "/apps", element: <AppsPage /> },
      { path: "/apps/:id", element: <AppDetailPage /> },
      { path: "/storage", element: <StoragePage /> },
      { path: "/storage/:id", element: <BucketPage /> },
      { path: "/databases", element: <DatabasesPage /> },
      { path: "/databases/:id", element: <DatabasePage /> },
      { path: "/builder", element: <BuilderPage /> },
      { path: "/builder/:id", element: <BuilderAppPage /> },
      { path: "/subscription", element: <SubscriptionPage /> },
      { path: "/members", element: <MembersPage /> },
      { path: "/settings", element: <SettingsPage /> },
      { path: "/invite/:token", element: <InvitePage /> },
    ],
  },
]);
