"use client"

import {
	defaultShouldDehydrateQuery,
	QueryClient,
	QueryClientProvider
} from "@tanstack/react-query"
import { httpBatchStreamLink, loggerLink } from "@trpc/client"
import { createTRPCReact } from "@trpc/react-query"
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server"
import { useState } from "react"
import { deserialize, serialize } from "superjson"

import type { AppRouter } from "@/server/api/root"

export const createQueryClient = () =>
	new QueryClient({
		defaultOptions: {
			queries: {
				// With SSR, we usually want to set some default staleTime
				// above 0 to avoid refetching immediately on the client
				staleTime: 30 * 1000
			},
			dehydrate: {
				serializeData: serialize,
				shouldDehydrateQuery: (query) =>
					defaultShouldDehydrateQuery(query) || query.state.status === "pending"
			},
			hydrate: {
				deserializeData: deserialize
			}
		}
	})

let clientQueryClientSingleton: QueryClient | undefined
const getQueryClient = () => {
	if (typeof window === "undefined") {
		// Server: always make a new query client
		return createQueryClient()
	}
	// Browser: use singleton pattern to keep the same query client
	clientQueryClientSingleton ??= createQueryClient()

	return clientQueryClientSingleton
}

export const api = createTRPCReact<AppRouter>()

export type RouterInputs = inferRouterInputs<AppRouter>
export type RouterOutputs = inferRouterOutputs<AppRouter>

export function TRPCReactProvider(props: { children: React.ReactNode }) {
	const queryClient = getQueryClient()

	const [trpcClient] = useState(() =>
		api.createClient({
			links: [
				loggerLink({
					enabled: (op) =>
						process.env.NODE_ENV === "development" ||
						(op.direction === "down" && op.result instanceof Error)
				}),
				httpBatchStreamLink({
					transformer: { serialize, deserialize },
					url: `${getBaseUrl()}/api/trpc`,
					headers: () => {
						const headers = new Headers()
						headers.set("x-trpc-source", "nextjs-react")
						return headers
					}
				})
			]
		})
	)

	return (
		<QueryClientProvider client={queryClient}>
			<api.Provider client={trpcClient} queryClient={queryClient}>
				{props.children}
			</api.Provider>
		</QueryClientProvider>
	)
}

function getBaseUrl() {
	if (typeof window !== "undefined") return window.location.origin
	const vercelUrl = process.env.VERCEL_URL
	if (vercelUrl !== undefined && vercelUrl !== null && vercelUrl.trim() !== "")
		return `https://${vercelUrl}`
	return `http://localhost:${process.env.PORT ?? 3000}`
}
