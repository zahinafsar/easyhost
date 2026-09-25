import { createBrowserRouter } from "react-router";
import { AppShell } from "@/components/app-shell";
import { AuthLayout } from "@/components/auth-layout";
import { LoginPage } from "@/pages/login";
import { RegisterPage } from "@/pages/register";
import { ForgotPasswordPage } from "@/pages/forgot-password";
import { ResetPasswordPage } from "@/pages/reset-password";
import { VerifyPage } from "@/pages/verify";
import { OverviewPage } from "@/pages/overview";
import { AppsPage } from "@/pages/apps";
import { AppDetailPage } from "@/pages/app-detail";
import { StoragePage } from "@/pages/storage";
import { BucketPage } from "@/pages/bucket";
import { DatabasesPage } from "@/pages/databases";
import { DatabasePage } from "@/pages/database";
import { EmailPage } from "@/pages/email";
import { ApiKeysPage } from "@/pages/api-keys";
import { SettingsPage } from "@/pages/settings";

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
      { path: "/forgot-password", element: <ForgotPasswordPage /> },
      { path: "/reset-password", element: <ResetPasswordPage /> },
      { path: "/verify", element: <VerifyPage /> },
    ],
  },
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <OverviewPage /> },
      { path: "/apps", element: <AppsPage /> },
      { path: "/apps/:id", element: <AppDetailPage /> },
      { path: "/storage", element: <StoragePage /> },
      { path: "/storage/:id", element: <BucketPage /> },
      { path: "/databases", element: <DatabasesPage /> },
      { path: "/databases/:id", element: <DatabasePage /> },
      { path: "/email", element: <EmailPage /> },
      { path: "/api-keys", element: <ApiKeysPage /> },
      { path: "/settings", element: <SettingsPage /> },
    ],
  },
]);
