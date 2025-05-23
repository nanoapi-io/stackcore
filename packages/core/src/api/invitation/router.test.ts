import { assertEquals, assertNotEquals } from "@std/assert";
import api from "../index.ts";
import { db, destroyKyselyDb, initKyselyDb } from "../../db/database.ts";
import { resetTables } from "../../testHelpers/db.ts";
import { OrganizationService } from "../organization/service.ts";
import { InvitationService } from "./service.ts";
import { createTestUserAndToken } from "../../testHelpers/auth.ts";
import {
  alreadyAMemberOfOrganizationError,
  invitationExpiredError,
  invitationNotFoundError,
  notAnAdminOfOrganizationError,
  notMemberOfOrganizationError,
  organizationNotTeamError,
} from "./service.ts";

// POST /:organizationId/invite (create invitation)
Deno.test("create invitation - with invalid email", async () => {
  initKyselyDb();
  await resetTables();

  try {
    // Create a test user and organization
    const { userId, token } = await createTestUserAndToken();

    const orgService = new OrganizationService();
    await orgService.createTeamOrganization(
      "Test Team",
      userId,
    );

    // Get the organization ID from the database
    const org = await db
      .selectFrom("organization")
      .selectAll()
      .where("name", "=", "Test Team")
      .executeTakeFirstOrThrow();

    const response = await api.handle(
      new Request(
        `http://localhost:3000/invitations`,
        {
          method: "POST",
          body: JSON.stringify({
            organizationId: org.id,
            email: "invalid-email",
          }),
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

Deno.test("create invitation - with personal organization", async () => {
  initKyselyDb();
  await resetTables();

  try {
    // Create a test user and organization
    const { token, personalOrgId } = await createTestUserAndToken();

    const inviteeEmail = `invited-${crypto.randomUUID()}@example.com`;

    const response = await api.handle(
      new Request(
        `http://localhost:3000/invitations`,
        {
          method: "POST",
          body: JSON.stringify({
            organizationId: personalOrgId,
            email: inviteeEmail,
          }),
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
    assertEquals(
      responseBody.error,
      organizationNotTeamError,
    );
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("create invitation - with non-admin user", async () => {
  initKyselyDb();
  await resetTables();

  try {
    // Create a test user and organization
    const { userId } = await createTestUserAndToken();

    const orgService = new OrganizationService();
    await orgService.createTeamOrganization(
      "Test Team",
      userId,
    );

    // Get the organization ID from the database
    const org = await db
      .selectFrom("organization")
      .selectAll()
      .where("name", "=", "Test Team")
      .executeTakeFirstOrThrow();

    // Create another user who will be a member but not admin
    const { token: memberToken, userId: memberUserId } =
      await createTestUserAndToken();

    // Add the second user as a member
    await db
      .insertInto("organization_member")
      .values({
        organization_id: org.id,
        user_id: memberUserId,
        role: "member",
        created_at: new Date(),
      })
      .execute();

    const response = await api.handle(
      new Request(
        `http://localhost:3000/invitations`,
        {
          method: "POST",
          body: JSON.stringify({
            organizationId: org.id,
            email: "test@example.com",
          }),
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
    assertEquals(responseBody.error, notAnAdminOfOrganizationError);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("create invitation - with non-member user", async () => {
  initKyselyDb();
  await resetTables();

  try {
    // Create a test user and organization
    const { userId } = await createTestUserAndToken();

    const orgService = new OrganizationService();
    await orgService.createTeamOrganization(
      "Test Team",
      userId,
    );

    // Get the organization ID from the database
    const org = await db
      .selectFrom("organization")
      .selectAll()
      .where("name", "=", "Test Team")
      .executeTakeFirstOrThrow();

    // Create another user who is not a member
    const { token: nonMemberToken } = await createTestUserAndToken();

    const response = await api.handle(
      new Request(
        `http://localhost:3000/invitations`,
        {
          method: "POST",
          body: JSON.stringify({
            organizationId: org.id,
            email: "test@example.com",
          }),
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
    assertEquals(responseBody.error, notMemberOfOrganizationError);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("create invitation - with non-existent organization", async () => {
  initKyselyDb();
  await resetTables();

  try {
    // Create a test user
    const { token } = await createTestUserAndToken();

    const response = await api.handle(
      new Request(
        `http://localhost:3000/invitations`,
        {
          method: "POST",
          body: JSON.stringify({
            organizationId: 999999, // Non-existent organization ID
            email: "test@example.com",
          }),
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
    assertEquals(responseBody.error, notMemberOfOrganizationError);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("create invitation - success", async () => {
  initKyselyDb();
  await resetTables();

  try {
    // Create a test user and organization
    const { userId, token } = await createTestUserAndToken();

    const orgService = new OrganizationService();
    await orgService.createTeamOrganization(
      "Test Team",
      userId,
    );

    // Get the organization ID from the database
    const org = await db
      .selectFrom("organization")
      .selectAll()
      .where("name", "=", "Test Team")
      .executeTakeFirstOrThrow();

    const inviteeEmail = `invited-${crypto.randomUUID()}@example.com`;

    const response = await api.handle(
      new Request(
        `http://localhost:3000/invitations`,
        {
          method: "POST",
          body: JSON.stringify({
            organizationId: org.id,
            email: inviteeEmail,
          }),
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
      .selectFrom("organization_invitation")
      .selectAll()
      .where("organization_id", "=", org.id)
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

    const orgService = new OrganizationService();
    await orgService.createTeamOrganization(
      "Test Team",
      userId,
    );

    // Get the organization ID from the database
    const org = await db
      .selectFrom("organization")
      .selectAll()
      .where("name", "=", "Test Team")
      .executeTakeFirstOrThrow();

    const inviteeEmail = `invited-${crypto.randomUUID()}@example.com`;

    const invitationService = new InvitationService();
    await invitationService.createInvitation(
      userId,
      org.id,
      inviteeEmail,
    );

    const invitation = await db
      .selectFrom("organization_invitation")
      .selectAll()
      .where("organization_id", "=", org.id)
      .executeTakeFirstOrThrow();

    const { token: inviteeToken, userId: inviteeUserId } =
      await createTestUserAndToken();

    const response = await api.handle(
      new Request(
        `http://localhost:3000/invitations/${invitation.uuid}/claim`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${inviteeToken}`,
          },
        },
      ),
    );

    assertNotEquals(response, undefined);
    assertEquals(response?.status, 200);

    // Check user is now a member of the organization
    const membership = await db
      .selectFrom("organization_member")
      .selectAll()
      .where("user_id", "=", inviteeUserId)
      .where("organization_id", "=", org.id)
      .executeTakeFirstOrThrow();

    assertEquals(membership.role, "member");

    // Check invitation was deleted
    const checkInvitation = await db
      .selectFrom("organization_invitation")
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
    // Create a test user and organization
    const { userId } = await createTestUserAndToken();

    const orgService = new OrganizationService();
    await orgService.createTeamOrganization(
      "Test Team",
      userId,
    );

    // Get the organization ID from the database
    const org = await db
      .selectFrom("organization")
      .selectAll()
      .where("name", "=", "Test Team")
      .executeTakeFirstOrThrow();

    const inviteeEmail = `invited-${crypto.randomUUID()}@example.com`;

    // Create invitation
    const invitationService = new InvitationService();
    await invitationService.createInvitation(
      userId,
      org.id,
      inviteeEmail,
    );

    const invitation = await db
      .selectFrom("organization_invitation")
      .selectAll()
      .where("organization_id", "=", org.id)
      .executeTakeFirstOrThrow();

    // Create user and add them to organization
    const { token: inviteeToken, userId: inviteeUserId } =
      await createTestUserAndToken();

    await db
      .insertInto("organization_member")
      .values({
        organization_id: org.id,
        user_id: inviteeUserId,
        role: "member",
        created_at: new Date(),
      })
      .execute();

    // Try to claim invitation when already a member
    const response = await api.handle(
      new Request(
        `http://localhost:3000/invitations/${invitation.uuid}/claim`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${inviteeToken}`,
          },
        },
      ),
    );

    assertNotEquals(response, undefined);
    assertEquals(response?.status, 400);
    const responseBody = await response?.json();
    assertEquals(responseBody.error, alreadyAMemberOfOrganizationError);
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

    const response = await api.handle(
      new Request(
        `http://localhost:3000/invitations/${crypto.randomUUID()}/claim`,
        {
          method: "POST",
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

Deno.test("claim invitation - with non-team organization", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { token } = await createTestUserAndToken();

    // Create a personal organization (non-team)
    const org = await db
      .insertInto("organization")
      .values({
        name: "Personal Org",
        isTeam: false,
        deactivated: false,
        access_enabled: true,
        created_at: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Create an invitation for the personal organization
    const invitation = await db
      .insertInto("organization_invitation")
      .values({
        organization_id: org.id,
        expires_at: new Date(Date.now() + 86400000), // 1 day from now
        created_at: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    const response = await api.handle(
      new Request(
        `http://localhost:3000/invitations/${invitation.uuid}/claim`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        },
      ),
    );

    assertNotEquals(response, undefined);
    assertEquals(response?.status, 400);
    const responseBody = await response?.json();
    assertEquals(responseBody.error, organizationNotTeamError);
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

    const orgService = new OrganizationService();
    await orgService.createTeamOrganization(
      "Test Team",
      userId,
    );

    // Get the organization ID from the database
    const org = await db
      .selectFrom("organization")
      .selectAll()
      .where("name", "=", "Test Team")
      .executeTakeFirstOrThrow();

    // Create an expired invitation
    const invitation = await db
      .insertInto("organization_invitation")
      .values({
        organization_id: org.id,
        expires_at: new Date(Date.now() - 86400000), // 1 day ago
        created_at: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    const { token } = await createTestUserAndToken();

    const response = await api.handle(
      new Request(
        `http://localhost:3000/invitations/${invitation.uuid}/claim`,
        {
          method: "POST",
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
