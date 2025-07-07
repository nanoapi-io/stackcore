import {
  PGVectorStore,
  type PGVectorStoreArgs,
} from "@langchain/community/vectorstores/pgvector";
import settings from "../settings.ts";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { poolConfig } from "./database.ts";
import type { dependencyManifestTypes } from "@stackcore/shared";

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "text-embedding-004",
  apiKey: settings.AI.GOOGLE.API_KEY,
  maxConcurrency: 100,
});

const config: PGVectorStoreArgs = {
  postgresConnectionOptions: poolConfig,
  tableName: "manifestEmbeddings",
  columns: {
    idColumnName: "id",
    vectorColumnName: "vector",
    contentColumnName: "content",
    metadataColumnName: "metadata",
  },
  distanceStrategy: "cosine",
};

let vectorStore: PGVectorStore;

export async function initializeVectorStore() {
  vectorStore = await PGVectorStore.initialize(embeddings, config);
}

export async function destroyVectorStore() {
  await vectorStore.end();
}

export async function embedManifest(
  workspaceId: number,
  projectId: number,
  manifestId: number,
  manifest: dependencyManifestTypes.DependencyManifest,
) {
  const documents: {
    pageContent: string;
    metadata: {
      workspaceId: number;
      projectId: number;
      manifestId: number;
      fileId: string;
      symbolId: string;
    };
  }[] = [];

  for (const file of Object.values(manifest)) {
    for (const symbol of Object.values(file.symbols)) {
      // Skip symbols with no description
      if (symbol.description.length === 0) {
        continue;
      }

      const document = {
        id: crypto.randomUUID(),
        pageContent: symbol.description,
        metadata: {
          workspaceId,
          projectId,
          manifestId,
          fileId: file.id,
          symbolId: symbol.id,
        },
      };
      documents.push(document);
    }
  }

  if (documents.length > 0) {
    await vectorStore.addDocuments(documents);
  }
}

export async function searchManifest(
  query: string,
  limit: number,
  filter: {
    workspaceId?: number;
    projectId?: number;
    manifestId?: number;
    fileId?: string;
    symbolId?: string;
  },
) {
  const results = await vectorStore.similaritySearch(query, limit, filter) as {
    id: string;
    pageContent: string;
    metadata: {
      workspaceId: number;
      projectId: number;
      manifestId: number;
      fileId: string;
      symbolId: string;
    };
  }[];

  return results;
}
