import { assertEquals, assertNotEquals } from "@std/assert";
import api from "../index.ts";
import { db, destroyKyselyDb, initKyselyDb } from "../../db/database.ts";
import { resetTables } from "../../testHelpers/db.ts";
import { createTestUserAndToken } from "../../testHelpers/auth.ts";
import { WorkspaceService } from "../workspace/service.ts";
import { ProjectService } from "../project/service.ts";
import { ManifestService } from "./service.ts";
import {
  type dependencyManifestTypes,
  manifestApiTypes,
} from "@stackcore/shared";
import { downloadJsonFromBucket } from "../../bucketStorage/index.ts";

// Helper function to provide default project configuration values
function getDefaultProjectConfig() {
  return {
    maxCodeCharPerSymbol: 1000,
    maxCodeCharPerFile: 50000,
    maxCharPerSymbol: 2000,
    maxCharPerFile: 100000,
    maxCodeLinePerSymbol: 50,
    maxCodeLinePerFile: 2000,
    maxLinePerSymbol: 100,
    maxLinePerFile: 4000,
    maxDependencyPerSymbol: 10,
    maxDependencyPerFile: 100,
    maxDependentPerSymbol: 20,
    maxDependentPerFile: 200,
    maxCyclomaticComplexityPerSymbol: 10,
    maxCyclomaticComplexityPerFile: 100,
  };
}

// --- CREATE MANIFEST TESTS ---
Deno.test("create a manifest", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    const workspaceService = new WorkspaceService();
    await workspaceService.createTeamWorkspace("Test Workspace", userId);

    const workspace = await db
      .selectFrom("workspace")
      .selectAll()
      .where("name", "=", "Test Workspace")
      .executeTakeFirstOrThrow();

    const projectService = new ProjectService();
    const config = getDefaultProjectConfig();
    await projectService.createProject(
      userId,
      {
        name: "Test Project",
        repoUrl: "https://github.com/test/test",
        workspaceId: workspace.id,
        maxCodeCharPerSymbol: config.maxCodeCharPerSymbol,
        maxCodeCharPerFile: config.maxCodeCharPerFile,
        maxCharPerSymbol: config.maxCharPerSymbol,
        maxCharPerFile: config.maxCharPerFile,
        maxCodeLinePerSymbol: config.maxCodeLinePerSymbol,
        maxCodeLinePerFile: config.maxCodeLinePerFile,
        maxLinePerSymbol: config.maxLinePerSymbol,
        maxLinePerFile: config.maxLinePerFile,
        maxDependencyPerSymbol: config.maxDependencyPerSymbol,
        maxDependencyPerFile: config.maxDependencyPerFile,
        maxDependentPerSymbol: config.maxDependentPerSymbol,
        maxDependentPerFile: config.maxDependentPerFile,
        maxCyclomaticComplexityPerSymbol:
          config.maxCyclomaticComplexityPerSymbol,
        maxCyclomaticComplexityPerFile: config.maxCyclomaticComplexityPerFile,
      },
    );

    const project = await db
      .selectFrom("project")
      .selectAll()
      .where("name", "=", "Test Project")
      .executeTakeFirstOrThrow();

    const sampleManifest: dependencyManifestTypes.DependencyManifest = {
      "src/index.py": {
        id: "src/index.py",
        filePath: "src/index.py",
        language: "python",
        metrics: {
          linesCount: 12,
          codeLineCount: 8,
          characterCount: 200,
          codeCharacterCount: 150,
          dependencyCount: 1,
          dependentCount: 0,
          cyclomaticComplexity: 3,
        },
        dependencies: {
          "./utils": {
            id: "./utils",
            isExternal: false,
            symbols: {},
          },
        },
        dependents: {},
        symbols: {
          "MyClass": {
            id: "MyClass",
            type: "class" as const,
            metrics: {
              linesCount: 12,
              codeLineCount: 8,
              characterCount: 200,
              codeCharacterCount: 150,
              dependencyCount: 1,
              dependentCount: 0,
              cyclomaticComplexity: 3,
            },
            description: "",
            dependencies: {
              "./utils.py": {
                id: "./utils.py",
                isExternal: false,
                symbols: {},
              },
            },
            dependents: {},
          },
        },
      },
    };

    // Create a manifest via API
    const { url, method, body } = manifestApiTypes.prepareCreateManifest({
      projectId: project.id,
      branch: "main",
      commitSha: "abc123",
      commitShaDate: new Date(),
      manifest: sampleManifest,
    });

    const createResponse = await api.handle(
      new Request(`http://localhost:3000${url}`, {
        method,
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      }),
    );

    assertEquals(createResponse?.status, 201);

    const responseBody = await createResponse?.json();
    assertEquals(typeof responseBody.id, "number");

    // Verify manifest was created in database
    const manifest = await db
      .selectFrom("manifest")
      .selectAll()
      .where("id", "=", responseBody.id)
      .executeTakeFirstOrThrow();

    assertEquals(manifest.project_id, project.id);
    assertEquals(manifest.branch, "main");
    assertEquals(manifest.commitSha, "abc123");
    assertEquals(manifest.version, 1);

    // Verify manifest was created in bucket
    const manifestContent = await downloadJsonFromBucket(manifest.manifest);
    assertEquals(manifestContent, sampleManifest);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("create a manifest - non-member of workspace", async () => {
  initKyselyDb();
  await resetTables();

  try {
    // Create first user with workspace and project
    const { userId } = await createTestUserAndToken();

    const workspaceService = new WorkspaceService();
    await workspaceService.createTeamWorkspace("Test Workspace", userId);

    const workspace = await db
      .selectFrom("workspace")
      .selectAll()
      .where("name", "=", "Test Workspace")
      .executeTakeFirstOrThrow();

    const projectService = new ProjectService();
    const config = getDefaultProjectConfig();
    await projectService.createProject(
      userId,
      {
        name: "Test Project",
        repoUrl: "https://github.com/test/test",
        workspaceId: workspace.id,
        maxCodeCharPerSymbol: config.maxCodeCharPerSymbol,
        maxCodeCharPerFile: config.maxCodeCharPerFile,
        maxCharPerSymbol: config.maxCharPerSymbol,
        maxCharPerFile: config.maxCharPerFile,
        maxCodeLinePerSymbol: config.maxCodeLinePerSymbol,
        maxCodeLinePerFile: config.maxCodeLinePerFile,
        maxLinePerSymbol: config.maxLinePerSymbol,
        maxLinePerFile: config.maxLinePerFile,
        maxDependencyPerSymbol: config.maxDependencyPerSymbol,
        maxDependencyPerFile: config.maxDependencyPerFile,
        maxDependentPerSymbol: config.maxDependentPerSymbol,
        maxDependentPerFile: config.maxDependentPerFile,
        maxCyclomaticComplexityPerSymbol:
          config.maxCyclomaticComplexityPerSymbol,
        maxCyclomaticComplexityPerFile: config.maxCyclomaticComplexityPerFile,
      },
    );

    const project = await db
      .selectFrom("project")
      .selectAll()
      .where("name", "=", "Test Project")
      .executeTakeFirstOrThrow();

    // Create second user (not a member of the workspace)
    const { token: nonMemberToken } = await createTestUserAndToken();

    // Try to create a manifest in a project the user doesn't have access to
    const { url, method, body } = manifestApiTypes.prepareCreateManifest({
      projectId: project.id,
      branch: "main",
      commitSha: "abc123",
      commitShaDate: null,
      manifest: { test: "data" },
    });

    const response = await api.handle(
      new Request(`http://localhost:3000${url}`, {
        method,
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${nonMemberToken}`,
        },
      }),
    );

    assertEquals(response?.status, 400);
    const responseBody = await response?.json();
    assertEquals(responseBody.error, "project_not_found");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("create manifest - invalid input validation", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { token } = await createTestUserAndToken();

    // Test with invalid JSON
    const { url, method } = manifestApiTypes.prepareCreateManifest({
      projectId: 999,
      branch: "main",
      commitSha: "abc123",
      commitShaDate: new Date(),
      manifest: { test: "data" },
    });

    const response = await api.handle(
      new Request(`http://localhost:3000${url}`, {
        method,
        body: JSON.stringify({ invalidField: "test" }),
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      }),
    );
    assertEquals(response?.status, 400);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("create manifest - workspace access disabled", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    const workspaceService = new WorkspaceService();
    await workspaceService.createTeamWorkspace("Test Workspace", userId);

    const workspace = await db
      .selectFrom("workspace")
      .selectAll()
      .where("name", "=", "Test Workspace")
      .executeTakeFirstOrThrow();

    // Disable workspace access
    await db
      .updateTable("workspace")
      .set({ access_enabled: false })
      .where("id", "=", workspace.id)
      .execute();

    const projectService = new ProjectService();
    const config = getDefaultProjectConfig();
    await projectService.createProject(
      userId,
      {
        name: "Test Project",
        repoUrl: "https://github.com/test/test",
        workspaceId: workspace.id,
        maxCodeCharPerSymbol: config.maxCodeCharPerSymbol,
        maxCodeCharPerFile: config.maxCodeCharPerFile,
        maxCharPerSymbol: config.maxCharPerSymbol,
        maxCharPerFile: config.maxCharPerFile,
        maxCodeLinePerSymbol: config.maxCodeLinePerSymbol,
        maxCodeLinePerFile: config.maxCodeLinePerFile,
        maxLinePerSymbol: config.maxLinePerSymbol,
        maxLinePerFile: config.maxLinePerFile,
        maxDependencyPerSymbol: config.maxDependencyPerSymbol,
        maxDependencyPerFile: config.maxDependencyPerFile,
        maxDependentPerSymbol: config.maxDependentPerSymbol,
        maxDependentPerFile: config.maxDependentPerFile,
        maxCyclomaticComplexityPerSymbol:
          config.maxCyclomaticComplexityPerSymbol,
        maxCyclomaticComplexityPerFile: config.maxCyclomaticComplexityPerFile,
      },
    );

    const project = await db
      .selectFrom("project")
      .selectAll()
      .where("name", "=", "Test Project")
      .executeTakeFirstOrThrow();

    // Try to create a manifest with disabled workspace access
    const { url, method, body } = manifestApiTypes.prepareCreateManifest({
      projectId: project.id,
      branch: "main",
      commitSha: "abc123",
      commitShaDate: new Date(),
      manifest: { test: "data" },
    });

    const response = await api.handle(
      new Request(`http://localhost:3000${url}`, {
        method,
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      }),
    );

    assertEquals(response?.status, 400);
    const responseBody = await response?.json();
    assertEquals(responseBody.error, "access_disabled");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

// --- GET MANIFESTS TESTS ---
Deno.test("get manifests", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    // Create workspace and project first
    const workspaceService = new WorkspaceService();
    await workspaceService.createTeamWorkspace("Test Workspace", userId);

    const workspace = await db
      .selectFrom("workspace")
      .selectAll()
      .where("name", "=", "Test Workspace")
      .executeTakeFirstOrThrow();

    const projectService = new ProjectService();
    const config = getDefaultProjectConfig();
    await projectService.createProject(
      userId,
      {
        name: "Test Project",
        repoUrl: "https://github.com/test/test",
        workspaceId: workspace.id,
        maxCodeCharPerSymbol: config.maxCodeCharPerSymbol,
        maxCodeCharPerFile: config.maxCodeCharPerFile,
        maxCharPerSymbol: config.maxCharPerSymbol,
        maxCharPerFile: config.maxCharPerFile,
        maxCodeLinePerSymbol: config.maxCodeLinePerSymbol,
        maxCodeLinePerFile: config.maxCodeLinePerFile,
        maxLinePerSymbol: config.maxLinePerSymbol,
        maxLinePerFile: config.maxLinePerFile,
        maxDependencyPerSymbol: config.maxDependencyPerSymbol,
        maxDependencyPerFile: config.maxDependencyPerFile,
        maxDependentPerSymbol: config.maxDependentPerSymbol,
        maxDependentPerFile: config.maxDependentPerFile,
        maxCyclomaticComplexityPerSymbol:
          config.maxCyclomaticComplexityPerSymbol,
        maxCyclomaticComplexityPerFile: config.maxCyclomaticComplexityPerFile,
      },
    );

    const project = await db
      .selectFrom("project")
      .selectAll()
      .where("name", "=", "Test Project")
      .executeTakeFirstOrThrow();

    // Create manifests
    const manifestService = new ManifestService();
    for (let i = 0; i < 10; i++) {
      await manifestService.createManifest(
        userId,
        project.id,
        `branch-${i}`,
        `commit-${i}`,
        new Date(),
        {},
      );
    }

    const { url, method } = manifestApiTypes.prepareGetManifests({
      page: 1,
      limit: 5,
      projectId: project.id,
    });

    const response = await api.handle(
      new Request(`http://localhost:3000${url}`, {
        method,
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }),
    );

    assertEquals(response?.status, 200);
    const responseBody = await response?.json();
    assertEquals(responseBody.total, 10);
    assertEquals(responseBody.results.length, 5);

    // Verify the manifest field is not included in list view
    assertEquals(responseBody.results[0].manifest, undefined);
    assertEquals(typeof responseBody.results[0].id, "number");
    assertEquals(responseBody.results[0].project_id, project.id);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("get manifests with workspace filter", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    // Create workspace and project
    const workspaceService = new WorkspaceService();
    await workspaceService.createTeamWorkspace("Test Workspace", userId);

    const workspace = await db
      .selectFrom("workspace")
      .selectAll()
      .where("name", "=", "Test Workspace")
      .executeTakeFirstOrThrow();

    const projectService = new ProjectService();
    const config = getDefaultProjectConfig();
    await projectService.createProject(
      userId,
      {
        name: "Test Project",
        repoUrl: "https://github.com/test/test",
        workspaceId: workspace.id,
        maxCodeCharPerSymbol: config.maxCodeCharPerSymbol,
        maxCodeCharPerFile: config.maxCodeCharPerFile,
        maxCharPerSymbol: config.maxCharPerSymbol,
        maxCharPerFile: config.maxCharPerFile,
        maxCodeLinePerSymbol: config.maxCodeLinePerSymbol,
        maxCodeLinePerFile: config.maxCodeLinePerFile,
        maxLinePerSymbol: config.maxLinePerSymbol,
        maxLinePerFile: config.maxLinePerFile,
        maxDependencyPerSymbol: config.maxDependencyPerSymbol,
        maxDependencyPerFile: config.maxDependencyPerFile,
        maxDependentPerSymbol: config.maxDependentPerSymbol,
        maxDependentPerFile: config.maxDependentPerFile,
        maxCyclomaticComplexityPerSymbol:
          config.maxCyclomaticComplexityPerSymbol,
        maxCyclomaticComplexityPerFile: config.maxCyclomaticComplexityPerFile,
      },
    );

    const project = await db
      .selectFrom("project")
      .selectAll()
      .where("name", "=", "Test Project")
      .executeTakeFirstOrThrow();

    // Create manifest
    const manifestService = new ManifestService();
    await manifestService.createManifest(
      userId,
      project.id,
      "main",
      "abc123",
      new Date(),
      {},
    );

    const { url, method } = manifestApiTypes.prepareGetManifests({
      page: 1,
      limit: 10,
      workspaceId: workspace.id,
    });

    const response = await api.handle(
      new Request(`http://localhost:3000${url}`, {
        method,
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }),
    );

    assertEquals(response?.status, 200);
    const responseBody = await response?.json();
    assertEquals(responseBody.total, 1);
    assertEquals(responseBody.results.length, 1);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("get manifests with search", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    // Create workspace and project
    const workspaceService = new WorkspaceService();
    await workspaceService.createTeamWorkspace("Test Workspace", userId);

    const workspace = await db
      .selectFrom("workspace")
      .selectAll()
      .where("name", "=", "Test Workspace")
      .executeTakeFirstOrThrow();

    const projectService = new ProjectService();
    const config = getDefaultProjectConfig();
    await projectService.createProject(
      userId,
      {
        name: "Test Project",
        repoUrl: "https://github.com/test/test",
        workspaceId: workspace.id,
        maxCodeCharPerSymbol: config.maxCodeCharPerSymbol,
        maxCodeCharPerFile: config.maxCodeCharPerFile,
        maxCharPerSymbol: config.maxCharPerSymbol,
        maxCharPerFile: config.maxCharPerFile,
        maxCodeLinePerSymbol: config.maxCodeLinePerSymbol,
        maxCodeLinePerFile: config.maxCodeLinePerFile,
        maxLinePerSymbol: config.maxLinePerSymbol,
        maxLinePerFile: config.maxLinePerFile,
        maxDependencyPerSymbol: config.maxDependencyPerSymbol,
        maxDependencyPerFile: config.maxDependencyPerFile,
        maxDependentPerSymbol: config.maxDependentPerSymbol,
        maxDependentPerFile: config.maxDependentPerFile,
        maxCyclomaticComplexityPerSymbol:
          config.maxCyclomaticComplexityPerSymbol,
        maxCyclomaticComplexityPerFile: config.maxCyclomaticComplexityPerFile,
      },
    );

    const project = await db
      .selectFrom("project")
      .selectAll()
      .where("name", "=", "Test Project")
      .executeTakeFirstOrThrow();

    // Create manifests with different branches
    const manifestService = new ManifestService();
    await manifestService.createManifest(
      userId,
      project.id,
      "main",
      "abc123",
      new Date(),
      {},
    );
    await manifestService.createManifest(
      userId,
      project.id,
      "feature-xyz",
      "def456",
      new Date(),
      {},
    );

    const { url, method } = manifestApiTypes.prepareGetManifests({
      page: 1,
      limit: 10,
      search: "feature",
      projectId: project.id,
    });

    const response = await api.handle(
      new Request(`http://localhost:3000${url}`, {
        method,
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }),
    );

    assertEquals(response?.status, 200);
    const responseBody = await response?.json();
    assertEquals(responseBody.total, 1);
    assertEquals(responseBody.results.length, 1);
    assertEquals(responseBody.results[0].branch, "feature-xyz");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

// --- PAGINATION TESTS ---
Deno.test("get manifests - pagination", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    // Create workspace and project
    const workspaceService = new WorkspaceService();
    await workspaceService.createTeamWorkspace("Test Workspace", userId);

    const workspace = await db
      .selectFrom("workspace")
      .selectAll()
      .where("name", "=", "Test Workspace")
      .executeTakeFirstOrThrow();

    const projectService = new ProjectService();
    const config = getDefaultProjectConfig();
    await projectService.createProject(
      userId,
      {
        name: "Test Project",
        repoUrl: "https://github.com/test/test",
        workspaceId: workspace.id,
        maxCodeCharPerSymbol: config.maxCodeCharPerSymbol,
        maxCodeCharPerFile: config.maxCodeCharPerFile,
        maxCharPerSymbol: config.maxCharPerSymbol,
        maxCharPerFile: config.maxCharPerFile,
        maxCodeLinePerSymbol: config.maxCodeLinePerSymbol,
        maxCodeLinePerFile: config.maxCodeLinePerFile,
        maxLinePerSymbol: config.maxLinePerSymbol,
        maxLinePerFile: config.maxLinePerFile,
        maxDependencyPerSymbol: config.maxDependencyPerSymbol,
        maxDependencyPerFile: config.maxDependencyPerFile,
        maxDependentPerSymbol: config.maxDependentPerSymbol,
        maxDependentPerFile: config.maxDependentPerFile,
        maxCyclomaticComplexityPerSymbol:
          config.maxCyclomaticComplexityPerSymbol,
        maxCyclomaticComplexityPerFile: config.maxCyclomaticComplexityPerFile,
      },
    );

    const project = await db
      .selectFrom("project")
      .selectAll()
      .where("name", "=", "Test Project")
      .executeTakeFirstOrThrow();

    // Create 10 manifests
    const manifestService = new ManifestService();
    for (let i = 0; i < 10; i++) {
      await manifestService.createManifest(
        userId,
        project.id,
        `branch-${i}`,
        `commit-${i}`,
        new Date(),
        {},
      );
    }

    // Test second page
    const { url, method } = manifestApiTypes.prepareGetManifests({
      page: 2,
      limit: 5,
      projectId: project.id,
    });

    const response = await api.handle(
      new Request(`http://localhost:3000${url}`, {
        method,
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }),
    );

    assertEquals(response?.status, 200);
    const responseBody = await response?.json();
    assertEquals(responseBody.total, 10);
    assertEquals(responseBody.results.length, 5);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("get manifests - invalid pagination parameters", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { token } = await createTestUserAndToken();

    // Test with invalid page number
    const response = await api.handle(
      new Request(
        "http://localhost:3000/manifests?page=invalid&limit=5",
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        },
      ),
    );
    assertEquals(response?.status, 400);

    // Test with invalid limit
    const response2 = await api.handle(
      new Request(
        "http://localhost:3000/manifests?page=1&limit=invalid",
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        },
      ),
    );
    assertEquals(response2?.status, 400);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

// --- GET MANIFEST DETAILS TESTS ---
Deno.test("get manifest details", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    // Create workspace and project
    const workspaceService = new WorkspaceService();
    await workspaceService.createTeamWorkspace("Test Workspace", userId);

    const workspace = await db
      .selectFrom("workspace")
      .selectAll()
      .where("name", "=", "Test Workspace")
      .executeTakeFirstOrThrow();

    const projectService = new ProjectService();
    const config = getDefaultProjectConfig();
    await projectService.createProject(
      userId,
      {
        name: "Test Project",
        repoUrl: "https://github.com/test/test",
        workspaceId: workspace.id,
        maxCodeCharPerSymbol: config.maxCodeCharPerSymbol,
        maxCodeCharPerFile: config.maxCodeCharPerFile,
        maxCharPerSymbol: config.maxCharPerSymbol,
        maxCharPerFile: config.maxCharPerFile,
        maxCodeLinePerSymbol: config.maxCodeLinePerSymbol,
        maxCodeLinePerFile: config.maxCodeLinePerFile,
        maxLinePerSymbol: config.maxLinePerSymbol,
        maxLinePerFile: config.maxLinePerFile,
        maxDependencyPerSymbol: config.maxDependencyPerSymbol,
        maxDependencyPerFile: config.maxDependencyPerFile,
        maxDependentPerSymbol: config.maxDependentPerSymbol,
        maxDependentPerFile: config.maxDependentPerFile,
        maxCyclomaticComplexityPerSymbol:
          config.maxCyclomaticComplexityPerSymbol,
        maxCyclomaticComplexityPerFile: config.maxCyclomaticComplexityPerFile,
      },
    );

    const project = await db
      .selectFrom("project")
      .selectAll()
      .where("name", "=", "Test Project")
      .executeTakeFirstOrThrow();

    // Create manifest
    const manifestService = new ManifestService();
    const sampleManifest: dependencyManifestTypes.DependencyManifest = {
      "src/index.py": {
        id: "src/index.py",
        filePath: "src/index.py",
        language: "python",
        metrics: {
          linesCount: 12,
          codeLineCount: 8,
          characterCount: 200,
          codeCharacterCount: 150,
          dependencyCount: 1,
          dependentCount: 0,
          cyclomaticComplexity: 3,
        },
        dependencies: {
          "./utils": {
            id: "./utils",
            isExternal: false,
            symbols: {},
          },
        },
        dependents: {},
        symbols: {
          "MyClass": {
            id: "MyClass",
            type: "class" as const,
            metrics: {
              linesCount: 12,
              codeLineCount: 8,
              characterCount: 200,
              codeCharacterCount: 150,
              dependencyCount: 1,
              dependentCount: 0,
              cyclomaticComplexity: 3,
            },
            description: "",
            dependencies: {
              "./utils.py": {
                id: "./utils.py",
                isExternal: false,
                symbols: {},
              },
            },
            dependents: {},
          },
        },
      },
    };
    const createResponse = await manifestService.createManifest(
      userId,
      project.id,
      "main",
      "abc123",
      new Date(),
      sampleManifest,
    );

    if ("error" in createResponse) {
      throw new Error(createResponse.error);
    }

    await db
      .selectFrom("manifest")
      .selectAll()
      .where("id", "=", createResponse.id)
      .executeTakeFirstOrThrow();

    const { url, method } = manifestApiTypes.prepareGetManifestDetails(
      createResponse.id,
    );

    const response = await api.handle(
      new Request(`http://localhost:3000${url}`, {
        method,
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }),
    );

    assertEquals(response?.status, 200);
    const manifest = await response?.json();
    assertEquals(manifest.id, createResponse.id);
    assertEquals(manifest.project_id, project.id);
    assertEquals(manifest.branch, "main");
    assertEquals(manifest.commitSha, "abc123");
    assertEquals(manifest.version, 1);
    assertEquals(manifest.manifest.length > 0, true);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("get manifest details - non-member", async () => {
  initKyselyDb();
  await resetTables();

  try {
    // Create first user with workspace, project, and manifest
    const { userId } = await createTestUserAndToken();

    const workspaceService = new WorkspaceService();
    await workspaceService.createTeamWorkspace("Test Workspace", userId);

    const workspace = await db
      .selectFrom("workspace")
      .selectAll()
      .where("name", "=", "Test Workspace")
      .executeTakeFirstOrThrow();

    const projectService = new ProjectService();
    const config = getDefaultProjectConfig();
    await projectService.createProject(
      userId,
      {
        name: "Test Project",
        repoUrl: "https://github.com/test/test",
        workspaceId: workspace.id,
        maxCodeCharPerSymbol: config.maxCodeCharPerSymbol,
        maxCodeCharPerFile: config.maxCodeCharPerFile,
        maxCharPerSymbol: config.maxCharPerSymbol,
        maxCharPerFile: config.maxCharPerFile,
        maxCodeLinePerSymbol: config.maxCodeLinePerSymbol,
        maxCodeLinePerFile: config.maxCodeLinePerFile,
        maxLinePerSymbol: config.maxLinePerSymbol,
        maxLinePerFile: config.maxLinePerFile,
        maxDependencyPerSymbol: config.maxDependencyPerSymbol,
        maxDependencyPerFile: config.maxDependencyPerFile,
        maxDependentPerSymbol: config.maxDependentPerSymbol,
        maxDependentPerFile: config.maxDependentPerFile,
        maxCyclomaticComplexityPerSymbol:
          config.maxCyclomaticComplexityPerSymbol,
        maxCyclomaticComplexityPerFile: config.maxCyclomaticComplexityPerFile,
      },
    );

    const project = await db
      .selectFrom("project")
      .selectAll()
      .where("name", "=", "Test Project")
      .executeTakeFirstOrThrow();

    const manifestService = new ManifestService();
    const createResponse = await manifestService.createManifest(
      userId,
      project.id,
      "main",
      "abc123",
      new Date(),
      {},
    );

    if ("error" in createResponse) {
      throw new Error(createResponse.error);
    }

    // Create second user (not a member of the workspace)
    const { token: nonMemberToken } = await createTestUserAndToken();

    const { url, method } = manifestApiTypes.prepareGetManifestDetails(
      createResponse.id,
    );

    const response = await api.handle(
      new Request(`http://localhost:3000${url}`, {
        method,
        headers: {
          "Authorization": `Bearer ${nonMemberToken}`,
        },
      }),
    );

    assertEquals(response?.status, 400);
    const responseBody = await response?.json();
    assertEquals(responseBody.error, "manifest_not_found");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

// --- DELETE MANIFEST TESTS ---
Deno.test("delete a manifest", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    // Create workspace and project
    const workspaceService = new WorkspaceService();
    await workspaceService.createTeamWorkspace("Test Workspace", userId);

    const workspace = await db
      .selectFrom("workspace")
      .selectAll()
      .where("name", "=", "Test Workspace")
      .executeTakeFirstOrThrow();

    const projectService = new ProjectService();
    const config = getDefaultProjectConfig();
    await projectService.createProject(
      userId,
      {
        name: "Test Project",
        repoUrl: "https://github.com/test/test",
        workspaceId: workspace.id,
        maxCodeCharPerSymbol: config.maxCodeCharPerSymbol,
        maxCodeCharPerFile: config.maxCodeCharPerFile,
        maxCharPerSymbol: config.maxCharPerSymbol,
        maxCharPerFile: config.maxCharPerFile,
        maxCodeLinePerSymbol: config.maxCodeLinePerSymbol,
        maxCodeLinePerFile: config.maxCodeLinePerFile,
        maxLinePerSymbol: config.maxLinePerSymbol,
        maxLinePerFile: config.maxLinePerFile,
        maxDependencyPerSymbol: config.maxDependencyPerSymbol,
        maxDependencyPerFile: config.maxDependencyPerFile,
        maxDependentPerSymbol: config.maxDependentPerSymbol,
        maxDependentPerFile: config.maxDependentPerFile,
        maxCyclomaticComplexityPerSymbol:
          config.maxCyclomaticComplexityPerSymbol,
        maxCyclomaticComplexityPerFile: config.maxCyclomaticComplexityPerFile,
      },
    );

    const project = await db
      .selectFrom("project")
      .selectAll()
      .where("name", "=", "Test Project")
      .executeTakeFirstOrThrow();

    // Create manifest
    const manifestService = new ManifestService();
    const createResponse = await manifestService.createManifest(
      userId,
      project.id,
      "main",
      "abc123",
      new Date(),
      {},
    );

    if ("error" in createResponse) {
      throw new Error(createResponse.error);
    }

    const { url, method } = manifestApiTypes.prepareDeleteManifest(
      createResponse.id,
    );

    const response = await api.handle(
      new Request(`http://localhost:3000${url}`, {
        method,
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }),
    );

    assertEquals(response?.status, 204);

    // Verify manifest was deleted
    const deletedManifest = await db
      .selectFrom("manifest")
      .selectAll()
      .where("id", "=", createResponse.id)
      .executeTakeFirst();

    assertEquals(deletedManifest, undefined);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("delete a manifest - non-member", async () => {
  initKyselyDb();
  await resetTables();

  try {
    // Create first user with workspace, project, and manifest
    const { userId } = await createTestUserAndToken();

    const workspaceService = new WorkspaceService();
    await workspaceService.createTeamWorkspace("Test Workspace", userId);

    const workspace = await db
      .selectFrom("workspace")
      .selectAll()
      .where("name", "=", "Test Workspace")
      .executeTakeFirstOrThrow();

    const projectService = new ProjectService();
    const config = getDefaultProjectConfig();
    await projectService.createProject(
      userId,
      {
        name: "Test Project",
        repoUrl: "https://github.com/test/test",
        workspaceId: workspace.id,
        maxCodeCharPerSymbol: config.maxCodeCharPerSymbol,
        maxCodeCharPerFile: config.maxCodeCharPerFile,
        maxCharPerSymbol: config.maxCharPerSymbol,
        maxCharPerFile: config.maxCharPerFile,
        maxCodeLinePerSymbol: config.maxCodeLinePerSymbol,
        maxCodeLinePerFile: config.maxCodeLinePerFile,
        maxLinePerSymbol: config.maxLinePerSymbol,
        maxLinePerFile: config.maxLinePerFile,
        maxDependencyPerSymbol: config.maxDependencyPerSymbol,
        maxDependencyPerFile: config.maxDependencyPerFile,
        maxDependentPerSymbol: config.maxDependentPerSymbol,
        maxDependentPerFile: config.maxDependentPerFile,
        maxCyclomaticComplexityPerSymbol:
          config.maxCyclomaticComplexityPerSymbol,
        maxCyclomaticComplexityPerFile: config.maxCyclomaticComplexityPerFile,
      },
    );

    const project = await db
      .selectFrom("project")
      .selectAll()
      .where("name", "=", "Test Project")
      .executeTakeFirstOrThrow();

    const manifestService = new ManifestService();
    const createResponse = await manifestService.createManifest(
      userId,
      project.id,
      "main",
      "abc123",
      new Date(),
      {},
    );

    // Create second user (not a member of the workspace)
    const { token: nonMemberToken } = await createTestUserAndToken();

    if ("error" in createResponse) {
      throw new Error(createResponse.error);
    }

    const { url, method } = manifestApiTypes.prepareDeleteManifest(
      createResponse.id,
    );

    const response = await api.handle(
      new Request(`http://localhost:3000${url}`, {
        method,
        headers: {
          "Authorization": `Bearer ${nonMemberToken}`,
        },
      }),
    );

    assertEquals(response?.status, 400);
    const responseBody = await response?.json();
    assertEquals(responseBody.error, "manifest_not_found");

    // Verify manifest still exists
    const existingManifest = await db
      .selectFrom("manifest")
      .selectAll()
      .where("id", "=", createResponse.id)
      .executeTakeFirst();

    assertNotEquals(existingManifest, undefined);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

// --- GET MANIFEST AUDIT TESTS ---
Deno.test("get manifest audit", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    // Create workspace and project
    const workspaceService = new WorkspaceService();
    await workspaceService.createTeamWorkspace("Test Workspace", userId);

    const workspace = await db
      .selectFrom("workspace")
      .selectAll()
      .where("name", "=", "Test Workspace")
      .executeTakeFirstOrThrow();

    const projectService = new ProjectService();
    const config = getDefaultProjectConfig();
    await projectService.createProject(
      userId,
      {
        name: "Test Project",
        repoUrl: "https://github.com/test/test",
        workspaceId: workspace.id,
        maxCodeCharPerSymbol: config.maxCodeCharPerSymbol,
        maxCodeCharPerFile: config.maxCodeCharPerFile,
        maxCharPerSymbol: config.maxCharPerSymbol,
        maxCharPerFile: config.maxCharPerFile,
        maxCodeLinePerSymbol: config.maxCodeLinePerSymbol,
        maxCodeLinePerFile: config.maxCodeLinePerFile,
        maxLinePerSymbol: config.maxLinePerSymbol,
        maxLinePerFile: config.maxLinePerFile,
        maxDependencyPerSymbol: config.maxDependencyPerSymbol,
        maxDependencyPerFile: config.maxDependencyPerFile,
        maxDependentPerSymbol: config.maxDependentPerSymbol,
        maxDependentPerFile: config.maxDependentPerFile,
        maxCyclomaticComplexityPerSymbol:
          config.maxCyclomaticComplexityPerSymbol,
        maxCyclomaticComplexityPerFile: config.maxCyclomaticComplexityPerFile,
      },
    );

    const project = await db
      .selectFrom("project")
      .selectAll()
      .where("name", "=", "Test Project")
      .executeTakeFirstOrThrow();

    // Create manifest with sample dependency manifest structure
    const manifestService = new ManifestService();
    const sampleManifest: dependencyManifestTypes.DependencyManifest = {
      "src/index.py": {
        id: "src/index.py",
        filePath: "src/index.py",
        language: "python",
        metrics: {
          linesCount: 12,
          codeLineCount: 8,
          characterCount: 200,
          codeCharacterCount: 150,
          dependencyCount: 1,
          dependentCount: 0,
          cyclomaticComplexity: 3,
        },
        dependencies: {
          "./utils": {
            id: "./utils",
            isExternal: false,
            symbols: {},
          },
        },
        dependents: {},
        symbols: {
          "MyClass": {
            id: "MyClass",
            type: "class" as const,
            metrics: {
              linesCount: 12,
              codeLineCount: 8,
              characterCount: 200,
              codeCharacterCount: 150,
              dependencyCount: 1,
              dependentCount: 0,
              cyclomaticComplexity: 3,
            },
            description: "",
            dependencies: {
              "./utils.py": {
                id: "./utils.py",
                isExternal: false,
                symbols: {},
              },
            },
            dependents: {},
          },
        },
      },
    };

    const createResponse = await manifestService.createManifest(
      userId,
      project.id,
      "main",
      "abc123",
      new Date(),
      sampleManifest,
    );

    if ("error" in createResponse) {
      throw new Error(createResponse.error);
    }

    const { url, method } = manifestApiTypes.prepareGetManifestAudit(
      createResponse.id,
    );

    const response = await api.handle(
      new Request(`http://localhost:3000${url}`, {
        method,
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }),
    );

    assertEquals(response?.status, 200);
    const auditManifest = await response?.json();

    // Verify audit manifest structure
    assertEquals(typeof auditManifest, "object");

    // Check that it has the expected file entry
    assertEquals(typeof auditManifest["src/index.py"], "object");
    assertEquals(auditManifest["src/index.py"].id, "src/index.py");
    assertEquals(typeof auditManifest["src/index.py"].alerts, "object");
    assertEquals(typeof auditManifest["src/index.py"].symbols, "object");

    // Check that the symbol is present
    assertEquals(
      typeof auditManifest["src/index.py"].symbols["MyClass"],
      "object",
    );
    assertEquals(
      auditManifest["src/index.py"].symbols["MyClass"].id,
      "MyClass",
    );
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("get manifest audit - non-member", async () => {
  initKyselyDb();
  await resetTables();

  try {
    // Create first user with workspace, project, and manifest
    const { userId } = await createTestUserAndToken();

    const workspaceService = new WorkspaceService();
    await workspaceService.createTeamWorkspace("Test Workspace", userId);

    const workspace = await db
      .selectFrom("workspace")
      .selectAll()
      .where("name", "=", "Test Workspace")
      .executeTakeFirstOrThrow();

    const projectService = new ProjectService();
    const config = getDefaultProjectConfig();
    await projectService.createProject(
      userId,
      {
        name: "Test Project",
        repoUrl: "https://github.com/test/test",
        workspaceId: workspace.id,
        maxCodeCharPerSymbol: config.maxCodeCharPerSymbol,
        maxCodeCharPerFile: config.maxCodeCharPerFile,
        maxCharPerSymbol: config.maxCharPerSymbol,
        maxCharPerFile: config.maxCharPerFile,
        maxCodeLinePerSymbol: config.maxCodeLinePerSymbol,
        maxCodeLinePerFile: config.maxCodeLinePerFile,
        maxLinePerSymbol: config.maxLinePerSymbol,
        maxLinePerFile: config.maxLinePerFile,
        maxDependencyPerSymbol: config.maxDependencyPerSymbol,
        maxDependencyPerFile: config.maxDependencyPerFile,
        maxDependentPerSymbol: config.maxDependentPerSymbol,
        maxDependentPerFile: config.maxDependentPerFile,
        maxCyclomaticComplexityPerSymbol:
          config.maxCyclomaticComplexityPerSymbol,
        maxCyclomaticComplexityPerFile: config.maxCyclomaticComplexityPerFile,
      },
    );

    const project = await db
      .selectFrom("project")
      .selectAll()
      .where("name", "=", "Test Project")
      .executeTakeFirstOrThrow();

    const manifestService = new ManifestService();
    const createResponse = await manifestService.createManifest(
      userId,
      project.id,
      "main",
      "abc123",
      new Date(),
      {},
    );

    if ("error" in createResponse) {
      throw new Error(createResponse.error);
    }

    // Create second user (not a member of the workspace)
    const { token: nonMemberToken } = await createTestUserAndToken();

    const { url, method } = manifestApiTypes.prepareGetManifestAudit(
      createResponse.id,
    );

    const response = await api.handle(
      new Request(`http://localhost:3000${url}`, {
        method,
        headers: {
          "Authorization": `Bearer ${nonMemberToken}`,
        },
      }),
    );

    assertEquals(response?.status, 400);
    const responseBody = await response?.json();
    assertEquals(responseBody.error, "manifest_not_found");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("get manifest audit - invalid manifest id", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { token } = await createTestUserAndToken();

    const { url, method } = manifestApiTypes.prepareGetManifestAudit(999999);

    const response = await api.handle(
      new Request(`http://localhost:3000${url}`, {
        method,
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }),
    );

    assertEquals(response?.status, 400);
    const responseBody = await response?.json();
    assertEquals(responseBody.error, "manifest_not_found");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});
