// @ts-nocheck - server property types not included in TanStack Router type generation
import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "@repo/db";
import { images } from "@repo/db/schema";
import { eq } from "drizzle-orm";

export const Route = createFileRoute("/api/images/$id")({
  server: {
    handlers: {
      DELETE: async ({ request, params }) => {
        try {
          const cookie = request.headers.get("cookie") || "";
          if (!cookie.includes("better-auth.session_token")) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          const db = getDb();
          const id = params.id;

          await db.delete(images).where(eq(images.id, id));

          return Response.json({ success: true });
        } catch (error) {
          console.error("Error deleting image:", error);
          return Response.json(
            { error: "Internal server error" },
            { status: 500 },
          );
        }
      },
    },
  },
});
