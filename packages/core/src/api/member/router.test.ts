import { assertEquals, assertNotEquals } from "@std/assert";
import api from "../index.ts";
import { db, destroyKyselyDb, initKyselyDb } from "../../db/database.ts";
import { resetTables } from "../../testHelpers/db.ts";
import { OrganizationService } from "../organization/service.ts";
import { createTestUserAndToken } from "../../testHelpers/auth.ts";
import {
  cannotUpdateSelfError,
  memberNotFoundError,
  notAdminOfOrganizationError,
  notMemberOfOrganizationError,
} from "./service.ts";
import { MemberApiTypes } from "../responseType.ts";
import type { OrganizationMemberRole } from "../../db/models/organizationMember.ts";

// GET /:organizationId/members (list members)
Deno.test("get organization members", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    // Create organization
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

    // Create additional test users and add them to the organization
    for (let i = 0; i < 5; i++) {
      const { userId: memberId } = await createTestUserAndToken();
      await db
        .insertInto("organization_member")
        .values({
          organization_id: org.id,
          user_id: memberId,
          role: i === 0 ? "admin" : "member",
          created_at: new Date(),
        })
        .execute();
    }

    const { url, method } = MemberApiTypes.prepareGetMembers({
      organizationId: org.id,
      page: 1,
      limit: 10,
    });

    // Get members
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
    const { url, method } = MemberApiTypes.prepareGetMembers({
      organizationId: -1,
      page: 1,
      limit: 10,
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

    assertEquals(response?.status, 400);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("get organization members - invalid page/limit values", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { token } = await createTestUserAndToken();

    const { url, method } = MemberApiTypes.prepareGetMembers({
      organizationId: 1,
      page: -1,
      limit: -10,
    });

    // Test with negative page
    const response1 = await api.handle(
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

    assertEquals(response1?.status, 400);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("get organization members - empty search", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    // Create organization
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

    const { url, method } = MemberApiTypes.prepareGetMembers({
      organizationId: org.id,
      page: 1,
      limit: 10,
    });

    // Test with empty search string
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
    assertEquals(response?.status, 200);
    const responseBody = await response?.json();
    assertEquals(responseBody.total, 1); // Should find the creator
    assertEquals(responseBody.results.length, 1);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("get organization members - pagination", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    // Create organization
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

    // Create additional test users and add them to the organization
    for (let i = 0; i < 15; i++) {
      const { userId: memberId } = await createTestUserAndToken();
      await db
        .insertInto("organization_member")
        .values({
          organization_id: org.id,
          user_id: memberId,
          role: "member",
          created_at: new Date(),
        })
        .execute();
    }

    const { url: url1, method: method1 } = MemberApiTypes.prepareGetMembers({
      organizationId: org.id,
      page: 1,
      limit: 10,
    });

    // Test first page
    const response1 = await api.handle(
      new Request(
        `http://localhost:3000${url1}`,
        {
          method: method1,
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        },
      ),
    );

    assertNotEquals(response1, undefined);
    assertEquals(response1?.status, 200);
    const responseBody1 = await response1?.json();
    assertEquals(responseBody1.total, 16); // 15 added members + 1 creator
    assertEquals(responseBody1.results.length, 10);

    const { url: url2, method: method2 } = MemberApiTypes.prepareGetMembers({
      organizationId: org.id,
      page: 2,
      limit: 10,
    });

    // Test second page
    const response2 = await api.handle(
      new Request(
        `http://localhost:3000${url2}`,
        {
          method: method2,
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        },
      ),
    );

    assertNotEquals(response2, undefined);
    assertEquals(response2?.status, 200);
    const responseBody2 = await response2?.json();
    assertEquals(responseBody2.total, 16);
    assertEquals(responseBody2.results.length, 6); // Remaining 6 members
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

    // Create second user (not a member of the organization)
    const { token: nonMemberToken } = await createTestUserAndToken();

    const { url, method } = MemberApiTypes.prepareGetMembers({
      organizationId: org.id,
      page: 1,
      limit: 10,
    });

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

    assertNotEquals(response, undefined);
    assertEquals(response?.status, 400);
    const responseBody = await response?.json();
    assertEquals(responseBody.error, notMemberOfOrganizationError);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("get organization members - with search", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    // Create organization
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

    // Create additional test users and add them to the organization
    const testEmails = [
      "user1@example.com",
      "user2@example.com",
      "other@example.com",
    ];

    for (const email of testEmails) {
      const { userId: memberId } = await createTestUserAndToken();
      await db
        .insertInto("organization_member")
        .values({
          organization_id: org.id,
          user_id: memberId,
          role: "member",
          created_at: new Date(),
        })
        .execute();

      // Update user email
      await db
        .updateTable("user")
        .set({ email })
        .where("id", "=", memberId)
        .execute();
    }

    // Search for members with "test" in their email
    const { url, method } = MemberApiTypes.prepareGetMembers({
      organizationId: org.id,
      page: 1,
      limit: 10,
      search: "user",
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

    assertNotEquals(response, undefined);
    assertEquals(response?.status, 200);
    const responseBody = await response?.json();
    assertEquals(responseBody.total, 2); // Should find test1@example.com and test2@example.com
    assertEquals(responseBody.results.length, 2);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

// PATCH /:organizationId/members/:memberId (update member role)
Deno.test("update member role", async () => {
  initKyselyDb();
  await resetTables();

  try {
    // Create admin user with organization
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

    // Create a member
    const { userId: memberId } = await createTestUserAndToken();
    const memberRecord = await db
      .insertInto("organization_member")
      .values({
        organization_id: org.id,
        user_id: memberId,
        role: "member",
        created_at: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    const { url, method, body } = MemberApiTypes.prepareUpdateMemberRole(
      memberRecord.id,
      {
        role: "admin",
      },
    );
    // Update member role to admin
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

    // Create a regular member
    const { userId: memberId, token: memberToken } =
      await createTestUserAndToken();
    await db
      .insertInto("organization_member")
      .values({
        organization_id: org.id,
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
        organization_id: org.id,
        user_id: targetMemberId,
        role: "member",
        created_at: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    const { url, method, body } = MemberApiTypes.prepareUpdateMemberRole(
      targetMember.id,
      {
        role: "admin",
      },
    );

    // Regular member tries to update another member's role
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
    assertEquals(responseBody.error, notAdminOfOrganizationError);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("update member role - cannot update self", async () => {
  initKyselyDb();
  await resetTables();

  try {
    // Create admin user with organization
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

    // Get the admin's membership record
    const adminMember = await db
      .selectFrom("organization_member")
      .selectAll()
      .where("organization_id", "=", org.id)
      .where("user_id", "=", userId)
      .executeTakeFirstOrThrow();

    const { url, method, body } = MemberApiTypes.prepareUpdateMemberRole(
      adminMember.id,
      {
        role: "member",
      },
    );

    // Try to update own role
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
    assertEquals(responseBody.error, cannotUpdateSelfError);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("update member role - invalid role value", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    // Create organization
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

    // Create a member
    const { userId: memberId } = await createTestUserAndToken();
    const memberRecord = await db
      .insertInto("organization_member")
      .values({
        organization_id: org.id,
        user_id: memberId,
        role: "member",
        created_at: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    const { url, method, body } = MemberApiTypes.prepareUpdateMemberRole(
      memberRecord.id,
      {
        role: "invalid_role" as OrganizationMemberRole,
      },
    );

    // Try to update with invalid role
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
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("update member role - non-existent member", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { token } = await createTestUserAndToken();

    const { url, method, body } = MemberApiTypes.prepareUpdateMemberRole(
      999999,
      {
        role: "admin",
      },
    );

    // Try to update non-existent member
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
    assertEquals(responseBody.error, memberNotFoundError);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("update member role - invalid member ID format", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { token } = await createTestUserAndToken();

    const { url, method, body } = MemberApiTypes.prepareUpdateMemberRole(
      -1,
      {
        role: "admin",
      },
    );

    // Try to update with invalid member ID format
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
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

// DELETE /:organizationId/members/:memberId (remove member)
Deno.test("remove member from organization", async () => {
  initKyselyDb();
  await resetTables();

  try {
    // Create admin user with organization
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

    // Create a member
    const { userId: memberId } = await createTestUserAndToken();
    const memberRecord = await db
      .insertInto("organization_member")
      .values({
        organization_id: org.id,
        user_id: memberId,
        role: "member",
        created_at: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    const { url, method } = MemberApiTypes.prepareDeleteMember(
      memberRecord.id,
    );

    // Remove member
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

    // Get the admin's membership record
    const adminMember = await db
      .selectFrom("organization_member")
      .selectAll()
      .where("organization_id", "=", org.id)
      .where("user_id", "=", userId)
      .executeTakeFirstOrThrow();

    const { url, method } = MemberApiTypes.prepareDeleteMember(
      adminMember.id,
    );

    // Try to remove self
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
    assertEquals(responseBody.error, cannotUpdateSelfError);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("remove member - non-existent member", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { token } = await createTestUserAndToken();

    const { url, method } = MemberApiTypes.prepareDeleteMember(
      999999,
    );

    // Try to remove non-existent member
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
    assertEquals(responseBody.error, memberNotFoundError);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("remove member - invalid member ID format", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { token } = await createTestUserAndToken();

    const { url, method } = MemberApiTypes.prepareDeleteMember(
      -1,
    );

    // Try to remove with invalid member ID format
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
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("remove member - not admin", async () => {
  initKyselyDb();
  await resetTables();

  try {
    // Create admin user with organization
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

    // Create a regular member
    const { userId: memberId, token: memberToken } =
      await createTestUserAndToken();
    await db
      .insertInto("organization_member")
      .values({
        organization_id: org.id,
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
        organization_id: org.id,
        user_id: targetMemberId,
        role: "member",
        created_at: new Date(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    const { url, method } = MemberApiTypes.prepareDeleteMember(
      targetMember.id,
    );

    // Regular member tries to remove another member
    const response = await api.handle(
      new Request(
        `http://localhost:3000${url}`,
        {
          method,
          headers: {
            "Authorization": `Bearer ${memberToken}`,
          },
        },
      ),
    );

    assertNotEquals(response, undefined);
    assertEquals(response?.status, 400);
    const responseBody = await response?.json();
    assertEquals(responseBody.error, notAdminOfOrganizationError);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});
