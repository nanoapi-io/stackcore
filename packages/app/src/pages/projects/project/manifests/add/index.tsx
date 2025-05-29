import { useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../../../components/shadcn/Card.tsx";
import { Input } from "../../../../../components/shadcn/Input.tsx";
import { Button } from "../../../../../components/shadcn/Button.tsx";
import {
  CheckCircle,
  ExternalLink,
  Loader,
  Terminal,
  Upload,
} from "lucide-react";
import { toast } from "../../../../../components/shadcn/hooks/use-toast.tsx";
import { useCoreApi } from "../../../../../contexts/CoreApi.tsx";
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
} from "../../../../../components/shadcn/Form.tsx";
import { ManifestApiTypes } from "@stackcore/core/responses";
import type { ProjectPageContext } from "../../base.tsx";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "../../../../../components/shadcn/Alert.tsx";
import { Separator } from "../../../../../components/shadcn/Separator.tsx";

const formSchema = z.object({
  branch: z.string().optional(),
  commitSha: z.string().optional(),
  commitShaDate: z.string().optional(),
  version: z.number().min(1, "Version must be at least 1"),
  manifestFile: z.any().optional(),
});

export default function ProjectManifestsAdd() {
  const context = useOutletContext<ProjectPageContext>();
  const navigate = useNavigate();
  const coreApi = useCoreApi();

  const [isBusy, setIsBusy] = useState(false);
  const [manifestContent, setManifestContent] = useState<
    Record<string, unknown> | null
  >(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      branch: "",
      commitSha: "",
      commitShaDate: "",
      version: 1,
    },
    disabled: isBusy,
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setManifestContent(null);
      return;
    }

    // Validate file type
    if (file.type !== "application/json" && !file.name.endsWith(".json")) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JSON file only.",
        variant: "destructive",
      });
      event.target.value = "";
      setManifestContent(null);
      return;
    }

    // Read and parse JSON file
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = JSON.parse(e.target?.result as string);
        setManifestContent(content);
        toast({
          title: "File loaded",
          description: "JSON manifest file loaded successfully.",
        });
      } catch (error) {
        toast({
          title: "Invalid JSON",
          description: "The uploaded file contains invalid JSON.",
          variant: "destructive",
        });
        event.target.value = "";
        setManifestContent(null);
      }
    };
    reader.readAsText(file);
  };

  async function onSubmit(data: z.infer<typeof formSchema>) {
    if (!manifestContent) {
      toast({
        title: "Missing manifest",
        description: "Please upload a JSON manifest file.",
        variant: "destructive",
      });
      return;
    }

    setIsBusy(true);
    try {
      // Pass the date string directly - the API schema will transform it to Date
      const commitShaDate = data.commitShaDate || null;

      // Create the payload with the correct input types (before Zod transformation)
      const payload: {
        projectId: number;
        branch: string | null;
        commitSha: string | null;
        commitShaDate: string | null; // Input type before Zod transforms to Date
        version: number;
        manifest: Record<string, unknown>;
      } = {
        projectId: context.project.id,
        branch: data.branch || null,
        commitSha: data.commitSha || null,
        commitShaDate: commitShaDate,
        version: data.version,
        manifest: manifestContent,
      };

      const { url, method, body } = ManifestApiTypes.prepareCreateManifest(
        payload as any,
      );

      const response = await coreApi.handleRequest(url, method, body);

      if (!response.ok || response.status !== 201) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create manifest");
      }

      toast({
        title: "Success",
        description: "Manifest created successfully.",
      });

      navigate(`/projects/${context.project.id}/manifests`);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: error instanceof Error
          ? error.message
          : "Failed to create manifest",
        variant: "destructive",
      });
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto mt-5 space-y-4">
      {/* CLI Alternative */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            CLI Alternative
          </CardTitle>
          <CardDescription>
            Prefer automation? Use our CLI tool instead
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Terminal className="h-4 w-4" />
            <AlertTitle>Command Line Interface</AlertTitle>
            <AlertDescription className="flex items-center gap-2">
              You can also upload manifests programmatically using our CLI tool,
              perfect for CI/CD pipelines.
              <Link
                to={`/projects/${context.project.id}/manifests/add/cli`}
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                View CLI instructions <ExternalLink className="h-3 w-3" />
              </Link>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Separator />

      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Manifest
          </CardTitle>
          <CardDescription>
            Upload a JSON manifest file for project: {context.project.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6"
            >
              {/* Manifest File Upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Manifest File <span className="text-destructive">*</span>
                </label>
                <div className="flex items-center gap-4">
                  <Input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileUpload}
                    disabled={isBusy}
                    className="flex-1"
                  />
                  {manifestContent && (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">JSON loaded</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Upload a JSON file containing your manifest data. Only .json
                  files are accepted.
                </p>
              </div>

              {/* Metadata Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="version"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Version <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value) || 1)}
                          disabled={isBusy}
                        />
                      </FormControl>
                      <FormDescription>
                        Manifest version number (must be unique for this
                        project)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="branch"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branch</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., main, develop"
                          {...field}
                          disabled={isBusy}
                        />
                      </FormControl>
                      <FormDescription>
                        Git branch name (optional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="commitSha"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Commit SHA</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., a1b2c3d4..."
                          {...field}
                          disabled={isBusy}
                        />
                      </FormControl>
                      <FormDescription>
                        Git commit SHA (optional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="commitShaDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Commit Date</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                          disabled={isBusy}
                        />
                      </FormControl>
                      <FormDescription>
                        Git commit date (optional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Manifest Preview */}
              {manifestContent && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Manifest Preview
                  </label>
                  <textarea
                    value={JSON.stringify(manifestContent, null, 2)}
                    readOnly
                    className="w-full h-32 p-3 font-mono text-sm border rounded-md bg-muted"
                  />
                  <p className="text-sm text-muted-foreground">
                    Preview of the uploaded manifest content
                  </p>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center gap-4">
                <Button type="submit" disabled={isBusy || !manifestContent}>
                  {isBusy && <Loader className="h-4 w-4 animate-spin" />}
                  Create Manifest
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    navigate(`/projects/${context.project.id}/manifests`)}
                  disabled={isBusy}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
