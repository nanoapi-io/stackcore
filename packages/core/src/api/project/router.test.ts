import { assertEquals, assertNotEquals } from "@std/assert";
import api from "../index.ts";
import { db, destroyKyselyDb, initKyselyDb } from "@stackcore/db";
import { resetTables } from "../../testHelpers/db.ts";
import { createTestUserAndToken } from "../../testHelpers/auth.ts";
import { WorkspaceService } from "../workspace/service.ts";
import { ProjectService } from "./service.ts";
import { ProjectApiTypes } from "@stackcore/coreApiTypes";

// --- CREATE PROJECT TESTS ---
Deno.test("create a project", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    // Create an workspace first
    const workspaceService = new WorkspaceService();
    await workspaceService.createTeamWorkspace(
      "Test Workspace",
      userId,
    );
    // Fetch the workspace from the DB
    const workspace = await db
      .selectFrom("workspace")
      .selectAll()
      .where("name", "=", "Test Workspace")
      .executeTakeFirstOrThrow();

    // Create a project via API
    const { url, method, body } = ProjectApiTypes.prepareCreateProject({
      name: "Test Project",
      repoUrl: "https://github.com/test/test",
      workspaceId: workspace.id,
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

    // Get the project from the database for its ID
    const project = await db
      .selectFrom("project")
      .selectAll()
      .where("name", "=", "Test Project")
      .where("workspace_id", "=", workspace.id)
      .executeTakeFirstOrThrow();

    const createResponseBody = await createResponse?.json();
    assertEquals(createResponseBody.id, project.id);

    assertEquals(project.name, "Test Project");
    assertEquals(project.workspace_id, workspace.id);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("create a project with a duplicate name should fail", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    // Create an workspace first
    const workspaceService = new WorkspaceService();
    await workspaceService.createTeamWorkspace(
      "Test Workspace",
      userId,
    );
    // Fetch the workspace from the DB
    const workspace = await db
      .selectFrom("workspace")
      .selectAll()
      .where("name", "=", "Test Workspace")
      .executeTakeFirstOrThrow();

    // Create a project service
    const projectService = new ProjectService();
    await projectService.createProject(
      userId,
      {
        name: "Test Project",
        repoUrl: "https://github.com/test/test",
        workspaceId: workspace.id,
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
      },
    );

    // Try to create a project with the same name
    const { url, method, body } = ProjectApiTypes.prepareCreateProject({
      name: "Test Project",
      repoUrl: "https://github.com/test/test",
      workspaceId: workspace.id,
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
    assertEquals(responseBody.error, "project_already_exists");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("create a project - non-member of workspace", async () => {
  initKyselyDb();
  await resetTables();

  try {
    // Create first user with workspace
    const { userId } = await createTestUserAndToken();

    const workspaceService = new WorkspaceService();
    await workspaceService.createTeamWorkspace(
      "Test Workspace",
      userId,
    );
    // Fetch the workspace from the DB
    const workspace = await db
      .selectFrom("workspace")
      .selectAll()
      .where("name", "=", "Test Workspace")
      .executeTakeFirstOrThrow();

    // Create second user (not a member of the workspace)
    const { token: nonMemberToken } = await createTestUserAndToken();

    // Try to create a project in an workspace the user is not a member of
    const { url, method, body } = ProjectApiTypes.prepareCreateProject({
      name: "Unauthorized Project",
      repoUrl: "https://github.com/test/test",
      workspaceId: workspace.id,
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
    assertEquals(responseBody.error, "not_a_member_of_workspace");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("create project - invalid input validation", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { token } = await createTestUserAndToken();

    // Test with invalid JSON
    const { url, method, body } = ProjectApiTypes.prepareCreateProject({
      name: "Test Project",
      repoUrl: "https://github.com/test/test",
      workspaceId: 1,
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

    // Test with missing required fields
    const { url: url2, method: method2, body: body2 } = ProjectApiTypes
      .prepareCreateProject({
        name: "Test Project",
        repoUrl: "https://github.com/test/test",
        workspaceId: 1,
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
      });

    const response2 = await api.handle(
      new Request(`http://localhost:3000${url2}`, {
        method: method2,
        body: JSON.stringify(body2),
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      }),
    );
    assertEquals(response2?.status, 400);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

// --- GET PROJECT DETAILS TESTS ---
Deno.test("get project details", async () => {
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
    await projectService.createProject(
      userId,
      {
        name: "Test Project",
        repoUrl: "https://github.com/test/test",
        workspaceId: workspace.id,
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
      },
    );

    const project = await db
      .selectFrom("project")
      .selectAll()
      .where("name", "=", "Test Project")
      .where("workspace_id", "=", workspace.id)
      .executeTakeFirstOrThrow();

    // Get project details via API
    const { url, method } = ProjectApiTypes.prepareGetProjectDetails(
      project.id,
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
    const responseBody = await response?.json();
    assertEquals(responseBody.id, project.id);
    assertEquals(responseBody.name, "Test Project");
    assertEquals(responseBody.repo_url, "https://github.com/test/test");
    assertEquals(responseBody.workspace_id, workspace.id);
    assertEquals(
      new Date(responseBody.created_at).getTime(),
      project.created_at.getTime(),
    );
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("get project details - non-member of workspace", async () => {
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
    await projectService.createProject(
      userId,
      {
        name: "Test Project",
        repoUrl: "https://github.com/test/test",
        workspaceId: workspace.id,
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
      },
    );

    const project = await db
      .selectFrom("project")
      .selectAll()
      .where("name", "=", "Test Project")
      .where("workspace_id", "=", workspace.id)
      .executeTakeFirstOrThrow();

    // Create second user (not a member of the workspace)
    const { token: nonMemberToken } = await createTestUserAndToken();

    // Try to get project details as non-member
    const { url, method } = ProjectApiTypes.prepareGetProjectDetails(
      project.id,
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
    assertEquals(responseBody.error, "project_not_found");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("get project details - project not found", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { token } = await createTestUserAndToken();

    // Try to get details for non-existent project
    const { url, method } = ProjectApiTypes.prepareGetProjectDetails(999);

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
    assertEquals(responseBody.error, "project_not_found");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("get project details - invalid project ID", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { token } = await createTestUserAndToken();

    // Try to get details with invalid project ID
    const response = await api.handle(
      new Request(`http://localhost:3000/projects/invalid`, {
        method: "GET",
        headers: {
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

Deno.test("get project details - deactivated workspace", async () => {
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
    await projectService.createProject(
      userId,
      {
        name: "Test Project",
        repoUrl: "https://github.com/test/test",
        workspaceId: workspace.id,
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
      },
    );

    const project = await db
      .selectFrom("project")
      .selectAll()
      .where("name", "=", "Test Project")
      .where("workspace_id", "=", workspace.id)
      .executeTakeFirstOrThrow();

    // Deactivate the workspace
    await db
      .updateTable("workspace")
      .set({ deactivated: true })
      .where("id", "=", workspace.id)
      .execute();

    // Try to get project details from deactivated workspace
    const { url, method } = ProjectApiTypes.prepareGetProjectDetails(
      project.id,
    );

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
    assertEquals(responseBody.error, "project_not_found");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

// --- GET PROJECTS TESTS ---
Deno.test("get user projects", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    // Create an workspace first
    const workspaceService = new WorkspaceService();
    await workspaceService.createTeamWorkspace(
      "Test Workspace",
      userId,
    );
    // Fetch the workspace from the DB
    const workspace = await db
      .selectFrom("workspace")
      .selectAll()
      .where("name", "=", "Test Workspace")
      .executeTakeFirstOrThrow();

    // Create projects for the user
    const projectService = new ProjectService();
    for (let i = 0; i < 10; i++) {
      await projectService.createProject(
        userId,
        {
          name: `Project ${i}`,
          repoUrl: "https://github.com/test/test",
          workspaceId: workspace.id,
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
        },
      );
    }

    const { url, method, body } = ProjectApiTypes.prepareGetProjects({
      page: 1,
      limit: 5,
      workspaceId: workspace.id,
    });

    const response = await api.handle(
      new Request(`http://localhost:3000${url}`, {
        method,
        body: JSON.stringify(body),
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }),
    );

    assertEquals(response?.status, 200);
    const responseBody = await response?.json();
    assertEquals(responseBody.total, 10);
    assertEquals(responseBody.results.length, 5);
    for (let i = 0; i < 5; i++) {
      assertEquals(responseBody.results[i].name, `Project ${i}`);
      assertEquals(
        responseBody.results[i].repo_url,
        "https://github.com/test/test",
      );
      assertEquals(responseBody.results[i].workspace_id, workspace.id);
    }
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("get user projects, pagination", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    // Create an workspace first
    const workspaceService = new WorkspaceService();
    await workspaceService.createTeamWorkspace(
      "Test Workspace",
      userId,
    );
    // Fetch the workspace from the DB
    const workspace = await db
      .selectFrom("workspace")
      .selectAll()
      .where("name", "=", "Test Workspace")
      .executeTakeFirstOrThrow();

    // Create projects for the user
    const projectService = new ProjectService();
    for (let i = 0; i < 10; i++) {
      await projectService.createProject(
        userId,
        {
          name: `Project ${i}`,
          repoUrl: "https://github.com/test/test",
          workspaceId: workspace.id,
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
        },
      );
    }

    const { url, method, body } = ProjectApiTypes.prepareGetProjects({
      page: 2,
      limit: 5,
      workspaceId: workspace.id,
    });

    const response = await api.handle(
      new Request(`http://localhost:3000${url}`, {
        method,
        body: JSON.stringify(body),
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }),
    );

    assertEquals(response?.status, 200);
    const responseBody = await response?.json();
    assertEquals(responseBody.total, 10);
    assertEquals(responseBody.results.length, 5);
    for (let i = 0; i < 5; i++) {
      assertEquals(responseBody.results[i].name, `Project ${i + 5}`);
      assertEquals(
        responseBody.results[i].repo_url,
        "https://github.com/test/test",
      );
      assertEquals(responseBody.results[i].workspace_id, workspace.id);
    }
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("get user projects, search by name", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    // Create an workspace first
    const workspaceService = new WorkspaceService();
    await workspaceService.createTeamWorkspace(
      "Test Workspace",
      userId,
    );
    // Fetch the workspace from the DB
    const workspace = await db
      .selectFrom("workspace")
      .selectAll()
      .where("name", "=", "Test Workspace")
      .executeTakeFirstOrThrow();

    // Create projects for the user
    const projectService = new ProjectService();
    for (let i = 0; i < 10; i++) {
      await projectService.createProject(
        userId,
        {
          name: `Test Project ${i}`,
          repoUrl: "https://github.com/test/test",
          workspaceId: workspace.id,
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
        },
      );
    }

    const { url, method } = ProjectApiTypes.prepareGetProjects({
      page: 1,
      limit: 5,
      search: "Test Project 0",
      workspaceId: workspace.id,
    });

    const response = await api.handle(
      new Request(
        `http://localhost:3000${url}`,
        {
          method,
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        },
      ),
    );

    assertEquals(response?.status, 200);
    const responseBody = await response?.json();
    assertEquals(responseBody.total, 1);
    assertEquals(responseBody.results.length, 1);
    assertEquals(responseBody.results[0].name, "Test Project 0");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("get projects - invalid pagination parameters", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { token } = await createTestUserAndToken();

    // Test with invalid page number
    const response = await api.handle(
      new Request(
        "http://localhost:3000/projects?page=invalid&limit=5",
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
        "http://localhost:3000/projects?page=1&limit=invalid",
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        },
      ),
    );
    assertEquals(response2?.status, 400);

    // Test with invalid workspaceId
    const response3 = await api.handle(
      new Request(
        "http://localhost:3000/projects?page=1&limit=5&workspaceId=invalid",
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        },
      ),
    );
    assertEquals(response3?.status, 400);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

// --- UPDATE PROJECT TESTS ---
Deno.test("update a project", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    // Create an workspace first
    const workspaceService = new WorkspaceService();
    await workspaceService.createTeamWorkspace(
      "Test Workspace",
      userId,
    );
    // Fetch the workspace from the DB
    const workspace = await db
      .selectFrom("workspace")
      .selectAll()
      .where("name", "=", "Test Workspace")
      .executeTakeFirstOrThrow();

    // Create a project via API
    const { url, method, body } = ProjectApiTypes.prepareCreateProject({
      name: "Original Project Name",
      repoUrl: "https://github.com/test/test",
      workspaceId: workspace.id,
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

    // Get the project from the database for its ID
    const project = await db
      .selectFrom("project")
      .selectAll()
      .where("name", "=", "Original Project Name")
      .where("workspace_id", "=", workspace.id)
      .executeTakeFirstOrThrow();

    // Update project name via API
    const { url: url2, method: method2, body: body2 } = ProjectApiTypes
      .prepareUpdateProject(project.id, {
        name: "Updated Project Name",
        repoUrl: "https://github.com/test/test",
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
      });

    const response = await api.handle(
      new Request(`http://localhost:3000${url2}`, {
        method: method2,
        body: JSON.stringify(body2),
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      }),
    );

    assertEquals(response?.status, 200);
    const responseBody = await response?.json();
    assertEquals(responseBody.message, "Project updated successfully");

    // Verify project was updated in database
    const updatedProject = await db
      .selectFrom("project")
      .selectAll()
      .where("id", "=", project.id)
      .executeTakeFirstOrThrow();

    assertEquals(updatedProject.name, "Updated Project Name");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("update a project - non-member", async () => {
  initKyselyDb();
  await resetTables();

  try {
    // Create first user with workspace and project
    const { userId } = await createTestUserAndToken();

    const workspaceService = new WorkspaceService();
    await workspaceService.createTeamWorkspace(
      "Test Workspace",
      userId,
    );
    // Fetch the workspace from the DB
    const workspaceNM = await db
      .selectFrom("workspace")
      .selectAll()
      .where("name", "=", "Test Workspace")
      .executeTakeFirstOrThrow();

    // Create a project as the first user
    const projectService = new ProjectService();
    await projectService.createProject(
      userId,
      {
        name: "Test Project",
        repoUrl: "https://github.com/test/test",
        workspaceId: workspaceNM.id,
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
      },
    );

    // Get the project from the database for its ID
    const project = await db
      .selectFrom("project")
      .selectAll()
      .where("name", "=", "Test Project")
      .where("workspace_id", "=", workspaceNM.id)
      .executeTakeFirstOrThrow();

    // Create second user (not a member of the workspace)
    const { token: nonMemberTokenNM } = await createTestUserAndToken();

    const { url, method, body } = ProjectApiTypes.prepareUpdateProject(
      project.id,
      {
        name: "Unauthorized Update",
        repoUrl: "https://github.com/test/test",
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
      },
    );

    const response = await api.handle(
      new Request(`http://localhost:3000${url}`, {
        method,
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${nonMemberTokenNM}`,
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

Deno.test("update project - duplicate name in same workspace", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    // Create an workspace first
    const workspaceService = new WorkspaceService();
    await workspaceService.createTeamWorkspace(
      "Test Workspace",
      userId,
    );
    const workspace = await db
      .selectFrom("workspace")
      .selectAll()
      .where("name", "=", "Test Workspace")
      .executeTakeFirstOrThrow();

    // Create two projects
    const projectService = new ProjectService();
    await projectService.createProject(
      userId,
      {
        name: "Project 1",
        repoUrl: "https://github.com/test/test",
        workspaceId: workspace.id,
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
      },
    );
    await projectService.createProject(
      userId,
      {
        name: "Project 2",
        repoUrl: "https://github.com/test/test",
        workspaceId: workspace.id,
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
      },
    );

    // Get the second project
    const project2 = await db
      .selectFrom("project")
      .selectAll()
      .where("name", "=", "Project 2")
      .executeTakeFirstOrThrow();

    // Try to update Project 2 to have the same name as Project 1
    const { url, method, body } = ProjectApiTypes.prepareUpdateProject(
      project2.id,
      {
        name: "Project 1",
        repoUrl: "https://github.com/test/test",
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
      },
    );

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
    assertEquals(responseBody.error, "project_already_exists");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

// --- DELETE PROJECT TESTS ---
Deno.test("delete a project", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    // Create an workspace first
    const workspaceService = new WorkspaceService();
    await workspaceService.createTeamWorkspace(
      "Test Workspace",
      userId,
    );
    // Fetch the workspace from the DB
    const workspace = await db
      .selectFrom("workspace")
      .selectAll()
      .where("name", "=", "Test Workspace")
      .executeTakeFirstOrThrow();

    // Create a project via API
    const projectService = new ProjectService();
    await projectService.createProject(
      userId,
      {
        name: "Test Project",
        repoUrl: "https://github.com/test/test",
        workspaceId: workspace.id,
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
      },
    );

    // Get the project from the database for its ID
    const project = await db
      .selectFrom("project")
      .selectAll()
      .where("name", "=", "Test Project")
      .where("workspace_id", "=", workspace.id)
      .executeTakeFirstOrThrow();

    // --- DELETE ---
    const { url, method } = ProjectApiTypes.prepareDeleteProject(project.id);

    const response = await api.handle(
      new Request(`http://localhost:3000${url}`, {
        method,
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }),
    );

    assertEquals(response?.status, 204);

    // Verify project was actually deleted
    const deletedProject = await db
      .selectFrom("project")
      .selectAll()
      .where("id", "=", project.id)
      .executeTakeFirst();

    assertEquals(deletedProject, undefined);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("delete a project - non-member", async () => {
  initKyselyDb();
  await resetTables();

  try {
    // Create first user with workspace and project
    const { userId } = await createTestUserAndToken();

    const workspaceService = new WorkspaceService();
    await workspaceService.createTeamWorkspace(
      "Test Workspace",
      userId,
    );
    // Fetch the workspace from the DB
    const workspaceNM = await db
      .selectFrom("workspace")
      .selectAll()
      .where("name", "=", "Test Workspace")
      .executeTakeFirstOrThrow();

    // Create a project as the first user
    const projectService = new ProjectService();
    await projectService.createProject(
      userId,
      {
        name: "Test Project",
        repoUrl: "https://github.com/test/test",
        workspaceId: workspaceNM.id,
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
      },
    );

    // Get the project from the database for its ID
    const projectNM = await db
      .selectFrom("project")
      .selectAll()
      .where("name", "=", "Test Project")
      .where("workspace_id", "=", workspaceNM.id)
      .executeTakeFirstOrThrow();

    // Create second user (not a member of the workspace)
    const { token: nonMemberTokenNM } = await createTestUserAndToken();

    const { url, method } = ProjectApiTypes.prepareDeleteProject(projectNM.id);

    const responseNM = await api.handle(
      new Request(`http://localhost:3000${url}`, {
        method,
        headers: {
          "Authorization": `Bearer ${nonMemberTokenNM}`,
        },
      }),
    );

    assertEquals(responseNM?.status, 400);
    const responseBodyNM = await responseNM?.json();
    assertEquals(responseBodyNM.error, "project_not_found");

    // Verify project still exists
    const existingProjectNM = await db
      .selectFrom("project")
      .selectAll()
      .where("id", "=", projectNM.id)
      .executeTakeFirst();

    assertNotEquals(existingProjectNM, undefined);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});
