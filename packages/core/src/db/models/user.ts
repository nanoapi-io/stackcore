import type {
  ColumnType,
  Generated,
  Insertable,
  Selectable,
  Updateable,
} from "kysely";

export interface UserTable {
  id: Generated<number>;
  email: string;
  otp: string | null;
  otp_attempts: number;
  otp_expires_at: ColumnType<Date | null>;
  last_login_at: ColumnType<Date | null>;
  deactivated: boolean;
  created_at: ColumnType<Date>;
}

export type User = Selectable<UserTable>;
export type NewUser = Insertable<UserTable>;
export type UserUpdate = Updateable<UserTable>;
