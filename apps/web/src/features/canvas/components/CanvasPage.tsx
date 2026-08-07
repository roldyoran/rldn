import { useState, useRef, useCallback, useEffect } from "react";
import { serializeAsJSON } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { ExcalidrawEditor, type ExcalidrawEditorHandle } from "./ExcalidrawEditor";

// Tabler icons as React components
import IconArrowLeft from "@tabler/icons/outline/arrow-left.svg?react";
import IconCloudUpload from "@tabler/icons/outline/cloud-upload.svg?react";
import IconMaximize from "@tabler/icons/outline/maximize.svg?react";
import IconPointer from "@tabler/icons/outline/pointer.svg?react";
import IconHandClick from "@tabler/icons/outline/hand-click.svg?react";
import IconPencil from "@tabler/icons/outline/pencil.svg?react";
import IconLetterT from "@tabler/icons/outline/letter-t.svg?react";
import IconRectangle from "@tabler/icons/outline/rectangle.svg?react";
import IconCircle from "@tabler/icons/outline/circle.svg?react";
import IconMinus from "@tabler/icons/outline/minus.svg?react";
import IconArrowRight from "@tabler/icons/outline/arrow-right.svg?react";
import IconPhoto from "@tabler/icons/outline/photo.svg?react";
import IconDownload from "@tabler/icons/outline/download.svg?react";
import IconCheck from "@tabler/icons/outline/check.svg?react";
import IconX from "@tabler/icons/outline/x.svg?react";

interface CanvasPageProps {
	canvasId: string;
}

export default function CanvasPage({ canvasId }: CanvasPageProps) {
	const excalidrawRef = useRef<ExcalidrawEditorHandle>(null);
	const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
	const [docTitle, setDocTitle] = useState("Sin título");
	const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
	const [currentTool, setCurrentTool] = useState("selection");
	const [currentStrokeColor, setCurrentStrokeColor] = useState("#ffffff");
	const [currentBackgroundColor, setCurrentBackgroundColor] = useState("transparent");
	const [initialStoreData, setInitialStoreData] = useState<string | null | undefined>(undefined); // undefined = loading

	// Refs for save logic (avoid re-render loops)
	const isDirtyRef = useRef(false);
	const isSavingRef = useRef(false);
	const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
	const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const docTitleRef = useRef(docTitle);
	const lastSavedStoreDataRef = useRef<string | null>(null); // content-hash dedup
	const suppressNextChangeRef = useRef(true); // skip onChange during initial load

	// Keep refs in sync
	useEffect(() => {
		apiRef.current = api;
	}, [api]);

	useEffect(() => {
		docTitleRef.current = docTitle;
	}, [docTitle]);

	// Single fetch: get canvas name + storeData in one request
	useEffect(() => {
		fetch(`/api/canvases/${canvasId}`, { credentials: "include" })
			.then((r) => r.json())
			.then((data) => {
				if (data.name) setDocTitle(data.name);
				setInitialStoreData(data.document?.storeData ?? null);
			})
			.catch(() => {
				setInitialStoreData(null);
			});
	}, [canvasId]);

	// ===== SAVE LOGIC =====
	const buildStoreData = useCallback(() => {
		const currentApi = apiRef.current;
		if (!currentApi) throw new Error("API not ready");
		const elements = currentApi.getSceneElements();
		const appState = currentApi.getAppState();
		const files = currentApi.getFiles();
		const storeData = serializeAsJSON(elements, appState, files, "local");
		return { storeData };
	}, []);

	const saveCanvas = useCallback(async () => {
		if (isSavingRef.current) return;
		const currentApi = apiRef.current;
		if (!currentApi) return;

		// If nothing changed, just show "already saved" feedback
		if (!isDirtyRef.current) {
			setSaveState("saved");
			setTimeout(() => setSaveState("idle"), 1200);
			return;
		}

		isSavingRef.current = true;
		setSaveState("saving");

		try {
			const { storeData } = buildStoreData();

			// Content-hash dedup: skip save if storeData hasn't changed
			if (storeData === lastSavedStoreDataRef.current) {
				isDirtyRef.current = false;
				isSavingRef.current = false;
				setSaveState("saved");
				setTimeout(() => setSaveState("idle"), 1200);
				return;
			}

			const res = await fetch(`/api/canvases/${canvasId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: docTitleRef.current, storeData }),
				credentials: "include",
			});
			if (!res.ok) throw new Error(`Server ${res.status}`);
			lastSavedStoreDataRef.current = storeData;
			isDirtyRef.current = false;
			setSaveState("saved");
			setTimeout(() => setSaveState("idle"), 1500);
		} catch (err) {
			console.error("[Canvas] Save FAILED:", err);
			isDirtyRef.current = true;
			setSaveState("error");
			setTimeout(() => setSaveState("idle"), 3000);
		} finally {
			isSavingRef.current = false;
		}
	}, [canvasId, buildStoreData]);

	const scheduleSave = useCallback(() => {
		if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
		saveTimeoutRef.current = setTimeout(saveCanvas, 1200);
	}, [saveCanvas]);

	const markDirty = useCallback(() => {
		isDirtyRef.current = true;
		scheduleSave();
	}, [scheduleSave]);

	// ===== EXCALIDRAW CALLBACKS =====
	const handleAPIReady = useCallback((apiInstance: ExcalidrawImperativeAPI) => {
		setApi(apiInstance);
		// Sync color state from Excalidraw's appState
		try {
			const appState = apiInstance.getAppState();
			if (appState.currentItemStrokeColor) setCurrentStrokeColor(appState.currentItemStrokeColor);
			if (appState.currentItemBackgroundColor)
				setCurrentBackgroundColor(appState.currentItemBackgroundColor);
			const elements = apiInstance.getSceneElements();
			const files = apiInstance.getFiles();
			lastSavedStoreDataRef.current = serializeAsJSON(elements, appState, files, "local");
		} catch {
			/* ignore */
		}
	}, []);

	const handleChange = useCallback(() => {
		// Sync color state from Excalidraw's appState on every change
		const currentApi = apiRef.current;
		if (currentApi) {
			const appState = currentApi.getAppState();
			if (appState.currentItemStrokeColor) setCurrentStrokeColor(appState.currentItemStrokeColor);
			if (appState.currentItemBackgroundColor)
				setCurrentBackgroundColor(appState.currentItemBackgroundColor);
		}
		// Skip onChange fired during initial render (Excalidraw fires onChange
		// immediately when it mounts with initialData, causing a useless save)
		if (suppressNextChangeRef.current) {
			suppressNextChangeRef.current = false;
			return;
		}
		markDirty();
	}, [markDirty]);

	// ===== TOOLBAR =====
	const noLockTools = useRef(new Set(["arrow", "line", "freedraw"]));

	// Re-focus Excalidraw canvas after toolbar interactions
	const refocusCanvas = useCallback(() => {
		requestAnimationFrame(() => {
			const canvas = document.getElementById("canvas-wrap")?.querySelector("canvas");
			if (canvas) canvas.focus();
		});
	}, []);

	const setTool = useCallback(
		(tool: string) => {
			if (!api) return;
			let nextTool = tool;
			if (currentTool === tool && tool !== "selection") {
				nextTool = "selection";
			}
			setCurrentTool(nextTool);
			const locked = nextTool !== "selection" && !noLockTools.current.has(nextTool);
			api.setActiveTool({ type: nextTool, locked } as any);
			refocusCanvas();
		},
		[api, currentTool, refocusCanvas],
	);

	// ===== COLOR PRESETS =====
	const exportPNG = useCallback(async () => {
		const currentApi = apiRef.current;
		if (!currentApi) return;
		const { exportToBlob } = await import("@excalidraw/excalidraw");
		const elements = currentApi.getSceneElements();
		const appState = currentApi.getAppState();
		const files = currentApi.getFiles();
		const blob = await exportToBlob({
			elements,
			appState: {
				...appState,
				exportBackground: true,
				exportWithDarkMode: false,
				exportScale: 2,
			},
			files,
			mimeType: "image/png",
			quality: 1,
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${docTitleRef.current || "lienzo"}.png`;
		a.click();
		URL.revokeObjectURL(url);
	}, []);

	const fitToContent = useCallback(() => {
		const currentApi = apiRef.current;
		if (!currentApi) return;
		const elements = currentApi.getSceneElements();
		if (elements.length === 0) return;
		currentApi.scrollToContent(elements, {
			fitToViewport: true,
			viewportZoomFactor: 1,
			animate: true,
		});
	}, []);

	const setStrokeColor = useCallback(
		(color: string) => {
			setCurrentStrokeColor(color);
			if (!api) return;
			api.updateScene({ appState: { currentItemStrokeColor: color } });
			const appState = api.getAppState();
			const selectedIds = appState.selectedElementIds || {};
			const elements = api.getSceneElements();
			const hasSelected = elements.some((el: any) => selectedIds[el.id]);
			if (hasSelected) {
				api.updateScene({
					elements: elements.map((el: any) =>
						selectedIds[el.id] ? { ...el, strokeColor: color, version: (el.version || 0) + 1 } : el,
					),
				});
			}
		},
		[api],
	);

	const setBackgroundColor = useCallback(
		(color: string) => {
			setCurrentBackgroundColor(color);
			if (!api) return;
			api.updateScene({ appState: { currentItemBackgroundColor: color } });
			const appState = api.getAppState();
			const selectedIds = appState.selectedElementIds || {};
			const elements = api.getSceneElements();
			const hasSelected = elements.some((el: any) => selectedIds[el.id]);
			if (hasSelected) {
				api.updateScene({
					elements: elements.map((el: any) =>
						selectedIds[el.id]
							? { ...el, backgroundColor: color, version: (el.version || 0) + 1 }
							: el,
					),
				});
			}
		},
		[api],
	);

	// ===== EFFECTS =====
	// Tool shortcuts map
	const toolShortcuts = useRef<Record<string, string>>({
		v: "selection",
		h: "hand",
		p: "freedraw",
		t: "text",
		r: "rectangle",
		o: "ellipse",
		l: "line",
		a: "arrow",
	});

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Ignore if typing in an input/textarea
			const tag = (e.target as HTMLElement)?.tagName;
			if (tag === "INPUT" || tag === "TEXTAREA") return;

			if ((e.ctrlKey || e.metaKey) && e.key === "s") {
				e.preventDefault();
				saveCanvas();
				return;
			}

			// Don't intercept keyboard shortcuts (Ctrl/Cmd combos like Ctrl+V paste)
			if (e.ctrlKey || e.metaKey) return;

			const tool = toolShortcuts.current[e.key.toLowerCase()];
			if (tool) {
				e.preventDefault();
				setTool(tool);
			}
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [saveCanvas, setTool]);

	useEffect(() => {
		const handleBeforeUnload = () => {
			if (isDirtyRef.current) {
				try {
					const { storeData } = buildStoreData();
					const payload = JSON.stringify({ name: docTitleRef.current, storeData });
					if (payload.length < 64000) {
						fetch(`/api/canvases/${canvasId}`, {
							method: "PUT",
							headers: { "Content-Type": "application/json" },
							body: payload,
							credentials: "include",
							keepalive: true,
						});
					}
				} catch (_e) {
					/* ignore */
				}
			}
		};
		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => window.removeEventListener("beforeunload", handleBeforeUnload);
	}, [canvasId, buildStoreData]);

	useEffect(() => {
		const handleVisibilityChange = () => {
			if (document.hidden && isDirtyRef.current) {
				if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
				saveCanvas();
			}
		};
		document.addEventListener("visibilitychange", handleVisibilityChange);
		return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
	}, [saveCanvas]);

	return (
		<div
			id="app"
			className="relative h-screen w-screen overflow-hidden bg-[#1b1b1a] text-[#eae8e4]"
			style={{
				fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
				userSelect: "none",
			}}
		>
			{/* Topbar */}
			<div
				id="topbar"
				className="absolute top-0 left-0 right-0 z-30 flex h-[52px] items-center justify-between border-b border-[#373634] bg-[#232322] px-3"
			>
				<div className="flex items-center gap-1.5">
					<button
						className="icon-btn flex h-[34px] w-[34px] items-center justify-center rounded-lg text-[#928f89] hover:bg-[#2a2926] hover:text-[#eae8e4]"
						onClick={() => {
							window.location.href = "/dashboard";
						}}
						title="Volver"
					>
						<IconArrowLeft width={18} height={18} />
					</button>
					<input
						value={docTitle}
						onChange={(e) => {
							setDocTitle(e.target.value);
							markDirty();
						}}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								(e.target as HTMLInputElement).blur();
							}
						}}
						className="rounded-md border-none bg-transparent px-2 py-1.5 text-sm font-semibold text-[#eae8e4] outline-none max-w-[220px] hover:bg-[#2a2926] focus:bg-[#2a2926]"
					/>
				</div>
				<div className="flex items-center gap-1.5">
					<button
						className="icon-btn flex h-[34px] w-[34px] items-center justify-center rounded-lg text-[#928f89] hover:bg-[#2a2926] hover:text-[#eae8e4]"
						onClick={fitToContent}
						title="Encajar en pantalla"
					>
						<IconMaximize width={18} height={18} />
					</button>
					<div className="h-5 w-px bg-[#373634]" />
					<button
						className="icon-btn flex h-[34px] w-[34px] items-center justify-center rounded-lg text-[#928f89] hover:bg-[#2a2926] hover:text-[#eae8e4]"
						onClick={saveCanvas}
						title="Guardar (Ctrl+S)"
					>
						<IconCloudUpload width={18} height={18} />
					</button>
				</div>
			</div>

			{/* Toolbar */}
			<div
				id="toolbar"
				className="absolute left-3 top-[70px] z-30 flex flex-col gap-0.5 rounded-xl border border-[#373634] bg-[#232322] p-1.5"
			>
				{[
					{ tool: "selection", title: "Seleccionar (V)", icon: IconPointer },
					{ tool: "hand", title: "Mover lienzo (H)", icon: IconHandClick },
					{ tool: "freedraw", title: "Lápiz (P)", icon: IconPencil },
					{ tool: "text", title: "Texto (T)", icon: IconLetterT },
					{ tool: "rectangle", title: "Rectángulo (R)", icon: IconRectangle },
					{ tool: "ellipse", title: "Elipse (O)", icon: IconCircle },
					{ tool: "line", title: "Línea (L)", icon: IconMinus },
					{ tool: "arrow", title: "Flecha (A)", icon: IconArrowRight },
				].map((item) => (
					<button
						key={item.tool}
						className={`tool-btn flex h-[38px] w-[38px] items-center justify-center rounded-lg hover:bg-[#2a2926] hover:text-[#eae8e4] ${
							currentTool === item.tool ? "bg-[#eae8e4] text-[#14141f]" : "text-[#928f89]"
						}`}
						onClick={() => setTool(item.tool)}
						title={item.title}
					>
						<item.icon width={18} height={18} />
					</button>
				))}

				<div className="my-1 h-px bg-[#373634] mx-1" />

				{/* Insert image */}
				<button
					className="tool-btn flex h-[38px] w-[38px] items-center justify-center rounded-lg text-[#928f89] hover:bg-[#2a2926] hover:text-[#eae8e4]"
					onClick={() => {
						excalidrawRef.current?.openImageDialog();
						refocusCanvas();
					}}
					title="Insertar imagen por URL"
				>
					<IconPhoto width={18} height={18} />
				</button>

				{/* Download PNG */}
				<button
					className="tool-btn flex h-[38px] w-[38px] items-center justify-center rounded-lg text-[#928f89] hover:bg-[#2a2926] hover:text-[#eae8e4]"
					onClick={() => {
						exportPNG();
						refocusCanvas();
					}}
					title="Descargar como PNG"
				>
					<IconDownload width={18} height={18} />
				</button>

				{/* Color Pickers */}
				<div className="my-1 h-px bg-[#373634] mx-1" />

				{/* Stroke Color */}
				<div className="flex flex-col items-center gap-1 py-1" title="Color de trazo">
					<label className="text-[9px] text-[#928f89] uppercase tracking-wider">Trazo</label>
					<button
						className="h-[24px] w-[24px] cursor-pointer rounded-md border border-[#373634] p-0 hover:ring-1 hover:ring-[#928f89] transition-all"
						style={{ background: currentStrokeColor }}
						onClick={() => {
							excalidrawRef.current?.openColorPicker("stroke");
							refocusCanvas();
						}}
						title="Seleccionar color de trazo"
					/>
					<div className="flex flex-wrap gap-0.5 justify-center max-w-[38px]">
						{[
							{ color: "#ffffff", title: "Blanco" },
							{ color: "#ff6b6b", title: "Rojo" },
							{ color: "#ffa94d", title: "Naranja" },
							{ color: "#ffd43b", title: "Amarillo" },
							{ color: "#69db7c", title: "Verde" },
							{ color: "#4dabf7", title: "Azul" },
							{ color: "#b197fc", title: "Morado" },
							{ color: "#f783ac", title: "Rosa" },
							{ color: "#928f89", title: "Gris" },
							{ color: "#1e1e1e", title: "Negro" },
						].map((preset) => (
							<button
								key={preset.color}
								className="color-preset h-[14px] w-[14px] rounded-sm border border-[#4a4846] hover:scale-125 transition-transform"
								style={{ background: preset.color }}
								onClick={() => {
									setStrokeColor(preset.color);
									refocusCanvas();
								}}
								title={preset.title}
							/>
						))}
					</div>
				</div>

				{/* Fill Color */}
				<div className="flex flex-col items-center gap-1 py-1" title="Color de relleno">
					<label className="text-[9px] text-[#928f89] uppercase tracking-wider">Relleno</label>
					<button
						className="h-[24px] w-[24px] cursor-pointer rounded-md border border-[#373634] p-0 hover:ring-1 hover:ring-[#928f89] transition-all"
						style={{
							background:
								currentBackgroundColor === "transparent"
									? "repeating-conic-gradient(#373634 0% 25%, #1b1b1a 0% 50%) 50% / 8px 8px"
									: currentBackgroundColor,
						}}
						onClick={() => {
							excalidrawRef.current?.openColorPicker("bg");
							refocusCanvas();
						}}
						title="Seleccionar color de relleno"
					/>
					<div className="flex flex-wrap gap-0.5 justify-center max-w-[38px]">
						<button
							className="color-preset h-[14px] w-[14px] rounded-sm border border-[#4a4846] hover:scale-125 transition-transform"
							onClick={() => {
								setBackgroundColor("transparent");
								refocusCanvas();
							}}
							title="Sin relleno"
						>
							<span className="block h-full w-full relative">
								<span
									className="absolute inset-0 border border-[#ff4747] rotate-45 transform origin-center"
									style={{ borderWidth: "1px" }}
								/>
							</span>
						</button>
						{[
							{ color: "#ffffff", title: "Blanco" },
							{ color: "#ff6b6b", title: "Rojo" },
							{ color: "#ffa94d", title: "Naranja" },
							{ color: "#ffd43b", title: "Amarillo" },
							{ color: "#69db7c", title: "Verde" },
							{ color: "#4dabf7", title: "Azul" },
							{ color: "#b197fc", title: "Morado" },
							{ color: "#f783ac", title: "Rosa" },
						].map((preset) => (
							<button
								key={preset.color}
								className="color-preset h-[14px] w-[14px] rounded-sm border border-[#4a4846] hover:scale-125 transition-transform"
								style={{ background: preset.color }}
								onClick={() => {
									setBackgroundColor(preset.color);
									refocusCanvas();
								}}
								title={preset.title}
							/>
						))}
					</div>
				</div>
			</div>

			{/* Canvas */}
			<div id="canvas-wrap" className="absolute inset-0 top-[52px] bg-[#1b1b1a]">
				<ExcalidrawEditor
					ref={excalidrawRef}
					canvasId={canvasId}
					initialStoreData={initialStoreData}
					onAPIReady={handleAPIReady}
					onChange={handleChange}
				/>
			</div>

			{/* Save indicator */}
			<div
				className={`absolute top-[72px] right-4 z-40 items-center gap-2 rounded-lg border border-[#373634] bg-[#232322]/90 px-3 py-2 text-xs text-[#928f89] shadow-lg backdrop-blur-sm transition-all duration-300 ${
					saveState === "idle" ? "hidden" : "flex"
				}`}
			>
				<span className="flex h-3.5 w-3.5 items-center justify-center">
					{saveState === "saving" && (
						<span className="save-spinner inline-block h-3 w-3 rounded-full border-2 border-[#928f89] border-t-transparent" />
					)}
					{saveState === "saved" && <IconCheck width={14} height={14} className="text-[#69db7c]" />}
					{saveState === "error" && <IconX width={14} height={14} className="text-[#ff6b6b]" />}
				</span>
				<span>
					{saveState === "saving" && "Guardando..."}
					{saveState === "saved" && "Guardado"}
					{saveState === "error" && "Error al guardar"}
				</span>
			</div>
		</div>
	);
}
