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
import { ExternalLink, Loader, Terminal, Upload } from "lucide-react";
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

const formSchema = z.object({
  branch: z.string().optional(),
  commitSha: z.string().optional(),
  commitShaDate: z.string().optional(),
  manifest: z.instanceof(File).refine(
    (file) => file.type === "application/json",
    {
      message: "Only JSON files are allowed",
    },
  ),
});

export default function ProjectManifestsAdd() {
  const context = useOutletContext<ProjectPageContext>();
  const navigate = useNavigate();
  const coreApi = useCoreApi();

  const [isBusy, setIsBusy] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      branch: undefined,
      commitSha: undefined,
      commitShaDate: undefined,
      manifest: undefined,
    },
    disabled: isBusy,
  });

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsBusy(true);
    try {
      const manifestText = await data.manifest.text();
      const manifestJson = JSON.parse(manifestText);

      const payload: ManifestApiTypes.CreateManifestPayload = {
        projectId: context.project.id,
        branch: data.branch || null,
        commitSha: data.commitSha || null,
        commitShaDate: data.commitShaDate ? new Date(data.commitShaDate) : null,
        manifest: manifestJson,
      };

      const { url, method, body } = ManifestApiTypes.prepareCreateManifest(
        payload,
      );

      const response = await coreApi.handleRequest(url, method, body);

      if (!response.ok || response.status !== 201) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create manifest");
      }

      const createResponseBody = await response
        .json() as ManifestApiTypes.CreateManifestResponse;

      toast({
        title: "Success",
        description: "Manifest created successfully.",
      });

      navigate(
        `/projects/${context.project.id}/manifests/${createResponseBody.id}`,
      );
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
            <Terminal />
            CLI Alternative
          </CardTitle>
          <CardDescription>
            Prefer automation? Use our CLI tool instead
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTitle>Command Line Interface</AlertTitle>
            <AlertDescription>
              You can also upload manifests programmatically using our CLI tool,
              perfect for CI/CD pipelines.
              <Link
                to={`/projects/${context.project.id}/manifests/add/cli`}
              >
                <Button variant="link" size="sm">
                  <ExternalLink />
                  View CLI instructions
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload />
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
              className="space-y-4"
            >
              {/* Manifest File Upload */}
              <FormField
                control={form.control}
                name="manifest"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Manifest File
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept=".json"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          field.onChange(file);
                        }}
                        disabled={isBusy}
                      />
                    </FormControl>
                    <FormDescription>
                      Upload a JSON file containing your manifest data. Only
                      .json files are accepted.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Metadata Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              {/* Submit Buttons */}
              <div className="flex items-center gap-4">
                <Button type="submit" disabled={isBusy}>
                  {isBusy && <Loader className="animate-spin" />}
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
