import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { authClient } from "#/lib/auth-client.ts";

interface Canvas {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  thumbnail: string | null;
  createdAt: string;
  updatedAt: string;
}

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();
  const [canvases, setCanvases] = useState<Canvas[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCanvasName, setNewCanvasName] = useState("");
  const [newCanvasDescription, setNewCanvasDescription] = useState("");
  const [creating, setCreating] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isPending && !session) {
      navigate({ to: "/login" });
    }
  }, [session, isPending, navigate]);

  // Fetch canvases
  useEffect(() => {
    if (session?.user?.id) {
      fetchCanvases(session.user.id);
    }
  }, [session?.user?.id]);

  const fetchCanvases = async (userId: string) => {
    try {
      const response = await fetch(`/api/canvases?userId=${userId}`);
      const data = await response.json();
      if (data.canvases) {
        setCanvases(data.canvases);
      }
    } catch (error) {
      console.error("Error fetching canvases:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCanvas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCanvasName.trim() || !session?.user?.id) return;

    setCreating(true);
    try {
      const response = await fetch("/api/canvases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCanvasName.trim(),
          description: newCanvasDescription.trim() || null,
          userId: session.user.id,
        }),
      });

      const data = await response.json();
      if (data.canvas) {
        setCanvases([data.canvas, ...canvases]);
        setShowCreateModal(false);
        setNewCanvasName("");
        setNewCanvasDescription("");
        navigate({ to: `/canvas/$id`, params: { id: data.canvas.id } });
      }
    } catch (error) {
      console.error("Error creating canvas:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCanvas = async (canvasId: string) => {
    if (!confirm("Are you sure you want to delete this canvas?")) return;

    try {
      const response = await fetch(`/api/canvases/${canvasId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setCanvases(canvases.filter((c) => c.id !== canvasId));
      }
    } catch (error) {
      console.error("Error deleting canvas:", error);
    }
  };

  if (isPending || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-bold text-foreground">My Canvases</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {session.user?.email}
            </span>
            <button
              onClick={() => authClient.signOut()}
              className="rounded-md border bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-muted-foreground">
            {canvases.length} canvas{canvases.length !== 1 ? "es" : ""}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90"
          >
            + New Canvas
          </button>
        </div>

        {canvases.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-card p-12 text-center">
            <h3 className="text-lg font-medium text-foreground">No canvases yet</h3>
            <p className="mt-2 text-muted-foreground">
              Create your first canvas to get started
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90"
            >
              + Create Canvas
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {canvases.map((canvas) => (
              <div
                key={canvas.id}
                className="group relative rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <Link
                  to="/canvas/$id"
                  params={{ id: canvas.id }}
                  className="block"
                >
                  <div className="mb-3 aspect-video rounded-md bg-muted" />
                  <h3 className="font-medium text-card-foreground">{canvas.name}</h3>
                  {canvas.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {canvas.description}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(canvas.updatedAt).toLocaleDateString()}
                  </p>
                </Link>
                <button
                  onClick={() => handleDeleteCanvas(canvas.id)}
                  className="absolute right-2 top-2 rounded-md bg-destructive/10 p-1.5 text-destructive opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/20"
                  title="Delete canvas"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Canvas Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-card-foreground">
              Create New Canvas
            </h2>
            <form onSubmit={handleCreateCanvas} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="canvas-name"
                  className="block text-sm font-medium text-foreground"
                >
                  Name
                </label>
                <input
                  id="canvas-name"
                  type="text"
                  value={newCanvasName}
                  onChange={(e) => setNewCanvasName(e.target.value)}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="My Canvas"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label
                  htmlFor="canvas-description"
                  className="block text-sm font-medium text-foreground"
                >
                  Description (optional)
                </label>
                <textarea
                  id="canvas-description"
                  value={newCanvasDescription}
                  onChange={(e) => setNewCanvasDescription(e.target.value)}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="What's this canvas for?"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewCanvasName("");
                    setNewCanvasDescription("");
                  }}
                  className="rounded-md border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newCanvasName.trim()}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
