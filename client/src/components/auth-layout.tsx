import { Link, Outlet } from "react-router";
import { Box } from "lucide-react";

export const AuthLayout = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
      <Link to="/" className="mb-8 flex items-center gap-2 text-lg font-semibold">
        <Box className="size-5" />
        EasyHost
      </Link>
      <div className="w-full max-w-sm">
        <Outlet />
      </div>
    </div>
  );
};
