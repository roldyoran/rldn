import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql, relations } from "drizzle-orm";

/**
 * Canvases table - Stores user canvases
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
 * Canvas documents table - Stores tldraw store data (serialized JSON)
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

/**
 * Relations
 */
export const canvasesRelations = relations(canvases, ({ one, many }) => ({
  document: one(canvasDocuments, {
    fields: [canvases.id],
    references: [canvasDocuments.canvasId],
  }),
  images: many(images),
}));

export const canvasDocumentsRelations = relations(
  canvasDocuments,
  ({ one }) => ({
    canvas: one(canvases, {
      fields: [canvasDocuments.canvasId],
      references: [canvases.id],
    }),
  }),
);

export const imagesRelations = relations(images, ({ one }) => ({
  canvas: one(canvases, {
    fields: [images.canvasId],
    references: [canvases.id],
  }),
}));

// Type exports for use in the application
export type Canvas = typeof canvases.$inferSelect;
export type NewCanvas = typeof canvases.$inferInsert;

export type CanvasDocument = typeof canvasDocuments.$inferSelect;
export type NewCanvasDocument = typeof canvasDocuments.$inferInsert;

export type Image = typeof images.$inferSelect;
export type NewImage = typeof images.$inferInsert;
