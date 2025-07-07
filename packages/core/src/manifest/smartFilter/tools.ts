import z from "zod";
import { searchManifest } from "../../db/vectorStore.ts";
import { dependencyManifestTypes } from "@stackcore/shared";
import { tool } from "@langchain/core/tools";
import { Command } from "@langchain/langgraph";
import { ToolMessage } from "@langchain/core/messages";
import {
  intersectionOperation,
  replaceOperation,
  subtractionOperation,
  unionOperation,
} from "./graph.ts";

export function getTools(
  dependencyManifestId: number,
  dependencyManifest: dependencyManifestTypes.DependencyManifest,
) {
  const semanticSearchTool = tool(
    async (
      input: {
        query: string;
        limit: number;
        stateOperation:
          | typeof unionOperation
          | typeof intersectionOperation
          | typeof replaceOperation
          | typeof subtractionOperation;
      },
      config,
    ) => {
      const results = await searchManifest(input.query, input.limit, {
        manifestId: dependencyManifestId,
      });

      const symbolRefs: {
        fileId: string;
        symbolId: string;
      }[] = [];

      for (const result of results) {
        symbolRefs.push({
          fileId: result.metadata.fileId,
          symbolId: result.metadata.symbolId,
        });
      }

      return new Command({
        update: {
          messages: [
            new ToolMessage({
              tool_call_id: config.toolCall.id,
              content:
                `Found ${symbolRefs.length} symbols and updated the state with the results`,
            }),
          ],
          results: {
            data: symbolRefs,
            operation: input.stateOperation,
          },
        },
      });
    },
    {
      name: "semanticSearch",
      description:
        "Search for symbols using natural language queries. This tool finds symbols based on their meaning, description, or semantic similarity to your query. Use this when you want to find symbols by what they do rather than their type or metrics.",
      schema: z.object({
        query: z.string().describe(
          "Natural language description of what you're looking for (e.g., 'authentication functions', 'database connection classes', 'error handling')",
        ),
        limit: z.number().describe(
          "Maximum number of results to return (recommended: 10-50)",
        ),
        stateOperation: z.enum([
          unionOperation,
          intersectionOperation,
          replaceOperation,
          subtractionOperation,
        ]).describe(
          "How to combine with existing results: 'replace', 'union' (add to existing), 'intersection' (keep only common symbols)",
        ),
      }),
    },
  );

  const fileMetricSearchTool = tool(
    (
      input: {
        metric: dependencyManifestTypes.Metric;
        value: number;
        operator: string;
        stateOperation:
          | typeof unionOperation
          | typeof intersectionOperation
          | typeof replaceOperation
          | typeof subtractionOperation;
      },
      config,
    ) => {
      const symbolRefs: {
        fileId: string;
        symbolId: string;
      }[] = [];

      for (const file of Object.values(dependencyManifest)) {
        const metricValue = file.metrics[input.metric];

        let includeSymbols = false;

        if (input.operator === "<" && metricValue < input.value) {
          includeSymbols = true;
        } else if (input.operator === "<=" && metricValue <= input.value) {
          includeSymbols = true;
        } else if (input.operator === "=" && metricValue === input.value) {
          includeSymbols = true;
        } else if (input.operator === ">=" && metricValue >= input.value) {
          includeSymbols = true;
        } else if (input.operator === ">" && metricValue > input.value) {
          includeSymbols = true;
        }

        for (const symbol of Object.values(file.symbols)) {
          if (includeSymbols) {
            symbolRefs.push({ fileId: file.id, symbolId: symbol.id });
          }
        }
      }

      return new Command({
        update: {
          messages: [
            new ToolMessage({
              tool_call_id: config.toolCall.id,
              content:
                `Found ${symbolRefs.length} symbols and updated the state with the results`,
            }),
          ],
          results: {
            data: symbolRefs,
            operation: input.stateOperation,
          },
        },
      });
    },
    {
      name: "fileMetricSearch",
      description:
        "Search for symbols in files that match specific file-level metrics (like file size, complexity, or dependency count). Use this to find symbols in files with certain characteristics.",
      schema: z.object({
        metric: z.enum([
          dependencyManifestTypes.metricLinesCount,
          dependencyManifestTypes.metricCodeLineCount,
          dependencyManifestTypes.metricCharacterCount,
          dependencyManifestTypes.metricCodeCharacterCount,
          dependencyManifestTypes.metricDependencyCount,
          dependencyManifestTypes.metricDependentCount,
          dependencyManifestTypes.metricCyclomaticComplexity,
        ]).describe(
          "The file metric to filter by: lines of code, dependencies, complexity, etc.",
        ),
        value: z.number().describe("The threshold value to compare against"),
        operator: z.enum(["<", "<=", "=", ">=", ">"]).describe(
          "Comparison operator: '<' (less than), '<=' (less than or equal), '=' (exactly), '>=' (greater than or equal), '>' (greater than)",
        ),
        stateOperation: z.enum([
          unionOperation,
          intersectionOperation,
          replaceOperation,
          subtractionOperation,
        ]).describe(
          "How to combine with existing results: 'replace', 'union' (add to existing), 'intersection' (keep only common symbols)",
        ),
      }),
    },
  );

  const symbolMetricSearchTool = tool(
    (
      input: {
        metric: dependencyManifestTypes.Metric;
        value: number;
        operator: string;
        stateOperation:
          | typeof unionOperation
          | typeof intersectionOperation
          | typeof replaceOperation
          | typeof subtractionOperation;
      },
      config,
    ) => {
      const symbolRefs: {
        fileId: string;
        symbolId: string;
      }[] = [];

      for (const file of Object.values(dependencyManifest)) {
        for (const symbol of Object.values(file.symbols)) {
          const metricValue = symbol.metrics[input.metric];

          if (input.operator === "<" && metricValue < input.value) {
            symbolRefs.push({ fileId: file.id, symbolId: symbol.id });
          } else if (input.operator === "<=" && metricValue <= input.value) {
            symbolRefs.push({ fileId: file.id, symbolId: symbol.id });
          } else if (input.operator === "=" && metricValue === input.value) {
            symbolRefs.push({ fileId: file.id, symbolId: symbol.id });
          } else if (input.operator === ">=" && metricValue >= input.value) {
            symbolRefs.push({ fileId: file.id, symbolId: symbol.id });
          } else if (input.operator === ">" && metricValue > input.value) {
            symbolRefs.push({ fileId: file.id, symbolId: symbol.id });
          }
        }
      }

      return new Command({
        update: {
          messages: [
            new ToolMessage({
              tool_call_id: config.toolCall.id,
              content:
                `Found ${symbolRefs.length} symbols and updated the state with the results`,
            }),
          ],
          results: {
            data: symbolRefs,
            operation: input.stateOperation,
          },
        },
      });
    },
    {
      name: "metricSearch",
      description:
        "Search for symbols based on their individual metrics (like complexity, size, or dependency count). Use this to find symbols with specific characteristics.",
      schema: z.object({
        metric: z.enum([
          dependencyManifestTypes.metricLinesCount,
          dependencyManifestTypes.metricCodeLineCount,
          dependencyManifestTypes.metricCharacterCount,
          dependencyManifestTypes.metricCodeCharacterCount,
          dependencyManifestTypes.metricDependencyCount,
          dependencyManifestTypes.metricDependentCount,
          dependencyManifestTypes.metricCyclomaticComplexity,
        ]).describe(
          "The symbol metric to filter by: lines of code, dependencies, complexity, etc.",
        ),
        value: z.number().describe("The threshold value to compare against"),
        operator: z.enum(["<", "<=", "=", ">=", ">"]).describe(
          "Comparison operator: '<' (less than), '<=' (less than or equal), '=' (exactly), '>=' (greater than or equal), '>' (greater than)",
        ),
        stateOperation: z.enum([
          unionOperation,
          intersectionOperation,
          replaceOperation,
          subtractionOperation,
        ]).describe(
          "How to combine with existing results: 'replace', 'union' (add to existing), 'intersection' (keep only common symbols)",
        ),
      }),
    },
  );

  const symbolTypeSearchTool = tool(
    (
      input: {
        type: dependencyManifestTypes.SymbolType;
        stateOperation:
          | typeof unionOperation
          | typeof intersectionOperation
          | typeof replaceOperation
          | typeof subtractionOperation;
      },
      config,
    ) => {
      const symbolRefs: {
        fileId: string;
        symbolId: string;
      }[] = [];

      for (const file of Object.values(dependencyManifest)) {
        for (const symbol of Object.values(file.symbols)) {
          if (symbol.type === input.type) {
            symbolRefs.push({ fileId: file.id, symbolId: symbol.id });
          }
        }
      }

      return new Command({
        update: {
          messages: [
            new ToolMessage({
              tool_call_id: config.toolCall.id,
              content:
                `Found ${symbolRefs.length} symbols and updated the state with the results`,
            }),
          ],
          results: {
            data: symbolRefs,
            operation: input.stateOperation,
          },
        },
      });
    },
    {
      name: "symbolTypeSearch",
      description:
        "Search for symbols by their type (class, function, interface, etc.). This is the most direct way to find specific types of code elements.",
      schema: z.object({
        type: z.enum([
          dependencyManifestTypes.symbolTypeClass,
          dependencyManifestTypes.symbolTypeFunction,
          dependencyManifestTypes.symbolTypeVariable,
          dependencyManifestTypes.symbolTypeStruct,
          dependencyManifestTypes.symbolTypeEnum,
          dependencyManifestTypes.symbolTypeUnion,
          dependencyManifestTypes.symbolTypeTypedef,
          dependencyManifestTypes.symbolTypeInterface,
          dependencyManifestTypes.symbolTypeRecord,
          dependencyManifestTypes.symbolTypeDelegate,
        ]).describe(
          "The type of symbol to search for: class, function, interface, variable, etc.",
        ),
        stateOperation: z.enum([
          unionOperation,
          intersectionOperation,
          replaceOperation,
          subtractionOperation,
        ]).describe(
          "How to combine with existing results: 'replace', 'union' (add to existing), 'intersection' (keep only common symbols)",
        ),
      }),
    },
  );
  const filePatternSearchTool = tool(
    (input: {
      pattern: string;
      matchType: string;
      stateOperation:
        | typeof unionOperation
        | typeof intersectionOperation
        | typeof replaceOperation
        | typeof subtractionOperation;
    }, config) => {
      const symbolRefs: { fileId: string; symbolId: string }[] = [];

      for (const file of Object.values(dependencyManifest)) {
        let matches = false;

        switch (input.matchType) {
          case "exact":
            matches =
              file.filePath.toLowerCase() === input.pattern.toLowerCase();
            break;
          case "contains":
            matches = file.filePath.toLowerCase().includes(
              input.pattern.toLowerCase(),
            );
            break;
          case "starts_with":
            matches = file.filePath.toLowerCase().startsWith(
              input.pattern.toLowerCase(),
            );
            break;
          case "ends_with":
            matches = file.filePath.toLowerCase().endsWith(
              input.pattern.toLowerCase(),
            );
            break;
        }

        if (matches) {
          for (const symbol of Object.values(file.symbols)) {
            symbolRefs.push({ fileId: file.id, symbolId: symbol.id });
          }
        }
      }

      return new Command({
        update: {
          messages: [
            new ToolMessage({
              tool_call_id: config.toolCall.id,
              content:
                `Found ${symbolRefs.length} symbols and updated the state with the results`,
            }),
          ],
          results: {
            data: symbolRefs,
            operation: input.stateOperation,
          },
        },
      });
    },
    {
      name: "filePatternSearch",
      description:
        "Search for symbols in files that match specific path patterns. Use this to find symbols in particular directories, file types, or naming patterns.",
      schema: z.object({
        pattern: z.string().describe(
          "The file path pattern to match (e.g., 'models/', 'test_', '.py', 'utils')",
        ),
        matchType: z.enum(["exact", "contains", "starts_with", "ends_with"])
          .describe(
            "How to match the pattern: 'exact' (exact path), 'contains' (path contains pattern), 'starts_with' (path starts with pattern), 'ends_with' (path ends with pattern)",
          ),
        stateOperation: z.enum([
          unionOperation,
          intersectionOperation,
          replaceOperation,
          subtractionOperation,
        ]).describe(
          "How to combine with existing results: 'replace', 'union' (add to existing), 'intersection' (keep only common symbols)",
        ),
      }),
    },
  );

  const getManifestOverviewTool = tool(
    () => {
      const files = Object.values(dependencyManifest);
      const totalSymbols = files.reduce(
        (sum, file) => sum + Object.keys(file.symbols).length,
        0,
      );

      const languages = [...new Set(files.map((f) => f.language))];
      const symbolTypes = new Map<string, number>();

      files.forEach((file) => {
        Object.values(file.symbols).forEach((symbol) => {
          symbolTypes.set(symbol.type, (symbolTypes.get(symbol.type) || 0) + 1);
        });
      });

      return JSON.stringify({
        totalFiles: files.length,
        totalSymbols,
        languages,
        symbolTypeBreakdown: Object.fromEntries(symbolTypes),
        fileIds: Object.keys(dependencyManifest),
      });
    },
    {
      name: "getManifestOverview",
      description:
        "Get a high-level overview of the entire codebase including file count, symbol count, languages, and symbol type breakdown. Use this to understand the structure before searching.",
    },
  );

  const getFileDetailsTool = tool(
    (input: { fileId: string }) => {
      const file = dependencyManifest[input.fileId];
      if (!file) {
        return { error: "File not found" };
      }

      return JSON.stringify({
        fileId: input.fileId,
        filePath: file.filePath,
        language: file.language,
        metrics: file.metrics,
        dependencies: file.dependencies,
        dependents: file.dependents,
        symbolCount: Object.keys(file.symbols).length,
        symbols: Object.keys(file.symbols),
      });
    },
    {
      name: "getFileDetails",
      description:
        "Get detailed information about a specific file including its metrics, dependencies, and symbols. Use this to understand a file's characteristics and relationships.",
      schema: z.object({
        fileId: z.string().describe("The ID of the file to get details for"),
      }),
    },
  );

  const getSymbolDetailsTool = tool(
    (input: { fileId: string; symbolId: string }) => {
      const file = dependencyManifest[input.fileId];
      if (!file) {
        return { error: "File not found" };
      }

      const symbol = file.symbols[input.symbolId];
      if (!symbol) {
        return { error: "Symbol not found" };
      }

      return JSON.stringify({
        fileId: input.fileId,
        filePath: file.filePath,
        language: file.language,
        symbolId: input.symbolId,
        symbolType: symbol.type,
        description: symbol.description,
        metrics: symbol.metrics,
        dependencies: symbol.dependencies,
        dependents: symbol.dependents,
      });
    },
    {
      name: "getSymbolDetails",
      description:
        "Get detailed information about a specific symbol including its type, description, metrics, and dependencies. Use this to understand a symbol's characteristics and relationships.",
      schema: z.object({
        fileId: z.string().describe("The ID of the file containing the symbol"),
        symbolId: z.string().describe(
          "The ID of the symbol to get details for",
        ),
      }),
    },
  );

  const getSymbolDescriptionTool = tool(
    (input: { fileId: string; symbolId: string }) => {
      const file = dependencyManifest[input.fileId];
      if (!file) {
        return { error: "File not found" };
      }

      const symbol = file.symbols[input.symbolId];
      if (!symbol) {
        return { error: "Symbol not found" };
      }

      return symbol.description || "No description available";
    },
    {
      name: "getSymbolDescription",
      description:
        "Get the description of a specific symbol. Use this to understand what a symbol does before deciding if it matches your search criteria.",
      schema: z.object({
        fileId: z.string().describe("The ID of the file containing the symbol"),
        symbolId: z.string().describe(
          "The ID of the symbol to get description for",
        ),
      }),
    },
  );

  return [
    semanticSearchTool,
    fileMetricSearchTool,
    symbolMetricSearchTool,
    symbolTypeSearchTool,
    filePatternSearchTool,
    getManifestOverviewTool,
    getFileDetailsTool,
    getSymbolDetailsTool,
    getSymbolDescriptionTool,
  ];
}
