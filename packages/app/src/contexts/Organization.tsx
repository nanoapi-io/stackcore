import { createContext, useContext, useState } from "react";
import { toast } from "../components/shadcn/hooks/use-toast.tsx";
import { useCoreApi } from "./CoreApi.tsx";

export const ADMIN_ROLE = "admin";
export const MEMBER_ROLE = "member";

export type Organization = {
  id: number;
  isTeam: boolean;
  name: string;
  role: typeof ADMIN_ROLE | typeof MEMBER_ROLE;
};

type OrganizationContextType = {
  isBusy: boolean;
  organizations: Organization[];
  selectedOrganizationId: number | undefined;
  setSelectedOrganizationId: (id: number | undefined) => void;
  refreshOrganizations: () => Promise<void>;
};

const initialState: OrganizationContextType = {
  isBusy: false,
  organizations: [],
  selectedOrganizationId: undefined,
  setSelectedOrganizationId: () => {},
  refreshOrganizations: () => Promise.resolve(),
};

const OrganizationContext = createContext<OrganizationContextType>(
  initialState,
);

export function OrganizationProvider(
  { children, ...props }: { children: React.ReactNode },
) {
  const coreApiContext = useCoreApi();

  const [isBusy, setIsBusy] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<
    number | undefined
  >(undefined);

  async function getAllOrganizations() {
    const limit = 100;
    let page = 1;

    const organizations: Organization[] = [];

    while (true) {
      const response = await coreApiContext.handleRequest(
        `/organizations?page=${page}&limit=${limit}`,
        "GET",
      );

      if (!response.ok || response.status !== 200) {
        throw new Error("Failed to get organizations");
      }

      const responseData = await response.json() as {
        results: Organization[];
        total: number;
      };

      organizations.push(...responseData.results);

      if (organizations.length >= responseData.total) {
        break;
      }

      page++;
    }

    const personalOrganizations = organizations.filter(
      (organization) => !organization.isTeam,
    ).sort((a, b) => a.name.localeCompare(b.name));
    const teamOrganizations = organizations.filter(
      (organization) => organization.isTeam,
    ).sort((a, b) => a.name.localeCompare(b.name));

    return [...personalOrganizations, ...teamOrganizations];
  }

  async function refreshOrganizations() {
    setIsBusy(true);
    try {
      const organizations = await getAllOrganizations();
      setOrganizations(organizations);

      if (organizations.length === 0) {
        setSelectedOrganizationId(undefined);
      } else {
        if (!selectedOrganizationId) {
          setSelectedOrganizationId(organizations[0].id);
        } else {
          const selectedOrganization = organizations.find(
            (organization) => organization.id === selectedOrganizationId,
          );
          if (!selectedOrganization) {
            setSelectedOrganizationId(organizations[0].id);
          }
        }
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to refresh organizations",
        variant: "destructive",
      });
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <OrganizationContext.Provider
      {...props}
      value={{
        isBusy,
        organizations,
        selectedOrganizationId,
        setSelectedOrganizationId,
        refreshOrganizations,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export const useOrganization = () => {
  const context = useContext(OrganizationContext);

  if (!context) {
    throw new Error("useOrganization must be used within OrganizationProvider");
  }

  return context;
};
