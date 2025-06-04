import z from "zod";

// Dependency manifest version 1
// We will add more versions in the future for backward compatibility

export const metricLinesCount = "linesCount";
export const metricCodeLineCount = "codeLineCount";
export const metricCharacterCount = "characterCount";
export const metricCodeCharacterCount = "codeCharacterCount";
export const metricDependencyCount = "dependencyCount";
export const metricDependentCount = "dependentCount";
export const metricCyclomaticComplexity = "cyclomaticComplexity";

export type Metric =
  | typeof metricLinesCount
  | typeof metricCodeLineCount
  | typeof metricCharacterCount
  | typeof metricCodeCharacterCount
  | typeof metricDependencyCount
  | typeof metricDependentCount
  | typeof metricCyclomaticComplexity;

export const symbolTypeClass = "class";
export const symbolTypeFunction = "function";
export const symbolTypeVariable = "variable";
export const symbolTypeStruct = "struct";
export const symbolTypeEnum = "enum";
export const symbolTypeUnion = "union";
export const symbolTypeTypedef = "typedef";
export const symbolTypeInterface = "interface";
export const symbolTypeRecord = "record";
export const symbolTypeDelegate = "delegate";

export type SymbolType =
  | typeof symbolTypeClass
  | typeof symbolTypeFunction
  | typeof symbolTypeVariable
  | typeof symbolTypeStruct
  | typeof symbolTypeEnum
  | typeof symbolTypeUnion
  | typeof symbolTypeTypedef
  | typeof symbolTypeInterface
  | typeof symbolTypeRecord
  | typeof symbolTypeDelegate;

export const metricsSchema = z.object({
  [metricLinesCount]: z.number(),
  [metricCodeLineCount]: z.number(),
  [metricCharacterCount]: z.number(),
  [metricCodeCharacterCount]: z.number(),
  [metricDependencyCount]: z.number(),
  [metricDependentCount]: z.number(),
  [metricCyclomaticComplexity]: z.number(),
});

const symbolTypeSchema = z.enum([
  symbolTypeClass,
  symbolTypeFunction,
  symbolTypeVariable,
  symbolTypeStruct,
  symbolTypeEnum,
  symbolTypeUnion,
  symbolTypeTypedef,
  symbolTypeInterface,
  symbolTypeRecord,
  symbolTypeDelegate,
]);

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
