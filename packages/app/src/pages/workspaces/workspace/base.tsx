import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "react-router";
import { useEffect, useState } from "react";
import { useWorkspace, type Workspace } from "../../../contexts/Workspace.tsx";
import {
  Card,
  CardHeader,
  CardTitle,
} from "../../../components/shadcn/Card.tsx";
import { Badge } from "../../../components/shadcn/Badge.tsx";
import { Skeleton } from "../../../components/shadcn/Skeleton.tsx";
import { MemberApiTypes, WorkspaceApiTypes } from "@stackcore/core/responses";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader, Trash } from "lucide-react";
import { Button } from "../../../components/shadcn/Button.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../components/shadcn/Dialog.tsx";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../../components/shadcn/Form.tsx";
import { toast } from "../../../components/shadcn/hooks/use-toast.tsx";
import { Input } from "../../../components/shadcn/Input.tsx";
import { Separator } from "../../../components/shadcn/Separator.tsx";
import { useCoreApi } from "../../../contexts/CoreApi.tsx";
import z from "zod";
import { useForm } from "react-hook-form";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "../../../components/shadcn/Tabs.tsx";

export type WorkspacePageContext = {
  workspace: Workspace;
};

export default function WorkspacePage() {
  const navigate = useNavigate();
  const location = useLocation();

  const { workspaceId } = useParams<{ workspaceId: string }>();
  const workspaceContext = useWorkspace();
  const [workspace, setWorkspace] = useState<Workspace | undefined>(undefined);

  function getWorkspace() {
    if (!workspaceContext.isInitialized) {
      // wait for workspaces to be initialized
      return;
    }

    if (!workspaceId) {
      throw new Error("Workspace ID is required");
    }

    const workspace = workspaceContext.workspaces.find(
      (w) => w.id === parseInt(workspaceId),
    );

    if (!workspace) {
      navigate("/");
      return;
    }

    setWorkspace(workspace);
  }

  useEffect(() => {
    getWorkspace();
  }, [
    workspaceContext.isInitialized,
    workspaceContext.workspaces,
    workspaceId,
  ]);

  const [tab, setTab] = useState<"members" | "subscription">(getTabValue());

  function getTabValue() {
    if (location.pathname.endsWith("members")) {
      return "members";
    }
    return "subscription";
  }

  useEffect(() => {
    setTab(getTabValue());
  }, [location.pathname]);

  return (
    <div className="w-full max-w-7xl mx-auto mt-5 space-y-4">
      {workspace
        ? (
          <>
            {/* Workspace Header */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-1">
                    <span>Workspace: {workspace.name}</span>
                    {workspace.isTeam && (
                      <Badge variant="outline" className="ml-2">Team</Badge>
                    )}
                  </CardTitle>
                  {(workspace &&
                    workspace.role === MemberApiTypes.ADMIN_ROLE &&
                    workspace.isTeam) && (
                    <DeactivateWorkspaceDialog
                      workspace={workspace}
                    />
                  )}
                </div>
              </CardHeader>
            </Card>

            {/* Navigation Tabs */}
            <Card>
              <CardHeader>
                <Tabs value={tab}>
                  <TabsList>
                    <TabsTrigger value="members">
                      <Link to={`/workspaces/${workspaceId}/members`}>
                        Members
                      </Link>
                    </TabsTrigger>
                    <TabsTrigger value="subscription">
                      <Link to={`/workspaces/${workspaceId}/subscription`}>
                        Subscription
                      </Link>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
            </Card>

            {/* Outlet Content */}
            <Outlet context={{ workspace }} />
          </>
        )
        : (
          <div className="space-y-4">
            <Skeleton className="w-full h-32" />
            <Skeleton className="w-full h-20" />
            <Skeleton className="w-full h-40" />
          </div>
        )}
    </div>
  );
}

function DeactivateWorkspaceDialog(
  props: { workspace: Workspace },
) {
  const navigate = useNavigate();

  const coreApi = useCoreApi();
  const { refreshWorkspaces } = useWorkspace();

  const [isBusy, setIsBusy] = useState(false);

  const formSchema = z.object({
    name: z.string().refine(
      (value) => value === `deactivate ${props.workspace.name}`,
      {
        message: "must match for confirmation",
      },
    ),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
    disabled: isBusy,
  });

  async function onSubmit() {
    setIsBusy(true);
    try {
      const { url, method } = WorkspaceApiTypes.prepareDeactivateWorkspace(
        props.workspace.id,
      );

      const response = await coreApi.handleRequest(
        url,
        method,
      );

      if (!response.ok || response.status !== 204) {
        toast({
          title: "Error",
          description: "Failed to deactivate workspace",
          variant: "destructive",
        });
        setIsBusy(false);
        throw new Error("Failed to deactivate workspace");
      }

      await refreshWorkspaces();

      navigate("/");
    } catch (error) {
      console.error(error);
    } finally {
      setIsBusy(false);
    }
  }
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="destructive"
          size="icon"
        >
          <Trash />
        </Button>
      </DialogTrigger>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Deactivate workspace</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <div>
                You are about to deactivate the workspace{" "}
                <span className="font-bold">
                  {props.workspace.name}
                </span>.
              </div>
              <br />
              <span>
                All data associated with this workspace will be inaccessible
                (projects, manifests, reports...).
              </span>
              <Separator className="my-2" />
              <span className="font-bold">This action is irreversible.</span>
            </div>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    To confirm, type "
                    <span className="font-bold">
                      deactivate {props.workspace.name}
                    </span>
                    "
                  </FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isBusy} autoComplete="off" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2">
              <DialogClose asChild>
                <Button type="button" disabled={isBusy}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" variant="destructive" disabled={isBusy}>
                {isBusy && <Loader className="animate-spin" />}
                Deactivate
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
