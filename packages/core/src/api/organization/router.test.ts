import { assertEquals, assertNotEquals } from "@std/assert";
import api from "../index.ts";
import { db, destroyKyselyDb, initKyselyDb } from "../../db/database.ts";
import { resetTables } from "../../testHelpers/db.ts";
import { OrganizationService } from "./service.ts";
import { createTestUserAndToken } from "../../testHelpers/auth.ts";
import { OrganizationApiTypes } from "../responseType.ts";

// POST / (create organization)
Deno.test("create a team organization", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { token } = await createTestUserAndToken();

    const { url, method, body } = OrganizationApiTypes
      .prepareCreateOrganization({
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

    // Verify organization exists in database
    const org = await db
      .selectFrom("organization")
      .selectAll()
      .where("name", "=", "Test Team")
      .executeTakeFirstOrThrow();

    assertEquals(responseBody.id, org.id);

    assertEquals(org.name, "Test Team");
    assertEquals(org.isTeam, true);

    // Verify creator is an admin
    const member = await db
      .selectFrom("organization_member")
      .selectAll()
      .where("organization_id", "=", org.id)
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

    const { url, method, body } = OrganizationApiTypes
      .prepareCreateOrganization({
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
    assertEquals(responseBody.error, "organization_already_exists");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

// GET / (list organizations)
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

    const { url, method } = OrganizationApiTypes.prepareGetOrganizations({
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
    assertEquals(responseBody.total, 10 + 1); // +1 for personal organization
    assertEquals(responseBody.results.length, 5);
    for (let i = 0; i < 5; i++) {
      assertEquals(responseBody.results[i].name, `Org ${i}`);
      assertEquals(responseBody.results[i].isTeam, true);
      assertEquals(responseBody.results[i].role, "admin");
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

    const { url, method } = OrganizationApiTypes.prepareGetOrganizations({
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
    assertEquals(responseBody.total, 10 + 1); // +1 for personal organization
    assertEquals(responseBody.results.length, 5);
    for (let i = 0; i < 5; i++) {
      assertEquals(responseBody.results[i].name, `Org ${i + 5}`);
      assertEquals(responseBody.results[i].isTeam, true);
      assertEquals(responseBody.results[i].role, "admin");
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

    const { url, method } = OrganizationApiTypes.prepareGetOrganizations({
      page: 1,
      limit: 5,
      search: "Test Org 0",
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
    assertEquals(responseBody.results[0].name, "Test Org 0");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

// PATCH /:organizationId (update organization)
Deno.test("update an organization", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    // Create organization
    const orgService = new OrganizationService();
    await orgService.createTeamOrganization(
      "Original Name",
      userId,
    );

    // Get the organization ID from the database
    const org = await db
      .selectFrom("organization")
      .selectAll()
      .where("name", "=", "Original Name")
      .executeTakeFirstOrThrow();

    const { url, method, body } = OrganizationApiTypes
      .prepareUpdateOrganization(
        org.id,
        {
          name: "Updated Name",
        },
      );

    // Update organization name
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
    assertEquals(responseBody.message, "Organization updated successfully");

    // Verify organization was updated in database
    const updatedOrg = await db
      .selectFrom("organization")
      .selectAll()
      .where("id", "=", org.id)
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

    const { url, method, body } = OrganizationApiTypes
      .prepareUpdateOrganization(
        org.id,
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
    assertEquals(responseBody.error, "organization_not_found");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

// DELETE /:organizationId (delete organization)
Deno.test("delete an organization", async () => {
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

    const { url, method } = OrganizationApiTypes.prepareDeleteOrganization(
      org.id,
    );

    // Delete organization
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

    // Verify organization was deleted from database
    const deletedOrg = await db
      .selectFrom("organization")
      .selectAll()
      .where("id", "=", org.id)
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

    const { url, method } = OrganizationApiTypes.prepareDeleteOrganization(
      org.id,
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
    assertEquals(responseBody.error, "organization_not_found");

    // Verify organization still exists
    const checkOrg = await db
      .selectFrom("organization")
      .selectAll()
      .where("id", "=", org.id)
      .executeTakeFirst();

    assertNotEquals(checkOrg, undefined);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test(
  "delete organization - cannot delete personal organization",
  async () => {
    initKyselyDb();
    await resetTables();

    try {
      const { token, personalOrgId } = await createTestUserAndToken();

      const { url, method } = OrganizationApiTypes.prepareDeleteOrganization(
        personalOrgId,
      );

      // Try to delete personal organization
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
      assertEquals(responseBody.error, "cannot_delete_personal_organization");
    } finally {
      await resetTables();
      await destroyKyselyDb();
    }
  },
);
