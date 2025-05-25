/// <reference lib="dom" />

import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import IndexPage from "./pages/index.tsx";
import { Toaster } from "./components/shadcn/Toaster.tsx";
import { ThemeProvider } from "./contexts/ThemeProvider.tsx";
import LoginPage from "./pages/login.tsx";
import { CoreApiProvider } from "./contexts/CoreApi.tsx";
import { RequireAuth } from "./guards/RequireAuth.tsx";
import { OrganizationProvider } from "./contexts/Organization.tsx";
import AddOrganizationPage from "./pages/organizations/add.tsx";
import OrganizationPage from "./pages/organizations/organization/index.tsx";
import ChangePlanPage from "./pages/organizations/organization/changePlan.tsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <RequireAuth>
        <IndexPage />
      </RequireAuth>
    ),
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/organizations/new",
    element: <AddOrganizationPage />,
  },
  {
    path: "/organizations/:organizationId",
    element: <OrganizationPage />,
  },
  {
    path: "/organizations/:organizationId/changePlan",
    element: <ChangePlanPage />,
  },
]);

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider>
      <CoreApiProvider>
        <OrganizationProvider>
          <RouterProvider router={router} />
          <Toaster />
        </OrganizationProvider>
      </CoreApiProvider>
    </ThemeProvider>
  </StrictMode>,
);
