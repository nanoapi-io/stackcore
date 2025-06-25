import { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { useCoreApi } from "./CoreApi.tsx";
import { WorkspaceApiTypes } from "@stackcore/coreApiTypes";

export type Workspace =
  WorkspaceApiTypes.GetWorkspacesResponse["results"][number];

type WorkspaceContextType = {
  isBusy: boolean;
  workspaces: Workspace[];
  selectedWorkspaceId: number | undefined;
  setSelectedWorkspaceId: (id: number | undefined) => void;
  refreshWorkspaces: () => Promise<void>;
  isInitialized: boolean;
};

const initialState: WorkspaceContextType = {
  isBusy: false,
  workspaces: [],
  selectedWorkspaceId: undefined,
  setSelectedWorkspaceId: () => {},
  refreshWorkspaces: () => Promise.resolve(),
  isInitialized: false,
};

const WorkspaceContext = createContext<WorkspaceContextType>(
  initialState,
);

export function WorkspaceProvider(
  { children, ...props }: { children: React.ReactNode },
) {
  const coreApiContext = useCoreApi();

  const [isBusy, setIsBusy] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<
    number | undefined
  >(undefined);
  const [isInitialized, setIsInitialized] = useState(false);

  async function getAllWorkspaces() {
    const limit = 100;
    let page = 1;

    const workspaces: Workspace[] = [];

    while (true) {
      const { url, method } = WorkspaceApiTypes.prepareGetWorkspaces({
        page,
        limit,
      });
      const response = await coreApiContext.handleRequest(url, method);

      if (!response.ok || response.status !== 200) {
        throw new Error("Failed to get workspaces");
      }

      const responseData = await response
        .json() as WorkspaceApiTypes.GetWorkspacesResponse;

      workspaces.push(...responseData.results);

      if (workspaces.length >= responseData.total) {
        break;
      }

      page++;
    }

    const personalWorkspaces = workspaces.filter(
      (workspace) => !workspace.isTeam,
    ).sort((a, b) => a.name.localeCompare(b.name));
    const teamWorkspaces = workspaces.filter(
      (workspace) => workspace.isTeam,
    ).sort((a, b) => a.name.localeCompare(b.name));

    return [...personalWorkspaces, ...teamWorkspaces];
  }

  async function refreshWorkspaces() {
    setIsBusy(true);
    try {
      const workspaces = await getAllWorkspaces();
      setWorkspaces(workspaces);

      if (workspaces.length === 0) {
        setSelectedWorkspaceId(undefined);
      } else {
        if (!selectedWorkspaceId) {
          setSelectedWorkspaceId(workspaces[0].id);
        } else {
          const selectedWorkspace = workspaces.find(
            (workspace) => workspace.id === selectedWorkspaceId,
          );
          if (!selectedWorkspace) {
            setSelectedWorkspaceId(workspaces[0].id);
          }
        }
      }
      setIsInitialized(true);
    } catch (error) {
      console.error(error);
      toast.error("Failed to refresh workspaces");
    } finally {
      setIsBusy(false);
    }
  }

  useEffect(() => {
    if (!isInitialized) {
      refreshWorkspaces();
    }
  }, [isInitialized]);

  return (
    <WorkspaceContext.Provider
      {...props}
      value={{
        isBusy,
        workspaces,
        selectedWorkspaceId,
        setSelectedWorkspaceId,
        refreshWorkspaces,
        isInitialized,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }

  return context;
};
