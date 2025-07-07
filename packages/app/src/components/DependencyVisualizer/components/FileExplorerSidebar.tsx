import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  type auditManifestTypes,
  type dependencyManifestTypes,
  manifestApiTypes,
} from "@stackcore/shared";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarRail,
} from "../../shadcn/Sidebar.tsx";
import { Button } from "../../shadcn/Button.tsx";
import { Input } from "../../shadcn/Input.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../shadcn/Tooltip.tsx";
import {
  ChevronDown,
  ChevronRight,
  Code,
  File,
  FolderClosed,
  FolderOpen,
  ScanEye,
  SearchCode,
  Sparkles,
  X,
} from "lucide-react";
import { ScrollArea, ScrollBar } from "../../shadcn/Scrollarea.tsx";
import DisplayNameWithTooltip from "./DisplayNameWithTootip.tsx";
import { toast } from "sonner";
import { useCoreApi } from "../../../contexts/CoreApi.tsx";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormField } from "../../shadcn/Form.tsx";

export interface ExplorerNodeData {
  id: string;
  displayName: string;
  fileId?: string;
  symbolId?: string;
  children: Map<string, ExplorerNodeData>;
}

export function FileExplorerSidebar(props: {
  dependencyManifestId: number;
  dependencyManifest: dependencyManifestTypes.DependencyManifest;
  auditManifest: auditManifestTypes.AuditManifest;
  onHighlightInCytoscape: (node: ExplorerNodeData) => void;
  toDetails: (node: ExplorerNodeData) => string;
}) {
  const coreApi = useCoreApi();

  const [busy, setBusy] = useState<boolean>(false);
  const [filteredSymbols, setFilteredSymbols] = useState<
    { fileId: string; symbolId: string }[]
  >([]);

  const [explorerTree, setExplorerTree] = useState<ExplorerNodeData>();

  // Build the explorer tree when the dependency manifest changes
  useEffect(() => {
    const tree = buildExplorerTree(props.dependencyManifest, []);
    setExplorerTree(tree);
  }, [props.dependencyManifest]);

  const searchSchema = z.object({
    search: z.string().min(1, "Search is required"),
  });

  const form = useForm<z.infer<typeof searchSchema>>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      search: "",
    },
  });

  async function onSubmitSearch(values: z.infer<typeof searchSchema>) {
    setBusy(true);
    try {
      const {
        url: smartFilterUrl,
        method: smartFilterMethod,
        body: smartFilterBody,
      } = manifestApiTypes.prepareSmartFilter(
        props.dependencyManifestId,
        {
          prompt: values.search,
        },
      );

      const response = await coreApi.handleRequest(
        smartFilterUrl,
        smartFilterMethod,
        smartFilterBody,
      );

      if (!response.ok) {
        throw new Error("Failed to search for files");
      }

      const responseData = await response
        .json() as manifestApiTypes.SmartFilterResponse;

      if (!responseData.success) {
        toast.error(responseData.message);
        return;
      }

      const filteredSymbols = responseData.results;

      setFilteredSymbols(filteredSymbols);

      const tree = buildExplorerTree(props.dependencyManifest, filteredSymbols);
      setExplorerTree(tree);

      toast.success(responseData.message);
    } catch (error) {
      console.error(error);
      toast.error("Error searching for files");
    } finally {
      setBusy(false);
    }
  }

  function onClearSearch() {
    setFilteredSymbols([]);
    setExplorerTree(buildExplorerTree(props.dependencyManifest, []));
  }

  function buildExplorerTree(
    dependencyManifest: dependencyManifestTypes.DependencyManifest,
    filteredSymbols: { fileId: string; symbolId: string }[],
  ): ExplorerNodeData | undefined {
    const getExplorerNodeId = (filePath: string, instanceId?: string) => {
      if (instanceId) {
        return `${filePath}#${instanceId}`;
      }
      return filePath;
    };

    const root: ExplorerNodeData = {
      id: "root",
      displayName: "Project",
      children: new Map(),
    };

    // Create a set for faster lookup of filtered symbols
    const filteredSymbolsSet = new Set(
      filteredSymbols.map((s) => `${s.fileId}#${s.symbolId}`),
    );

    // Create a set of files that have filtered symbols
    const filesWithFilteredSymbols = new Set(
      filteredSymbols.map((s) => s.fileId),
    );

    // If no filtered symbols provided, show everything
    const shouldShowAll = filteredSymbols.length === 0;

    // Track if any nodes match the filter to avoid empty results
    let hasMatchingNodes = false;

    for (const fileDependencyManifest of Object.values(dependencyManifest)) {
      const filePath = fileDependencyManifest.filePath;

      // Check if this file should be included
      const fileShouldBeIncluded = shouldShowAll ||
        filesWithFilteredSymbols.has(filePath);

      if (!fileShouldBeIncluded) {
        continue;
      }

      hasMatchingNodes = true;

      const parts = filePath.split("/");
      let currentNode: ExplorerNodeData = root;
      for (const part of parts) {
        const id = getExplorerNodeId(part);
        if (!currentNode.children.has(id)) {
          currentNode.children.set(id, {
            id: id,
            displayName: part,
            children: new Map(),
          });
        }
        currentNode = currentNode.children.get(id)!;
      }
      currentNode.fileId = getExplorerNodeId(filePath);

      // Add symbols - either all symbols if no filter, or only filtered symbols
      for (const instanceId of Object.keys(fileDependencyManifest.symbols)) {
        const symbolKey = `${filePath}#${instanceId}`;
        if (shouldShowAll || filteredSymbolsSet.has(symbolKey)) {
          const id = getExplorerNodeId(filePath, instanceId);
          currentNode.children.set(id, {
            id: id,
            displayName: instanceId,
            fileId: filePath,
            symbolId: instanceId,
            children: new Map(),
          });
        }
      }
    }

    // If no nodes match the filter, return an empty tree
    if (!shouldShowAll && !hasMatchingNodes) {
      return undefined;
    }

    const flattenTree = (node: ExplorerNodeData): ExplorerNodeData => {
      // First recursively flatten all children
      if (node.children.size > 0) {
        const flattenedChildren = new Map<string, ExplorerNodeData>();

        // Sort children into folders and files
        const folders: Array<[string, ExplorerNodeData]> = [];
        const files: Array<[string, ExplorerNodeData]> = [];

        for (const [id, child] of node.children) {
          const flattenedChild = flattenTree(child);
          if (flattenedChild.fileId) {
            files.push([id, flattenedChild]);
          } else {
            folders.push([id, flattenedChild]);
          }
        }

        // Add folders first, then files
        for (const [id, folder] of folders) {
          flattenedChildren.set(id, folder);
        }
        for (const [id, file] of files) {
          flattenedChildren.set(id, file);
        }

        node.children = flattenedChildren;
      }

      // Then check if this node has exactly one child that can be merged
      while (node.children.size === 1) {
        const childEntry = Array.from(node.children.entries())[0];
        const child = childEntry[1];

        // Skip if the child has symbols (is a leaf node)
        if (child.fileId) {
          break;
        }

        // Merge child's name into parent
        node.displayName = `${node.displayName}/${child.displayName}`;
        // Update the parent's id to child's id
        node.id = child.id;
        // Replace parent's children with child's children
        node.children = child.children;
      }

      return node;
    };

    // Flatten nodes that have only one child
    const flattenedTree = flattenTree(root);

    return flattenedTree;
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <Link
          to="https://nanoapi.io"
          target="_blank"
          className="flex items-center space-x-3"
        >
          <img src="/logo.png" alt="logo" className="h-10" />
          <div className="text-xl font-bold">NanoAPI</div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="flex h-full">
          <ScrollArea>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmitSearch)}
                className="flex items-center gap-2"
              >
                <FormField
                  control={form.control}
                  name="search"
                  render={({ field }) => (
                    <Tooltip delayDuration={500}>
                      <TooltipTrigger asChild>
                        <Input
                          {...field}
                          placeholder="Search"
                          disabled={busy}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-sm">
                          AI-powered search for code exploration.
                          <br />
                          Filter by type (e.g. "show all classes"),
                          <br />
                          by metrics (e.g. "functions with high complexity"),
                          <br />
                          or by business domain (e.g. "auth related code").
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )}
                />
                <Button
                  type="submit"
                  disabled={busy}
                  variant="ghost"
                  size="icon"
                >
                  <Sparkles />
                </Button>
                {filteredSymbols.length > 0 && (
                  <Button
                    onClick={onClearSearch}
                    disabled={busy}
                    variant="ghost"
                    size="icon"
                  >
                    <X />
                  </Button>
                )}
              </form>
            </Form>

            <div className="pt-2">
              {!explorerTree
                ? (
                  <div className="text-sm font-muted italic">
                    No Matching files found
                  </div>
                )
                : (
                  <ExplorerNode
                    node={explorerTree}
                    level={0}
                    onHighlightInCytoscape={props
                      .onHighlightInCytoscape}
                    toDetails={props.toDetails}
                  />
                )}
            </div>
            <ScrollBar orientation="vertical" />
          </ScrollArea>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}

function ExplorerNode(props: {
  node: ExplorerNodeData;
  level: number;
  onHighlightInCytoscape: (node: ExplorerNodeData) => void;
  toDetails: (node: ExplorerNodeData) => string;
}) {
  const [showChildren, setShowChildren] = useState<boolean>(false);

  const type: "folder" | "file" | "symbol" = props.node.symbolId
    ? "symbol"
    : props.node.fileId
    ? "file"
    : "folder";

  return (
    <div
      className="w-full space-y-1"
      style={{ paddingLeft: `${props.level / 2}rem` }}
    >
      {(() => {
        switch (type) {
          case "folder":
            return (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowChildren(!showChildren)}
                className="w-full justify-start"
              >
                {showChildren ? <FolderOpen /> : <FolderClosed />}
                <DisplayNameWithTooltip
                  name={props.node.displayName}
                  maxChar={Math.max(5, 30 - props.level * 2)}
                />
              </Button>
            );
          case "file":
            return (
              <div className="flex justify-between items-center gap-2">
                <div className="grow flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowChildren(!showChildren)}
                    className="w-full justify-start"
                  >
                    {showChildren
                      ? <ChevronDown size={16} />
                      : <ChevronRight size={16} />}
                    <File />
                    <DisplayNameWithTooltip
                      name={props.node.displayName}
                      maxChar={Math.max(5, 30 - props.level * 2)}
                    />
                  </Button>
                </div>
                <div className="flex items-center gap-1">
                  <Tooltip delayDuration={500}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => props.onHighlightInCytoscape(props.node)}
                      >
                        <ScanEye />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">
                      Highlight in graph
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip delayDuration={500}>
                    <TooltipTrigger asChild>
                      <Button asChild variant="secondary" size="sm">
                        <Link to={props.toDetails(props.node)}>
                          <SearchCode />
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">
                      View graph for this file
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            );
          case "symbol":
            return (
              <div className="flex justify-between items-center gap-2">
                <div className="grow flex items-center gap-2">
                  <Code size={12} />
                  <DisplayNameWithTooltip
                    name={props.node.displayName}
                    maxChar={Math.max(5, 30 - props.level * 2)}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Tooltip delayDuration={500}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => props.onHighlightInCytoscape(props.node)}
                      >
                        <ScanEye />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">
                      Highlight in graph
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip delayDuration={500}>
                    <TooltipTrigger asChild>
                      <Button asChild variant="secondary" size="sm">
                        <Link to={props.toDetails(props.node)}>
                          <SearchCode />
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">
                      View graph for this symbol
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            );
        }
      })()}
      {showChildren &&
        Array.from(props.node.children.values()).map((child) => (
          <ExplorerNode
            key={child.id}
            node={child}
            level={props.level + 1}
            onHighlightInCytoscape={props.onHighlightInCytoscape}
            toDetails={props.toDetails}
          />
        ))}
    </div>
  );
}
