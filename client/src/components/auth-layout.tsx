import { Link, Outlet } from "react-router";

export const AuthLayout = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4">
      <Link to="/" className="mb-8 flex items-center gap-2 text-lg font-semibold">
        <img src="/logo.svg" alt="" className="h-6 w-auto" />
        Reverhost
      </Link>
      <div className="w-full max-w-sm">
        <Outlet />
      </div>
    </div>
  );
};
