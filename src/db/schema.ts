import { pgTable } from "drizzle-orm/pg-core"

export const users = pgTable('user', (t) => ({
  id: t.uuid().defaultRandom().primaryKey(),
  name: t.varchar({ length: 100 }).notNull(),
  email: t.varchar({ length: 255 }).notNull().unique(),
  password: t.varchar({ length: 255 }).notNull(),
  createdAt: t.timestamp({ mode: 'date' }).notNull().defaultNow(),
  updatedAt: t.timestamp({ mode: 'date' }).notNull().defaultNow().$onUpdateFn(() => new Date()),
}))

export const posts = pgTable('post', (t) => ({
  id: t.uuid().defaultRandom().primaryKey(),
  userId: t.uuid().notNull().references(() => users.id),
  title: t.varchar({ length: 255 }).notNull(),
  content: t.varchar({ length: 1000 }).notNull(),
  createdAt: t.timestamp({ mode: 'date' }).notNull().defaultNow(),
  updatedAt: t.timestamp({ mode: 'date' }).notNull().defaultNow().$onUpdateFn(() => new Date()),
}))

export const comments = pgTable('comment', (t) => ({
  id: t.uuid().defaultRandom().primaryKey(),
  postId: t.uuid().notNull().references(() => posts.id),
  userId: t.uuid().notNull().references(() => users.id),
  content: t.varchar({ length: 500 }).notNull(),
  createdAt: t.timestamp({ mode: 'date' }).notNull().defaultNow(),
  updatedAt: t.timestamp({ mode: 'date' }).notNull().defaultNow().$onUpdateFn(() => new Date()),
}))
