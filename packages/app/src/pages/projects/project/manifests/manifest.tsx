import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { useCoreApi } from "../../../../contexts/CoreApi.tsx";
import {
  type auditManifestTypes,
  type dependencyManifestTypes,
  manifestApiTypes,
} from "@stackcore/shared";
import { Loader } from "lucide-react";
import DependencyVisualizer from "../../../../components/DependencyVisualizer/DependencyVisualizer.tsx";

export default function ProjectManifest() {
  const { manifestId } = useParams<{
    manifestId: string;
  }>();
  const coreApi = useCoreApi();

  const [isBusy, setIsBusy] = useState(true);

  const [manifestData, setManifestData] = useState<
    manifestApiTypes.GetManifestDetailsResponse | undefined
  >(undefined);

  const [dependencyManifest, setDependencyManifest] = useState<
    dependencyManifestTypes.DependencyManifest | undefined
  >(undefined);

  const [auditManifest, setAuditManifest] = useState<
    manifestApiTypes.GetManifestAuditResponse | undefined
  >(undefined);

  async function fetchManifest(url: string) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to fetch manifest");
    }
    const manifest = await response
      .json() as unknown as dependencyManifestTypes.DependencyManifest;

    return manifest;
  }

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
        const { url: manifestUrl, method: manifestMethod } = manifestApiTypes
          .prepareGetManifestDetails(manifestIdNum);
        const manifestResponse = await coreApi.handleRequest(
          manifestUrl,
          manifestMethod,
        );

        if (!manifestResponse.ok || manifestResponse.status !== 200) {
          throw new Error("Failed to fetch manifest");
        }

        const manifest = await manifestResponse
          .json() as manifestApiTypes.GetManifestDetailsResponse;
        setManifestData(manifest);

        const dependencyManifest = await fetchManifest(manifest.manifest);
        setDependencyManifest(dependencyManifest);

        // Fetch audit manifest
        const { url: auditUrl, method: auditMethod } = manifestApiTypes
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
      dependencyManifest={dependencyManifest as dependencyManifestTypes.DependencyManifest}
      auditManifest={auditManifest as auditManifestTypes.AuditManifest}
    />
  );
}
