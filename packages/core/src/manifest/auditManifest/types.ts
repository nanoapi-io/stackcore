import z from "zod";
import {
  metricCharacterCount,
  metricCodeCharacterCount,
  metricCodeLineCount,
  metricCyclomaticComplexity,
  metricDependencyCount,
  metricDependentCount,
  metricLinesCount,
} from "../dependencyManifest/types.ts";

const auditAlertSchema = z.object({
  metric: z.enum([
    metricLinesCount,
    metricCodeLineCount,
    metricCharacterCount,
    metricCodeCharacterCount,
    metricDependencyCount,
    metricDependentCount,
    metricCyclomaticComplexity,
  ]),
  severity: z.number().min(1).max(5),
  message: z.object({
    short: z.string(),
    long: z.string(),
  }),
});

const symbolAuditManifestSchema = z.object({
  id: z.string(),
  alerts: z.record(z.string(), auditAlertSchema),
});

const fileAuditManifestSchema = z.object({
  id: z.string(),
  alerts: z.record(z.string(), auditAlertSchema),
  symbols: z.record(z.string(), symbolAuditManifestSchema),
});

const auditManifestSchema = z.record(z.string(), fileAuditManifestSchema);

export type AuditManifest = z.infer<typeof auditManifestSchema>;
