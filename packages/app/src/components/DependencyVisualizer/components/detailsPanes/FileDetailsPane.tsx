import type {
  auditManifestTypes,
  dependencyManifestTypes,
} from "@stackcore/shared";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../../../shadcn/Sheet.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../shadcn/Card.tsx";
import { Code, File, Pickaxe, SearchCode } from "lucide-react";
import { ScrollArea } from "../../../shadcn/Scrollarea.tsx";
import { Button } from "../../../shadcn/Button.tsx";
import { Link, useSearchParams } from "react-router";
import DisplayNameWithTooltip from "../DisplayNameWithTootip.tsx";
import Metrics from "./Metrics.tsx";
import AlertBadge from "./AlertBadge.tsx";
import SymbolExtractionDialog from "../SymbolExtractionDialog.tsx";

export default function FileDetailsPane(props: {
  context: {
    manifestId: number;
    fileDependencyManifest: dependencyManifestTypes.DependencyManifest[string];
    fileAuditManifest: auditManifestTypes.AuditManifest[string];
  } | undefined;
  onClose: () => void;
}) {
  const [searchParams] = useSearchParams();

  function getToFileLink(filePath: string) {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("fileId", filePath);
    newSearchParams.delete("instanceId");
    return `?${newSearchParams.toString()}`;
  }

  return (
    <div className="absolute z-50">
      <Sheet
        open={props.context !== undefined}
        onOpenChange={() => props.onClose()}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              <div className="flex items-center space-x-2">
                <File />
                <DisplayNameWithTooltip
                  name={props.context?.fileDependencyManifest.filePath || ""}
                  maxChar={30}
                />
              </div>
            </SheetTitle>
            <Button
              asChild
              variant="secondary"
              size="sm"
              onClick={props.onClose}
            >
              <Link
                to={getToFileLink(
                  props.context?.fileDependencyManifest.filePath || "",
                )}
              >
                <SearchCode />
                View graph for this file
              </Link>
            </Button>
            <SymbolExtractionDialog
              manifestId={props.context?.manifestId || 0}
              filePath={props.context?.fileDependencyManifest.filePath || ""}
              symbolIds={Object.keys(
                props.context?.fileDependencyManifest.symbols || {},
              )}
            >
              <Button variant="secondary" size="sm">
                <Pickaxe />
                Extract all symbols via CLI
              </Button>
            </SymbolExtractionDialog>
          </SheetHeader>
          <ScrollArea>
            <div className="flex flex-col space-y-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <File />
                      <div>File Metrics</div>
                    </div>
                    <AlertBadge
                      count={Object.keys(
                        props.context?.fileAuditManifest.alerts || {},
                      ).length || 0}
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Metrics
                    dependencyManifest={props.context?.fileDependencyManifest}
                    auditManifest={props.context?.fileAuditManifest}
                  />
                </CardContent>
                <CardHeader>
                  <CardTitle>
                    <div className="flex items-center space-x-2">
                      <Code />
                      <div>
                        Symbols ({Object.keys(
                          props.context?.fileDependencyManifest.symbols || {},
                        ).length || 0})
                      </div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col space-y-2">
                    {Object.entries(
                      Object.values(
                        props.context?.fileDependencyManifest.symbols || [],
                      ).reduce((acc, symbol) => {
                        acc[symbol.type] = (acc[symbol.type] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>),
                    ).map(([type, count]) => (
                      <div
                        key={type}
                        className="flex items-center justify-between"
                      >
                        <div>{type}</div>
                        <div>{count}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              {Object.values(
                props.context?.fileDependencyManifest.symbols || {},
              ).map((symbol) => (
                <Card key={symbol.id}>
                  <CardHeader>
                    <CardTitle>
                      <div className="flex items-center space-x-2">
                        <Code />
                        <DisplayNameWithTooltip
                          name={`${symbol.id} (${symbol.type})`}
                          maxChar={30}
                          truncateBefore
                        />
                      </div>
                    </CardTitle>
                    <Button asChild variant="secondary" size="sm">
                      <Link
                        to={`/${
                          encodeURIComponent(
                            props.context?.fileDependencyManifest.filePath ||
                              "",
                          )
                        }/${encodeURIComponent(symbol.id)}`}
                      >
                        <SearchCode />
                        View graph for this symbol
                      </Link>
                    </Button>
                    <SymbolExtractionDialog
                      manifestId={props.context?.manifestId || 0}
                      filePath={props.context?.fileDependencyManifest
                        .filePath || ""}
                      symbolIds={[symbol.id]}
                    >
                      <Button variant="secondary" size="sm">
                        <Pickaxe />
                        Extract symbol via CLI
                      </Button>
                    </SymbolExtractionDialog>
                  </CardHeader>
                  <CardContent>
                    <Metrics
                      dependencyManifest={symbol}
                      auditManifest={props.context?.fileAuditManifest.symbols
                        ?.[symbol.id]}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
