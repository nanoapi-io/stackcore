import { assertEquals, assertNotEquals } from "@std/assert";
import api from "../index.ts";
import { db, destroyKyselyDb, initKyselyDb } from "../../db/database.ts";
import { resetTables } from "../../testHelpers/db.ts";
import { createTestUserAndToken } from "../../testHelpers/auth.ts";
import { OrganizationService } from "../organization/service.ts";
import { ProjectService } from "./service.ts";

// --- CREATE PROJECT TESTS ---
Deno.test("create a project", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    // Create an organization first
    const orgService = new OrganizationService();
    await orgService.createTeamOrganization(
      "Test Organization",
      userId,
    );
    // Fetch the organization from the DB
    const organization = await db
      .selectFrom("organization")
      .selectAll()
      .where("name", "=", "Test Organization")
      .executeTakeFirstOrThrow();

    // Create a project via API
    const createResponse = await api.handle(
      new Request("http://localhost:3000/projects", {
        method: "POST",
        body: JSON.stringify({
          name: "Test Project",
          organizationId: organization.id,
          provider: "github",
          providerId: "123456",
        }),
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
      .where("organization_id", "=", organization.id)
      .executeTakeFirstOrThrow();

    assertEquals(project.name, "Test Project");
    assertEquals(project.organization_id, organization.id);
    assertEquals(project.provider, "github");
    assertEquals(project.provider_id, "123456");
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

    // Create an organization first
    const orgService = new OrganizationService();
    await orgService.createTeamOrganization(
      "Test Organization",
      userId,
    );
    // Fetch the organization from the DB
    const organization = await db
      .selectFrom("organization")
      .selectAll()
      .where("name", "=", "Test Organization")
      .executeTakeFirstOrThrow();

    // Create a project service
    const projectService = new ProjectService();
    await projectService.createProject(
      userId,
      "Test Project",
      organization.id,
      "github",
      "123456",
    );

    // Try to create a project with the same name
    const response = await api.handle(
      new Request("http://localhost:3000/projects", {
        method: "POST",
        body: JSON.stringify({
          name: "Test Project",
          organizationId: organization.id,
          provider: "gitlab",
          providerId: "654321",
        }),
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

Deno.test("create a project - non-member of organization", async () => {
  initKyselyDb();
  await resetTables();

  try {
    // Create first user with organization
    const { userId } = await createTestUserAndToken();

    const orgService = new OrganizationService();
    await orgService.createTeamOrganization(
      "Test Organization",
      userId,
    );
    // Fetch the organization from the DB
    const organization = await db
      .selectFrom("organization")
      .selectAll()
      .where("name", "=", "Test Organization")
      .executeTakeFirstOrThrow();

    // Create second user (not a member of the organization)
    const { token: nonMemberToken } = await createTestUserAndToken();

    // Try to create a project in an organization the user is not a member of
    const response = await api.handle(
      new Request("http://localhost:3000/projects", {
        method: "POST",
        body: JSON.stringify({
          name: "Unauthorized Project",
          organizationId: organization.id,
          provider: null,
          providerId: null,
        }),
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${nonMemberToken}`,
        },
      }),
    );

    assertEquals(response?.status, 400);
    const responseBody = await response?.json();
    assertEquals(responseBody.error, "not_a_member_of_organization");
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
    const response = await api.handle(
      new Request("http://localhost:3000/projects", {
        method: "POST",
        body: "{}",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      }),
    );
    assertEquals(response?.status, 400);

    // Test with missing required fields
    const response2 = await api.handle(
      new Request("http://localhost:3000/projects", {
        method: "POST",
        body: JSON.stringify({
          name: "Test Project",
          // missing organizationId
        }),
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

// --- GET PROJECTS TESTS ---
Deno.test("get user projects", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    // Create an organization first
    const orgService = new OrganizationService();
    await orgService.createTeamOrganization(
      "Test Organization",
      userId,
    );
    // Fetch the organization from the DB
    const organization = await db
      .selectFrom("organization")
      .selectAll()
      .where("name", "=", "Test Organization")
      .executeTakeFirstOrThrow();

    // Create projects for the user
    const projectService = new ProjectService();
    for (let i = 0; i < 10; i++) {
      await projectService.createProject(
        userId,
        `Project ${i}`,
        organization.id,
        null,
        null,
      );
    }

    const response = await api.handle(
      new Request(
        "http://localhost:3000/projects?page=1&limit=5&organizationId=" +
          organization.id,
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
    assertEquals(responseBody.total, 10);
    assertEquals(responseBody.results.length, 5);
    for (let i = 0; i < 5; i++) {
      assertEquals(responseBody.results[i].name, `Project ${i}`);
      assertEquals(responseBody.results[i].organization_id, organization.id);
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

    // Create an organization first
    const orgService = new OrganizationService();
    await orgService.createTeamOrganization(
      "Test Organization",
      userId,
    );
    // Fetch the organization from the DB
    const organization = await db
      .selectFrom("organization")
      .selectAll()
      .where("name", "=", "Test Organization")
      .executeTakeFirstOrThrow();

    // Create projects for the user
    const projectService = new ProjectService();
    for (let i = 0; i < 10; i++) {
      await projectService.createProject(
        userId,
        `Project ${i}`,
        organization.id,
        null,
        null,
      );
    }

    const response = await api.handle(
      new Request(
        "http://localhost:3000/projects?page=2&limit=5&organizationId=" +
          organization.id,
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
    assertEquals(responseBody.total, 10);
    assertEquals(responseBody.results.length, 5);
    for (let i = 0; i < 5; i++) {
      assertEquals(responseBody.results[i].name, `Project ${i + 5}`);
      assertEquals(responseBody.results[i].organization_id, organization.id);
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

    // Create an organization first
    const orgService = new OrganizationService();
    await orgService.createTeamOrganization(
      "Test Organization",
      userId,
    );
    // Fetch the organization from the DB
    const organization = await db
      .selectFrom("organization")
      .selectAll()
      .where("name", "=", "Test Organization")
      .executeTakeFirstOrThrow();

    // Create projects for the user
    const projectService = new ProjectService();
    for (let i = 0; i < 10; i++) {
      await projectService.createProject(
        userId,
        `Test Project ${i}`,
        organization.id,
        null,
        null,
      );
    }

    const response = await api.handle(
      new Request(
        `http://localhost:3000/projects?page=1&limit=5&search=${
          encodeURIComponent("Test Project 0")
        }&organizationId=${organization.id}`,
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

    // Test with invalid organizationId
    const response3 = await api.handle(
      new Request(
        "http://localhost:3000/projects?page=1&limit=5&organizationId=invalid",
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

    // Create an organization first
    const orgService = new OrganizationService();
    await orgService.createTeamOrganization(
      "Test Organization",
      userId,
    );
    // Fetch the organization from the DB
    const organization = await db
      .selectFrom("organization")
      .selectAll()
      .where("name", "=", "Test Organization")
      .executeTakeFirstOrThrow();

    // Create a project via API
    const createResponse = await api.handle(
      new Request("http://localhost:3000/projects", {
        method: "POST",
        body: JSON.stringify({
          name: "Original Project Name",
          organizationId: organization.id,
          provider: "github",
          providerId: "123456",
        }),
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
      .where("organization_id", "=", organization.id)
      .executeTakeFirstOrThrow();

    // Update project name via API
    const response = await api.handle(
      new Request(
        `http://localhost:3000/projects/${project.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            name: "Updated Project Name",
            provider: "gitlab",
            providerId: "654321",
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
    assertEquals(responseBody.message, "Project updated successfully");

    // Verify project was updated in database
    const updatedProject = await db
      .selectFrom("project")
      .selectAll()
      .where("id", "=", project.id)
      .executeTakeFirstOrThrow();

    assertEquals(updatedProject.name, "Updated Project Name");
    assertEquals(updatedProject.provider, "gitlab");
    assertEquals(updatedProject.provider_id, "654321");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("update a project - non-member", async () => {
  initKyselyDb();
  await resetTables();

  try {
    // Create first user with organization and project
    const { userId, token } = await createTestUserAndToken();

    const orgService = new OrganizationService();
    await orgService.createTeamOrganization(
      "Test Organization",
      userId,
    );
    // Fetch the organization from the DB
    const organizationNM = await db
      .selectFrom("organization")
      .selectAll()
      .where("name", "=", "Test Organization")
      .executeTakeFirstOrThrow();

    // Create a project as the first user
    const createResponseNM = await api.handle(
      new Request("http://localhost:3000/projects", {
        method: "POST",
        body: JSON.stringify({
          name: "Test Project",
          organizationId: organizationNM.id,
          provider: null,
          providerId: null,
        }),
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      }),
    );
    assertEquals(createResponseNM?.status, 201);

    // Get the project from the database for its ID
    const projectNM = await db
      .selectFrom("project")
      .selectAll()
      .where("name", "=", "Test Project")
      .where("organization_id", "=", organizationNM.id)
      .executeTakeFirstOrThrow();

    // Create second user (not a member of the organization)
    const { token: nonMemberTokenNM } = await createTestUserAndToken();

    const responseNM = await api.handle(
      new Request(
        `http://localhost:3000/projects/${projectNM.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            name: "Unauthorized Update",
          }),
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${nonMemberTokenNM}`,
          },
        },
      ),
    );

    assertEquals(responseNM?.status, 400);
    const responseBodyNM = await responseNM?.json();
    assertEquals(responseBodyNM.error, "project_not_found");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("update project - duplicate name in same organization", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    // Create an organization first
    const orgService = new OrganizationService();
    await orgService.createTeamOrganization(
      "Test Organization",
      userId,
    );
    const organization = await db
      .selectFrom("organization")
      .selectAll()
      .where("name", "=", "Test Organization")
      .executeTakeFirstOrThrow();

    // Create two projects
    const projectService = new ProjectService();
    await projectService.createProject(
      userId,
      "Project 1",
      organization.id,
      null,
      null,
    );
    await projectService.createProject(
      userId,
      "Project 2",
      organization.id,
      null,
      null,
    );

    // Get the second project
    const project2 = await db
      .selectFrom("project")
      .selectAll()
      .where("name", "=", "Project 2")
      .executeTakeFirstOrThrow();

    // Try to update Project 2 to have the same name as Project 1
    const response = await api.handle(
      new Request(
        `http://localhost:3000/projects/${project2.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            name: "Project 1",
          }),
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        },
      ),
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

    // Create an organization first
    const orgService = new OrganizationService();
    await orgService.createTeamOrganization(
      "Test Organization",
      userId,
    );
    // Fetch the organization from the DB
    const organization = await db
      .selectFrom("organization")
      .selectAll()
      .where("name", "=", "Test Organization")
      .executeTakeFirstOrThrow();

    // Create a project via API
    const createResponse = await api.handle(
      new Request("http://localhost:3000/projects", {
        method: "POST",
        body: JSON.stringify({
          name: "Test Project",
          organizationId: organization.id,
          provider: null,
          providerId: null,
        }),
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
      .where("organization_id", "=", organization.id)
      .executeTakeFirstOrThrow();

    // --- DELETE ---
    const response = await api.handle(
      new Request(
        `http://localhost:3000/projects/${project.id}`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        },
      ),
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
    // Create first user with organization and project
    const { userId, token } = await createTestUserAndToken();

    const orgService = new OrganizationService();
    await orgService.createTeamOrganization(
      "Test Organization",
      userId,
    );
    // Fetch the organization from the DB
    const organizationNM = await db
      .selectFrom("organization")
      .selectAll()
      .where("name", "=", "Test Organization")
      .executeTakeFirstOrThrow();

    // Create a project as the first user
    const createResponseNM = await api.handle(
      new Request("http://localhost:3000/projects", {
        method: "POST",
        body: JSON.stringify({
          name: "Test Project",
          organizationId: organizationNM.id,
          provider: null,
          providerId: null,
        }),
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      }),
    );
    assertEquals(createResponseNM?.status, 201);

    // Get the project from the database for its ID
    const projectNM = await db
      .selectFrom("project")
      .selectAll()
      .where("name", "=", "Test Project")
      .where("organization_id", "=", organizationNM.id)
      .executeTakeFirstOrThrow();

    // Create second user (not a member of the organization)
    const { token: nonMemberTokenNM } = await createTestUserAndToken();

    const responseNM = await api.handle(
      new Request(
        `http://localhost:3000/projects/${projectNM.id}`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${nonMemberTokenNM}`,
          },
        },
      ),
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
