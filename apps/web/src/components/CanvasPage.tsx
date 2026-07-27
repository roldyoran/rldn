import { useState, useRef, useCallback, useEffect } from "react";
import { serializeAsJSON } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { ExcalidrawEditor, type ExcalidrawEditorHandle } from "./ExcalidrawEditor";

interface CanvasPageProps {
	canvasId: string;
}

export default function CanvasPage({ canvasId }: CanvasPageProps) {
	const excalidrawRef = useRef<ExcalidrawEditorHandle>(null);
	const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
	const [docTitle, setDocTitle] = useState("Sin título");
	const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
	const [currentTool, setCurrentTool] = useState("selection");

	// Refs for save logic (avoid re-render loops)
	const isDirtyRef = useRef(false);
	const isSavingRef = useRef(false);
	const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
	const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const docTitleRef = useRef(docTitle);

	// Keep refs in sync
	useEffect(() => {
		apiRef.current = api;
	}, [api]);

	useEffect(() => {
		docTitleRef.current = docTitle;
	}, [docTitle]);

	// Load saved canvas name
	useEffect(() => {
		fetch(`/api/canvases/${canvasId}`, { credentials: "include" })
			.then((r) => r.json())
			.then((data) => {
				if (data.name) setDocTitle(data.name);
			})
			.catch(() => {});
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
		if (!isDirtyRef.current) return;

		isSavingRef.current = true;
		setSaveState("saving");

		try {
			const { storeData } = buildStoreData();
			const res = await fetch(`/api/canvases/${canvasId}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: docTitleRef.current, storeData }),
				credentials: "include",
			});
			if (!res.ok) throw new Error(`Server ${res.status}`);
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
	}, []);

	const handleChange = useCallback(() => {
		markDirty();
	}, [markDirty]);

	// ===== TOOLBAR =====
	const noLockTools = useRef(new Set(["arrow", "line", "freedraw"]));

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
		},
		[api, currentTool],
	);

	// ===== COLOR PRESETS =====
	const setStrokeColor = useCallback(
		(color: string) => {
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
		f: "frame",
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
						<svg
							className="h-[18px] w-[18px]"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
						>
							<path d="M19 12H5M12 19l-7-7 7-7" />
						</svg>
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
						onClick={saveCanvas}
						title="Guardar (Ctrl+S)"
					>
						<svg
							className="h-[18px] w-[18px]"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
							<polyline points="17 21 17 13 7 13 7 21" />
							<polyline points="7 3 7 8 15 8" />
						</svg>
					</button>
				</div>
			</div>

			{/* Toolbar */}
			<div
				id="toolbar"
				className="absolute left-3 top-[70px] z-30 flex flex-col gap-0.5 rounded-xl border border-[#373634] bg-[#232322] p-1.5"
			>
				{[
					{ tool: "selection", title: "Seleccionar (V)", path: "M4 4l7.07 17 2.51-7.39L21 11.07z" },
					{
						tool: "hand",
						title: "Mover lienzo (H)",
						path: "M18 11V6a2 2 0 0 0-4 0M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8M6 14l-1.7-1.7a1.7 1.7 0 0 0-2.5 2.3l4 4.6A5 5 0 0 0 9.6 21H14a5 5 0 0 0 5-5v-4a2 2 0 0 0-4 0",
					},
					{
						tool: "freedraw",
						title: "Lápiz (P)",
						path: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z",
					},
					{
						tool: "text",
						title: "Texto (T)",
						extra: (
							<>
								<polyline points="4 7 4 4 20 4 20 7" />
								<line x1="9" y1="20" x2="15" y2="20" />
								<line x1="12" y1="4" x2="12" y2="20" />
							</>
						),
					},
					{ tool: "rectangle", title: "Rectángulo (R)", isRect: true },
					{ tool: "ellipse", title: "Elipse (O)", isCircle: true },
					{ tool: "line", title: "Línea (L)", isLine: true },
					{ tool: "arrow", title: "Flecha (A)", isArrow: true },
				].map((item) => (
					<button
						key={item.tool}
						className={`tool-btn flex h-[38px] w-[38px] items-center justify-center rounded-lg hover:bg-[#2a2926] hover:text-[#eae8e4] ${
							currentTool === item.tool ? "bg-[#eae8e4] text-[#14141f]" : "text-[#928f89]"
						}`}
						onClick={() => setTool(item.tool)}
						title={item.title}
					>
						<svg
							className="h-[18px] w-[18px]"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							{item.extra ? (
								item.extra
							) : item.isRect ? (
								<rect x="3" y="5" width="18" height="14" rx="2" />
							) : item.isCircle ? (
								<circle cx="12" cy="12" r="9" />
							) : item.isLine ? (
								<line x1="5" y1="19" x2="19" y2="5" />
							) : item.isArrow ? (
								<>
									<line x1="5" y1="19" x2="19" y2="5" />
									<polyline points="9 5 19 5 19 15" />
								</>
							) : (
								<path d={item.path} />
							)}
						</svg>
					</button>
				))}

				<div className="my-1 h-px bg-[#373634] mx-1" />

				{/* Frame tool */}
				<button
					className={`tool-btn flex h-[38px] w-[38px] items-center justify-center rounded-lg hover:bg-[#2a2926] hover:text-[#eae8e4] ${
						currentTool === "frame" ? "bg-[#eae8e4] text-[#14141f]" : "text-[#928f89]"
					}`}
					onClick={() => setTool("frame")}
					title="Marco (F)"
				>
					<svg
						className="h-[18px] w-[18px]"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<rect x="3" y="3" width="18" height="18" rx="2" />
						<path d="M3 9h18M9 3v18" />
					</svg>
				</button>

				{/* Insert image */}
				<button
					className="tool-btn flex h-[38px] w-[38px] items-center justify-center rounded-lg text-[#928f89] hover:bg-[#2a2926] hover:text-[#eae8e4]"
					onClick={() => excalidrawRef.current?.openImageDialog()}
					title="Insertar imagen por URL"
				>
					<svg
						className="h-[18px] w-[18px]"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
						<circle cx="8.5" cy="8.5" r="1.5" />
						<polyline points="21 15 16 10 5 21" />
					</svg>
				</button>

				{/* Color Pickers */}
				<div className="my-1 h-px bg-[#373634] mx-1" />

				{/* Stroke Color */}
				<div className="flex flex-col items-center gap-1 py-1" title="Color de trazo">
					<label className="text-[9px] text-[#928f89] uppercase tracking-wider">Trazo</label>
					<button
						className="h-[24px] w-[24px] cursor-pointer rounded-md border border-[#373634] p-0 hover:ring-1 hover:ring-[#928f89] transition-all"
						style={{ background: "#ffffff" }}
						onClick={() => excalidrawRef.current?.openColorPicker("stroke")}
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
								onClick={() => setStrokeColor(preset.color)}
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
							background: "repeating-conic-gradient(#373634 0% 25%, #1b1b1a 0% 50%) 50% / 8px 8px",
						}}
						onClick={() => excalidrawRef.current?.openColorPicker("bg")}
						title="Seleccionar color de relleno"
					/>
					<div className="flex flex-wrap gap-0.5 justify-center max-w-[38px]">
						<button
							className="color-preset h-[14px] w-[14px] rounded-sm border border-[#4a4846] hover:scale-125 transition-transform"
							onClick={() => setBackgroundColor("transparent")}
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
								onClick={() => setBackgroundColor(preset.color)}
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
					{saveState === "saved" && (
						<svg
							className="h-3.5 w-3.5 text-[#69db7c]"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<polyline points="20 6 9 17 4 12" />
						</svg>
					)}
					{saveState === "error" && (
						<svg
							className="h-3.5 w-3.5 text-[#ff6b6b]"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<circle cx="12" cy="12" r="10" />
							<line x1="15" y1="9" x2="9" y2="15" />
							<line x1="9" y1="9" x2="15" y2="15" />
						</svg>
					)}
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
