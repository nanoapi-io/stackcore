import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/shadcn/Card.tsx";
import { Input } from "../../components/shadcn/Input.tsx";
import { Button } from "../../components/shadcn/Button.tsx";
import { Briefcase, Loader, Users } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useCoreApi } from "../../contexts/CoreApi.tsx";
import { useWorkspace } from "../../contexts/Workspace.tsx";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../components/shadcn/Form.tsx";
import { workspaceApiTypes } from "@stackcore/shared";

export default function AddWorkspacePage() {
  const navigate = useNavigate();

  const coreApi = useCoreApi();
  const { refreshWorkspaces, setSelectedWorkspaceId } = useWorkspace();
  const [isBusy, setIsBusy] = useState(false);

  const formSchema = z.object({
    name: z.string().min(1).max(50),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    disabled: isBusy,
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsBusy(true);

    try {
      const { url, method, body } = workspaceApiTypes
        .prepareCreateWorkspace({
          name: values.name,
        });

      const response = await coreApi.handleRequest(url, method, body);

      if (!response.ok || response.status !== 201) {
        const { error } = await response.json();
        if (error && error === "workspace_already_exists") {
          form.setError("name", {
            message: "Workspace already exists",
          });
          setIsBusy(false);
          return;
        }

        throw new Error("Failed to create workspace");
      }

      toast.success("Workspace created");

      const workspace = await response
        .json() as workspaceApiTypes.CreateWorkspaceResponse;

      await refreshWorkspaces();

      setSelectedWorkspaceId(workspace.id);

      navigate(`/workspaces/${workspace.id}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to create workspace");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="grow flex items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        {/* Welcome Card */}
        <Card>
          <CardHeader className="flex flex-col items-center gap-2">
            <CardTitle className="flex flex-col items-center gap-2">
              <Briefcase />
              <div className="text-2xl">
                Create New Workspace
              </div>
            </CardTitle>
            <CardDescription>
              Workspaces help you organize your projects and collaborate with
              your team
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Form Card */}
        <Card>
          <CardHeader className="flex flex-col items-center gap-2">
            <CardTitle className="flex items-center gap-2">
              <Users />
              Workspace Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-5"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Workspace Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="My Awesome Workspace"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  disabled={isBusy}
                  className="w-full"
                >
                  {isBusy && <Loader className="animate-spin" />}
                  {isBusy ? "Creating..." : "Create Workspace"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Once created, you can invite team members and start organizing your
            projects.
          </p>
        </div>
      </div>
    </div>
  );
}
