import { fetchRequestHandler } from "@trpc/server/adapters/fetch"
import type { NextRequest } from "next/server"

import { env } from "@/lib/env"
import { appRouter } from "@/server/api/root"
import { createTRPCContext } from "@/server/api/trpc"

const createContext = async (req: NextRequest) => {
	return createTRPCContext({
		headers: req.headers
	})
}

const handler = async (req: NextRequest) =>
	fetchRequestHandler({
		endpoint: "/api/trpc",
		req,
		router: appRouter,
		createContext: async () => createContext(req),
		onError:
			env.NODE_ENV === "development"
				? ({ path, error }) => {
						console.error(
							`❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`
						)
					}
				: undefined
	})

export { handler as GET, handler as POST }
