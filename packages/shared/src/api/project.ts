export type CreateProjectPayload = {
  name: string;
  repoUrl: string;
  workspaceId: number;
  maxCodeCharPerSymbol: number;
  maxCodeCharPerFile: number;
  maxCharPerSymbol: number;
  maxCharPerFile: number;
  maxCodeLinePerSymbol: number;
  maxCodeLinePerFile: number;
  maxLinePerSymbol: number;
  maxLinePerFile: number;
  maxDependencyPerSymbol: number;
  maxDependencyPerFile: number;
  maxDependentPerSymbol: number;
  maxDependentPerFile: number;
  maxCyclomaticComplexityPerSymbol: number;
  maxCyclomaticComplexityPerFile: number;
};

export type CreateProjectResponse = {
  id: number;
};

export function prepareCreateProject(
  payload: CreateProjectPayload,
): {
  url: string;
  method: string;
  body: CreateProjectPayload;
} {
  return {
    url: "/projects",
    method: "POST",
    body: payload,
  };
}

export function prepareGetProjects(payload: {
  page: number;
  limit: number;
  search?: string;
  workspaceId?: number;
}): {
  url: string;
  method: string;
} {
  const searchParams = new URLSearchParams();
  searchParams.set("page", payload.page.toString());
  searchParams.set("limit", payload.limit.toString());
  if (payload.search) {
    searchParams.set("search", payload.search);
  }
  if (payload.workspaceId) {
    searchParams.set("workspaceId", payload.workspaceId.toString());
  }

  return {
    url: `/projects?${searchParams.toString()}`,
    method: "GET",
  };
}

export function prepareGetProjectDetails(projectId: number): {
  url: string;
  method: string;
} {
  return {
    url: `/projects/${projectId}`,
    method: "GET",
  };
}

export type UpdateProjectPayload = {
  name: string;
  repoUrl: string;
  maxCodeCharPerSymbol: number;
  maxCodeCharPerFile: number;
  maxCharPerSymbol: number;
  maxCharPerFile: number;
  maxCodeLinePerSymbol: number;
  maxCodeLinePerFile: number;
  maxLinePerSymbol: number;
  maxLinePerFile: number;
  maxDependencyPerSymbol: number;
  maxDependencyPerFile: number;
  maxDependentPerSymbol: number;
  maxDependentPerFile: number;
  maxCyclomaticComplexityPerSymbol: number;
  maxCyclomaticComplexityPerFile: number;
};

export function prepareUpdateProject(
  projectId: number,
  payload: UpdateProjectPayload,
): {
  url: string;
  method: string;
  body: UpdateProjectPayload;
} {
  return {
    url: `/projects/${projectId}`,
    method: "PATCH",
    body: payload,
  };
}

export function prepareDeleteProject(projectId: number): {
  url: string;
  method: string;
} {
  return {
    url: `/projects/${projectId}`,
    method: "DELETE",
  };
}

export type GetProjectsResponse = {
  results: {
    id: number;
    name: string;
    repo_url: string;
    workspace_id: number;
    max_code_char_per_symbol: number;
    max_code_char_per_file: number;
    max_char_per_symbol: number;
    max_char_per_file: number;
    max_code_line_per_symbol: number;
    max_code_line_per_file: number;
    max_line_per_symbol: number;
    max_line_per_file: number;
    max_dependency_per_symbol: number;
    max_dependency_per_file: number;
    max_dependent_per_symbol: number;
    max_dependent_per_file: number;
    max_cyclomatic_complexity_per_symbol: number;
    max_cyclomatic_complexity_per_file: number;
    created_at: Date;
  }[];
  total: number;
};

export type GetProjectDetailsResponse = {
  id: number;
  name: string;
  repo_url: string;
  workspace_id: number;
  max_code_char_per_symbol: number;
  max_code_char_per_file: number;
  max_char_per_symbol: number;
  max_char_per_file: number;
  max_code_line_per_symbol: number;
  max_code_line_per_file: number;
  max_line_per_symbol: number;
  max_line_per_file: number;
  max_dependency_per_symbol: number;
  max_dependency_per_file: number;
  max_dependent_per_symbol: number;
  max_dependent_per_file: number;
  max_cyclomatic_complexity_per_symbol: number;
  max_cyclomatic_complexity_per_file: number;
  created_at: Date;
};
