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
import { Loader, PencilRuler, Settings } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "../../components/shadcn/hooks/use-toast.tsx";
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
import { ProjectApiTypes } from "@stackcore/core/responses";

export default function AddProjectPage() {
  const navigate = useNavigate();

  const coreApi = useCoreApi();
  const { selectedWorkspaceId } = useWorkspace();
  const [isBusy, setIsBusy] = useState(false);

  const formSchema = z.object({
    name: z.string().min(1, "Project name is required").max(100),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    disabled: isBusy,
    defaultValues: {
      name: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!selectedWorkspaceId) {
      toast({
        title: "Error",
        description: "No workspace selected",
        variant: "destructive",
      });
      return;
    }

    setIsBusy(true);

    try {
      const { url, method, body } = ProjectApiTypes.prepareCreateProject({
        name: values.name,
        workspaceId: selectedWorkspaceId,
      });

      const response = await coreApi.handleRequest(url, method, body);

      if (!response.ok || response.status !== 201) {
        const { error } = await response.json();
        if (error && error === "project_already_exists") {
          form.setError("name", {
            message: "Project with this name already exists in the workspace",
          });
          setIsBusy(false);
          return;
        }

        throw new Error("Failed to create project");
      }

      toast({
        title: "Project created",
        description: "You can now start working on your project",
      });

      navigate(`/projects`);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      });
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
              <PencilRuler />
              <div className="text-2xl">
                Create New Project
              </div>
            </CardTitle>
            <CardDescription>
              Projects represent codebases where you can push and view manifests
              for specific commits
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Form Card */}
        <Card>
          <CardHeader className="flex flex-col items-center gap-2">
            <CardTitle className="flex items-center gap-2">
              <Settings />
              Project Details
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
                        Project Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="My Awesome Project"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={isBusy || !selectedWorkspaceId}
                  className="w-full"
                >
                  {isBusy && <Loader />}
                  Create Project
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Once created, you can manage your project settings and start
            development work.
          </p>
        </div>
      </div>
    </div>
  );
}
