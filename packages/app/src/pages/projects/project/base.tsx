import { Outlet, useNavigate, useParams } from "react-router";
import { useEffect, useState } from "react";
import { Skeleton } from "../../../components/shadcn/Skeleton.tsx";
import { ProjectApiTypes } from "@stackcore/coreApiTypes";
import { toast } from "sonner";
import { useCoreApi } from "../../../contexts/CoreApi.tsx";

export type ProjectPageContext = {
  project: ProjectApiTypes.GetProjectDetailsResponse;
};

export default function ProjectBase() {
  const navigate = useNavigate();
  const coreApi = useCoreApi();

  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<
    ProjectApiTypes.GetProjectDetailsResponse | undefined
  >(undefined);

  async function getProject() {
    if (!projectId) {
      throw new Error("Project ID is required");
    }

    try {
      // Use the new efficient project details endpoint
      const { url, method } = ProjectApiTypes.prepareGetProjectDetails(
        parseInt(projectId),
      );

      const response = await coreApi.handleRequest(url, method);

      if (!response.ok) {
        if (response.status === 400) {
          // Project not found or access denied
          navigate("/");
          return;
        }
        throw new Error("Failed to get project");
      }

      const projectData = await response
        .json() as ProjectApiTypes.GetProjectDetailsResponse;
      setProject(projectData);
    } catch (error) {
      console.error(error);
      toast.error("Failed to get project");
      navigate("/");
    }
  }

  useEffect(() => {
    getProject();
  }, [projectId]);

  if (project) {
    return <Outlet context={{ project }} />;
  } else {
    return (
      <div className="w-full max-w-7xl mx-auto mt-5 space-y-4">
        <Skeleton className="w-full h-32" />
        <Skeleton className="w-full h-20" />
        <Skeleton className="w-full h-40" />
      </div>
    );
  }
}
