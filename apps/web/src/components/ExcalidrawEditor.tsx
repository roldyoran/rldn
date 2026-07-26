import { useEffect, useRef, useCallback, useState } from "react";
import { Excalidraw, serializeAsJSON } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";

// Self-host fonts from public/fonts/
if (typeof window !== "undefined") {
	window.EXCALIDRAW_ASSET_PATH = "/";

	// Patch canvas context to override Excalidraw's hardcoded grid colors
	// Excalidraw v0.18.1 uses Bold:"#dddddd" and Regular:"#e5e5e5" for grid
	if (!(window as any).__gridColorPatched) {
		(window as any).__gridColorPatched = true;
		const desc = Object.getOwnPropertyDescriptor(
			CanvasRenderingContext2D.prototype,
			"strokeStyle",
		)!;
		Object.defineProperty(CanvasRenderingContext2D.prototype, "strokeStyle", {
			set(value: string) {
				// Replace grid grey colors with intense red
				if (value === "#dddddd" || value === "#e5e5e5") {
					value = value === "#dddddd" ? "rgba(128, 128, 128, 0.3)" : "rgba(160, 160, 160, 0.3)";
				}
				desc.set.call(this, value);
			},
			get() {
				return desc.get.call(this);
			},
			configurable: true,
		});
	}
}

export interface ExcalidrawEditorProps {
	canvasId: string;
	onChange?: () => void;
	viewModeEnabled?: boolean;
}

export function ExcalidrawEditor({
	canvasId,
	onChange,
	viewModeEnabled = false,
}: ExcalidrawEditorProps) {
	const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
	const [initialData, setInitialData] = useState<
		| {
				elements: any[];
				appState: Record<string, any>;
				files: Record<string, any>;
				scrollToContent: boolean;
		  }
		| undefined
	>(undefined);
	const [loading, setLoading] = useState(true);

	// Fetch canvas data and set as initialData (Promise pattern for Excalidraw)
	useEffect(() => {
		let cancelled = false;

		async function loadCanvas() {
			console.log(`[ExcalidrawEditor] Loading canvas ${canvasId}...`);
			try {
				const res = await fetch(`/api/canvases/${canvasId}`, {
					credentials: "include",
				});
				if (!res.ok) {
					console.error("[ExcalidrawEditor] Failed to load canvas:", res.status);
					return;
				}
				const data = await res.json();
				console.log("[ExcalidrawEditor] Canvas loaded:", data.name, "doc:", !!data.document);

				if (cancelled) return;

				if (data.document?.storeData) {
					try {
						const parsed = JSON.parse(data.document.storeData);
						console.log("[ExcalidrawEditor] Parsed storeData:", {
							elements: parsed.elements?.length ?? 0,
							hasFiles: !!parsed.files && Object.keys(parsed.files).length > 0,
						});
						setInitialData({
							elements: parsed.elements || [],
							appState: {
								...parsed.appState,
								viewBackgroundColor: "#1b1b1a",
								currentStrokeColor: "#ffffff",
								currentBackgroundColor: "transparent",
								collaborators: [],
							},
							files: parsed.files || {},
							scrollToContent: true,
						});
					} catch (e) {
						console.error("[ExcalidrawEditor] Failed to parse storeData:", e);
						setInitialData({
							elements: [],
							appState: {},
							files: {},
							scrollToContent: false,
						});
					}
				} else {
					console.log("[ExcalidrawEditor] No document, starting empty");
					setInitialData({
						elements: [],
						appState: {
							viewBackgroundColor: "#1b1b1a",
							currentStrokeColor: "#ffffff",
							currentBackgroundColor: "transparent",
						},
						files: {},
						scrollToContent: false,
					});
				}
			} catch (e) {
				console.error("[ExcalidrawEditor] Load error:", e);
			} finally {
				if (!cancelled) setLoading(false);
			}
		}

		loadCanvas();
		return () => {
			cancelled = true;
		};
	}, [canvasId]);

	// Register serializeAsJSON globally for the page script
	useEffect(() => {
		if (typeof window !== "undefined") {
			(window as any).__serializeExcalidraw = (
				elements: readonly any[],
				appState: Record<string, any>,
				files: Record<string, any>,
			) => {
				return serializeAsJSON(elements, appState, files, "local");
			};
		}
	}, []);

	// Expose API to page script and handle data loading
	const handleAPI = useCallback((apiInstance: ExcalidrawImperativeAPI) => {
		console.log("[ExcalidrawEditor] API ready");
		apiRef.current = apiInstance;

		// Expose to page script for toolbar/save operations
		if (typeof window !== "undefined") {
			(window as any).__excalidrawAPI = {
				set: () => {},
				get: () => apiInstance,
			};
		}
	}, []);

	// Notify page script on changes
	const handleChange = useCallback(
		(_elements: readonly any[], _appState: Record<string, any>, _files: Record<string, any>) => {
			if (typeof window !== "undefined" && (window as any).__onExcalidrawChange) {
				(window as any).__onExcalidrawChange();
			}
			onChange?.();
		},
		[onChange],
	);

	if (loading || !initialData) {
		return (
			<div
				className="excalidraw-wrapper"
				style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
			>
				<span style={{ color: "#928f89", fontSize: "14px" }}>Cargando lienzo...</span>
			</div>
		);
	}

	return (
		<div className="excalidraw-wrapper">
			<Excalidraw
				excalidrawAPI={handleAPI}
				initialData={initialData}
				theme="light"
				viewModeEnabled={viewModeEnabled}
				onChange={handleChange}
				gridModeEnabled
				UIOptions={{
					canvasActions: {
						changeViewBackgroundColor: false,
						clearCanvas: false,
						export: false,
						loadScene: false,
						saveToActiveFile: false,
						toggleTheme: false,
						saveAsImage: false,
					},
				}}
				autoFocus
			/>
		</div>
	);
}

export type { ExcalidrawImperativeAPI };
