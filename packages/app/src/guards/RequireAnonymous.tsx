// auth/RequireAuth.tsx
import { Navigate } from "react-router";
import { useCoreApi } from "../contexts/CoreApi.tsx";

export const RequireAnonymous: React.FC<{ children: React.ReactNode }> = (
  { children },
) => {
  const { isAuthenticated } = useCoreApi();

  if (isAuthenticated) {
    // Redirect to index page
    return <Navigate to="/" replace />;
  }

  return children;
};
