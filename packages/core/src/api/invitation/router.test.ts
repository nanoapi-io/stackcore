import { assertEquals, assertNotEquals } from "@std/assert";
import api from "../index.ts";
import { db, destroyKyselyDb, initKyselyDb } from "@stackcore/db";
import { resetTables } from "../../testHelpers/db.ts";
import { WorkspaceService } from "../workspace/service.ts";
import { InvitationService } from "./service.ts";
import { createTestUserAndToken } from "../../testHelpers/auth.ts";
import {
  alreadyAMemberOfWorkspaceError,
  invitationExpiredError,
  invitationNotFoundError,
  notAnAdminOfWorkspaceError,
  notMemberOfWorkspaceError,
  workspaceNotTeamError,
} from "./service.ts";
import { prepareClaimInvitation, prepareCreateInvitation } from "./types.ts";

// POST /:workspaceId/invite (create invitation)
Deno.test("create invitation - with invalid email", async () => {
  initKyselyDb();
  await resetTables();

  try {
    // Create a test user and workspace
    const { userId, token } = await createTestUserAndToken();

    const workspaceService = new WorkspaceService();
    await workspaceService.createTeamWorkspace(
      "Test Workspace",
      userId,
    );

    // Get the workspace ID from the database
    const workspace = await db
      .selectFrom("workspace")
      .selectAll()
      .where("name", "=", "Test Workspace")
      .executeTakeFirstOrThrow();

    const { url, method, body } = prepareCreateInvitation({
      workspaceId: workspace.id,
      email: "invalid-email",
      returnUrl: "http://localhost:3000/invitations/claim",
    });

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

    assertNotEquals(response, undefined);
    assertEquals(response?.status, 400);
    const responseBody = await response?.json();
    assertEquals(responseBody.error.issues[0], {
      validation: "email",
      code: "invalid_string",
      path: ["email"],
      message: "Invalid email",
    });
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("create invitation - with personal workspace", async () => {
  initKyselyDb();
  await resetTables();

  try {
    // Create a test user and workspace
    const { token, personalWorkspaceId } = await createTestUserAndToken();

    const inviteeEmail = `invited-${crypto.randomUUID()}@example.com`;

    const { url, method, body } = prepareCreateInvitation({
      workspaceId: personalWorkspaceId,
      email: inviteeEmail,
      returnUrl: "http://localhost:3000/invitations/claim",
    });

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

    assertNotEquals(response, undefined);
    assertEquals(response?.status, 400);
    const responseBody = await response?.json();
    assertEquals(responseBody.error, workspaceNotTeamError);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("create invitation - with non-admin user", async () => {
  initKyselyDb();
  await resetTables();

  try {
    // Create a test user and workspace
    const { userId } = await createTestUserAndToken();

    const workspaceService = new WorkspaceService();
    await workspaceService.createTeamWorkspace(
      "Test Workspace",
      userId,
    );

    // Get the workspace ID from the database
    const workspace = await db
      .selectFrom("workspace")
      .selectAll()
      .where("name", "=", "Test Workspace")
      .executeTakeFirstOrThrow();

    // Create another user who will be a member but not admin
    const { token: memberToken, userId: memberUserId } =
      await createTestUserAndToken();

    // Add the second user as a member
    await db
      .insertInto("member")
      .values({
        workspace_id: workspace.id,
        user_id: memberUserId,
        role: "member",
        created_at: new Date(),
      })
      .execute();

    const { url, method, body } = prepareCreateInvitation({
      workspaceId: workspace.id,
      email: "test@example.com",
      returnUrl: "http://localhost:3000/invitations/claim",
    });

    const response = await api.handle(
      new Request(
        `http://localhost:3000${url}`,
        {
          method,
          body: JSON.stringify(body),
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${memberToken}`,
          },
        },
      ),
    );

    assertNotEquals(response, undefined);
    assertEquals(response?.status, 400);
    const responseBody = await response?.json();
    assertEquals(responseBody.error, notAnAdminOfWorkspaceError);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("create invitation - with non-member user", async () => {
  initKyselyDb();
  await resetTables();

  try {
    // Create a test user and workspace
    const { userId } = await createTestUserAndToken();

    const workspaceService = new WorkspaceService();
    await workspaceService.createTeamWorkspace(
      "Test Workspace",
      userId,
    );

    // Get the workspace ID from the database
    const workspace = await db
      .selectFrom("workspace")
      .selectAll()
      .where("name", "=", "Test Workspace")
      .executeTakeFirstOrThrow();

    // Create another user who is not a member
    const { token: nonMemberToken } = await createTestUserAndToken();

    const { url, method, body } = prepareCreateInvitation({
      workspaceId: workspace.id,
      email: "test@example.com",
      returnUrl: "http://localhost:3000/invitations/claim",
    });

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

    assertNotEquals(response, undefined);
    assertEquals(response?.status, 400);
    const responseBody = await response?.json();
    assertEquals(responseBody.error, notMemberOfWorkspaceError);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("create invitation - with non-existent workspace", async () => {
  initKyselyDb();
  await resetTables();

  try {
    // Create a test user
    const { token } = await createTestUserAndToken();

    const { url, method, body } = prepareCreateInvitation({
      workspaceId: 999999,
      email: "test@example.com",
      returnUrl: "http://localhost:3000/invitations/claim",
    });

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

    assertNotEquals(response, undefined);
    assertEquals(response?.status, 400);
    const responseBody = await response?.json();
    assertEquals(responseBody.error, notMemberOfWorkspaceError);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("create invitation - success", async () => {
  initKyselyDb();
  await resetTables();

  try {
    // Create a test user and workspace
    const { userId, token } = await createTestUserAndToken();

    const workspaceService = new WorkspaceService();
    await workspaceService.createTeamWorkspace(
      "Test Workspace",
      userId,
    );

    // Get the workspace ID from the database
    const workspace = await db
      .selectFrom("workspace")
      .selectAll()
      .where("name", "=", "Test Workspace")
      .executeTakeFirstOrThrow();

    const inviteeEmail = `invited-${crypto.randomUUID()}@example.com`;

    const { url, method, body } = prepareCreateInvitation({
      workspaceId: workspace.id,
      email: inviteeEmail,
      returnUrl: "http://localhost:3000/invitations/claim",
    });

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

    assertNotEquals(response, undefined);
    assertEquals(response?.status, 200);
    const responseBody = await response?.json();
    assertEquals(responseBody.message, "Invitation created successfully");

    // Verify invitation was created in database
    const invitation = await db
      .selectFrom("invitation")
      .selectAll()
      .where("workspace_id", "=", workspace.id)
      .executeTakeFirstOrThrow();

    assertNotEquals(invitation, undefined);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("claim  invitation - success", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId } = await createTestUserAndToken();

    const workspaceService = new WorkspaceService();
    await workspaceService.createTeamWorkspace(
      "Test Workspace",
      userId,
    );

    // Get the workspace ID from the database
    const workspace = await db
      .selectFrom("workspace")
      .selectAll()
      .where("name", "=", "Test Workspace")
      .executeTakeFirstOrThrow();

    const inviteeEmail = `invited-${crypto.randomUUID()}@example.com`;

    const invitationService = new InvitationService();
    await invitationService.createInvitation(
      userId,
      workspace.id,
      inviteeEmail,
      "http://localhost:3000/invitations/claim",
    );

    const invitation = await db
      .selectFrom("invitation")
      .selectAll()
      .where("workspace_id", "=", workspace.id)
      .executeTakeFirstOrThrow();

    const { token: inviteeToken, userId: inviteeUserId } =
      await createTestUserAndToken();

    const { url, method } = prepareClaimInvitation(invitation.uuid);

    const response = await api.handle(
      new Request(
        `http://localhost:3000${url}`,
        {
          method,
          headers: {
            "Authorization": `Bearer ${inviteeToken}`,
          },
        },
      ),
    );

    assertNotEquals(response, undefined);
    assertEquals(response?.status, 200);

    // Check user is now a member of the workspace
    const membership = await db
      .selectFrom("member")
      .selectAll()
      .where("user_id", "=", inviteeUserId)
      .where("workspace_id", "=", workspace.id)
      .executeTakeFirstOrThrow();

    assertEquals(membership.role, "member");

    // Check invitation was deleted
    const checkInvitation = await db
      .selectFrom("invitation")
      .selectAll()
      .where("uuid", "=", invitation.uuid)
      .executeTakeFirst();

    assertEquals(checkInvitation, undefined);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("claim invitation - already a member", async () => {
  initKyselyDb();
  await resetTables();

  try {
    // Create a test user and workspace
    const { userId } = await createTestUserAndToken();

    const workspaceService = new WorkspaceService();
    await workspaceService.createTeamWorkspace(
      "Test Workspace",
      userId,
    );

    // Get the workspace ID from the database
    const workspace = await db
      .selectFrom("workspace")
      .selectAll()
      .where("name", "=", "Test Workspace")
      .executeTakeFirstOrThrow();

    const inviteeEmail = `invited-${crypto.randomUUID()}@example.com`;

    // Create invitation
    const invitationService = new InvitationService();
    await invitationService.createInvitation(
      userId,
      workspace.id,
      inviteeEmail,
      "http://localhost:3000/invitations/claim",
    );

    const invitation = await db
      .selectFrom("invitation")
      .selectAll()
      .where("workspace_id", "=", workspace.id)
      .executeTakeFirstOrThrow();

    // Create user and add them to workspace
    const { token: inviteeToken, userId: inviteeUserId } =
      await createTestUserAndToken();

    await db
      .insertInto("member")
      .values({
        workspace_id: workspace.id,
        user_id: inviteeUserId,
        role: "member",
        created_at: new Date(),
      })
      .execute();

    // Try to claim invitation when already a member
    const { url, method } = prepareClaimInvitation(invitation.uuid);

    const response = await api.handle(
      new Request(
        `http://localhost:3000${url}`,
        {
          method,
          headers: {
            "Authorization": `Bearer ${inviteeToken}`,
          },
        },
      ),
    );

    assertNotEquals(response, undefined);
    assertEquals(response?.status, 400);
    const responseBody = await response?.json();
    assertEquals(responseBody.error, alreadyAMemberOfWorkspaceError);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("claim invitation - with non-existent invitation", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { token } = await createTestUserAndToken();

    const { url, method } = prepareClaimInvitation(crypto.randomUUID());

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

    assertNotEquals(response, undefined);
    assertEquals(response?.status, 400);
    const responseBody = await response?.json();
    assertEquals(responseBody.error, invitationNotFoundError);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("claim invitation - with non-team workspace", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { token } = await createTestUserAndToken();

    // Create a personal workspace (non-team)
    const workspace = await db
      .insertInto("workspace")
      .values({
        name: "Personal Org",
        isTeam: false,
        deactivated: false,
        access_enabled: true,
        created_at: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Create an invitation for the personal workspace
    const invitation = await db
      .insertInto("invitation")
      .values({
        workspace_id: workspace.id,
        expires_at: new Date(Date.now() + 86400000), // 1 day from now
        created_at: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    const { url, method } = prepareClaimInvitation(invitation.uuid);

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

    assertNotEquals(response, undefined);
    assertEquals(response?.status, 400);
    const responseBody = await response?.json();
    assertEquals(responseBody.error, workspaceNotTeamError);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("claim invitation - with expired invitation", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId } = await createTestUserAndToken();

    const workspaceService = new WorkspaceService();
    await workspaceService.createTeamWorkspace(
      "Test Workspace",
      userId,
    );

    // Get the workspace ID from the database
    const workspace = await db
      .selectFrom("workspace")
      .selectAll()
      .where("name", "=", "Test Workspace")
      .executeTakeFirstOrThrow();

    // Create an expired invitation
    const invitation = await db
      .insertInto("invitation")
      .values({
        workspace_id: workspace.id,
        expires_at: new Date(Date.now() - 86400000), // 1 day ago
        created_at: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    const { token } = await createTestUserAndToken();

    const { url, method } = prepareClaimInvitation(invitation.uuid);

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

    assertNotEquals(response, undefined);
    assertEquals(response?.status, 400);
    const responseBody = await response?.json();
    assertEquals(responseBody.error, invitationExpiredError);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});
