import { HumanMessage } from "@langchain/core/messages";
import type { dependencyManifestTypes } from "@stackcore/shared";
import { createSmartFilterWorkflow } from "./graph.ts";

export async function smartFilter(
  dependencyManifestId: number,
  dependencyManifest: dependencyManifestTypes.DependencyManifest,
  prompt: string,
) {
  const workflow = createSmartFilterWorkflow(
    dependencyManifestId,
    dependencyManifest,
  );

  const result = await workflow.invoke({
    messages: [
      new HumanMessage(prompt),
    ],
  });

  return result.results.data;
}
