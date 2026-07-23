import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef } from "react";
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

// ── SVG Icons ────────────────────────────────────────────────────────────────
const I = {
  Arrow: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg>,
  Hand: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 11V6a2 2 0 0 0-4 0v6"/><path d="M14 10V4a2 2 0 0 0-4 0v7"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>,
  Pencil: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>,
  Text: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>,
  Rect: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/></svg>,
  Circle: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/></svg>,
  Line: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 19L19 5"/></svg>,
  Image: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>,
  Undo: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>,
  Redo: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/></svg>,
  ZoomIn: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6"/><path d="M8 11h6"/></svg>,
  ZoomOut: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M8 11h6"/></svg>,
  Fit: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="m21 3-7 7"/><path d="m3 21 7-7"/></svg>,
  Back: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>,
  Trash: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>,
  Close: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>,
  Download: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Upload: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  StickyNote: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/><path d="M14 3v4a2 2 0 0 0 2 2h4"/></svg>,
  ArrowLine: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>,
  Grid: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>,
  Copy: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>,
  Paste: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>,
  Group: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="8" height="8" rx="1"/><rect x="14" y="14" width="8" height="8" rx="1"/></svg>,
  Ungroup: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="8" height="8" rx="1"/><rect x="14" y="14" width="8" height="8" rx="1"/><path d="M14 7h3a2 2 0 0 1 2 2v3"/><path d="M7 14v-3a2 2 0 0 1 2-2h3"/></svg>,
};

type Tool = "select" | "pan" | "pencil" | "text" | "rect" | "circle" | "line" | "image" | "arrow" | "sticky";
const BG = "#1a1a2e";

// Dynamic import helper — only runs in browser
function loadFabric() {
  return import("fabric");
}

function CanvasPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();
  const [canvasData, setCanvasData] = useState<Canvas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>("select");
  const [showImagePanel, setShowImagePanel] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageName, setImageName] = useState("");
  const [addingImage, setAddingImage] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);

  const clipboardRef = useRef<any[]>([]);
  const [selectedObj, setSelectedObj] = useState<any | null>(null);
  const [brushColor, setBrushColor] = useState("#e94560");
  const [brushWidth, setBrushWidth] = useState(3);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [gridSize] = useState(20);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [stickyColor, setStickyColor] = useState("#fff9b1");
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const tldrawContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tldrawRef = useRef<any>(null);
  const tldrawStoreRef = useRef<any>(null);
  const tldrawApiRef = useRef<any>(null);
  const instanceRef = useRef<any>(null);
  const isLoadingRef = useRef(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedTldrawObject = useRef<any>(null);

  

  // Redirect if not authenticated
  useEffect(() => {
    if (!isPending && !session) navigate({ to: "/login" });
  }, [session, isPending, navigate]);

  // Fetch canvas metadata
  useEffect(() => {
    if (session?.user?.id && id) fetchCanvas();
  }, [session?.user?.id, id]);

  // ── Load fabric, create canvas and bind events ──
  const loadCanvas = useCallback((fabric: any) => {
    const el = canvasElRef.current;
    const container = containerRef.current;
    if (!el || !container) return;

    const canvas = new fabric.Canvas(el, {
      backgroundColor: BG,
      selection: true,
      preserveObjectStacking: true,
      selectionColor: "rgba(100,100,255,0.15)",
      selectionBorderColor: "#6464ff",
      selectionLineWidth: 1,
      width: 800,
      height: 600,
    });
    tldrawRef.current = canvas;

    const setupCanvas = () => {
      // Use fabric's built-in zoom (wheel)
      canvas.on("mouse:wheel", (opt: any) => {
        const e = opt.e;
        let z = canvas.getZoom() * (0.999 ** e.deltaY);
        z = Math.min(Math.max(z, 0.1), 10);
        canvas.setZoom(z);
        setZoom(Math.round(z * 100));
        e.preventDefault();
        e.stopPropagation();
      });

      // Use fabric's built-in panning (when not selecting/drawing)
      canvas.on("mouse:down", (opt: any) => {
        const e = opt.e;
        if (tool === "pan" || e.button === 1 || (e.button === 0 && e.altKey)) {
          canvas.isDrawingMode = false;
          canvas.selection = false;
        }
      });

      canvas.on("mouse:up", () => {
        canvas.selection = true;
      });

      // Use fabric's built-in object modification tracking
      canvas.on("object:modified", () => {
        if (!isLoadingRef.current) {
          pushHistory();
        }
      });

      // Use fabric's built-in selection tracking
      canvas.on("selection:created", () => {
        setSelectedObj(canvas.getActiveObject());
      });
      canvas.on("selection:updated", () => {
        setSelectedObj(canvas.getActiveObject());
      });
      canvas.on("selection:cleared", () => {
        setSelectedObj(null);
      });

      // Bind resize event
      const resize = () => {
        const rect = container.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          canvas.setDimensions({ width: rect.width, height: rect.height });
          canvas.requestRenderAll();
        }
      };
      resize();
      window.addEventListener("resize", resize);

      // Return cleanup function
      return () => {
        window.removeEventListener("resize", resize);
        canvas.dispose();
        tldrawRef.current = null;
      };
    };

    // Initialize canvas setup
    const cleanup = setupCanvas();
    isLoadingRef.current = false;
    setReady(true);

    return cleanup;
  }, [pushHistory]);

  useEffect(() => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    loadCanvas(fabricRef.current!);

    return () => {};
  }, [loadCanvas]);

  // ── History helpers ──
  const pushHistory = useCallback(() => {
    const fc = fcRef.current;
    if (!fc || isLoadingRef.current) return;
    const json = JSON.stringify(fc.toJSON(["selectable", "evented"]));
    historyRef.current = historyRef.current.slice(0, historyIdxRef.current + 1);
    historyRef.current.push(json);
    if (historyRef.current.length > 50) historyRef.current.shift();
    historyIdxRef.current = historyRef.current.length - 1;
    setCanUndo(historyIdxRef.current > 0);
    setCanRedo(false);
    debouncedSave(json);
  }, []);

  const restoreHistory = useCallback((idx: number) => {
    const fc = fcRef.current;
    if (!fc || idx < 0 || idx >= historyRef.current.length) return;
    isLoadingRef.current = true;
    fc.loadFromJSON(historyRef.current[idx]).then(() => {
      fc.requestRenderAll();
      isLoadingRef.current = false;
      historyIdxRef.current = idx;
      setCanUndo(idx > 0);
      setCanRedo(idx < historyRef.current.length - 1);
      setSelectedObj(null);
    });
  }, []);

  const undo = useCallback(() => restoreHistory(historyIdxRef.current - 1), [restoreHistory]);
  const redo = useCallback(() => restoreHistory(historyIdxRef.current + 1), [restoreHistory]);

  // ── Save to server (debounced) ──
  const debouncedSave = useCallback((json: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await fetch(`/api/canvases/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storeData: JSON.parse(json) }),
        });
      } catch (e) { console.error("Save error:", e); }
      setSaving(false);
    }, 1500);
  }, [id]);

  // ── Load canvas from server ──
  const fetchCanvas = async () => {
    try {
      const res = await fetch(`/api/canvases/${id}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to load canvas"); return; }
      setCanvasData(data.canvas);

      if (data.document?.storeData && fcRef.current) {
        try {
          const store = typeof data.document.storeData === "string"
            ? JSON.parse(data.document.storeData) : data.document.storeData;
          await fcRef.current.loadFromJSON(store);
          fcRef.current.requestRenderAll();
          const json = JSON.stringify(fcRef.current.toJSON(["selectable", "evented"]));
          historyRef.current = [json];
          historyIdxRef.current = 0;
          setCanUndo(false);
          setCanRedo(false);
        } catch (e) { console.error("Load snapshot error:", e); }
      }
      isLoadingRef.current = false;
    } catch { setError("Failed to load canvas"); }
    setLoading(false);
  };

  // ── Tool switching ──
  const switchTool = useCallback((t: Tool) => {
    const fc = fcRef.current;
    if (!fc) return;
    setTool(t);
    fc.isDrawingMode = t === "pencil";
    fc.selection = t === "select";

    if (t === "pencil") {
      fc.freeDrawingBrush.color = brushColor;
      fc.freeDrawingBrush.width = brushWidth;
    }
    if (t === "select") {
      fc.forEachObject((o) => { o.selectable = true; o.evented = true; });
    } else if (t !== "pencil") {
      fc.discardActiveObject();
      fc.forEachObject((o) => { o.selectable = false; o.evented = false; });
    }
    fc.requestRenderAll();
  }, [brushColor, brushWidth]);

  useEffect(() => {
    const fc = fcRef.current;
    if (!fc) return;
    if (tool === "pencil" && fc.freeDrawingBrush) {
      fc.freeDrawingBrush.color = brushColor;
      fc.freeDrawingBrush.width = brushWidth;
    }
  }, [brushColor, brushWidth, tool]);

  // ── Delete selected ──
  const deleteSelected = useCallback(() => {
    const fc = fcRef.current;
    if (!fc) return;
    const active = fc.getActiveObjects();
    if (!active.length) return;
    active.forEach((o) => fc.remove(o));
    fc.discardActiveObject();
    fc.requestRenderAll();
    setSelectedObj(null);
    pushHistory();
  }, [pushHistory]);

  // ── Copy ──
  const copyObject = useCallback(() => {
    const fc = fcRef.current;
    if (!fc) return;
    const active = fc.getActiveObjects();
    if (!active.length) return;
    Promise.all(active.map((o) => o.clone())).then((clones) => {
      clipboardRef.current = clones;
    });
  }, []);

  // ── Paste ──
  const pasteObject = useCallback(() => {
    const fc = fcRef.current;
    if (!fc || !clipboardRef.current.length) return;
    Promise.all(clipboardRef.current.map((o) => o.clone())).then((clones) => {
      clones.forEach((clone) => {
        clone.set({ left: (clone.left || 0) + 20, top: (clone.top || 0) + 20 });
        fc.add(clone);
      });
      fc.requestRenderAll();
      pushHistory();
    });
  }, [pushHistory]);

  // ── Group / Ungroup ──
  const groupObjects = useCallback(() => {
    const fc = fcRef.current;
    if (!fc) return;
    const active = fc.getActiveObject();
    if (!active || active.type !== "activeSelection") return;
    active.toGroup();
    fc.requestRenderAll();
    pushHistory();
  }, [pushHistory]);

  const ungroupObjects = useCallback(() => {
    const fc = fcRef.current;
    if (!fc) return;
    const active = fc.getActiveObject();
    if (!active || active.type !== "group") return;
    active.toActiveSelection();
    fc.requestRenderAll();
    pushHistory();
  }, [pushHistory]);

  // ── Add text ──
  const addText = useCallback(() => {
    const fc = fcRef.current;
    const fabric = fabricRef.current;
    if (!fc || !fabric) return;
    const t = new fabric.IText("Double-click to edit", {
      left: 200, top: 200, fontFamily: "Arial", fontSize: 24, fill: "#ffffff", editable: true,
    });
    fc.add(t);
    fc.setActiveObject(t);
    fc.requestRenderAll();
  }, []);

  // ── Add sticky note ──
  const addStickyNoteAt = useCallback((x: number, y: number) => {
    const fc = fcRef.current;
    const fabric = fabricRef.current;
    if (!fc || !fabric) return;
    const rect = new fabric.Rect({
      width: 200, height: 200, fill: stickyColor,
      rx: 8, ry: 8, shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.2)", blur: 10, offsetX: 2, offsetY: 2 }),
    });
    const text = new fabric.IText("Type here...", {
      fontFamily: "Arial", fontSize: 16, fill: "#333",
      width: 180, left: 10, top: 10, editable: true,
    });
    const group = new fabric.Group([rect, text], { left: x - 100, top: y - 100, selectable: true });
    fc.add(group);
    fc.setActiveObject(group);
    fc.requestRenderAll();
    pushHistory();
  }, [stickyColor, pushHistory]);

  // ── Export ──
  const exportAsPNG = useCallback(() => {
    const fc = fcRef.current;
    if (!fc) return;
    fc.discardActiveObject(); fc.requestRenderAll();
    const dataUrl = fc.toDataURL({ format: "png", quality: 1.0, multiplier: 2 });
    const link = document.createElement("a");
    link.download = `${canvasData?.name || "canvas"}.png`;
    link.href = dataUrl; link.click();
    setShowExportMenu(false);
  }, [canvasData]);

  const exportAsSVG = useCallback(() => {
    const fc = fcRef.current;
    if (!fc) return;
    fc.discardActiveObject(); fc.requestRenderAll();
    const svg = fc.toSVG();
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `${canvasData?.name || "canvas"}.svg`;
    link.href = url; link.click(); URL.revokeObjectURL(url);
    setShowExportMenu(false);
  }, [canvasData]);

  const exportAsJSON = useCallback(() => {
    const fc = fcRef.current;
    if (!fc) return;
    const json = JSON.stringify(fc.toJSON(["selectable", "evented"]), null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `${canvasData?.name || "canvas"}.json`;
    link.href = url; link.click(); URL.revokeObjectURL(url);
    setShowExportMenu(false);
  }, [canvasData]);

  // ── File upload ──
  const handleFileUpload = useCallback((files: FileList | null) => {
    if (!files || !files.length) return;
    const fc = fcRef.current;
    const fabric = fabricRef.current;
    if (!fc || !fabric) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const fImg = new fabric.FabricImage(img, { left: 100, top: 100 });
          const max = 400;
          if (img.width > max || img.height > max) {
            const s = max / Math.max(img.width, img.height);
            fImg.scaleX = s; fImg.scaleY = s;
          }
          fc.add(fImg); fc.setActiveObject(fImg); fc.requestRenderAll(); pushHistory();
        };
        img.src = url;
      };
      reader.readAsDataURL(file);
    });
  }, [pushHistory]);

  // ── Drag & Drop ──
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(false); }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDraggingOver(false);
    const fc = fcRef.current;
    const fabric = fabricRef.current;
    if (!fc || !fabric) return;
    const files = e.dataTransfer.files;
    if (files.length) { handleFileUpload(files); return; }
    const url = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
    if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
      const img = new Image(); img.crossOrigin = "anonymous";
      img.onload = () => {
        const fImg = new fabric.FabricImage(img, { left: 100, top: 100 });
        const max = 400;
        if (img.width > max || img.height > max) {
          const s = max / Math.max(img.width, img.height);
          fImg.scaleX = s; fImg.scaleY = s;
        }
        fc.add(fImg); fc.setActiveObject(fImg); fc.requestRenderAll(); pushHistory();
      };
      img.src = url;
    }
  }, [handleFileUpload, pushHistory]);

  // ── Add image via URL ──
  const handleAddImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) return;
    setAddingImage(true);
    const fabric = fabricRef.current;
    try {
      const res = await fetch("/api/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ canvasId: id, url: imageUrl.trim(), name: imageName.trim() || null }),
      });
      const data = await res.json();
      if (res.ok && data.image) {
        const img = new Image(); img.crossOrigin = "anonymous";
        img.onload = () => {
          if (!fabric) return;
          const fImg = new fabric.FabricImage(img, { left: 100, top: 100 });
          const max = 400;
          if (img.width > max || img.height > max) {
            const s = max / Math.max(img.width, img.height);
            fImg.scaleX = s; fImg.scaleY = s;
          }
          fcRef.current?.add(fImg); fcRef.current?.setActiveObject(fImg); fcRef.current?.requestRenderAll();
          pushHistory();
        };
        img.src = imageUrl.trim();
        setImageUrl(""); setImageName(""); setShowImagePanel(false);
      }
    } catch (e) { console.error("Add image error:", e); }
    setAddingImage(false);
  };

  // ── Zoom ──
  const zoomTo = (factor: number) => {
    const fc = fcRef.current;
    if (!fc) return;
    const z = Math.min(Math.max(factor, 0.1), 10);
    fc.setZoom(z); setZoom(Math.round(z * 100)); fc.requestRenderAll();
  };

  // ── Inline rename ──
  const startRename = useCallback(() => {
    if (!canvasData) return;
    setEditingName(canvasData.name); setIsRenaming(true);
  }, [canvasData]);

  const saveRename = useCallback(async () => {
    if (!editingName.trim() || !canvasData) { setIsRenaming(false); return; }
    try {
      await fetch(`/api/canvases/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingName.trim() }),
      });
      setCanvasData((prev) => prev ? { ...prev, name: editingName.trim() } : prev);
    } catch (e) { console.error("Rename error:", e); }
    setIsRenaming(false);
  }, [editingName, canvasData, id]);

  // ── Properties panel update ──
  const updateObjectProperty = useCallback((prop: string, value: unknown) => {
    const fc = fcRef.current;
    const obj = fc?.getActiveObject();
    if (!obj) return;
    obj.set(prop, value);
    obj.setCoords();
    fc?.requestRenderAll();
    setSelectedObj(Object.assign({}, obj));
    pushHistory();
  }, [pushHistory]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Delete" || e.key === "Backspace") { deleteSelected(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if ((e.ctrlKey || e.metaKey) && ((e.key === "z" && e.shiftKey) || e.key === "y")) { e.preventDefault(); redo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === "c") { e.preventDefault(); copyObject(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === "v") { e.preventDefault(); pasteObject(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === "g" && !e.shiftKey) { e.preventDefault(); groupObjects(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === "g" && e.shiftKey) { e.preventDefault(); ungroupObjects(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === "d") { e.preventDefault(); copyObject(); pasteObject(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        const fc = fcRef.current;
        if (!fc) return;
        fc.discardActiveObject();
        const sel = new fabricRef.current.ActiveSelection(fc.getObjects(), { canvas: fc });
        fc.setActiveObject(sel); fc.requestRenderAll();
        return;
      }
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const k = e.key.toLowerCase();
        if (k === "v") switchTool("select");
        else if (k === "h") switchTool("pan");
        else if (k === "p") switchTool("pencil");
        else if (k === "t") { e.preventDefault(); addText(); }
        else if (k === "r") switchTool("rect");
        else if (k === "c") switchTool("circle");
        else if (k === "l") switchTool("line");
        else if (k === "a") switchTool("arrow");
        else if (k === "n") switchTool("sticky");
        else if (k === "i") setShowImagePanel(true);
        else if (k === "g") setSnapToGrid((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteSelected, undo, redo, switchTool, addText, copyObject, pasteObject, groupObjects, ungroupObjects]);

  // ── Tool button ──
  const Btn = ({ t, icon, label }: { t: Tool | "text"; icon: React.ReactNode; label: string }) => (
    <button
      onClick={() => { if (t === "text") { addText(); return; } switchTool(t as Tool); }}
      className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${tool === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
      title={label}
    >{icon}</button>
  );

  if (isPending || loading) {
    return <div className="flex h-screen items-center justify-center bg-[#1a1a2e]"><div className="text-gray-400">Loading canvas...</div></div>;
  }

  if (error || !canvasData) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#1a1a2e]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white">{error || "Canvas not found"}</h2>
          <button onClick={() => navigate({ to: "/dashboard" })} className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">Back to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-[#1a1a2e]">
      {/* ── Top bar ── */}
      <header className="z-[200] flex shrink-0 items-center justify-between border-b bg-card/95 px-3 py-1.5 backdrop-blur">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate({ to: "/dashboard" })} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Back to Dashboard"><I.Back /></button>
          <div>
            {isRenaming ? (
              <input type="text" value={editingName} onChange={(e) => setEditingName(e.target.value)} onBlur={saveRename}
                onKeyDown={(e) => { if (e.key === "Enter") saveRename(); if (e.key === "Escape") setIsRenaming(false); }} autoFocus
                className="text-sm font-semibold text-foreground bg-background border rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary" />
            ) : (
              <h1 className="text-sm font-semibold text-foreground cursor-pointer hover:text-primary" onClick={startRename} title="Click to rename">{canvasData.name}</h1>
            )}
            {canvasData.description && <p className="text-xs text-muted-foreground">{canvasData.description}</p>}
          </div>
          {saving && <span className="text-xs text-muted-foreground animate-pulse">Saving...</span>}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={undo} disabled={!canUndo} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30" title="Undo (Ctrl+Z)"><I.Undo /></button>
          <button onClick={redo} disabled={!canRedo} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30" title="Redo (Ctrl+Shift+Z)"><I.Redo /></button>
          <div className="mx-1 h-5 w-px bg-border" />
          <button onClick={copyObject} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Copy (Ctrl+C)"><I.Copy /></button>
          <button onClick={pasteObject} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Paste (Ctrl+V)"><I.Paste /></button>
          <div className="mx-1 h-5 w-px bg-border" />
          <button onClick={groupObjects} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Group (Ctrl+G)"><I.Group /></button>
          <button onClick={ungroupObjects} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Ungroup (Ctrl+Shift+G)"><I.Ungroup /></button>
          <div className="mx-1 h-5 w-px bg-border" />
          <button onClick={() => zoomTo(fcRef.current ? fcRef.current.getZoom() / 1.2 : 1)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Zoom Out"><I.ZoomOut /></button>
          <span className="min-w-[3rem] text-center text-xs text-muted-foreground">{zoom}%</span>
          <button onClick={() => zoomTo(fcRef.current ? fcRef.current.getZoom() * 1.2 : 1)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Zoom In"><I.ZoomIn /></button>
          <button onClick={() => { fcRef.current?.setViewportTransform([1, 0, 0, 1, 0, 0]); fcRef.current?.requestRenderAll(); setZoom(100); }} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Fit to Screen"><I.Fit /></button>
          <div className="mx-1 h-5 w-px bg-border" />
          <button onClick={() => setSnapToGrid((p) => !p)} className={`rounded-md p-1.5 ${snapToGrid ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`} title="Toggle Grid Snap (G)"><I.Grid /></button>
          <div className="mx-1 h-5 w-px bg-border" />
          <div className="relative">
            <button onClick={() => setShowExportMenu(!showExportMenu)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Export"><I.Download /></button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border bg-card p-1 shadow-xl z-[200]">
                <button onClick={exportAsPNG} className="w-full rounded-md px-3 py-2 text-sm text-left text-foreground hover:bg-muted">Export as PNG</button>
                <button onClick={exportAsSVG} className="w-full rounded-md px-3 py-2 text-sm text-left text-foreground hover:bg-muted">Export as SVG</button>
                <button onClick={exportAsJSON} className="w-full rounded-md px-3 py-2 text-sm text-left text-foreground hover:bg-muted">Export as JSON</button>
              </div>
            )}
          </div>
          <button onClick={deleteSelected} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive" title="Delete (Del)"><I.Trash /></button>
        </div>
      </header>

      {/* ── Canvas area ── */}
      <div ref={containerRef} className="relative flex-1 overflow-hidden" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
        {isDraggingOver && (
          <div className="absolute inset-0 z-[200] flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-lg pointer-events-none">
            <div className="text-primary font-semibold text-lg">Drop images here</div>
          </div>
        )}

        <canvas ref={canvasElRef} />

        {/* Left toolbar */}
        <div className="absolute left-3 top-3 z-[150] flex flex-col gap-1 rounded-lg border bg-card/95 p-1.5 shadow-lg backdrop-blur">
          <Btn t="select" icon={<I.Arrow />} label="Select (V)" />
          <Btn t="pan" icon={<I.Hand />} label="Pan (H)" />
          <Btn t="pencil" icon={<I.Pencil />} label="Draw (P)" />
          <Btn t="text" icon={<I.Text />} label="Text (T)" />
          <div className="my-1 h-px bg-border" />
          <Btn t="rect" icon={<I.Rect />} label="Rectangle (R)" />
          <Btn t="circle" icon={<I.Circle />} label="Circle (C)" />
          <Btn t="line" icon={<I.Line />} label="Line (L)" />
          <Btn t="arrow" icon={<I.ArrowLine />} label="Arrow (A)" />
          <div className="my-1 h-px bg-border" />
          <Btn t="sticky" icon={<I.StickyNote />} label="Sticky Note (N)" />
          <button onClick={() => setShowImagePanel(true)} className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" title="Add Image (I)"><I.Image /></button>
          <button onClick={() => fileInputRef.current?.click()} className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" title="Upload File"><I.Upload /></button>
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFileUpload(e.target.files)} />
        </div>

        {/* Pencil settings */}
        {tool === "pencil" && (
          <div className="absolute left-[4.2rem] top-3 z-[150] flex items-center gap-3 rounded-lg border bg-card/95 px-4 py-2 shadow-lg backdrop-blur">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Color</label>
              <input type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Size</label>
              <input type="range" min="1" max="20" value={brushWidth} onChange={(e) => setBrushWidth(Number(e.target.value))} className="w-20 accent-primary" />
              <span className="text-xs text-muted-foreground w-5">{brushWidth}</span>
            </div>
          </div>
        )}

        {/* Sticky note color */}
        {tool === "sticky" && (
          <div className="absolute left-[4.2rem] top-3 z-[150] flex items-center gap-3 rounded-lg border bg-card/95 px-4 py-2 shadow-lg backdrop-blur">
            <label className="text-xs text-muted-foreground">Note color</label>
            {["#fff9b1", "#ffb3ba", "#baffc9", "#bae1ff", "#e8baff", "#ffffff"].map((c) => (
              <button key={c} onClick={() => setStickyColor(c)}
                className={`h-6 w-6 rounded-full border-2 ${stickyColor === c ? "border-primary scale-110" : "border-border"}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        )}

        {/* Image panel */}
        {showImagePanel && (
          <div className="absolute right-4 top-3 z-[150] w-80 rounded-lg border bg-card p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-card-foreground">Add Image</h3>
              <button onClick={() => { setShowImagePanel(false); setImageUrl(""); setImageName(""); }} className="rounded p-1 text-muted-foreground hover:text-foreground"><I.Close /></button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Enter an image URL or drag & drop files onto the canvas</p>
            <form onSubmit={handleAddImage} className="mt-3 space-y-3">
              <div>
                <label htmlFor="image-url" className="block text-sm font-medium text-foreground">Image URL</label>
                <input id="image-url" type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="https://example.com/image.jpg" required autoFocus />
              </div>
              <div>
                <label htmlFor="image-name" className="block text-sm font-medium text-foreground">Name (optional)</label>
                <input id="image-name" type="text" value={imageName} onChange={(e) => setImageName(e.target.value)}
                  className="mt-1 w-full rounded-md border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="My Image" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setShowImagePanel(false); setImageUrl(""); setImageName(""); }} className="rounded-md border bg-secondary px-3 py-1.5 text-sm text-secondary-foreground hover:bg-secondary/80">Cancel</button>
                <button type="submit" disabled={addingImage || !imageUrl.trim()} className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50">{addingImage ? "Adding..." : "Add"}</button>
              </div>
            </form>
          </div>
        )}

        {/* Properties panel */}
        {selectedObj && tool === "select" && (
          <div className="absolute right-4 top-3 z-[150] w-56 rounded-lg border bg-card p-3 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-sm text-card-foreground">Properties</h3>
              <button onClick={() => { fcRef.current?.discardActiveObject(); fcRef.current?.requestRenderAll(); setSelectedObj(null); }} className="rounded p-1 text-muted-foreground hover:text-foreground"><I.Close /></button>
            </div>
            <div className="space-y-2">
              {"fill" in selectedObj && selectedObj.type !== "group" && selectedObj.type !== "activeSelection" && (
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">Fill</label>
                  <input type="color" value={typeof selectedObj.fill === "string" ? selectedObj.fill : "#000000"}
                    onChange={(e) => updateObjectProperty("fill", e.target.value)} className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent" />
                </div>
              )}
              {"stroke" in selectedObj && (
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">Stroke</label>
                  <input type="color" value={typeof selectedObj.stroke === "string" ? selectedObj.stroke : "#000000"}
                    onChange={(e) => updateObjectProperty("stroke", e.target.value)} className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent" />
                </div>
              )}
              {"strokeWidth" in selectedObj && (
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">Stroke W.</label>
                  <input type="range" min="0" max="20" step="0.5" value={selectedObj.strokeWidth || 0}
                    onChange={(e) => updateObjectProperty("strokeWidth", Number(e.target.value))} className="w-20 accent-primary" />
                </div>
              )}
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">Opacity</label>
                <input type="range" min="0" max="1" step="0.05" value={selectedObj.opacity ?? 1}
                  onChange={(e) => updateObjectProperty("opacity", Number(e.target.value))} className="w-20 accent-primary" />
                <span className="text-xs text-muted-foreground w-8">{Math.round((selectedObj.opacity ?? 1) * 100)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">X</label>
                <input type="number" step="1" value={Math.round(selectedObj.left || 0)}
                  onChange={(e) => updateObjectProperty("left", Number(e.target.value))}
                  className="w-16 rounded border bg-background px-1 py-0.5 text-xs text-foreground" />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">Y</label>
                <input type="number" step="1" value={Math.round(selectedObj.top || 0)}
                  onChange={(e) => updateObjectProperty("top", Number(e.target.value))}
                  className="w-16 rounded border bg-background px-1 py-0.5 text-xs text-foreground" />
              </div>
              {"width" in selectedObj && (
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">W</label>
                  <input type="number" step="1" value={Math.round((selectedObj.width || 0) * (selectedObj.scaleX || 1))}
                    onChange={(e) => updateObjectProperty("scaleX", Number(e.target.value) / (selectedObj.width || 1))}
                    className="w-16 rounded border bg-background px-1 py-0.5 text-xs text-foreground" />
                </div>
              )}
              {"height" in selectedObj && (
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">H</label>
                  <input type="number" step="1" value={Math.round((selectedObj.height || 0) * (selectedObj.scaleY || 1))}
                    onChange={(e) => updateObjectProperty("scaleY", Number(e.target.value) / (selectedObj.height || 1))}
                    className="w-16 rounded border bg-background px-1 py-0.5 text-xs text-foreground" />
                </div>
              )}
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">Rotate</label>
                <input type="number" min="0" max="360" step="1" value={Math.round(selectedObj.angle || 0)}
                  onChange={(e) => updateObjectProperty("angle", Number(e.target.value))}
                  className="w-16 rounded border bg-background px-1 py-0.5 text-xs text-foreground" />
                <span className="text-xs text-muted-foreground">°</span>
              </div>
              {selectedObj.type === "i-text" && "fontSize" in selectedObj && (
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">Font Size</label>
                  <input type="number" min="8" max="200" step="1" value={selectedObj.fontSize || 24}
                    onChange={(e) => updateObjectProperty("fontSize", Number(e.target.value))}
                    className="w-16 rounded border bg-background px-1 py-0.5 text-xs text-foreground" />
                </div>
              )}
              {selectedObj.type === "i-text" && "fontFamily" in selectedObj && (
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">Font</label>
                  <select value={selectedObj.fontFamily || "Arial"}
                    onChange={(e) => updateObjectProperty("fontFamily", e.target.value)}
                    className="w-24 rounded border bg-background px-1 py-0.5 text-xs text-foreground">
                    {["Arial", "Helvetica", "Times New Roman", "Courier New", "Georgia", "Verdana", "Impact", "Comic Sans MS"].map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Shortcuts hint ── */}
      <div className="z-[200] flex shrink-0 justify-center border-t bg-card/80 py-1 text-[10px] text-muted-foreground backdrop-blur">
        V select · H pan · P draw · T text · R rect · C circle · L line · A arrow · N sticky · I image · Del delete · Ctrl+C/V copy/paste · Ctrl+G group · G snap · Scroll zoom · Alt+drag pan
      </div>
    </div>
  );
}
