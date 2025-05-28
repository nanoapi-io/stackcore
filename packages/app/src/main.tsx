/// <reference lib="dom" />

import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router";
import IndexPage from "./pages/index.tsx";
import { Toaster } from "./components/shadcn/Toaster.tsx";
import { ThemeProvider } from "./contexts/ThemeProvider.tsx";
import LoginPage from "./pages/login.tsx";
import { CoreApiProvider } from "./contexts/CoreApi.tsx";
import { WorkspaceProvider } from "./contexts/Workspace.tsx";
import AddWorkspacePage from "./pages/workspaces/add.tsx";
import WorkspaceBase from "./pages/workspaces/workspace/base.tsx";
import WorkspaceMembers from "./pages/workspaces/workspace/members.tsx";
import LoggedInLayout from "./layout/loggedIn.tsx";
import { RequireAuth } from "./guards/RequireAuth.tsx";
import WorkspaceSubscription from "./pages/workspaces/workspace/subscription.tsx";
import LoggedOutLayout from "./layout/loggedOut.tsx";

const router = createBrowserRouter([
  {
    element: <LoggedOutLayout />,
    children: [
      { path: "/login", Component: LoginPage },
    ],
  },

  {
    element: (
      <RequireAuth>
        <WorkspaceProvider>
          <LoggedInLayout />
        </WorkspaceProvider>
      </RequireAuth>
    ),
    children: [
      { index: true, Component: IndexPage },
      { path: "workspaces/add", element: <AddWorkspacePage /> },
      {
        path: "workspaces/:workspaceId",
        Component: WorkspaceBase,
        children: [
          { index: true, element: <Navigate to="members" replace /> },
          { path: "members", Component: WorkspaceMembers },
          {
            path: "subscription",
            Component: WorkspaceSubscription,
          },
        ],
      },
    ],
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
        <RouterProvider router={router} />
        <Toaster />
      </CoreApiProvider>
    </ThemeProvider>
  </StrictMode>,
);
