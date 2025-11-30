import * as z from "zod"
import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure
} from "@/server/api/trpc"

export const stuffRouter = createTRPCRouter({
	getPublicStuff: publicProcedure.query(() => {
		return {
			message: "Hello, world!"
		}
	}),
	getProtectedStuff: protectedProcedure
		.input(
			z.object({
				uuid: z.string()
			})
		)
		.query(({ ctx, input }) => {
			return {
				userId: ctx.session.user.id,
				uuid: input.uuid
			}
		})
})
