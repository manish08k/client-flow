import { and, eq, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

/** Every org-owned query MUST go through this to guarantee tenant isolation. */
export const inOrg = (orgCol: PgColumn, organizationId: string, ...extra: (SQL | undefined)[]) =>
  and(eq(orgCol, organizationId), ...extra);
