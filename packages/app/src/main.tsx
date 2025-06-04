/// <reference lib="dom" />

import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router";
import IndexPage from "./pages/index.tsx";
import { Toaster } from "sonner";
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
import ProjectManifests from "./pages/projects/project/manifests/index.tsx";
import ProjectManifestsAdd from "./pages/projects/project/manifests/add.tsx.tsx";
import ProjectManifestsCliSetup from "./pages/projects/project/manifests/cliSetup.tsx";
import ProjectManifest from "./pages/projects/project/manifests/manifest.tsx";
import ProjectSettings from "./pages/projects/project/settings.tsx";
import type { BreadcrumbHandle } from "./components/AutoBreadcrumb.tsx";

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
    handle: {
      breadcrumb: {
        title: "Dashboard",
        href: "/",
      },
    } satisfies BreadcrumbHandle,
    children: [
      {
        index: true,
        Component: IndexPage,
      },
      {
        path: "profile",
        Component: ProfilePage,
        handle: {
          breadcrumb: {
            title: "Profile",
            href: "/profile",
          },
        } satisfies BreadcrumbHandle,
      },
      { path: "invitations/claim", Component: InvitationClaimPage },
      {
        path: "workspaces/add",
        Component: AddWorkspacePage,
        handle: {
          breadcrumb: {
            title: "Add Workspace",
            href: "/workspaces/add",
          },
        } satisfies BreadcrumbHandle,
      },
      {
        path: "workspaces/:workspaceId",
        Component: WorkspaceBase,
        handle: {
          breadcrumb: {
            title: (params) => `Workspace ${params.workspaceId}`,
            href: (params) => `/workspaces/${params.workspaceId}`,
          },
        } satisfies BreadcrumbHandle,
        children: [
          { index: true, element: <Navigate to="members" replace /> },
          {
            path: "members",
            Component: WorkspaceMembers,
            handle: {
              breadcrumb: {
                title: "Members",
                href: (params) => `/workspaces/${params.workspaceId}/members`,
              },
            } satisfies BreadcrumbHandle,
          },
          {
            path: "subscription",
            Component: WorkspaceSubscription,
            handle: {
              breadcrumb: {
                title: "Subscription",
                href: (params) =>
                  `/workspaces/${params.workspaceId}/subscription`,
              },
            } satisfies BreadcrumbHandle,
          },
        ],
      },
      {
        path: "projects",
        handle: {
          breadcrumb: {
            title: "Projects",
            href: "/projects",
          },
        } satisfies BreadcrumbHandle,
        children: [
          {
            index: true,
            Component: ProjectsPage,
          },
          {
            path: "add",
            Component: AddProjectPage,
            handle: {
              breadcrumb: {
                title: "Add Project",
                href: "/projects/add",
              },
            } satisfies BreadcrumbHandle,
          },
          {
            path: ":projectId",
            Component: ProjectBase,
            handle: {
              breadcrumb: {
                title: (params) => `Project ${params.projectId}`,
                href: (params) => `/projects/${params.projectId}`,
              },
            } satisfies BreadcrumbHandle,
            children: [
              {
                path: "",
                Component: ProjectIndex,
                children: [
                  { index: true, element: <Navigate to="manifests" replace /> },
                  {
                    path: "manifests",
                    handle: {
                      breadcrumb: {
                        title: "Manifests",
                        href: (params) =>
                          `/projects/${params.projectId}/manifests`,
                      },
                    } satisfies BreadcrumbHandle,
                    children: [
                      {
                        index: true,
                        Component: ProjectManifests,
                      },
                      {
                        path: "add",
                        Component: ProjectManifestsAdd,
                        handle: {
                          breadcrumb: {
                            title: "Add Manifest",
                            href: (params) =>
                              `/projects/${params.projectId}/manifests/add`,
                          },
                        } satisfies BreadcrumbHandle,
                      },
                      {
                        path: "cliSetup",
                        Component: ProjectManifestsCliSetup,
                        handle: {
                          breadcrumb: {
                            title: "CLI Setup",
                            href: (params) =>
                              `/projects/${params.projectId}/manifests/add/cli`,
                          },
                        } satisfies BreadcrumbHandle,
                      },
                    ],
                  },
                  {
                    path: "settings",
                    Component: ProjectSettings,
                    handle: {
                      breadcrumb: {
                        title: "Settings",
                        href: (params) =>
                          `/projects/${params.projectId}/settings`,
                      },
                    } satisfies BreadcrumbHandle,
                  },
                ],
              },

              {
                path: "manifests/:manifestId",
                Component: ProjectManifest,
                handle: {
                  breadcrumb: {
                    title: (params) => `Manifest ${params.manifestId}`,
                    href: (params) =>
                      `/projects/${params.projectId}/manifests/${params.manifestId}`,
                  },
                } satisfies BreadcrumbHandle,
              },
            ],
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
        <Toaster position="top-right" closeButton richColors />
      </CoreApiProvider>
    </ThemeProvider>
  </StrictMode>,
);
