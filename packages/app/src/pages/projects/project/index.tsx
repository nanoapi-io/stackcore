import {
  Link,
  Outlet,
  useLocation,
  useOutletContext,
  useParams,
} from "react-router";
import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
} from "../../../components/shadcn/Card.tsx";
import { Badge } from "../../../components/shadcn/Badge.tsx";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "../../../components/shadcn/Tabs.tsx";
import type { ProjectPageContext } from "./base.tsx";

export default function ProjectPage() {
  const context = useOutletContext<ProjectPageContext>();

  const location = useLocation();

  const { projectId } = useParams<{ projectId: string }>();

  const [tab, setTab] = useState<string>("manifests");

  function getTabValue(): string {
    if (location.pathname.endsWith("manifests")) {
      return "manifests";
    }
    return "manifests"; // Default to manifests for now
  }

  useEffect(() => {
    setTab(getTabValue());
  }, [location.pathname]);

  return (
    <div className="w-full max-w-7xl mx-auto mt-5 space-y-4">
      {/* Project Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Project: {context.project.name}
              <Badge variant="secondary">
                ID: {context.project.id}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                Created:{" "}
                {new Date(context.project.created_at).toLocaleDateString()}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Navigation Tabs */}
      <Card>
        <CardHeader>
          <Tabs value={tab}>
            <TabsList>
              <TabsTrigger value="manifests">
                <Link to={`/projects/${projectId}/manifests`}>
                  Manifests
                </Link>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
      </Card>

      {/* Outlet Content */}
      <Outlet context={context} />
    </div>
  );
}
