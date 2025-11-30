import { stuffRouter } from "@/server/api/router/stuff"
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc"

export const appRouter = createTRPCRouter({
	stuff: stuffRouter
})

export type AppRouter = typeof appRouter

export const createCaller = createCallerFactory(appRouter)
