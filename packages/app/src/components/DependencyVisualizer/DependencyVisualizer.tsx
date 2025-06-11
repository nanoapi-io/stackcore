import { useState } from "react";
import { useSearchParams } from "react-router";
import type {
  AuditManifest,
  DependencyManifest,
} from "@stackcore/core/manifest";
import { SidebarProvider, SidebarTrigger } from "../shadcn/Sidebar.tsx";
import { FileExplorerSidebar } from "./components/FileExplorerSidebar.tsx";
import BreadcrumbNav from "./components/BreadcrumNav.tsx";
import ProjectVisualizer from "./visualizers/ProjectVisualizer.tsx";
import FileVisualizer from "./visualizers/FileVisualizer.tsx";
import SymbolVisualizer from "./visualizers/SymbolVisualizer.tsx";

export interface VisualizerContext {
  manifestId: number;
  dependencyManifest: DependencyManifest;
  auditManifest: AuditManifest;
  highlightedCytoscapeRef: {
    filePath: string;
    symbolId: string | undefined;
  } | undefined;
}

export default function DependencyVisualizer(props: {
  manifestId: number;
  dependencyManifest: DependencyManifest;
  auditManifest: AuditManifest;
}) {
  const [searchParams] = useSearchParams();

  const [highlightedCytoscapeRef, setHighlightedCytoscapeRef] = useState<
    {
      filePath: string;
      symbolId: string | undefined;
    } | undefined
  >(undefined);

  return (
    <SidebarProvider
      defaultOpen={false}
      style={{ "--sidebar-width": "30rem" } as React.CSSProperties}
      // min-h-0 needed to prevent the sidebar
      // from growing to the height of the screen
      // within the parent container
      className="grow flex min-h-0"
    >
      <FileExplorerSidebar
        dependencyManifest={props.dependencyManifest}
        auditManifest={props.auditManifest}
        onHighlightInCytoscape={(node) => {
          if (!node.fileId) return;
          const newRef = {
            filePath: node.fileId,
            symbolId: node.symbolId,
          };
          // If the new ref is the same as the current ref, we un set it (unhighlight)
          if (
            highlightedCytoscapeRef?.filePath === newRef.filePath &&
            highlightedCytoscapeRef?.symbolId === newRef.symbolId
          ) {
            setHighlightedCytoscapeRef(undefined);
          } else {
            setHighlightedCytoscapeRef(newRef);
          }
        }}
        toDetails={(node) => {
          if (node.symbolId && node.fileId) {
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.set("fileId", node.fileId);
            newSearchParams.set("instanceId", node.symbolId);
            return `?${newSearchParams.toString()}`;
          } else if (node.fileId) {
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.set("fileId", node.fileId);
            newSearchParams.delete("instanceId");
            return `?${newSearchParams.toString()}`;
          } else {
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.delete("fileId");
            newSearchParams.delete("instanceId");
            return `?${newSearchParams.toString()}`;
          }
        }}
      />
      <div className="w-full flex flex-col overflow-hidden">
        <div className="flex items-center py-2 justify-between">
          <div className="flex items-center gap-2 ml-2">
            <SidebarTrigger />
            <BreadcrumbNav
              toProjectLink={() => {
                const newSearchParams = new URLSearchParams(searchParams);
                newSearchParams.delete("fileId");
                newSearchParams.delete("instanceId");
                return `?${newSearchParams.toString()}`;
              }}
              fileId={searchParams.get("fileId")}
              toFileIdLink={(fileId) => {
                const newSearchParams = new URLSearchParams(searchParams);
                newSearchParams.set("fileId", fileId);
                newSearchParams.delete("instanceId");
                return `?${newSearchParams.toString()}`;
              }}
              instanceId={searchParams.get("instanceId")}
              toInstanceIdLink={(fileId, instanceId) => {
                const newSearchParams = new URLSearchParams(searchParams);
                newSearchParams.set("fileId", fileId);
                newSearchParams.set("instanceId", instanceId);
                return `?${newSearchParams.toString()}`;
              }}
            />
          </div>
        </div>
        <div className="grow w-full border-t">
          {searchParams.get("fileId") && searchParams.get("instanceId")
            ? (
              <SymbolVisualizer
                fileId={searchParams.get("fileId")!}
                instanceId={searchParams.get("instanceId")!}
                manifestId={props.manifestId}
                dependencyManifest={props.dependencyManifest}
                auditManifest={props.auditManifest}
                highlightedCytoscapeRef={highlightedCytoscapeRef}
              />
            )
            : searchParams.get("fileId")
            ? (
              <FileVisualizer
                fileId={searchParams.get("fileId")!}
                manifestId={props.manifestId}
                dependencyManifest={props.dependencyManifest}
                auditManifest={props.auditManifest}
                highlightedCytoscapeRef={highlightedCytoscapeRef}
              />
            )
            : (
              <ProjectVisualizer
                manifestId={props.manifestId}
                dependencyManifest={props.dependencyManifest}
                auditManifest={props.auditManifest}
                highlightedCytoscapeRef={highlightedCytoscapeRef}
              />
            )}
        </div>
      </div>
    </SidebarProvider>
  );
}
