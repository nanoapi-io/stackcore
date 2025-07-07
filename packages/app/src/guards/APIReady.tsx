// auth/RequireAuth.tsx
import { Navigate, useLocation } from "react-router";
import { useCoreApi } from "../contexts/CoreApi.tsx";

export const RequireAuth: React.FC<{ children: React.ReactNode }> = (
  { children },
) => {
  const { isAuthenticated } = useCoreApi();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to login page with current location as URL parameter
    const searchParams = new URLSearchParams();
    searchParams.set("from", location.pathname + location.search);
    const redirectUrl = `/login?${searchParams.toString()}`;
    return <Navigate to={redirectUrl} replace />;
  }

  return children;
};
