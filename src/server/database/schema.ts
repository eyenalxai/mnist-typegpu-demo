import { relations, sql } from "drizzle-orm"
import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { users } from "@/server/database/auth-schema"

export const stories = pgTable("stories", {
	uuid: uuid("uuid").default(sql`gen_random_uuid()`).primaryKey(),
	userId: text("userId")
		.notNull()
		.references(() => users.id),
	description: text("description").notNull(),
	createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
		.default(sql`now()`)
		.notNull()
})

export type StorySelect = typeof stories.$inferSelect
export type StoryInsert = typeof stories.$inferInsert

export const scenes = pgTable("scenes", {
	uuid: uuid("uuid").default(sql`gen_random_uuid()`).primaryKey(),
	userId: text("userId")
		.notNull()
		.references(() => users.id),
	storyUuid: uuid("storyId")
		.notNull()
		.references(() => stories.uuid),
	createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
		.default(sql`now()`)
		.notNull(),
	text: text("text").notNull(),
	actions: text("actions").array(),
	selectedAction: integer("selected_action")
})

export type SceneSelect = typeof scenes.$inferSelect
export type SceneInsert = typeof scenes.$inferInsert

export const scenesRelations = relations(scenes, ({ one }) => ({
	story: one(stories, {
		fields: [scenes.storyUuid],
		references: [stories.uuid]
	})
}))

export const storiesRelations = relations(stories, ({ many }) => ({
	scenes: many(scenes)
}))
