import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { env } from "@/lib/env"
import * as authSchema from "@/server/database/auth-schema"
import { db } from "@/server/database/client"
import * as schema from "@/server/database/schema"

export const auth = betterAuth({
	appName: "my-app",
	session: {
		freshAge: 7 * 24 * 60 * 60 // 7 days
	},
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: { ...schema, ...authSchema },
		usePlural: true
	}),
	socialProviders: {
		github: {
			clientId: env.GITHUB_CLIENT_ID,
			clientSecret: env.GITHUB_CLIENT_SECRET
		}
	},
	trustedOrigins: [env.NEXT_PUBLIC_APP_URL]
})
