import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";
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

export const Route = createFileRoute("/canvas/$id")({
  component: CanvasPage,
});

function CanvasPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showImagePanel, setShowImagePanel] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageName, setImageName] = useState("");
  const [addingImage, setAddingImage] = useState(false);
  const editorRef = useRef<unknown>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isPending && !session) {
      navigate({ to: "/login" });
    }
  }, [session, isPending, navigate]);

  // Fetch canvas data
  useEffect(() => {
    if (session?.user?.id && id) {
      fetchCanvas();
    }
  }, [session?.user?.id, id]);

  const fetchCanvas = async () => {
    try {
      const response = await fetch(`/api/canvases/${id}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to load canvas");
        return;
      }

      setCanvas(data.canvas);

      // TODO: Load tldraw store if document exists
      // if (data.document) {
      //   try {
      //     const storeData = JSON.parse(data.document.storeData);
      //     setInitialStore(storeData);
      //   } catch (e) {
      //     console.error("Error loading store:", e);
      //   }
      // }
    } catch (err) {
      setError("Failed to load canvas");
    } finally {
      setLoading(false);
    }
  };

  // Save canvas store (debounced)
  const saveCanvasStore = useCallback(
    (storeData: unknown) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await fetch(`/api/canvases/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ storeData }),
          });
        } catch (err) {
          console.error("Error saving canvas:", err);
        }
      }, 1000);
    },
    [id],
  );

  // Handle tldraw mount
  const handleMount = useCallback(
    (editor: unknown) => {
      editorRef.current = editor;

      // Listen for store changes and save
      const editorAny = editor as {
        store: { listen: (cb: () => void, opts: unknown) => void; getSnapshot: () => unknown };
      };

      editorAny.store.listen(
        () => {
          const snapshot = editorAny.store.getSnapshot();
          saveCanvasStore(snapshot);
        },
        { scope: "document", source: "user" },
      );
    },
    [saveCanvasStore],
  );

  // Add image to canvas
  const handleAddImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) return;

    setAddingImage(true);
    try {
      const response = await fetch("/api/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canvasId: id,
          url: imageUrl.trim(),
          name: imageName.trim() || null,
        }),
      });

      const data = await response.json();

      if (response.ok && data.image) {
        // Clear form
        setImageUrl("");
        setImageName("");
        setShowImagePanel(false);
      }
    } catch (err) {
      console.error("Error adding image:", err);
    } finally {
      setAddingImage(false);
    }
  };

  if (isPending || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading canvas...</div>
      </div>
    );
  }

  if (error || !canvas) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">
            {error || "Canvas not found"}
          </h2>
          <button
            onClick={() => navigate({ to: "/dashboard" })}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden">
      {/* Header */}
      <header className="absolute left-0 right-0 top-0 z-50 flex items-center justify-between border-b bg-card px-4 py-2">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate({ to: "/dashboard" })}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Back to Dashboard"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m12 19-7-7 7-7" />
              <path d="M19 12H5" />
            </svg>
          </button>
          <div>
            <h1 className="font-semibold text-foreground">{canvas.name}</h1>
            {canvas.description && (
              <p className="text-xs text-muted-foreground">
                {canvas.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImagePanel(!showImagePanel)}
            className="rounded-md border bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
          >
            + Add Image
          </button>
        </div>
      </header>

      {/* Image Panel */}
      {showImagePanel && (
        <div className="absolute right-4 top-14 z-50 w-80 rounded-lg border bg-card p-4 shadow-xl">
          <h3 className="font-medium text-card-foreground">Add Image</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Enter an image URL to add it to the canvas
          </p>

          <form onSubmit={handleAddImage} className="mt-3 space-y-3">
            <div>
              <label
                htmlFor="image-url"
                className="block text-sm font-medium text-foreground"
              >
                Image URL
              </label>
              <input
                id="image-url"
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="https://example.com/image.jpg"
                required
                autoFocus
              />
            </div>

            <div>
              <label
                htmlFor="image-name"
                className="block text-sm font-medium text-foreground"
              >
                Name (optional)
              </label>
              <input
                id="image-name"
                type="text"
                value={imageName}
                onChange={(e) => setImageName(e.target.value)}
                className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="My Image"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowImagePanel(false);
                  setImageUrl("");
                  setImageName("");
                }}
                className="rounded-md border bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addingImage || !imageUrl.trim()}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {addingImage ? "Adding..." : "Add"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* tldraw Canvas */}
      <div className="h-full w-full pt-12">
        <Tldraw onMount={handleMount} />
      </div>
    </div>
  );
}
