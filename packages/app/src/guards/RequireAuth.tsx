// auth/RequireAuth.tsx
import { Navigate, useLocation } from "react-router";
import { useCoreApi } from "../contexts/CoreApi.tsx";

export const RequireAuth: React.FC<{ children: React.ReactNode }> = (
  { children },
) => {
  const { isAuthenticated } = useCoreApi();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to login page, preserving the current location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};
