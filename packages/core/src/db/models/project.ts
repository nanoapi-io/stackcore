import type {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from "kysely";

export interface ProjectTable {
  id: Generated<number>;
  name: string;
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
  created_at: ColumnType<Date>;
}

export type Project = Selectable<ProjectTable>;
export type NewProject = Insertable<ProjectTable>;
export type ProjectUpdate = Updateable<ProjectTable>;
