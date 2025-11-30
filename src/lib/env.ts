import { createEnv } from "@t3-oss/env-nextjs"
import * as z from "zod"

export const env = createEnv({
	server: {
		DATABASE_URL: z.url(),
		BETTER_AUTH_SECRET: z.string().min(10),
		GITHUB_CLIENT_ID: z.string().min(10),
		GITHUB_CLIENT_SECRET: z.string().min(10),
		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development")
	},
	client: {
		NEXT_PUBLIC_APP_URL: z.url()
	},
	runtimeEnv: {
		DATABASE_URL: process.env.DATABASE_URL,
		BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
		GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
		GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
		NODE_ENV: process.env.NODE_ENV,
		NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
	},
	skipValidation: process.env.BUILD_TIME?.toLowerCase() === "true"
})
