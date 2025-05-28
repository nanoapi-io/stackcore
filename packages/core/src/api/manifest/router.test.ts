import { assertEquals, assertNotEquals } from "@std/assert";
import api from "../index.ts";
import { db, destroyKyselyDb, initKyselyDb } from "../../db/database.ts";
import { resetTables } from "../../testHelpers/db.ts";
import { createTestUserAndToken } from "../../testHelpers/auth.ts";
import { WorkspaceService } from "../workspace/service.ts";
import { ProjectService } from "../project/service.ts";
import { ManifestService } from "./service.ts";
import { ManifestApiTypes } from "../responseType.ts";

// --- CREATE MANIFEST TESTS ---
Deno.test("create a manifest", async () => {
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
    await projectService.createProject(userId, "Test Project", workspace.id);

    const project = await db
      .selectFrom("project")
      .selectAll()
      .where("name", "=", "Test Project")
      .executeTakeFirstOrThrow();

    // Create a manifest via API
    const { url, method, body } = ManifestApiTypes.prepareCreateManifest({
      projectId: project.id,
      branch: "main",
      commitSha: "abc123",
      commitShaDate: new Date(),
      version: 1,
      manifest: { test: "data" },
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
    assertEquals(responseBody.message, "Manifest created successfully");
    assertEquals(typeof responseBody.manifestId, "number");

    // Verify manifest was created in database
    const manifest = await db
      .selectFrom("manifest")
      .selectAll()
      .where("id", "=", responseBody.manifestId)
      .executeTakeFirstOrThrow();

    assertEquals(manifest.project_id, project.id);
    assertEquals(manifest.branch, "main");
    assertEquals(manifest.commitSha, "abc123");
    assertEquals(manifest.version, 1);
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
    await projectService.createProject(userId, "Test Project", workspace.id);

    const project = await db
      .selectFrom("project")
      .selectAll()
      .where("name", "=", "Test Project")
      .executeTakeFirstOrThrow();

    // Create second user (not a member of the workspace)
    const { token: nonMemberToken } = await createTestUserAndToken();

    // Try to create a manifest in a project the user doesn't have access to
    const { url, method, body } = ManifestApiTypes.prepareCreateManifest({
      projectId: project.id,
      branch: "main",
      commitSha: "abc123",
      commitShaDate: null,
      version: 1,
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
    const { url, method } = ManifestApiTypes.prepareCreateManifest({
      projectId: 999,
      version: 1,
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
    await projectService.createProject(userId, "Test Project", workspace.id);

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
        i + 1,
        { version: i + 1 },
      );
    }

    const { url, method } = ManifestApiTypes.prepareGetManifests({
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
    await projectService.createProject(userId, "Test Project", workspace.id);

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
      1,
      { test: "data" },
    );

    const { url, method } = ManifestApiTypes.prepareGetManifests({
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
    await projectService.createProject(userId, "Test Project", workspace.id);

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
      1,
      { test: "data" },
    );
    await manifestService.createManifest(
      userId,
      project.id,
      "feature-xyz",
      "def456",
      new Date(),
      2,
      { test: "data2" },
    );

    const { url, method } = ManifestApiTypes.prepareGetManifests({
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
    await projectService.createProject(userId, "Test Project", workspace.id);

    const project = await db
      .selectFrom("project")
      .selectAll()
      .where("name", "=", "Test Project")
      .executeTakeFirstOrThrow();

    // Create manifest
    const manifestService = new ManifestService();
    const { manifestId } = await manifestService.createManifest(
      userId,
      project.id,
      "main",
      "abc123",
      new Date(),
      1,
      { test: "data", complex: { nested: "value" } },
    );

    const { url, method } = ManifestApiTypes.prepareGetManifestDetails(
      manifestId!,
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
    assertEquals(manifest.id, manifestId);
    assertEquals(manifest.project_id, project.id);
    assertEquals(manifest.branch, "main");
    assertEquals(manifest.commitSha, "abc123");
    assertEquals(manifest.version, 1);
    assertEquals(manifest.manifest.test, "data");
    assertEquals(manifest.manifest.complex.nested, "value");
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
    await projectService.createProject(userId, "Test Project", workspace.id);

    const project = await db
      .selectFrom("project")
      .selectAll()
      .where("name", "=", "Test Project")
      .executeTakeFirstOrThrow();

    const manifestService = new ManifestService();
    const { manifestId } = await manifestService.createManifest(
      userId,
      project.id,
      "main",
      "abc123",
      new Date(),
      1,
      { test: "data" },
    );

    // Create second user (not a member of the workspace)
    const { token: nonMemberToken } = await createTestUserAndToken();

    const { url, method } = ManifestApiTypes.prepareGetManifestDetails(
      manifestId!,
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
    await projectService.createProject(userId, "Test Project", workspace.id);

    const project = await db
      .selectFrom("project")
      .selectAll()
      .where("name", "=", "Test Project")
      .executeTakeFirstOrThrow();

    // Create manifest
    const manifestService = new ManifestService();
    const { manifestId } = await manifestService.createManifest(
      userId,
      project.id,
      "main",
      "abc123",
      new Date(),
      1,
      { test: "data" },
    );

    const { url, method } = ManifestApiTypes.prepareDeleteManifest(manifestId!);

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
      .where("id", "=", manifestId!)
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
    await projectService.createProject(userId, "Test Project", workspace.id);

    const project = await db
      .selectFrom("project")
      .selectAll()
      .where("name", "=", "Test Project")
      .executeTakeFirstOrThrow();

    const manifestService = new ManifestService();
    const { manifestId } = await manifestService.createManifest(
      userId,
      project.id,
      "main",
      "abc123",
      new Date(),
      1,
      { test: "data" },
    );

    // Create second user (not a member of the workspace)
    const { token: nonMemberToken } = await createTestUserAndToken();

    const { url, method } = ManifestApiTypes.prepareDeleteManifest(manifestId!);

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
      .where("id", "=", manifestId!)
      .executeTakeFirst();

    assertNotEquals(existingManifest, undefined);
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
    await projectService.createProject(userId, "Test Project", workspace.id);

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
        i + 1,
        { version: i + 1 },
      );
    }

    // Test second page
    const { url, method } = ManifestApiTypes.prepareGetManifests({
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
