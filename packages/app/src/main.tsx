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
import WorkspaceBase from "./pages/workspaces/workspace/index.tsx";
import WorkspaceMembers from "./pages/workspaces/workspace/members.tsx";
import LoggedInLayout from "./layout/loggedIn.tsx";
import { RequireAuth } from "./guards/RequireAuth.tsx";
import WorkspaceSubscription from "./pages/workspaces/workspace/subscription.tsx";
import LoggedOutLayout from "./layout/loggedOut.tsx";
import InvitationClaimPage from "./pages/invitations/claim.tsx";
import ProjectsPage from "./pages/projects/index.tsx";
import AddProjectPage from "./pages/projects/add.tsx";
import ProfilePage from "./pages/profile.tsx";
import ProjectBase from "./pages/projects/project/base.tsx";
import ProjectIndex from "./pages/projects/project/index.tsx";
import ProjectManifests from "./pages/projects/project/manifests.tsx";
import ProjectManifestsAdd from "./pages/projects/project/manifests/add/index.tsx";
import ProjectManifest from "./pages/projects/project/manifests/manifest.tsx";
import ProjectManifestsAddCli from "./pages/projects/project/manifests/add/cli.tsx";
import ProjectSettings from "./pages/projects/project/settings.tsx";

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
      { path: "profile", Component: ProfilePage },
      { path: "invitations/claim", Component: InvitationClaimPage },
      { path: "workspaces/add", Component: AddWorkspacePage },
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
      { path: "projects", Component: ProjectsPage },
      { path: "projects/add", Component: AddProjectPage },
      {
        path: "projects/:projectId",
        Component: ProjectBase,
        children: [
          {
            path: "",
            Component: ProjectIndex,
            children: [
              { index: true, element: <Navigate to="manifests" replace /> },
              { path: "manifests", Component: ProjectManifests },
              { path: "settings", Component: ProjectSettings },
            ],
          },
          { path: "manifests/add", Component: ProjectManifestsAdd },
          {
            path: "manifests/add/cli",
            Component: ProjectManifestsAddCli,
          },
          { path: "manifests/:manifestId", Component: ProjectManifest },
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
