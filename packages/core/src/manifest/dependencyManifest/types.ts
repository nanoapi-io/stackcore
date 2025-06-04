import z from "zod";

// Dependency manifest version 1
// We will add more versions in the future for backward compatibility

const symbolTypeSchema = z.enum([
  "class",
  "function",
  "variable",
  "struct",
  "enum",
  "union",
  "typedef",
  "interface",
  "record",
  "delegate",
]);

export const metricsSchema = z.object({
  linesCount: z.number(),
  codeLineCount: z.number(),
  characterCount: z.number(),
  codeCharacterCount: z.number(),
  dependencyCount: z.number(),
  dependentCount: z.number(),
  cyclomaticComplexity: z.number(),
});

const dependencyInfoSchema = z.object({
  id: z.string(),
  isExternal: z.boolean(),
  symbols: z.record(z.string(), z.string()),
});

const dependentInfoSchema = z.object({
  id: z.string(),
  symbols: z.record(z.string(), z.string()),
});

const symbolDependencyManifestSchema = z.object({
  id: z.string(),
  type: symbolTypeSchema,
  metrics: metricsSchema,
  dependencies: z.record(z.string(), dependencyInfoSchema),
  dependents: z.record(z.string(), dependentInfoSchema),
});

const fileDependencyManifestSchema = z.object({
  id: z.string(),
  filePath: z.string(),
  language: z.string(),
  metrics: metricsSchema,
  dependencies: z.record(z.string(), dependencyInfoSchema),
  dependents: z.record(z.string(), dependentInfoSchema),
  symbols: z.record(z.string(), symbolDependencyManifestSchema),
});

const dependencyManifestV1Schema = z.record(
  z.string(),
  fileDependencyManifestSchema,
);

export type DependencyManifestV1 = z.infer<typeof dependencyManifestV1Schema>;

// Union type for all dependency manifest versions
// Add new versions here as they are created
export type DependencyManifest = DependencyManifestV1;
