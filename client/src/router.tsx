import { createBrowserRouter, Navigate } from "react-router";
import { AppShell } from "@/components/app-shell";
import { AuthLayout } from "@/components/auth-layout";
import { LoginPage } from "@/pages/login";
import { RegisterPage } from "@/pages/register";
import { ForgotPasswordPage } from "@/pages/forgot-password";
import { ResetPasswordPage } from "@/pages/reset-password";
import { SchedulesPage } from "@/pages/schedules";
import { AppsPage } from "@/pages/apps";
import { AppDetailPage } from "@/pages/app-detail";
import { StoragePage } from "@/pages/storage";
import { BucketPage } from "@/pages/bucket";
import { DatabasesPage } from "@/pages/databases";
import { DatabasePage } from "@/pages/database";
import { EmailComingSoonPage } from "@/pages/email";
import { SettingsPage } from "@/pages/settings";
import { MembersPage } from "@/pages/members";
import { BuilderPage } from "@/pages/builder";
import { BuilderAppPage } from "@/pages/builder-app";
import { InvitePage } from "@/pages/invite";
import { AdminPage } from "@/pages/admin";
import { TokensPage } from "@/pages/tokens";

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
  { path: "/admin", element: <AdminPage /> },
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <Navigate to="/apps" replace /> },
      { path: "/schedules", element: <SchedulesPage /> },
      { path: "/apps", element: <AppsPage /> },
      { path: "/apps/:id", element: <AppDetailPage /> },
      { path: "/storage", element: <StoragePage /> },
      { path: "/storage/:id", element: <BucketPage /> },
      { path: "/databases", element: <DatabasesPage /> },
      { path: "/databases/:id", element: <DatabasePage /> },
      { path: "/email", element: <EmailComingSoonPage /> },
      { path: "/builder", element: <BuilderPage /> },
      { path: "/builder/:id", element: <BuilderAppPage /> },
      { path: "/tokens", element: <TokensPage /> },
      { path: "/members", element: <MembersPage /> },
      { path: "/settings", element: <SettingsPage /> },
      { path: "/invite/:token", element: <InvitePage /> },
    ],
  },
]);
