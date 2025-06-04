import type { AuditManifest } from "./auditManifest/types.ts";
import {
  type DependencyManifest,
  type DependencyManifestV1,
  metricCharacterCount,
  metricCodeCharacterCount,
  metricCodeLineCount,
  metricCyclomaticComplexity,
  metricDependencyCount,
  metricDependentCount,
  metricLinesCount,
} from "./dependencyManifest/types.ts";

function getNumberSeverityLevel(
  value: number,
  targetValue = 0,
): 1 | 2 | 3 | 4 | 5 {
  if (value > targetValue * 10) {
    return 5;
  } else if (value > targetValue * 5) {
    return 4;
  } else if (value > targetValue * 2) {
    return 3;
  } else if (value > targetValue * 1.5) {
    return 2;
  } else {
    return 1;
  }
}

export function generateAuditManifest(
  version: number,
  dependencyManifest: DependencyManifest,
  config: {
    file: {
      maxCodeChar: number;
      maxChar: number;
      maxCodeLine: number;
      maxLine: number;
      maxDependency: number;
      maxDependent: number;
      maxCyclomaticComplexity: number;
    };
    symbol: {
      maxCodeChar: number;
      maxChar: number;
      maxCodeLine: number;
      maxLine: number;
      maxDependency: number;
      maxDependent: number;
      maxCyclomaticComplexity: number;
    };
  },
): AuditManifest {
  // Detect version and delegate to appropriate handler
  switch (version) {
    case 1:
      return generateAuditManifestV1(
        dependencyManifest as DependencyManifestV1,
        config,
      );
    default:
      throw new Error(`Unsupported dependency manifest version: ${version}`);
  }
}

function generateAuditManifestV1(
  depencyManifest: DependencyManifestV1,
  config: {
    file: {
      maxCodeChar: number;
      maxChar: number;
      maxCodeLine: number;
      maxLine: number;
      maxDependency: number;
      maxDependent: number;
      maxCyclomaticComplexity: number;
    };
    symbol: {
      maxCodeChar: number;
      maxChar: number;
      maxCodeLine: number;
      maxLine: number;
      maxDependency: number;
      maxDependent: number;
      maxCyclomaticComplexity: number;
    };
  },
): AuditManifest {
  const auditManifest: AuditManifest = {};

  for (const fileDependencyManifest of Object.values(depencyManifest)) {
    const fileAuditManifest: AuditManifest[string] = {
      id: fileDependencyManifest.id,
      alerts: {},
      symbols: {},
    };

    const codeCharacterCountValue =
      fileDependencyManifest.metrics.codeCharacterCount;
    const codeCharacterCountTarget = config.file.maxCodeChar;
    if (codeCharacterCountValue > codeCharacterCountTarget) {
      fileAuditManifest.alerts[metricCodeCharacterCount] = {
        metric: metricCodeCharacterCount,
        severity: getNumberSeverityLevel(
          codeCharacterCountValue,
          codeCharacterCountTarget,
        ),
        message: {
          short: "File too large",
          long:
            `File exceeds maximum character limit (${codeCharacterCountValue}/${codeCharacterCountTarget})`,
        },
      };
    }

    const characterCountValue = fileDependencyManifest.metrics.characterCount;
    const characterCountTarget = config.file.maxChar;
    if (characterCountValue > characterCountTarget) {
      fileAuditManifest.alerts[metricCharacterCount] = {
        metric: metricCharacterCount,
        severity: getNumberSeverityLevel(
          characterCountValue,
          characterCountTarget,
        ),
        message: {
          short: "File too large",
          long:
            `File exceeds maximum character limit (${characterCountValue}/${characterCountTarget})`,
        },
      };
    }

    const codeLineCountValue = fileDependencyManifest.metrics.codeLineCount;
    const codeLineCountTarget = config.file.maxCodeLine;
    if (codeLineCountValue > codeLineCountTarget) {
      fileAuditManifest.alerts[metricCodeLineCount] = {
        metric: metricCodeLineCount,
        severity: getNumberSeverityLevel(
          codeLineCountValue,
          codeLineCountTarget,
        ),
        message: {
          short: "Too many lines",
          long:
            `File exceeds maximum line count (${codeLineCountValue}/${codeLineCountTarget})`,
        },
      };
    }

    const linesCountValue = fileDependencyManifest.metrics.linesCount;
    const linesCountTarget = config.file.maxLine;
    if (linesCountValue > linesCountTarget) {
      fileAuditManifest.alerts[metricLinesCount] = {
        metric: metricLinesCount,
        severity: getNumberSeverityLevel(linesCountValue, linesCountTarget),
        message: {
          short: "Too many lines",
          long:
            `File exceeds maximum line count (${linesCountValue}/${linesCountTarget})`,
        },
      };
    }

    const dependencyCountValue = fileDependencyManifest.metrics.dependencyCount;
    const dependencyCountTarget = config.file.maxDependency;
    if (dependencyCountValue > dependencyCountTarget) {
      fileAuditManifest.alerts[metricDependencyCount] = {
        metric: metricDependencyCount,
        severity: getNumberSeverityLevel(
          dependencyCountValue,
          dependencyCountTarget,
        ),
        message: {
          short: "Too many dependencies",
          long:
            `File exceeds maximum dependency count (${dependencyCountValue}/${dependencyCountTarget})`,
        },
      };
    }

    const dependentCountValue = fileDependencyManifest.metrics.dependentCount;
    const dependentCountTarget = config.file.maxDependent;
    if (dependentCountValue > dependentCountTarget) {
      fileAuditManifest.alerts[metricDependentCount] = {
        metric: metricDependentCount,
        severity: getNumberSeverityLevel(
          dependentCountValue,
          dependentCountTarget,
        ),
        message: {
          short: "Too many dependents",
          long:
            `File exceeds maximum dependent count (${dependentCountValue}/${dependentCountTarget})`,
        },
      };
    }

    const cyclomaticComplexityValue =
      fileDependencyManifest.metrics.cyclomaticComplexity;
    const cyclomaticComplexityTarget = config.file.maxCyclomaticComplexity;
    if (cyclomaticComplexityValue > cyclomaticComplexityTarget) {
      fileAuditManifest.alerts[metricCyclomaticComplexity] = {
        metric: metricCyclomaticComplexity,
        severity: getNumberSeverityLevel(
          cyclomaticComplexityValue,
          cyclomaticComplexityTarget,
        ),
        message: {
          short: "Too complex",
          long:
            `File exceeds maximum cyclomatic complexity (${cyclomaticComplexityValue}/${cyclomaticComplexityTarget})`,
        },
      };
    }

    for (const symbol of Object.values(fileDependencyManifest.symbols)) {
      const symbolAuditManifest: AuditManifest[string]["symbols"][string] = {
        id: symbol.id,
        alerts: {},
      };

      const codeCharacterCountValue = symbol.metrics.codeCharacterCount;
      const codeCharacterCountTarget = config.symbol.maxCodeChar;
      if (codeCharacterCountValue > codeCharacterCountTarget) {
        symbolAuditManifest.alerts[metricCodeCharacterCount] = {
          metric: metricCodeCharacterCount,
          severity: getNumberSeverityLevel(
            codeCharacterCountValue,
            codeCharacterCountTarget,
          ),
          message: {
            short: "Symbol too large",
            long:
              `Symbol exceeds maximum character limit (${codeCharacterCountValue}/${codeCharacterCountTarget})`,
          },
        };
      }

      const characterCountValue = symbol.metrics.characterCount;
      const characterCountTarget = config.symbol.maxChar;
      if (characterCountValue > characterCountTarget) {
        symbolAuditManifest.alerts[metricCharacterCount] = {
          metric: metricCharacterCount,
          severity: getNumberSeverityLevel(
            characterCountValue,
            characterCountTarget,
          ),
          message: {
            short: "Symbol too large",
            long:
              `Symbol exceeds maximum character limit (${characterCountValue}/${characterCountTarget})`,
          },
        };
      }

      const codeLineCountValue = symbol.metrics.codeLineCount;
      const codeLineCountTarget = config.symbol.maxCodeLine;
      if (codeLineCountValue > codeLineCountTarget) {
        symbolAuditManifest.alerts[metricCodeLineCount] = {
          metric: metricCodeLineCount,
          severity: getNumberSeverityLevel(
            codeLineCountValue,
            codeLineCountTarget,
          ),
          message: {
            short: "Symbol too long",
            long:
              `Symbol exceeds maximum line count (${codeLineCountValue}/${codeLineCountTarget})`,
          },
        };
      }

      const linesCountValue = symbol.metrics.linesCount;
      const linesCountTarget = config.symbol.maxLine;
      if (linesCountValue > linesCountTarget) {
        symbolAuditManifest.alerts[metricLinesCount] = {
          metric: metricLinesCount,
          severity: getNumberSeverityLevel(linesCountValue, linesCountTarget),
          message: {
            short: "Symbol too long",
            long:
              `Symbol exceeds maximum line count (${linesCountValue}/${linesCountTarget})`,
          },
        };
      }

      const dependencyCountValue = symbol.metrics.dependencyCount;
      const dependencyCountTarget = config.symbol.maxDependency;
      if (dependencyCountValue > dependencyCountTarget) {
        symbolAuditManifest.alerts[metricDependencyCount] = {
          metric: metricDependencyCount,
          severity: getNumberSeverityLevel(
            dependencyCountValue,
            dependencyCountTarget,
          ),
          message: {
            short: "Too many dependencies",
            long:
              `Symbol exceeds maximum dependency count (${dependencyCountValue}/${dependencyCountTarget})`,
          },
        };
      }

      const dependentCountValue = symbol.metrics.dependentCount;
      const dependentCountTarget = config.symbol.maxDependent;
      if (dependentCountValue > dependentCountTarget) {
        symbolAuditManifest.alerts[metricDependentCount] = {
          metric: metricDependentCount,
          severity: getNumberSeverityLevel(
            dependentCountValue,
            dependentCountTarget,
          ),
          message: {
            short: "Too many dependents",
            long:
              `Symbol exceeds maximum dependent count (${dependentCountValue}/${dependentCountTarget})`,
          },
        };
      }

      const cyclomaticComplexityValue = symbol.metrics.cyclomaticComplexity;
      const cyclomaticComplexityTarget = config.symbol.maxCyclomaticComplexity;
      if (cyclomaticComplexityValue > cyclomaticComplexityTarget) {
        symbolAuditManifest.alerts[metricCyclomaticComplexity] = {
          metric: metricCyclomaticComplexity,
          severity: getNumberSeverityLevel(
            cyclomaticComplexityValue,
            cyclomaticComplexityTarget,
          ),
          message: {
            short: "Symbol too complex",
            long:
              `Symbol exceeds maximum cyclomatic complexity (${cyclomaticComplexityValue}/${cyclomaticComplexityTarget})`,
          },
        };
      }

      fileAuditManifest.symbols[symbol.id] = symbolAuditManifest;
    }

    auditManifest[fileDependencyManifest.id] = fileAuditManifest;
  }

  return auditManifest;
}
