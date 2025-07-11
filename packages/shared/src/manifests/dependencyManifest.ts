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

type DependencyInfo = {
  id: string;
  isExternal: boolean;
  symbols: Record<string, string>;
};

type DependentInfo = {
  id: string;
  symbols: Record<string, string>;
};

type SymbolDependencyManifest = {
  id: string;
  type: SymbolType;
  metrics: Record<Metric, number>;
  description: string;
  dependencies: Record<string, DependencyInfo>;
  dependents: Record<string, DependentInfo>;
};

type FileDependencyManifest = {
  id: string;
  filePath: string;
  language: string;
  metrics: Record<Metric, number>;
  dependencies: Record<string, DependencyInfo>;
  dependents: Record<string, DependentInfo>;
  symbols: Record<string, SymbolDependencyManifest>;
};

export type DependencyManifestV1 = Record<string, FileDependencyManifest>;

// Union type for all dependency manifest versions
// Add new versions here as they are created
export type DependencyManifest = DependencyManifestV1;
