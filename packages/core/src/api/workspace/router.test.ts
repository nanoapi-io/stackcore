import { assertEquals, assertNotEquals } from "@std/assert";
import api from "../index.ts";
import { db, destroyKyselyDb, initKyselyDb } from "../../db/database.ts";
import { resetTables } from "../../testHelpers/db.ts";
import {
  cannotDeactivatePersonalWorkspaceError,
  workspaceAlreadyExistsErrorCode,
  workspaceNotFoundError,
  WorkspaceService,
} from "./service.ts";
import { createTestUserAndToken } from "../../testHelpers/auth.ts";
import { workspaceApiTypes } from "@stackcore/shared";

// POST / (create workspace)
Deno.test("create a team workspace", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { token } = await createTestUserAndToken();

    const { url, method, body } = workspaceApiTypes
      .prepareCreateWorkspace({
        name: "Test Team",
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

    assertEquals(response?.status, 201);

    const responseBody = await response?.json();

    // Verify workspace exists in database
    const workspace = await db
      .selectFrom("workspace")
      .selectAll()
      .where("name", "=", "Test Team")
      .executeTakeFirstOrThrow();

    assertEquals(responseBody.id, workspace.id);

    assertEquals(workspace.name, "Test Team");
    assertEquals(workspace.isTeam, true);

    // Verify creator is an admin
    const member = await db
      .selectFrom("member")
      .selectAll()
      .where("workspace_id", "=", workspace.id)
      .executeTakeFirst();

    assertNotEquals(member, undefined);
    assertEquals(member?.role, "admin");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("create a team workspace with a duplicate name should fail", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    const workspaceService = new WorkspaceService();
    await workspaceService.createTeamWorkspace("Test Team", userId);

    const { url, method, body } = workspaceApiTypes
      .prepareCreateWorkspace({
        name: "Test Team",
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
    assertEquals(responseBody.error, workspaceAlreadyExistsErrorCode);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

// GET / (list workspaces)
Deno.test("get user workspaces", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    // Create workspaces for the user
    const workspaceService = new WorkspaceService();
    for (let i = 0; i < 10; i++) {
      await workspaceService.createTeamWorkspace(
        `${i} Workspace`,
        userId,
      );
    }

    const { url, method } = workspaceApiTypes.prepareGetWorkspaces({
      page: 1,
      limit: 5,
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
    assertEquals(responseBody.total, 10 + 1); // +1 for personal workspace
    assertEquals(responseBody.results.length, 5);
    for (let i = 0; i < 5; i++) {
      assertEquals(responseBody.results[i].name, `${i} Workspace`);
      assertEquals(responseBody.results[i].isTeam, true);
      assertEquals(responseBody.results[i].role, "admin");
    }
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("get user workspaces, pagination", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    // Create workspaces for the user
    const workspaceService = new WorkspaceService();
    for (let i = 0; i < 10; i++) {
      await workspaceService.createTeamWorkspace(
        `${i} Workspace`,
        userId,
      );
    }

    const { url, method } = workspaceApiTypes.prepareGetWorkspaces({
      page: 2,
      limit: 5,
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
    assertEquals(responseBody.total, 10 + 1); // +1 for personal workspace
    assertEquals(responseBody.results.length, 5);
    for (let i = 0; i < 5; i++) {
      assertEquals(responseBody.results[i].name, `${i + 5} Workspace`);
      assertEquals(responseBody.results[i].isTeam, true);
      assertEquals(responseBody.results[i].role, "admin");
    }
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("get user workspaces, search by name", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    // Create workspaces for the user
    const workspaceService = new WorkspaceService();
    for (let i = 0; i < 10; i++) {
      await workspaceService.createTeamWorkspace(
        `Test Workspace ${i}`,
        userId,
      );
    }

    const { url, method } = workspaceApiTypes.prepareGetWorkspaces({
      page: 1,
      limit: 5,
      search: "Test Workspace 0",
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
    assertEquals(responseBody.results[0].name, "Test Workspace 0");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

// PATCH /:workspaceId (update workspace)
Deno.test("update an workspace", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    // Create workspace
    const workspaceService = new WorkspaceService();
    await workspaceService.createTeamWorkspace(
      "Original Name",
      userId,
    );

    // Get the workspace ID from the database
    const workspace = await db
      .selectFrom("workspace")
      .selectAll()
      .where("name", "=", "Original Name")
      .executeTakeFirstOrThrow();

    const { url, method, body } = workspaceApiTypes
      .prepareUpdateWorkspace(
        workspace.id,
        {
          name: "Updated Name",
        },
      );

    // Update workspace name
    const response = await api.handle(
      new Request(
        `http://localhost:3000${url}`,
        {
          method,
          body: JSON.stringify(body),
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        },
      ),
    );

    assertEquals(response?.status, 200);
    const responseBody = await response?.json();
    assertEquals(responseBody.message, "Workspace updated successfully");

    // Verify workspace was updated in database
    const updatedWorkspace = await db
      .selectFrom("workspace")
      .selectAll()
      .where("id", "=", workspace.id)
      .executeTakeFirstOrThrow();

    assertEquals(updatedWorkspace.name, "Updated Name");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("update an workspace - non-member", async () => {
  initKyselyDb();
  await resetTables();

  try {
    // Create first user with workspace
    const { userId } = await createTestUserAndToken();

    const workspaceService = new WorkspaceService();
    await workspaceService.createTeamWorkspace(
      "Test Team",
      userId,
    );

    // Get the workspace ID from the database
    const workspace = await db
      .selectFrom("workspace")
      .selectAll()
      .where("name", "=", "Test Team")
      .executeTakeFirstOrThrow();

    // Create second user (not a member of the workspace)
    const { token: nonMemberToken } = await createTestUserAndToken();

    const { url, method, body } = workspaceApiTypes
      .prepareUpdateWorkspace(
        workspace.id,
        {
          name: "Unauthorized Update",
        },
      );

    const response = await api.handle(
      new Request(
        `http://localhost:3000${url}`,
        {
          method,
          body: JSON.stringify(body),
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${nonMemberToken}`,
          },
        },
      ),
    );

    assertEquals(response?.status, 400);
    const responseBody = await response?.json();
    assertEquals(responseBody.error, workspaceNotFoundError);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

// POST /:workspaceId/deactivate (deactivate workspace)
Deno.test("deactivate an workspace", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    // Create workspace
    const workspaceService = new WorkspaceService();
    await workspaceService.createTeamWorkspace(
      "Test Team",
      userId,
    );

    // Get the workspace ID from the database
    const workspace = await db
      .selectFrom("workspace")
      .selectAll()
      .where("name", "=", "Test Team")
      .executeTakeFirstOrThrow();

    const { url, method } = workspaceApiTypes.prepareDeactivateWorkspace(
      workspace.id,
    );

    // Deactivate workspace
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

    assertEquals(response?.status, 204);

    // Verify workspace was deactivated in database
    const deactivatedWorkspace = await db
      .selectFrom("workspace")
      .selectAll()
      .where("id", "=", workspace.id)
      .executeTakeFirstOrThrow();

    assertEquals(deactivatedWorkspace.deactivated, true);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("deactivate an workspace - non-member", async () => {
  initKyselyDb();
  await resetTables();

  try {
    // Create first user with workspace
    const { userId } = await createTestUserAndToken();

    const workspaceService = new WorkspaceService();
    await workspaceService.createTeamWorkspace(
      "Test Team",
      userId,
    );

    // Get the workspace ID from the database
    const workspace = await db
      .selectFrom("workspace")
      .selectAll()
      .where("name", "=", "Test Team")
      .executeTakeFirstOrThrow();

    // Create second user (not a member of the workspace)
    const { token: nonMemberToken } = await createTestUserAndToken();

    const { url, method } = workspaceApiTypes.prepareDeactivateWorkspace(
      workspace.id,
    );

    const response = await api.handle(
      new Request(
        `http://localhost:3000${url}`,
        {
          method,
          headers: {
            "Authorization": `Bearer ${nonMemberToken}`,
          },
        },
      ),
    );

    assertEquals(response?.status, 400);
    const responseBody = await response?.json();
    assertEquals(responseBody.error, workspaceNotFoundError);

    // Verify workspace still exists
    const checkWorkspace = await db
      .selectFrom("workspace")
      .selectAll()
      .where("id", "=", workspace.id)
      .executeTakeFirst();

    assertNotEquals(checkWorkspace, undefined);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test(
  "deactivate workspace - cannot deactivate personal workspace",
  async () => {
    initKyselyDb();
    await resetTables();

    try {
      const { token, personalWorkspaceId } = await createTestUserAndToken();

      const { url, method } = workspaceApiTypes.prepareDeactivateWorkspace(
        personalWorkspaceId,
      );

      // Try to deactivate personal workspace
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

      assertEquals(response?.status, 400);
      const responseBody = await response?.json();
      assertEquals(responseBody.error, cannotDeactivatePersonalWorkspaceError);
    } finally {
      await resetTables();
      await destroyKyselyDb();
    }
  },
);
