import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import { env } from "@/lib/env"
import * as authSchema from "@/server/database/auth-schema"
import * as schema from "@/server/database/schema"

export type Transaction =
	| Parameters<Parameters<typeof db.transaction>[0]>[0]
	| typeof db

const pool = new Pool({
	connectionString: env.DATABASE_URL
})

export const db = drizzle({
	client: pool,
	schema: { ...schema, ...authSchema }
})
