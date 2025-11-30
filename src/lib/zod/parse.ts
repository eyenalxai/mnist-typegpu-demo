import { err, ok, type Result } from "neverthrow"
import type * as z from "zod"

export const parseZodSchema = <T>(
	schema: z.ZodType<T>,
	data: unknown
): Result<T, { type: "zod_parse_error"; message: string }> => {
	const result = schema.safeParse(data)

	if (result.success) return ok(result.data)

	const errorMessage = result.error.issues
		.map(({ message, path }) => {
			if (path.length === 0) return message
			return `${path.join(".")}: ${message}`
		})
		.join(", ")

	return err({
		type: "zod_parse_error",
		message: errorMessage
	})
}
