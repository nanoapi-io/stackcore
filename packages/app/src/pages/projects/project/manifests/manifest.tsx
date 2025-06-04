import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { useCoreApi } from "../../../../contexts/CoreApi.tsx";
import { ManifestApiTypes } from "@stackcore/core/responses";
import type { DependencyManifest } from "@stackcore/core/manifest";
import { Loader } from "lucide-react";

export default function ProjectManifest() {
  const { manifestId } = useParams<{ manifestId: string }>();
  const coreApi = useCoreApi();

  const [isBusy, setIsBusy] = useState(true);

  const [manifestData, setManifestData] = useState<
    ManifestApiTypes.GetManifestDetailsResponse | undefined
  >(undefined);

  const [_dependencyManifest, setDependencyManifest] = useState<
    DependencyManifest | undefined
  >(undefined);

  const [auditManifest, setAuditManifest] = useState<
    ManifestApiTypes.GetManifestAuditResponse | undefined
  >(undefined);

  useEffect(() => {
    async function fetchData() {
      if (!manifestId) {
        setIsBusy(false);
        return;
      }

      setIsBusy(true);

      try {
        const manifestIdNum = parseInt(manifestId);

        // Fetch manifest details
        const { url: manifestUrl, method: manifestMethod } = ManifestApiTypes
          .prepareGetManifestDetails(manifestIdNum);
        const manifestResponse = await coreApi.handleRequest(
          manifestUrl,
          manifestMethod,
        );

        if (!manifestResponse.ok || manifestResponse.status !== 200) {
          throw new Error("Failed to fetch manifest");
        }

        const manifest = await manifestResponse.json();
        setManifestData(manifest);
        setDependencyManifest(manifest.manifest);

        // Fetch audit manifest
        const { url: auditUrl, method: auditMethod } = ManifestApiTypes
          .prepareGetManifestAudit(manifestIdNum);
        const auditResponse = await coreApi.handleRequest(
          auditUrl,
          auditMethod,
        );

        if (!auditResponse.ok || auditResponse.status !== 200) {
          throw new Error("Failed to fetch audit manifest");
        }

        const audit = await auditResponse.json();
        setAuditManifest(audit);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setIsBusy(false);
      }
    }

    fetchData();
  }, [manifestId]);

  if (isBusy) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="animate-spin mr-2" />
        <span>Loading manifest data...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto mt-5 space-y-4">
      <h1 className="text-2xl font-bold">Manifest #{manifestId}</h1>

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-2">Manifest Data</h2>
          <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
            {JSON.stringify(manifestData, null, 2)}
          </pre>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Audit Manifest</h2>
          <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
            {JSON.stringify(auditManifest, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
