// @ts-nocheck - server property types not included in TanStack Router type generation
import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "@repo/db";
import { canvases, canvasDocuments } from "@repo/db/schema";
import { eq } from "drizzle-orm";

export const Route = createFileRoute("/api/canvases/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const cookie = request.headers.get("cookie") || "";
          if (!cookie.includes("better-auth.session_token")) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          const db = getDb();
          const id = params.id;

          const canvas = await db
            .select()
            .from(canvases)
            .where(eq(canvases.id, id))
            .get();

          if (!canvas) {
            return Response.json({ error: "Canvas not found" }, { status: 404 });
          }

          const document = await db
            .select()
            .from(canvasDocuments)
            .where(eq(canvasDocuments.canvasId, id))
            .get();

          return Response.json({
            canvas,
            document: document || null,
          });
        } catch (error) {
          console.error("Error fetching canvas:", error);
          return Response.json(
            { error: "Internal server error" },
            { status: 500 },
          );
        }
      },

      PUT: async ({ request, params }) => {
        try {
          const cookie = request.headers.get("cookie") || "";
          if (!cookie.includes("better-auth.session_token")) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          const db = getDb();
          const id = params.id;
          const body = await request.json();
          const { name, description, storeData } = body;

          const timestamp = new Date();

          if (name !== undefined || description !== undefined) {
            await db
              .update(canvases)
              .set({
                ...(name !== undefined && { name }),
                ...(description !== undefined && { description }),
                updatedAt: timestamp,
              })
              .where(eq(canvases.id, id));
          }

          if (storeData !== undefined) {
            const existingDoc = await db
              .select()
              .from(canvasDocuments)
              .where(eq(canvasDocuments.canvasId, id))
              .get();

            if (existingDoc) {
              await db
                .update(canvasDocuments)
                .set({
                  storeData: JSON.stringify(storeData),
                  version: existingDoc.version + 1,
                  updatedAt: timestamp,
                })
                .where(eq(canvasDocuments.canvasId, id));
            } else {
              await db.insert(canvasDocuments).values({
                id: crypto.randomUUID(),
                canvasId: id,
                storeData: JSON.stringify(storeData),
                version: 1,
                updatedAt: timestamp,
              });
            }
          }

          return Response.json({ success: true });
        } catch (error) {
          console.error("Error updating canvas:", error);
          return Response.json(
            { error: "Internal server error" },
            { status: 500 },
          );
        }
      },

      DELETE: async ({ request, params }) => {
        try {
          const cookie = request.headers.get("cookie") || "";
          if (!cookie.includes("better-auth.session_token")) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          const db = getDb();
          const id = params.id;

          await db
            .delete(canvasDocuments)
            .where(eq(canvasDocuments.canvasId, id));

          await db.delete(canvases).where(eq(canvases.id, id));

          return Response.json({ success: true });
        } catch (error) {
          console.error("Error deleting canvas:", error);
          return Response.json(
            { error: "Internal server error" },
            { status: 500 },
          );
        }
      },
    },
  },
});
