// @ts-nocheck - server property types not included in TanStack Router type generation
import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "@repo/db";
import { images } from "@repo/db/schema";
import { eq } from "drizzle-orm";
import { generateId } from "#/lib/utils-db.ts";

export const Route = createFileRoute("/api/images")({
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
          const canvasId = url.searchParams.get("canvasId");

          if (!canvasId) {
            return Response.json(
              { error: "canvasId is required" },
              { status: 400 },
            );
          }

          const canvasImages = await db
            .select()
            .from(images)
            .where(eq(images.canvasId, canvasId));

          return Response.json({ images: canvasImages });
        } catch (error) {
          console.error("Error fetching images:", error);
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
          const { canvasId, url, name, width, height, positionX, positionY } =
            body;

          if (!canvasId || !url) {
            return Response.json(
              { error: "canvasId and url are required" },
              { status: 400 },
            );
          }

          const db = getDb();
          const imageId = generateId();
          const timestamp = new Date();

          await db.insert(images).values({
            id: imageId,
            canvasId,
            url,
            name: name || null,
            width: width || null,
            height: height || null,
            positionX: positionX || 0,
            positionY: positionY || 0,
            createdAt: timestamp,
          });

          return Response.json({
            image: {
              id: imageId,
              canvasId,
              url,
              name: name || null,
              width: width || null,
              height: height || null,
              positionX: positionX || 0,
              positionY: positionY || 0,
              createdAt: timestamp,
            },
          });
        } catch (error) {
          console.error("Error creating image:", error);
          return Response.json(
            { error: "Internal server error" },
            { status: 500 },
          );
        }
      },
    },
  },
});
