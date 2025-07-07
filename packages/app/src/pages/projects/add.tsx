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
import { toast } from "sonner";
import { useCoreApi } from "../../contexts/CoreApi.tsx";
import { useWorkspace } from "../../contexts/Workspace.tsx";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../components/shadcn/Form.tsx";
import { projectApiTypes } from "@stackcore/shared";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/shadcn/Tabs.tsx";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "../../components/shadcn/Alert.tsx";

export default function AddProjectPage() {
  const navigate = useNavigate();

  const coreApi = useCoreApi();
  const { selectedWorkspaceId } = useWorkspace();
  const [isBusy, setIsBusy] = useState(false);

  const formSchema = z.object({
    name: z.string().min(1, "Project name is required").max(100),
    repoUrl: z.string().url("Invalid repository URL"),
    maxCodeCharPerSymbol: z.number().int().min(1, "Must be at least 1"),
    maxCodeCharPerFile: z.number().int().min(1, "Must be at least 1"),
    maxCharPerSymbol: z.number().int().min(1, "Must be at least 1"),
    maxCharPerFile: z.number().int().min(1, "Must be at least 1"),
    maxCodeLinePerSymbol: z.number().int().min(1, "Must be at least 1"),
    maxCodeLinePerFile: z.number().int().min(1, "Must be at least 1"),
    maxLinePerSymbol: z.number().int().min(1, "Must be at least 1"),
    maxLinePerFile: z.number().int().min(1, "Must be at least 1"),
    maxDependencyPerSymbol: z.number().int().min(1, "Must be at least 1"),
    maxDependencyPerFile: z.number().int().min(1, "Must be at least 1"),
    maxDependentPerSymbol: z.number().int().min(1, "Must be at least 1"),
    maxDependentPerFile: z.number().int().min(1, "Must be at least 1"),
    maxCyclomaticComplexityPerSymbol: z.number().int().min(
      1,
      "Must be at least 1",
    ),
    maxCyclomaticComplexityPerFile: z.number().int().min(
      1,
      "Must be at least 1",
    ),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    disabled: isBusy,
    defaultValues: {
      name: "",
      repoUrl: "",
      maxCodeCharPerSymbol: 1000,
      maxCodeCharPerFile: 50000,
      maxCharPerSymbol: 2000,
      maxCharPerFile: 100000,
      maxCodeLinePerSymbol: 50,
      maxCodeLinePerFile: 2000,
      maxLinePerSymbol: 100,
      maxLinePerFile: 4000,
      maxDependencyPerSymbol: 10,
      maxDependencyPerFile: 100,
      maxDependentPerSymbol: 20,
      maxDependentPerFile: 200,
      maxCyclomaticComplexityPerSymbol: 10,
      maxCyclomaticComplexityPerFile: 100,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!selectedWorkspaceId) {
      toast.error("No workspace selected");
      return;
    }

    setIsBusy(true);

    try {
      const { url, method, body } = projectApiTypes.prepareCreateProject({
        name: values.name,
        repoUrl: values.repoUrl,
        workspaceId: selectedWorkspaceId,
        maxCodeCharPerSymbol: values.maxCodeCharPerSymbol,
        maxCodeCharPerFile: values.maxCodeCharPerFile,
        maxCharPerSymbol: values.maxCharPerSymbol,
        maxCharPerFile: values.maxCharPerFile,
        maxCodeLinePerSymbol: values.maxCodeLinePerSymbol,
        maxCodeLinePerFile: values.maxCodeLinePerFile,
        maxLinePerSymbol: values.maxLinePerSymbol,
        maxLinePerFile: values.maxLinePerFile,
        maxDependencyPerSymbol: values.maxDependencyPerSymbol,
        maxDependencyPerFile: values.maxDependencyPerFile,
        maxDependentPerSymbol: values.maxDependentPerSymbol,
        maxDependentPerFile: values.maxDependentPerFile,
        maxCyclomaticComplexityPerSymbol:
          values.maxCyclomaticComplexityPerSymbol,
        maxCyclomaticComplexityPerFile: values.maxCyclomaticComplexityPerFile,
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

      const createResponseBody = await response
        .json() as projectApiTypes.CreateProjectResponse;

      toast.success("Project created");

      navigate(`/projects/${createResponseBody.id}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to create project");
    } finally {
      setIsBusy(false);
    }
  }

  const tabs: {
    key: string;
    title: string;
    description: string;
    fieldForms: {
      name: keyof z.infer<typeof formSchema>;
      label: string;
      description: string;
    }[];
  }[] = [
    {
      key: "characterLimits",
      title: "Character Limits",
      description:
        "These limits control the maximum number of characters allowed in symbols and files. Code characters refer to actual code content, while total characters include comments and whitespace.",
      fieldForms: [
        {
          name: "maxCodeCharPerSymbol",
          label: "Max Code Characters per Symbol",
          description: "Default: 1000",
        },
        {
          name: "maxCodeCharPerFile",
          label: "Max Code Characters per File",
          description: "Default: 50000",
        },
        {
          name: "maxCharPerSymbol",
          label: "Max Total Characters per Symbol",
          description: "Default: 2000",
        },
        {
          name: "maxCharPerFile",
          label: "Max Total Characters per File",
          description: "Default: 100000",
        },
      ],
    },
    {
      key: "lineLimits",
      title: "Line Limits",
      description:
        "These limits control the maximum number of lines allowed in symbols and files. Code lines refer to lines containing actual code, while total lines include blank lines and comments.",
      fieldForms: [
        {
          name: "maxCodeLinePerSymbol",
          label: "Max Code Lines per Symbol",
          description: "Default: 50",
        },
        {
          name: "maxCodeLinePerFile",
          label: "Max Code Lines per File",
          description: "Default: 2000",
        },
        {
          name: "maxLinePerSymbol",
          label: "Max Total Lines per Symbol",
          description: "Default: 100",
        },
        {
          name: "maxLinePerFile",
          label: "Max Total Lines per File",
          description: "Default: 4000",
        },
      ],
    },
    {
      key: "dependencyLimits",
      title: "Dependency Limits",
      description:
        "These limits control how many dependencies and dependents are allowed. Dependencies are what a symbol/file uses, while dependents are what uses a symbol/file.",
      fieldForms: [
        {
          name: "maxDependencyPerSymbol",
          label: "Max Dependencies per Symbol",
          description: "Default: 10",
        },
        {
          name: "maxDependencyPerFile",
          label: "Max Dependencies per File",
          description: "Default: 100",
        },
        {
          name: "maxDependentPerSymbol",
          label: "Max Dependents per Symbol",
          description: "Default: 20",
        },
        {
          name: "maxDependentPerFile",
          label: "Max Dependents per File",
          description: "Default: 200",
        },
      ],
    },
    {
      key: "complexityLimits",
      title: "Complexity Limits",
      description:
        "These limits control the maximum number of cyclomatic complexity allowed in symbols and files.",
      fieldForms: [
        {
          name: "maxCyclomaticComplexityPerSymbol",
          label: "Max Cyclomatic Complexity per Symbol",
          description: "Default: 10",
        },
        {
          name: "maxCyclomaticComplexityPerFile",
          label: "Max Cyclomatic Complexity per File",
          description: "Default: 100",
        },
      ],
    },
  ];

  return (
    <div className="grow flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-6">
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
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings />
              Project Configuration
            </CardTitle>
            <CardDescription>
              Configure your project settings and limits. These can be adjusted
              later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                {/* Basic Info */}
                <div className="space-y-4">
                  <div className="text-lg">Basic Information</div>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Project Name{" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="My Awesome Project"
                          />
                        </FormControl>
                        <FormDescription>
                          A unique name for your project within this workspace
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="repoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Repository URL{" "}
                          <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="https://github.com/user/repo"
                          />
                        </FormControl>
                        <FormDescription>
                          The URL of the repository for this project
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Configuration Tabs */}
                <Tabs defaultValue="characterLimits">
                  <TabsList>
                    <TabsTrigger value="characterLimits">
                      Characters
                    </TabsTrigger>
                    <TabsTrigger value="lineLimits">
                      Lines
                    </TabsTrigger>
                    <TabsTrigger value="dependencyLimits">
                      Dependencies
                    </TabsTrigger>
                    <TabsTrigger value="complexityLimits">
                      Complexity
                    </TabsTrigger>
                  </TabsList>

                  {tabs.map((tab) => (
                    <TabsContent
                      key={tab.key}
                      value={tab.key}
                      className="space-y-4"
                    >
                      <div className="space-y-4">
                        <div className="text-lg">
                          {tab.title}
                        </div>
                        <Alert>
                          <AlertTitle>{tab.title}</AlertTitle>
                          <AlertDescription>
                            {tab.description}
                          </AlertDescription>
                        </Alert>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {tab.fieldForms.map((fieldForm) => (
                            <FormField
                              key={fieldForm.name}
                              control={form.control}
                              name={fieldForm.name}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>
                                    {fieldForm.label}
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="1"
                                      {...field}
                                      onChange={(e) =>
                                        field.onChange(
                                          parseInt(e.target.value) || 1,
                                        )}
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    {fieldForm.description}
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>

                <div className="flex items-center gap-4">
                  <Button
                    type="submit"
                    disabled={isBusy || !selectedWorkspaceId}
                    className="grow"
                  >
                    {isBusy && <Loader className="animate-spin" />}
                    Create Project
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/projects")}
                    disabled={isBusy}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          Once created, you can manage your project settings and start
          development work. All limits can be adjusted later from the project
          settings.
        </div>
      </div>
    </div>
  );
}
