import type {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from "kysely";

export interface TokenTable {
  id: Generated<number>;
  uuid: Generated<string>;
  name: string;
  user_id: number;
  last_used_at: ColumnType<Date | null>;
  created_at: ColumnType<Date>;
}

export type Token = Selectable<TokenTable>;
export type NewToken = Insertable<TokenTable>;
export type TokenUpdate = Updateable<TokenTable>;
