import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/shadcn/Card.tsx";
import { Input } from "../../components/shadcn/Input.tsx";
import LoggedInLayout from "../../layout/loggedIn.tsx";
import { Button } from "../../components/shadcn/Button.tsx";
import { Loader } from "lucide-react";
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
import { WorkspaceApiTypes } from "@stackcore/core/responses";

export default function AddWorkspacePage() {
  const navigate = useNavigate();

  const coreApi = useCoreApi();
  const { refreshWorkspaces } = useWorkspace();
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
      const { url, method, body } = WorkspaceApiTypes
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

      toast({
        title: "Workspace created",
        description: "You can now manage your workspace",
      });

      const workspace = await response
        .json() as WorkspaceApiTypes.CreateWorkspaceResponse;

      await refreshWorkspaces();

      navigate(`/workspaces/${workspace.id}`);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to create workspace",
        variant: "destructive",
      });
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <LoggedInLayout>
      <Card className="mt-20 w-md mx-auto">
        <CardHeader>
          <CardTitle>Create new workspace</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                disabled={isBusy}
                className="flex items-center space-x-2"
              >
                {isBusy && <Loader className="animate-spin" />}
                <div>
                  Create
                </div>
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </LoggedInLayout>
  );
}
