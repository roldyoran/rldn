import { useEffect, useRef, useCallback, useState } from "react";
import { Excalidraw, serializeAsJSON } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import "@excalidraw/excalidraw/index.css";
import { ColorPickerPopup } from "./ColorPickerPopup";
import { ImageUrlDialog } from "./ImageUrlDialog";

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
					value = value === "#dddddd" ? "rgba(128, 128, 128, 0.2)" : "rgba(160, 160, 160, 0.2)";
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
	const [colorPicker, setColorPicker] = useState<{
		open: boolean;
		type: "stroke" | "bg";
		color: string;
	}>({ open: false, type: "stroke", color: "#ffffff" });
	const [imageDialog, setImageDialog] = useState<{
		open: boolean;
		error: string | null;
		loading: boolean;
	}>({ open: false, error: null, loading: false });

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
								currentItemStrokeColor: "#ffffff",
								currentItemBackgroundColor: "transparent",
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
							currentItemStrokeColor: "#ffffff",
							currentItemBackgroundColor: "transparent",
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

			// Expose color picker controls for toolbar
			(window as any).__showColorPicker = (type: "stroke" | "bg") => {
				const appState = apiInstance.getAppState();
				const color =
					type === "stroke"
						? appState.currentItemStrokeColor || "#ffffff"
						: appState.currentItemBackgroundColor || "transparent";
				setColorPicker({ open: true, type, color });
			};
			(window as any).__hideColorPicker = () => {
				setColorPicker((prev) => ({ ...prev, open: false }));
			};

			// Expose image dialog controls for toolbar
			(window as any).__showImageUrlDialog = () => {
				setImageDialog({ open: true, error: null, loading: false });
			};

			// Update toolbar swatch button backgrounds
			(window as any).__updateToolbarSwatch = (type: "stroke" | "bg", color: string) => {
				const btn = document.getElementById(type === "stroke" ? "strokeColorBtn" : "bgColorBtn");
				if (btn) {
					btn.style.background =
						color === "transparent"
							? "repeating-conic-gradient(#373634 0% 25%, #1b1b1a 0% 50%) 50% / 8px 8px"
							: color;
				}
			};

			// Sync toolbar swatches from selected element colors
			(window as any).__syncSwatchesFromSelection = () => {
				const api = apiInstance;
				const appState = api.getAppState();
				const selectedIds = appState.selectedElementIds || {};
				const elements = api.getSceneElements();
				const selected = elements.find((el: any) => selectedIds[el.id]);

				if (selected) {
					(window as any).__updateToolbarSwatch("stroke", selected.strokeColor || "#ffffff");
					(window as any).__updateToolbarSwatch("bg", selected.backgroundColor || "transparent");
				} else {
					// No selection: show current defaults
					(window as any).__updateToolbarSwatch(
						"stroke",
						appState.currentItemStrokeColor || "#ffffff",
					);
					(window as any).__updateToolbarSwatch(
						"bg",
						appState.currentItemBackgroundColor || "transparent",
					);
				}
			};
		}
	}, []);

	// Handle color change from picker
	const handleColorChange = useCallback(
		(color: string) => {
			const api = apiRef.current;
			if (!api) return;

			const colorProp = colorPicker.type === "stroke" ? "strokeColor" : "backgroundColor";
			const appStateProp =
				colorPicker.type === "stroke" ? "currentItemStrokeColor" : "currentItemBackgroundColor";

			// Set default for new elements
			api.updateScene({ appState: { [appStateProp]: color } });

			// Update selected elements (Excalidraw v0.18+ uses selectedElementIds in appState)
			const appState = api.getAppState();
			const selectedIds = appState.selectedElementIds || {};
			const elements = api.getSceneElements();
			const hasSelected = elements.some((el: any) => selectedIds[el.id]);

			if (hasSelected) {
				api.updateScene({
					elements: elements.map((el: any) =>
						selectedIds[el.id] ? { ...el, [colorProp]: color, version: (el.version || 0) + 1 } : el,
					),
				});
			}

			// Update toolbar swatch
			if (typeof window !== "undefined" && (window as any).__updateToolbarSwatch) {
				(window as any).__updateToolbarSwatch(colorPicker.type, color);
			}
		},
		[colorPicker.type],
	);

	// Handle image URL insertion
	const handleImageInsert = useCallback(async (url: string) => {
		const api = apiRef.current;
		if (!api) return;

		setImageDialog((prev) => ({ ...prev, loading: true, error: null }));

		try {
			// Validate URL format
			let fetchUrl = url;
			if (!url.startsWith("data:") && !url.startsWith("blob:")) {
				try {
					new URL(url);
				} catch {
					setImageDialog((prev) => ({
						...prev,
						loading: false,
						error: "URL invalida. Pega un link completo.",
					}));
					return;
				}
				fetchUrl = url;
			}

			// Fetch the image
			let blob: Blob;
			if (url.startsWith("data:")) {
				// Data URL: convert to blob
				const res = await fetch(url);
				if (!res.ok) throw new Error("Failed to convert data URL");
				blob = await res.blob();
			} else {
				const res = await fetch(fetchUrl, { mode: "cors" });
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				blob = await res.blob();
			}

			// Validate MIME type
			if (!blob.type.startsWith("image/")) {
				setImageDialog((prev) => ({
					...prev,
					loading: false,
					error: `No es una imagen valida (${blob.type || "tipo desconocido"}).`,
				}));
				return;
			}

			// Supported image types
			const supportedTypes = [
				"image/png",
				"image/jpeg",
				"image/gif",
				"image/svg+xml",
				"image/webp",
			];
			if (!supportedTypes.some((t) => blob.type.startsWith(t))) {
				setImageDialog((prev) => ({
					...prev,
					loading: false,
					error: `Formato no soportado: ${blob.type}. Usa PNG, JPG, GIF, SVG o WebP.`,
				}));
				return;
			}

			// Convert to data URL
			const dataURL = await new Promise<string>((resolve, reject) => {
				const reader = new FileReader();
				reader.onloadend = () => {
					if (typeof reader.result === "string") resolve(reader.result);
					else reject(new Error("No se pudo leer la imagen"));
				};
				reader.onerror = () => reject(new Error("Error al leer la imagen"));
				reader.readAsDataURL(blob);
			});

			// Get natural dimensions
			const img = await new Promise<HTMLImageElement>((resolve, reject) => {
				const image = new Image();
				image.onload = () => resolve(image);
				image.onerror = () => reject(new Error("No se pudo cargar la imagen"));
				image.src = dataURL;
			});

			// Scale down if too large (max 500px on longest side)
			let { width, height } = img;
			const maxDim = 500;
			if (width > maxDim || height > maxDim) {
				const scale = maxDim / Math.max(width, height);
				width = Math.round(width * scale);
				height = Math.round(height * scale);
			}

			// Find nearest image element to avoid overlap
			const elements = api.getSceneElements();
			const imageElements = elements.filter((el: any) => el.type === "image" && !el.isDeleted);

			let x = 100;
			let y = 100;

			if (imageElements.length > 0) {
				// Find the rightmost image and place new one to its right with gap
				const sorted = [...imageElements].sort((a: any, b: any) => a.x - b.x);
				const rightmost = sorted[sorted.length - 1];
				x = rightmost.x + rightmost.width + 20;
				y = rightmost.y;
			}

			// Create file ID and image element
			const fileId = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` as any;
			const elementId = `el-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

			const imageElement = {
				id: elementId,
				type: "image" as const,
				fileId,
				x,
				y,
				width,
				height,
				angle: 0,
				strokeColor: "transparent",
				backgroundColor: "transparent",
				fillStyle: "hachure" as const,
				strokeWidth: 1,
				strokeStyle: "solid" as const,
				roughness: 1,
				opacity: 100,
				groupIds: [],
				frameId: null,
				roundness: null,
				status: "saved" as const,
				scale: [1, 1] as [number, number],
				seed: Date.now(),
				version: 1,
				versionNonce: Date.now(),
				isDeleted: false,
				boundElements: null,
				updated: Date.now(),
				locked: false,
				link: null,
			};

			// Add file data and element
			api.addFiles([
				{
					id: fileId,
					dataURL,
					mimeType: blob.type,
					created: Date.now(),
					lastRetrieved: Date.now(),
				},
			]);

			api.updateScene({
				elements: [...elements, imageElement] as any,
			});

			// Scroll to the new image
			setTimeout(() => {
				api.scrollToContent([imageElement as any], {
					fitToViewport: true,
					viewportZoomFactor: 0.8,
				});
			}, 50);

			// Close dialog
			setImageDialog({ open: false, error: null, loading: false });
		} catch (err: any) {
			console.error("[ImageInsert] Failed:", err);
			setImageDialog((prev) => ({
				...prev,
				loading: false,
				error: err.message || "Error al insertar la imagen.",
			}));
		}
	}, []);

	// Notify page script on changes
	const handleChange = useCallback(
		(_elements: readonly any[], appState: Record<string, any>, _files: Record<string, any>) => {
			if (typeof window !== "undefined") {
				(window as any).__onExcalidrawChange?.();
				// Sync toolbar swatches when selection changes
				(window as any).__syncSwatchesFromSelection?.();
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
		<div className="excalidraw-wrapper relative">
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
			{/* Professional Color Picker Popup */}
			{colorPicker.open && (
				<div className="absolute left-[70px] top-[160px] z-50">
					<ColorPickerPopup
						type={colorPicker.type}
						initialColor={colorPicker.color}
						onColorChange={handleColorChange}
						onClose={() => setColorPicker((prev) => ({ ...prev, open: false }))}
					/>
				</div>
			)}
			{/* Image URL Dialog */}
			{imageDialog.open && (
				<div className="absolute left-[70px] top-[280px] z-50">
					<ImageUrlDialog
						onInsert={handleImageInsert}
						onClose={() => setImageDialog({ open: false, error: null, loading: false })}
						error={imageDialog.error}
						loading={imageDialog.loading}
					/>
				</div>
			)}
		</div>
	);
}

export type { ExcalidrawImperativeAPI };
