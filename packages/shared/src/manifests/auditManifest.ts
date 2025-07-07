import type { Metric } from "./dependencyManifest.ts";

type AuditAlert = {
  metric: Metric;
  severity: number;
  message: {
    short: string;
    long: string;
  };
};

type SymbolAuditManifest = {
  id: string;
  alerts: Record<string, AuditAlert>;
};

type FileAuditManifest = {
  id: string;
  alerts: Record<string, AuditAlert>;
  symbols: Record<string, SymbolAuditManifest>;
};

export type AuditManifest = Record<string, FileAuditManifest>;
