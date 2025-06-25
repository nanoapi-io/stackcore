import type { Metric } from "./dependencyManifest.ts";

export type AuditManifest = Record<string, {
  id: string;
  alerts: Record<string, {
    metric: Metric;
    severity: number;
    message: {
      short: string;
      long: string;
    };
  }>;
  symbols: Record<string, {
    id: string;
    alerts: Record<string, {
      metric: Metric;
      severity: number;
      message: {
        short: string;
        long: string;
      };
    }>;
  }>;
}>;
