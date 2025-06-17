import { useEffect, useState } from "react";
import { useCoreApi } from "../contexts/CoreApi.tsx";
import { useWorkspace } from "../contexts/Workspace.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/shadcn/Card.tsx";
import { Link } from "react-router";
import { Button } from "../components/shadcn/Button.tsx";
import { Badge } from "../components/shadcn/Badge.tsx";
import {
  FastForward,
  FolderOpen,
  Loader,
  Plus,
  Settings,
  Users,
} from "lucide-react";
import { ProjectApiTypes } from "@stackcore/core/responses";

type Project = ProjectApiTypes.GetProjectsResponse["results"][number];

export default function IndexPage() {
  const coreApi = useCoreApi();
  const { workspaces, selectedWorkspaceId, isInitialized } = useWorkspace();

  const [user, setUser] = useState<{ userId: number; email: string } | null>(
    coreApi.getUserFromToken(),
  );
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  useEffect(() => {
    setUser(coreApi.getUserFromToken());
  }, [coreApi.isAuthenticated]);

  useEffect(() => {
    if (isInitialized && selectedWorkspaceId) {
      loadRecentProjects();
    }
  }, [isInitialized, selectedWorkspaceId]);

  async function loadRecentProjects() {
    if (!selectedWorkspaceId) return;

    setIsLoadingProjects(true);
    try {
      const { url, method } = ProjectApiTypes.prepareGetProjects({
        page: 1,
        limit: 5,
        workspaceId: selectedWorkspaceId,
      });

      const response = await coreApi.handleRequest(url, method);
      if (response.ok) {
        const data = await response
          .json() as ProjectApiTypes.GetProjectsResponse;
        setRecentProjects(data.results || []);
      }
    } catch (error) {
      console.error("Failed to load recent projects:", error);
    } finally {
      setIsLoadingProjects(false);
    }
  }

  const personalWorkspaces = workspaces.filter((w) => !w.isTeam);
  const teamWorkspaces = workspaces.filter((w) => w.isTeam);

  return (
    <div className="w-full max-w-7xl mx-auto mt-5 space-y-4">
      {/* Welcome Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Welcome back, {user?.email} 👋
          </CardTitle>
          <CardDescription>
            Here's what's happening across your workspaces and projects
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1">
            <FastForward />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Link to="projects" className="grow">
            <Button
              variant="secondary"
              className="w-full h-20 flex flex-col gap-2"
            >
              <FolderOpen />
              View Projects
            </Button>
          </Link>
          <Link to="projects/add" className="grow">
            <Button
              variant="secondary"
              className="w-full h-20 flex flex-col gap-2"
            >
              <Plus />
              Create Project
            </Button>
          </Link>
          <Link to="workspaces/add" className="grow">
            <Button
              variant="secondary"
              className="w-full h-20 flex flex-col gap-2"
            >
              <Users />
              Create Workspace
            </Button>
          </Link>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Stats Cards */}
        <div className="flex flex-col gap-4">
          <Card className="grow flex flex-col justify-center items-center p-4">
            <CardTitle>
              {isLoadingProjects
                ? <Loader className="animate-spin" />
                : recentProjects.length}
            </CardTitle>
            <CardDescription>
              Projects in Current Workspace
            </CardDescription>
          </Card>
          <Card className="grow flex flex-col justify-center items-center p-4">
            <CardTitle>
              {workspaces.length}
            </CardTitle>
            <CardDescription>
              Total Workspaces
            </CardDescription>
          </Card>
          <Card className="grow flex flex-col justify-center items-center p-4">
            <CardTitle>
              {teamWorkspaces.length}
            </CardTitle>
            <CardDescription>
              Team Workspaces
            </CardDescription>
          </Card>
        </div>

        {/* Workspaces Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Your Workspaces</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[{
                title: "Personal Workspaces",
                badge: "Personal",
                workspaces: personalWorkspaces,
              }, {
                title: "Team Workspaces",
                badge: "Team",
                workspaces: teamWorkspaces,
              }].map(
                ({ title, badge, workspaces }) => {
                  return (
                    <div className="space-y-2" key={title}>
                      <CardDescription>
                        {title}
                      </CardDescription>
                      {workspaces.length === 0
                        ? (
                          <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
                            <Users />
                            <div className="flex flex-col items-center justify-center gap-1">
                              <div>
                                No {badge} workspaces yet
                              </div>
                              <div>
                                Start collaborating with your team today!
                              </div>
                            </div>
                            <Link to="/workspaces/add">
                              <Button>
                                Create Your First Workspace
                              </Button>
                            </Link>
                          </div>
                        )
                        : (
                          workspaces.map((workspace) => (
                            <div
                              key={workspace.id}
                              className="flex items-center justify-between p-2 border rounded-md"
                            >
                              <div className="flex items-center gap-2">
                                <span>{workspace.name}</span>
                                <Badge variant="secondary">{badge}</Badge>
                              </div>
                              <Link to={`/workspaces/${workspace.id}`}>
                                <Button variant="secondary" size="sm">
                                  <Settings />
                                </Button>
                              </Link>
                            </div>
                          ))
                        )}
                    </div>
                  );
                },
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="text-center text-sm text-muted-foreground">
        Need some help? Email us at:
        <Link to="mailto:support@nanapi.com?subject=Help with nanoapi dashboard">
          <Button
            variant="link"
            size="sm"
          >
            support@nanapi.com
          </Button>
        </Link>
      </div>
    </div>
  );
}
