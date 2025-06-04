import { useState } from "react";
import { useOutletContext } from "react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../../../components/shadcn/Card.tsx";
import { Button } from "../../../../../components/shadcn/Button.tsx";
import { CheckCircle, Copy, FileText, Terminal } from "lucide-react";
import { toast } from "sonner";
import type { ProjectPageContext } from "../../base.tsx";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "../../../../../components/shadcn/Alert.tsx";

export default function ProjectManifestsAddCli() {
  const context = useOutletContext<ProjectPageContext>();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (_error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const cliCommands = [
    {
      title: "Install the CLI",
      command: "npm install -g @stackcore/cli",
      description: "Install the StackCore CLI globally on your system",
    },
    {
      title: "Login to your account",
      command: "napi auth login",
      description: "Authenticate with your StackCore account",
    },
    {
      title: "Generate the manifest",
      command: "napi manifest generate",
      description: "Generate a manifest file with metadata",
    },
    {
      title: "Upload with commit info (optional)",
      command:
        `napi manifest push --project-id ${context.project.id} --file ./manifest.json --commit-sha $(git rev-parse HEAD) --branch $(git branch --show-current)`,
      description: "Automatically include Git commit information",
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto mt-5 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            CLI Instructions
          </CardTitle>
          <CardDescription>
            Upload manifests programmatically using our CLI tool for{" "}
            {context.project.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertTitle>Automate your workflow</AlertTitle>
            <AlertDescription>
              The CLI is perfect for CI/CD pipelines and automated deployments.
              It can automatically detect Git metadata and upload manifests as
              part of your build process.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            {cliCommands.map((cmd) => (
              <div key={cmd.title} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">{cmd.title}</h4>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted p-3 rounded text-sm font-mono">
                    {cmd.command}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      copyToClipboard(cmd.command)}
                  >
                    {copied
                      ? <CheckCircle className="h-4 w-4 text-green-600" />
                      : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {cmd.description}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
