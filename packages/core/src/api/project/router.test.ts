import { assertEquals, assertNotEquals } from "@std/assert";
import api from "../index.ts";
import { db, destroyKyselyDb, initKyselyDb } from "../../db/database.ts";
import { resetTables } from "../../testHelpers/db.ts";
import { createTestUserAndToken } from "../../testHelpers/auth.ts";
import { OrganizationService } from "../organization/service.ts";
import { ProjectService } from "./service.ts";
import type { Organization, Project } from "../../db/types.ts";

Deno.test("create a project", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    // Create an organization first
    const orgService = new OrganizationService();
    const { organization } = await orgService.createTeamOrganization(
      "Test Organization",
      userId,
    ) as { organization: Organization };

    // Create a project
    const response = await api.handle(
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

    assertEquals(response?.status, 201);

    const responseBody = await response?.json();
    assertEquals(responseBody.name, "Test Project");
    assertEquals(responseBody.organization_id, organization.id);
    assertEquals(responseBody.provider, "github");
    assertEquals(responseBody.provider_id, "123456");

    // Verify project exists in database
    const project = await db
      .selectFrom("project")
      .selectAll()
      .where("id", "=", responseBody.id)
      .executeTakeFirst();

    assertNotEquals(project, undefined);
    assertEquals(project?.name, "Test Project");
    assertEquals(project?.organization_id, organization.id);
    assertEquals(project?.provider, "github");
    assertEquals(project?.provider_id, "123456");
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
    const { organization } = await orgService.createTeamOrganization(
      "Test Organization",
      userId,
    ) as { organization: Organization };

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
    const { organization } = await orgService.createTeamOrganization(
      "Test Organization",
      userId,
    ) as { organization: Organization };

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

Deno.test("get user projects", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    // Create an organization first
    const orgService = new OrganizationService();
    const { organization } = await orgService.createTeamOrganization(
      "Test Organization",
      userId,
    ) as { organization: Organization };

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
    const { organization } = await orgService.createTeamOrganization(
      "Test Organization",
      userId,
    ) as { organization: Organization };

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
    const { organization } = await orgService.createTeamOrganization(
      "Test Organization",
      userId,
    ) as { organization: Organization };

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

Deno.test("update a project", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    // Create an organization first
    const orgService = new OrganizationService();
    const { organization } = await orgService.createTeamOrganization(
      "Test Organization",
      userId,
    ) as { organization: Organization };

    // Create a project
    const projectService = new ProjectService();
    const { project } = await projectService.createProject(
      userId,
      "Original Project Name",
      organization.id,
      "github",
      "123456",
    ) as { project: Project };

    // Update project name
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
    assertEquals(responseBody.name, "Updated Project Name");
    assertEquals(responseBody.provider, "gitlab");
    assertEquals(responseBody.provider_id, "654321");

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
    const { userId } = await createTestUserAndToken();

    const orgService = new OrganizationService();
    const { organization } = await orgService.createTeamOrganization(
      "Test Organization",
      userId,
    ) as { organization: Organization };

    const projectService = new ProjectService();
    const { project } = await projectService.createProject(
      userId,
      "Test Project",
      organization.id,
      null,
      null,
    ) as { project: Project };

    // Create second user (not a member of the organization)
    const { token: nonMemberToken } = await createTestUserAndToken();

    const response = await api.handle(
      new Request(
        `http://localhost:3000/projects/${project.id}`,
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
    assertEquals(responseBody.error, "project_not_found");
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});

Deno.test("delete a project", async () => {
  initKyselyDb();
  await resetTables();

  try {
    const { userId, token } = await createTestUserAndToken();

    // Create an organization first
    const orgService = new OrganizationService();
    const { organization } = await orgService.createTeamOrganization(
      "Test Organization",
      userId,
    ) as { organization: Organization };

    // Create a project
    const projectService = new ProjectService();
    const { project } = await projectService.createProject(
      userId,
      "Test Project",
      organization.id,
      null,
      null,
    ) as { project: Project };

    // Delete project
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

    // Verify project was deleted from database
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
    const { userId } = await createTestUserAndToken();

    const orgService = new OrganizationService();
    const { organization } = await orgService.createTeamOrganization(
      "Test Organization",
      userId,
    ) as { organization: Organization };

    const projectService = new ProjectService();
    const { project } = await projectService.createProject(
      userId,
      "Test Project",
      organization.id,
      null,
      null,
    ) as { project: Project };

    // Create second user (not a member of the organization)
    const { token: nonMemberToken } = await createTestUserAndToken();

    const response = await api.handle(
      new Request(
        `http://localhost:3000/projects/${project.id}`,
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
    assertEquals(responseBody.error, "project_not_found");

    // Verify project still exists
    const existingProject = await db
      .selectFrom("project")
      .selectAll()
      .where("id", "=", project.id)
      .executeTakeFirst();

    assertNotEquals(existingProject, undefined);
  } finally {
    await resetTables();
    await destroyKyselyDb();
  }
});
