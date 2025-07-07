import { useEffect, useRef, useState } from "react";
import Controls from "../components/controls/Controls.tsx";
import GraphDepthExtension from "../components/controls/ControlExtensions/GraphDepthExtension.tsx";
import SymbolContextMenu from "../components/contextMenu/SymbolContextMenu.tsx";
import { useNavigate, useSearchParams } from "react-router";
import type { VisualizerContext } from "../DependencyVisualizer.tsx";
import SymbolDetailsPane from "../components/detailsPanes/SymbolDetailsPane.tsx";
import { useTheme } from "../../../contexts/ThemeProvider.tsx";
import type {
  auditManifestTypes,
  dependencyManifestTypes,
} from "@stackcore/shared";
import { SymbolDependencyVisualizer } from "../cytoscape/symbolDependencyVisualizer/index.ts";

export default function SymbolVisualizer(
  props: VisualizerContext & {
    fileId: string;
    instanceId: string;
  },
) {
  const navigate = useNavigate();

  const { theme } = useTheme();

  const [searchParams, setSearchParams] = useSearchParams();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [busy, setBusy] = useState<boolean>(true);
  const [symbolVisualizer, setSymbolVisualizer] = useState<
    SymbolDependencyVisualizer | undefined
  >(undefined);

  const dependencyDepthFromUrl =
    (searchParams.get("dependencyDepth") || undefined) as number | undefined;
  const dependentDepthFromUrl =
    (searchParams.get("dependentDepth") || undefined) as number | undefined;

  const [dependencyDepth, setDependencyDepth] = useState<number>(
    dependencyDepthFromUrl || 3,
  );
  const [dependentDepth, setDependentDepth] = useState<number>(
    dependentDepthFromUrl || 0,
  );

  function handleDependencyDepthChange(depth: number) {
    searchParams.set("dependencyDepth", depth.toString());
    setSearchParams(searchParams);
    setDependencyDepth(depth);
    // TODO do something with the symbolVisualizer
  }

  function handleDependentDepthChange(depth: number) {
    searchParams.set("dependentDepth", depth.toString());
    setSearchParams(searchParams);
    setDependentDepth(depth);
    // TODO do something with the symbolVisualizer
  }

  const [contextMenu, setContextMenu] = useState<
    {
      position: { x: number; y: number };
      fileDependencyManifest:
        dependencyManifestTypes.DependencyManifest[string];
      symbolDependencyManifest:
        dependencyManifestTypes.DependencyManifest[string]["symbols"][string];
    } | undefined
  >(undefined);

  const [detailsPane, setDetailsPane] = useState<
    {
      manifestId: number;
      fileDependencyManifest:
        dependencyManifestTypes.DependencyManifest[string];
      symbolDependencyManifest:
        dependencyManifestTypes.DependencyManifest[string]["symbols"][string];
      fileAuditManifest: auditManifestTypes.AuditManifest[string];
      symbolAuditManifest:
        auditManifestTypes.AuditManifest[string]["symbols"][string];
    } | undefined
  >(undefined); // Hook to update highlight node in the graph

  // On mount useEffect
  useEffect(() => {
    setBusy(true);

    if (!props.fileId || !props.instanceId) {
      return;
    }

    const symbolVisualizer = new SymbolDependencyVisualizer(
      containerRef.current as HTMLElement,
      props.fileId,
      props.instanceId,
      dependencyDepth,
      dependentDepth,
      props.dependencyManifest,
      props.auditManifest,
      {
        theme: theme,
        onAfterNodeRightClick: (value: {
          position: { x: number; y: number };
          filePath: string;
          symbolId: string;
        }) => {
          const fileDependencyManifest =
            props.dependencyManifest[value.filePath];
          const symbolDependencyManifest =
            fileDependencyManifest.symbols[value.symbolId];
          setContextMenu({
            position: value.position,
            fileDependencyManifest,
            symbolDependencyManifest,
          });
        },
        onAfterNodeDblClick: (filePath: string, symbolId: string) => {
          const urlEncodedFileName = encodeURIComponent(
            filePath,
          );
          const urlEncodedSymbolId = encodeURIComponent(
            symbolId,
          );
          const urlEncodedSymbolName =
            `/${urlEncodedFileName}/${urlEncodedSymbolId}`;

          navigate(urlEncodedSymbolName);
        },
      },
    );

    setSymbolVisualizer(symbolVisualizer);

    setBusy(false);

    // Cleanup on unmount
    return () => {
      symbolVisualizer?.cy.destroy();
      setSymbolVisualizer(undefined);
    };
  }, [
    props.dependencyManifest,
    props.auditManifest,
    props.fileId,
    props.instanceId,
    dependencyDepth,
    dependentDepth,
  ]);

  useEffect(() => {
    if (symbolVisualizer) {
      if (props.highlightedCytoscapeRef) {
        symbolVisualizer.highlightNode(props.highlightedCytoscapeRef);
      } else {
        symbolVisualizer.unhighlightNodes();
      }
    }
  }, [props.highlightedCytoscapeRef]);

  // Hook to update the theme in the graph
  useEffect(() => {
    if (symbolVisualizer) {
      symbolVisualizer.updateTheme(theme);
    }
  }, [theme]);

  return (
    <div className="relative w-full h-full">
      {/* This is the container for Cytoscape */}
      {/* It is important to set the width and height to 100% */}
      {/* Otherwise, Cytoscape will not render correctly */}
      <div ref={containerRef} className="absolute w-full h-full z-10" />

      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-20">
        <Controls
          busy={busy}
          cy={symbolVisualizer?.cy}
          onLayout={() => symbolVisualizer?.layoutGraph(symbolVisualizer.cy)}
        >
          <GraphDepthExtension
            busy={busy}
            dependencyState={{
              depth: dependencyDepth,
              setDepth: handleDependencyDepthChange,
            }}
            dependentState={{
              depth: dependentDepth,
              setDepth: handleDependentDepthChange,
            }}
          />
        </Controls>
      </div>

      <SymbolContextMenu
        context={contextMenu}
        onClose={() => setContextMenu(undefined)}
        onOpenDetails={(filePath, symbolId) => {
          const fileDependencyManifest = props.dependencyManifest[filePath];
          const symbolDependencyManifest =
            fileDependencyManifest.symbols[symbolId];
          const fileAuditManifest = props.auditManifest[filePath];
          const symbolAuditManifest = fileAuditManifest.symbols[symbolId];
          setDetailsPane({
            manifestId: props.manifestId,
            fileDependencyManifest,
            symbolDependencyManifest,
            fileAuditManifest,
            symbolAuditManifest,
          });
        }}
      />

      <SymbolDetailsPane
        context={detailsPane}
        onClose={() => setDetailsPane(undefined)}
      />
    </div>
  );
}
