import { assertEquals, assertNotEquals } from "@std/assert";
import api from "../index.ts";
import { db, destroyKyselyDb, initKyselyDb } from "../../db/database.ts";
import { resetTables } from "../../testHelpers/db.ts";
import { OrganizationService } from "./service.ts";
import settings from "../../settings.ts";
import { createTestUserAndToken } from "../../testHelpers/auth.ts";
import type { Organization } from "../../db/types.ts";

Deno.test("create a team organization", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { token } = await createTestUserAndToken();

    const response = await api.handle(
      new Request("http://localhost:3000/organizations", {
        method: "POST",
        body: JSON.stringify({ name: "Test Team" }),
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      }),
    );

    assertEquals(response?.status, 201);

    const responseBody = await response?.json();
    assertEquals(responseBody.name, "Test Team");
    assertEquals(responseBody.type, "team");

    // Verify organization exists in database
    const org = await db
      .selectFrom("organization")
      .selectAll()
      .where("id", "=", responseBody.id)
      .executeTakeFirst();

    assertNotEquals(org, undefined);
    assertEquals(org?.name, "Test Team");
    assertEquals(org?.type, "team");

    // Verify creator is an admin
    const member = await db
      .selectFrom("organization_member")
      .selectAll()
      .where("organization_id", "=", responseBody.id)
      .executeTakeFirst();

    assertNotEquals(member, undefined);
    assertEquals(member?.role, "admin");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("create a team organization with a duplicate name should fail", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    const orgService = new OrganizationService();
    await orgService.createTeamOrganization("Test Team", userId);

    const response = await api.handle(
      new Request("http://localhost:3000/organizations", {
        method: "POST",
        body: JSON.stringify({ name: "Test Team" }),
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      }),
    );

    assertEquals(response?.status, 400);

    const responseBody = await response?.json();
    assertEquals(responseBody.error, "organization_already_exists");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("get user organizations", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    // Create organizations for the user
    const orgService = new OrganizationService();
    for (let i = 0; i < 10; i++) {
      await orgService.createTeamOrganization(
        `Org ${i}`,
        userId,
      );
    }

    const response = await api.handle(
      new Request("http://localhost:3000/organizations?page=1&limit=5", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      }),
    );

    assertEquals(response?.status, 200);
    const responseBody = await response?.json();
    assertEquals(responseBody.total, 10 + 1); // +1 for personal organization
    assertEquals(responseBody.results.length, 5);
    for (let i = 0; i < 5; i++) {
      assertEquals(responseBody.results[i].name, `Org ${i}`);
      assertEquals(responseBody.results[i].type, "team");
      assertEquals(
        (responseBody.results[i].stripe_customer_id as string).startsWith(
          "cus_",
        ),
        true,
      );
      assertEquals(
        responseBody.results[i].monthly_included_credits,
        settings.ORGANIZATION.DEFAULT_MONTHLY_CREDITS,
      );
      assertEquals(
        responseBody.results[i].credits_balance,
        settings.ORGANIZATION.DEFAULT_MONTHLY_CREDITS,
      );
    }
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("get user organizations, pagination", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    // Create organizations for the user
    const orgService = new OrganizationService();
    for (let i = 0; i < 10; i++) {
      await orgService.createTeamOrganization(
        `Org ${i}`,
        userId,
      );
    }

    const response = await api.handle(
      new Request(
        "http://localhost:3000/organizations?page=2&limit=5",
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        },
      ),
    );

    assertEquals(response?.status, 200);
    const responseBody = await response?.json();
    assertEquals(responseBody.total, 10 + 1); // +1 for personal organization
    assertEquals(responseBody.results.length, 5);
    for (let i = 0; i < 5; i++) {
      assertEquals(responseBody.results[i].name, `Org ${i + 5}`);
      assertEquals(responseBody.results[i].type, "team");
      assertEquals(
        (responseBody.results[i].stripe_customer_id as string).startsWith(
          "cus_",
        ),
        true,
      );
      assertEquals(
        responseBody.results[i].monthly_included_credits,
        settings.ORGANIZATION.DEFAULT_MONTHLY_CREDITS,
      );
    }
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("get user organizations, search by name", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    // Create organizations for the user
    const orgService = new OrganizationService();
    for (let i = 0; i < 10; i++) {
      await orgService.createTeamOrganization(
        `Test Org ${i}`,
        userId,
      );
    }

    const response = await api.handle(
      new Request(
        `http://localhost:3000/organizations?page=1&limit=5&search=${
          encodeURIComponent("Test Org 0")
        }`,
        {
          method: "GET",
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
    assertEquals(responseBody.results[0].name, "Test Org 0");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("update an organization", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    // Create organization
    const orgService = new OrganizationService();
    const { organization } = await orgService.createTeamOrganization(
      "Original Name",
      userId,
    ) as { organization: Organization };

    // Update organization name
    const response = await api.handle(
      new Request(
        `http://localhost:3000/organizations/${organization.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            name: "Updated Name",
          }),
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        },
      ),
    );

    assertEquals(response?.status, 200);
    const responseBody = await response?.json();
    assertEquals(responseBody.message, "Organization updated successfully");

    // Verify organization was updated in database
    const updatedOrg = await db
      .selectFrom("organization")
      .selectAll()
      .where("id", "=", organization.id)
      .executeTakeFirstOrThrow();

    assertEquals(updatedOrg.name, "Updated Name");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("update an organization - non-member", async () => {
  initKyselyDb();
  await resetTables();

  try {
    // Create first user with organization
    const { userId } = await createTestUserAndToken();

    const orgService = new OrganizationService();
    const { organization } = await orgService.createTeamOrganization(
      "Test Team",
      userId,
    ) as { organization: Organization };

    // Create second user (not a member of the organization)
    const { token: nonMemberToken } = await createTestUserAndToken();

    const response = await api.handle(
      new Request(
        `http://localhost:3000/organizations/${organization.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            name: "Unauthorized Update",
          }),
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${nonMemberToken}`,
          },
        },
      ),
    );

    assertEquals(response?.status, 400);
    const responseBody = await response?.json();
    assertEquals(responseBody.error, "not_a_member_of_organization");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("delete an organization", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    // Create organization
    const orgService = new OrganizationService();
    const { organization } = await orgService.createTeamOrganization(
      "Test Team",
      userId,
    ) as { organization: Organization };

    // Delete organization
    const response = await api.handle(
      new Request(
        `http://localhost:3000/organizations/${organization.id}`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        },
      ),
    );

    assertEquals(response?.status, 204);

    // Verify organization was deleted from database
    const deletedOrg = await db
      .selectFrom("organization")
      .selectAll()
      .where("id", "=", organization.id)
      .executeTakeFirst();

    assertEquals(deletedOrg, undefined);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("delete an organization - non-member", async () => {
  initKyselyDb();
  await resetTables();

  try {
    // Create first user with organization
    const { userId } = await createTestUserAndToken();

    const orgService = new OrganizationService();
    const { organization } = await orgService.createTeamOrganization(
      "Test Team",
      userId,
    ) as { organization: Organization };

    // Create second user (not a member of the organization)
    const { token: nonMemberToken } = await createTestUserAndToken();

    const response = await api.handle(
      new Request(
        `http://localhost:3000/organizations/${organization.id}`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${nonMemberToken}`,
          },
        },
      ),
    );

    assertEquals(response?.status, 400);
    const responseBody = await response?.json();
    assertEquals(responseBody.error, "not_a_member_of_organization");

    // Verify organization still exists
    const org = await db
      .selectFrom("organization")
      .selectAll()
      .where("id", "=", organization.id)
      .executeTakeFirst();

    assertNotEquals(org, undefined);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("create invitation - with invalid email", async () => {
  initKyselyDb();
  await resetTables();

  try {
    // Create a test user and organization
    const { userId, token } = await createTestUserAndToken();

    const orgService = new OrganizationService();
    const { organization } = await orgService.createTeamOrganization(
      "Test Team",
      userId,
    ) as { organization: Organization };

    const response = await api.handle(
      new Request(
        `http://localhost:3000/organizations/${organization.id}/invite`,
        {
          method: "POST",
          body: JSON.stringify({
            email: "invalid-email",
          }),
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        },
      ),
    );

    assertEquals(response!.status, 400);
    const responseBody = await response!.json();
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
    const { userId, token } = await createTestUserAndToken();

    const personalOrg = await db
      .selectFrom("organization")
      .innerJoin(
        "organization_member",
        "organization_member.organization_id",
        "organization.id",
      )
      .selectAll()
      .where("organization_member.user_id", "=", userId)
      .where("organization.type", "=", "personal")
      .executeTakeFirstOrThrow();

    const inviteeEmail = `invited-${Date.now()}@example.com`;

    const response = await api.handle(
      new Request(
        `http://localhost:3000/organizations/${personalOrg.id}/invite`,
        {
          method: "POST",
          body: JSON.stringify({
            email: inviteeEmail,
          }),
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        },
      ),
    );

    assertEquals(response!.status, 400);
    const responseBody = await response!.json();
    assertEquals(responseBody.error, "organization_not_found");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("create invitation - success", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    const orgService = new OrganizationService();
    const { organization } = await orgService.createTeamOrganization(
      "Test Team",
      userId,
    ) as { organization: Organization };

    const inviteeEmail = `invited-${Date.now()}@example.com`;

    const response = await api.handle(
      new Request(
        `http://localhost:3000/organizations/${organization.id}/invite`,
        {
          method: "POST",
          body: JSON.stringify({
            email: inviteeEmail,
          }),
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        },
      ),
    );

    assertEquals(response!.status, 200);
    const responseBody = await response!.json();
    assertEquals(responseBody.message, "Invitation created successfully");

    // Check invitation was created
    const invitation = await db
      .selectFrom("organization_invitation")
      .selectAll()
      .where("organization_id", "=", organization.id)
      .executeTakeFirstOrThrow();

    assertNotEquals(invitation, undefined);
    assertEquals(invitation!.organization_id, organization.id);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("claim invitation - success", async () => {
  initKyselyDb();
  await resetTables();

  try {
    // Create a test user and organization
    const { userId } = await createTestUserAndToken();

    const orgService = new OrganizationService();
    const { organization } = await orgService.createTeamOrganization(
      "Test Team",
      userId,
    ) as { organization: Organization };

    const inviteeEmail = `invited-${Date.now()}@example.com`;

    const organizationService = new OrganizationService();
    await organizationService.createInvitation(
      userId,
      organization.id,
      inviteeEmail,
    );

    const invitation = await db
      .selectFrom("organization_invitation")
      .selectAll()
      .where("organization_id", "=", organization.id)
      .executeTakeFirstOrThrow();

    const { token: inviteeToken, userId: inviteeUserId } =
      await createTestUserAndToken();

    const response = await api.handle(
      new Request(
        `http://localhost:3000/organizations/invitation/claim/${invitation.uuid}`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${inviteeToken}`,
          },
        },
      ),
    );

    assertEquals(response!.status, 200);

    // Check user is now a member of the organization
    const membership = await db
      .selectFrom("organization_member")
      .selectAll()
      .where("user_id", "=", inviteeUserId)
      .where("organization_id", "=", organization!.id)
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

Deno.test("get organization members", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    // Create organization
    const orgService = new OrganizationService();
    const { organization } = await orgService.createTeamOrganization(
      "Test Team",
      userId,
    ) as { organization: Organization };

    // Create additional test users and add them to the organization
    for (let i = 0; i < 5; i++) {
      const { userId: memberId } = await createTestUserAndToken();
      await db
        .insertInto("organization_member")
        .values({
          organization_id: organization.id,
          user_id: memberId,
          role: i === 0 ? "admin" : "member",
          created_at: new Date(),
        })
        .execute();
    }

    // Get members
    const response = await api.handle(
      new Request(
        `http://localhost:3000/organizations/${organization.id}/members?page=1&limit=10`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        },
      ),
    );

    assertEquals(response?.status, 200);
    const responseBody = await response?.json();
    assertEquals(responseBody.total, 6); // 5 added members + 1 creator
    assertEquals(responseBody.results.length, 6);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("get organization members - invalid parameters", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { token } = await createTestUserAndToken();

    // Invalid organization ID
    const response = await api.handle(
      new Request(
        `http://localhost:3000/organizations/invalid/members?page=1&limit=10`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        },
      ),
    );

    assertEquals(response?.status, 400);
    const responseBody = await response?.json();
    assertEquals(responseBody.error.issues[0], {
      code: "custom",
      path: ["organizationId"],
      message: "Organization ID must be a number",
    });

    // Invalid page/limit
    const response2 = await api.handle(
      new Request(
        `http://localhost:3000/organizations/1/members?page=invalid&limit=ten`,
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

Deno.test("get organization members - not a member", async () => {
  initKyselyDb();
  await resetTables();

  try {
    // Create first user with organization
    const { userId } = await createTestUserAndToken();

    const orgService = new OrganizationService();
    const { organization } = await orgService.createTeamOrganization(
      "Test Team",
      userId,
    ) as { organization: Organization };

    // Create second user (not a member of the organization)
    const { token: nonMemberToken } = await createTestUserAndToken();

    const response = await api.handle(
      new Request(
        `http://localhost:3000/organizations/${organization.id}/members?page=1&limit=10`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${nonMemberToken}`,
          },
        },
      ),
    );

    assertEquals(response?.status, 400);
    const responseBody = await response?.json();
    assertEquals(responseBody.error, "not_a_member_of_organization");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("update member role", async () => {
  initKyselyDb();
  await resetTables();

  try {
    // Create admin user with organization
    const { userId, token } = await createTestUserAndToken();

    const orgService = new OrganizationService();
    const { organization } = await orgService.createTeamOrganization(
      "Test Team",
      userId,
    ) as { organization: Organization };

    // Create a member
    const { userId: memberId } = await createTestUserAndToken();
    const memberRecord = await db
      .insertInto("organization_member")
      .values({
        organization_id: organization.id,
        user_id: memberId,
        role: "member",
        created_at: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Update member role to admin
    const response = await api.handle(
      new Request(
        `http://localhost:3000/organizations/${organization.id}/members/${memberRecord.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            role: "admin",
          }),
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        },
      ),
    );

    assertEquals(response?.status, 200);
    const responseBody = await response?.json();
    assertEquals(responseBody.message, "Member role updated successfully");

    // Verify role was updated in database
    const updatedMember = await db
      .selectFrom("organization_member")
      .selectAll()
      .where("id", "=", memberRecord.id)
      .executeTakeFirstOrThrow();

    assertEquals(updatedMember.role, "admin");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("update member role - non-admin user", async () => {
  initKyselyDb();
  await resetTables();

  try {
    // Create admin user with organization
    const { userId } = await createTestUserAndToken();

    const orgService = new OrganizationService();
    const { organization } = await orgService.createTeamOrganization(
      "Test Team",
      userId,
    ) as { organization: Organization };

    // Create a regular member
    const { userId: memberId, token: memberToken } =
      await createTestUserAndToken();
    await db
      .insertInto("organization_member")
      .values({
        organization_id: organization.id,
        user_id: memberId,
        role: "member",
        created_at: new Date(),
      })
      .execute();

    // Create another member
    const { userId: targetMemberId } = await createTestUserAndToken();
    const targetMember = await db
      .insertInto("organization_member")
      .values({
        organization_id: organization.id,
        user_id: targetMemberId,
        role: "member",
        created_at: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Regular member tries to update another member's role
    const response = await api.handle(
      new Request(
        `http://localhost:3000/organizations/${organization.id}/members/${targetMember.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            role: "admin",
          }),
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${memberToken}`,
          },
        },
      ),
    );

    assertEquals(response?.status, 400);
    const responseBody = await response?.json();
    assertEquals(responseBody.error, "not_a_member_of_organization");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("remove member from organization", async () => {
  initKyselyDb();
  await resetTables();

  try {
    // Create admin user with organization
    const { userId, token } = await createTestUserAndToken();

    const orgService = new OrganizationService();
    const { organization } = await orgService.createTeamOrganization(
      "Test Team",
      userId,
    ) as { organization: Organization };

    // Create a member
    const { userId: memberId } = await createTestUserAndToken();
    const memberRecord = await db
      .insertInto("organization_member")
      .values({
        organization_id: organization.id,
        user_id: memberId,
        role: "member",
        created_at: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    // Remove member
    const response = await api.handle(
      new Request(
        `http://localhost:3000/organizations/${organization.id}/members/${memberRecord.id}`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        },
      ),
    );

    assertEquals(response?.status, 200);
    const responseBody = await response?.json();
    assertEquals(
      responseBody.message,
      "Member removed from organization successfully",
    );

    // Verify member was removed from database
    const removedMember = await db
      .selectFrom("organization_member")
      .selectAll()
      .where("id", "=", memberRecord.id)
      .executeTakeFirst();

    assertEquals(removedMember, undefined);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("remove member - cannot remove self", async () => {
  initKyselyDb();
  await resetTables();

  try {
    // Create admin user with organization
    const { userId, token } = await createTestUserAndToken();

    const orgService = new OrganizationService();
    const { organization } = await orgService.createTeamOrganization(
      "Test Team",
      userId,
    ) as { organization: Organization };

    // Get the admin's membership record
    const adminMember = await db
      .selectFrom("organization_member")
      .selectAll()
      .where("organization_id", "=", organization.id)
      .where("user_id", "=", userId)
      .executeTakeFirstOrThrow();

    // Try to remove self
    const response = await api.handle(
      new Request(
        `http://localhost:3000/organizations/${organization.id}/members/${adminMember.id}`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        },
      ),
    );

    assertEquals(response?.status, 400);
    const responseBody = await response?.json();
    assertEquals(responseBody.error, "cannot_remove_self_from_organization");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});
