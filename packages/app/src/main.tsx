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
import { WorkspaceProvider } from "./contexts/Workspace.tsx";
import AddWorkspacePage from "./pages/workspaces/add.tsx";
import WorkspacePage from "./pages/workspaces/workspace/index.tsx";
import ChangePlanPage from "./pages/workspaces/workspace/changePlan.tsx";

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
    path: "/workspaces/new",
    element: <AddWorkspacePage />,
  },
  {
    path: "/workspaces/:workspaceId",
    element: <WorkspacePage />,
  },
  {
    path: "/workspaces/:workspaceId/changePlan",
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
        <WorkspaceProvider>
          <RouterProvider router={router} />
          <Toaster />
        </WorkspaceProvider>
      </CoreApiProvider>
    </ThemeProvider>
  </StrictMode>,
);
