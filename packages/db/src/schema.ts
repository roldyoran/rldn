import { relations, sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

// ============================================
// Documents — Universal base entity for all features
// ============================================

/**
 * Documents table - Base entity for all feature types (canvas, kanban, todo, note, etc.)
 * Each document represents a single item owned by a user, with a type discriminator.
 */
export const documents = sqliteTable("documents", {
	id: text("id").primaryKey(),
	type: text("type").notNull(), // 'canvas' | 'kanban' | 'todo' | 'note' | future types
	ownerId: text("owner_id").notNull(),
	name: text("name").notNull(),
	description: text("description"),
	thumbnail: text("thumbnail"),
	metadata: text("metadata"), // JSON blob for feature-specific metadata
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});

// ============================================
// Canvas Feature Tables
// ============================================

/**
 * Canvases table - Stores user canvases (legacy, kept for backward compat)
 */
export const canvases = sqliteTable("canvases", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	description: text("description"),
	userId: text("user_id").notNull(),
	thumbnail: text("thumbnail"),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});

/**
 * Canvas documents table - Stores canvas data (serialized JSON)
 */
export const canvasDocuments = sqliteTable("canvas_documents", {
	id: text("id").primaryKey(),
	canvasId: text("canvas_id")
		.notNull()
		.references(() => canvases.id, { onDelete: "cascade" })
		.unique(),
	storeData: text("store_data").notNull(),
	version: integer("version").notNull().default(1),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});

/**
 * Images table - Stores external image URLs associated with canvases
 */
export const images = sqliteTable("images", {
	id: text("id").primaryKey(),
	canvasId: text("canvas_id")
		.notNull()
		.references(() => canvases.id, { onDelete: "cascade" }),
	url: text("url").notNull(),
	name: text("name"),
	width: integer("width"),
	height: integer("height"),
	positionX: real("position_x").notNull().default(0),
	positionY: real("position_y").notNull().default(0),
	createdAt: integer("created_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});

// ============================================
// Kanban Feature Tables (Future)
// ============================================

/**
 * Kanban data table - Stores kanban board state (JSON)
 * Each kanban board is linked to a document via documentId.
 */
export const kanbanData = sqliteTable("kanban_data", {
	documentId: text("document_id")
		.primaryKey()
		.references(() => documents.id, { onDelete: "cascade" }),
	columnsData: text("columns_data").notNull(), // JSON: columns, cards, ordering
	version: integer("version").notNull().default(1),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});

// ============================================
// Todo Feature Tables (Future)
// ============================================

/**
 * Todo data table - Stores todo list state (JSON)
 * Each todo list is linked to a document via documentId.
 */
export const todoData = sqliteTable("todo_data", {
	documentId: text("document_id")
		.primaryKey()
		.references(() => documents.id, { onDelete: "cascade" }),
	itemsData: text("items_data").notNull(), // JSON: todo items with checkboxes
	version: integer("version").notNull().default(1),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});

// ============================================
// Notes Feature Tables (Future)
// ============================================

/**
 * Notes data table - Stores note content (JSON or rich text)
 * Each note is linked to a document via documentId.
 */
export const noteData = sqliteTable("note_data", {
	documentId: text("document_id")
		.primaryKey()
		.references(() => documents.id, { onDelete: "cascade" }),
	contentData: text("content_data").notNull(), // JSON: rich text blocks or markdown
	version: integer("version").notNull().default(1),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.notNull()
		.default(sql`(unixepoch())`),
});

// ============================================
// Relations
// ============================================

export const documentsRelations = relations(documents, ({ one }) => ({
	kanbanData: one(kanbanData, {
		fields: [documents.id],
		references: [kanbanData.documentId],
	}),
	todoData: one(todoData, {
		fields: [documents.id],
		references: [todoData.documentId],
	}),
	noteData: one(noteData, {
		fields: [documents.id],
		references: [noteData.documentId],
	}),
}));

export const canvasesRelations = relations(canvases, ({ one, many }) => ({
	document: one(canvasDocuments, {
		fields: [canvases.id],
		references: [canvasDocuments.canvasId],
	}),
	images: many(images),
}));

export const canvasDocumentsRelations = relations(canvasDocuments, ({ one }) => ({
	canvas: one(canvases, {
		fields: [canvasDocuments.canvasId],
		references: [canvases.id],
	}),
}));

export const imagesRelations = relations(images, ({ one }) => ({
	canvas: one(canvases, {
		fields: [images.canvasId],
		references: [canvases.id],
	}),
}));

export const kanbanDataRelations = relations(kanbanData, ({ one }) => ({
	document: one(documents, {
		fields: [kanbanData.documentId],
		references: [documents.id],
	}),
}));

export const todoDataRelations = relations(todoData, ({ one }) => ({
	document: one(documents, {
		fields: [todoData.documentId],
		references: [documents.id],
	}),
}));

export const noteDataRelations = relations(noteData, ({ one }) => ({
	document: one(documents, {
		fields: [noteData.documentId],
		references: [documents.id],
	}),
}));

// ============================================
// Type Exports
// ============================================

// Documents (universal)
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;

// Canvas (legacy)
export type Canvas = typeof canvases.$inferSelect;
export type NewCanvas = typeof canvases.$inferInsert;

export type CanvasDocument = typeof canvasDocuments.$inferSelect;
export type NewCanvasDocument = typeof canvasDocuments.$inferInsert;

export type Image = typeof images.$inferSelect;
export type NewImage = typeof images.$inferInsert;

// Kanban (future)
export type KanbanData = typeof kanbanData.$inferSelect;
export type NewKanbanData = typeof kanbanData.$inferInsert;

// Todo (future)
export type TodoData = typeof todoData.$inferSelect;
export type NewTodoData = typeof todoData.$inferInsert;

// Notes (future)
export type NoteData = typeof noteData.$inferSelect;
export type NewNoteData = typeof noteData.$inferInsert;
