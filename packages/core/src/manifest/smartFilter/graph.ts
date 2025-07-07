import type { dependencyManifestTypes } from "@stackcore/shared";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import settings from "../../settings.ts";
import { getTools } from "./tools.ts";
import {
  type AIMessage,
  type BaseMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";

export const unionOperation = "union";
export const intersectionOperation = "intersection";
export const subtractionOperation = "subtraction";
export const replaceOperation = "replace";

export function createSmartFilterWorkflow(
  dependencyManifestId: number,
  dependencyManifest: dependencyManifestTypes.DependencyManifest,
) {
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    apiKey: settings.AI.GOOGLE.API_KEY,
  });
  const tools = getTools(dependencyManifestId, dependencyManifest);
  const modelWithTools = model.bindTools(tools);

  const StateAnnotation = Annotation.Root({
    userPrompt: Annotation<string>,
    messages: Annotation<BaseMessage[]>({
      reducer: (acc, value) => [...acc, ...value],
      default: () => [
        new SystemMessage(
          `You are a symbol filtering assistant that finds code elements in a codebase.
  You can only call tools. You cannot ask the user for more input.
  
  ## Search Tools:
  - **semanticSearch**: Find by meaning ("authentication functions", "error handling")
  - **symbolTypeSearch**: Find by type (class, function, interface, etc.)
  - **metricSearch**: Find by complexity, size, or dependencies
  - **filePatternSearch**: Find by file path patterns
  - **fileMetricSearch**: Find by file-level metrics
  
  ## Operations:
  - 'replace': Start fresh with new results
  - 'union': Add to existing results
  - 'intersection': Keep only common symbols
  - 'subtraction': Remove from existing results
  
  ## Strategy:
  1. Understand what the user wants
  2. Choose appropriate search tool(s)
  3. Use operations to combine results intelligently
  4. Always specify stateOperation parameter
  
  Examples:
  - "all classes" → symbolTypeSearch with replace
  - "also functions" → symbolTypeSearch with union  
  - "high complexity only" → metricSearch with intersection
  - "in models/" → filePatternSearch with intersection
  
  Start broad, then narrow down. Use semantic search for concepts, metrics for quality criteria.`,
        ),
      ],
    }),
    results: Annotation<{
      data: {
        fileId: string;
        symbolId: string;
      }[];
      operation?:
        | typeof unionOperation
        | typeof intersectionOperation
        | typeof subtractionOperation
        | typeof replaceOperation;
    }>({
      reducer: (acc, value) => {
        if (value.operation === replaceOperation) {
          return {
            data: value.data,
          };
        }
        if (value.operation === unionOperation) {
          // Union: Combine current and new results, removing duplicates
          const newData = [...acc.data];
          for (const item of value.data) {
            const isDuplicate = newData.some(
              (i) => i.fileId === item.fileId && i.symbolId === item.symbolId,
            );
            if (!isDuplicate) {
              newData.push(item);
            }
          }
          return { data: newData };
        }

        if (value.operation === intersectionOperation) {
          // Intersection: Keep only items that exist in both sets
          const newData = value.data.filter((item) =>
            acc.data.some(
              (i) => i.fileId === item.fileId && i.symbolId === item.symbolId,
            )
          );
          return { data: newData };
        }

        if (value.operation === subtractionOperation) {
          // Subtraction: Remove items in value.data from acc.data
          const newData = acc.data.filter(
            (item) =>
              !value.data.some(
                (i) => i.fileId === item.fileId && i.symbolId === item.symbolId,
              ),
          );
          return { data: newData };
        }

        if (value.operation === replaceOperation) {
          // Replace: Simply use the new data
          return { data: value.data };
        }

        // no operation, so we just return the accumulator
        return acc;
      },
      default: () => ({
        data: [],
      }),
    }),
  });

  async function agentNode(state: typeof StateAnnotation.State) {
    const messages = state.messages;

    const response = await modelWithTools.invoke(messages);
    return {
      messages: [response],
    };
  }

  // deno-lint-ignore no-explicit-any
  const toolNode = new ToolNode(tools as any[]);

  function routeMessage(state: typeof StateAnnotation.State) {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1] as AIMessage;
    // If no tools are called, we can finish (respond to the user)
    if (!lastMessage.tool_calls?.length) {
      return "finalize";
    }

    // Otherwise if there is, we continue and call the tools
    return "tool";
  }

  async function finalizeNode(state: typeof StateAnnotation.State) {
    const messages = [
      ...state.messages,
      new HumanMessage(`
    You are done with your work.
    Explain what you did to get the results and why you did it.
    Do not use the tools name, explain what you did in plain language.
    Summarize the results in a short one message sentence to the user.
      `),
      new HumanMessage(`
        Here is an overview of the results found:
        ${JSON.stringify(state.results.data)}

        Here is the user's prompt:
        ${state.userPrompt}
      `),
    ];

    const response = await model.invoke(messages);

    console.log(1111111111, response);
    return {
      messages: [response],
    };
  }

  const graph = new StateGraph(StateAnnotation)
    .addNode("agent", agentNode)
    .addNode("tool", toolNode)
    .addNode("finalize", finalizeNode)
    .addEdge(START, "agent")
    .addConditionalEdges("agent", routeMessage)
    .addEdge("tool", "agent")
    .addEdge("finalize", END);

  const compiledGraph = graph.compile({});

  return compiledGraph;
}
