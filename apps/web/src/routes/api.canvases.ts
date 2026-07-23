// @ts-nocheck - server property types not included in TanStack Router type generation
import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "@repo/db";
import { canvases, canvasDocuments } from "@repo/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "#/lib/utils-db.ts";

export const Route = createFileRoute("/api/canvases")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const cookie = request.headers.get("cookie") || "";
          if (!cookie.includes("better-auth.session_token")) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          const db = getDb();
          const url = new URL(request.url);
          const userId = url.searchParams.get("userId");

          if (!userId) {
            return Response.json(
              { error: "userId is required" },
              { status: 400 },
            );
          }

          const userCanvases = await db
            .select()
            .from(canvases)
            .where(eq(canvases.userId, userId));

          return Response.json({ canvases: userCanvases });
        } catch (error) {
          console.error("Error fetching canvases:", error);
          return Response.json(
            { error: "Internal server error" },
            { status: 500 },
          );
        }
      },

      POST: async ({ request }) => {
        try {
          const cookie = request.headers.get("cookie") || "";
          if (!cookie.includes("better-auth.session_token")) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          const body = await request.json();
          const { name, description, userId } = body;

          if (!name || !userId) {
            return Response.json(
              { error: "name and userId are required" },
              { status: 400 },
            );
          }

          const db = getDb();
          const canvasId = generateId();
          const documentId = generateId();
          const timestamp = new Date();

          await db.insert(canvases).values({
            id: canvasId,
            name,
            description: description || null,
            userId,
            createdAt: timestamp,
            updatedAt: timestamp,
          });

          const defaultStore = JSON.stringify({
            store: {},
            schema: { schemaVersion: 2 },
          });

          await db.insert(canvasDocuments).values({
            id: documentId,
            canvasId,
            storeData: defaultStore,
            version: 1,
            updatedAt: timestamp,
          });

          return Response.json({
            canvas: {
              id: canvasId,
              name,
              description: description || null,
              userId,
              createdAt: timestamp,
              updatedAt: timestamp,
            },
          });
        } catch (error) {
          console.error("Error creating canvas:", error);
          return Response.json(
            { error: "Internal server error" },
            { status: 500 },
          );
        }
      },
    },
  },
});
