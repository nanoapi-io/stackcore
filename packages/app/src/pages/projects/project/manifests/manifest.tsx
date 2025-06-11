import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { useCoreApi } from "../../../../contexts/CoreApi.tsx";
import { ManifestApiTypes } from "@stackcore/core/responses";
import type {
  AuditManifest,
  DependencyManifest,
} from "@stackcore/core/manifest";
import { Loader } from "lucide-react";
import DependencyVisualizer from "../../../../components/DependencyVisualizer/DependencyVisualizer.tsx";

export default function ProjectManifest() {
  const { manifestId } = useParams<{
    manifestId: string;
  }>();
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
        <Loader className="animate-spin" />
        <span>Loading manifest data...</span>
      </div>
    );
  }

  return (
    <DependencyVisualizer
      manifestId={manifestData?.id || 0}
      dependencyManifest={manifestData?.manifest as DependencyManifest}
      auditManifest={auditManifest as AuditManifest}
    />
  );
}
