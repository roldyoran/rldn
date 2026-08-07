import { useEffect, useRef, useCallback, useState, forwardRef, useImperativeHandle } from "react";
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
				// Replace grid grey colors with subtle transparent
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

export interface ExcalidrawEditorHandle {
	getAPI: () => ExcalidrawImperativeAPI | null;
	openColorPicker: (type: "stroke" | "bg") => void;
	closeColorPicker: () => void;
	openImageDialog: () => void;
	closeImageDialog: () => void;
}

export interface ExcalidrawEditorProps {
	canvasId: string;
	initialStoreData?: string | null;
	onAPIReady?: (api: ExcalidrawImperativeAPI) => void;
	onChange?: () => void;
	viewModeEnabled?: boolean;
}

export const ExcalidrawEditor = forwardRef<ExcalidrawEditorHandle, ExcalidrawEditorProps>(
	function ExcalidrawEditor(
		{ canvasId, initialStoreData, onAPIReady, onChange, viewModeEnabled = false },
		ref,
	) {
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

		// Expose imperative handle
		useImperativeHandle(
			ref,
			() => ({
				getAPI: () => apiRef.current,
				openColorPicker: (type: "stroke" | "bg") => {
					const appState = apiRef.current?.getAppState();
					const color =
						type === "stroke"
							? appState?.currentItemStrokeColor || "#ffffff"
							: appState?.currentItemBackgroundColor || "transparent";
					setColorPicker({ open: true, type, color });
				},
				closeColorPicker: () => setColorPicker((prev) => ({ ...prev, open: false })),
				openImageDialog: () => setImageDialog({ open: true, error: null, loading: false }),
				closeImageDialog: () => setImageDialog({ open: false, error: null, loading: false }),
			}),
			[],
		);

		// Parse storeData from prop (fetched by parent) instead of fetching independently
		useEffect(() => {
			if (initialStoreData === undefined) return; // still loading in parent
			if (initialStoreData === null) {
				// New canvas with no data
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
				setLoading(false);
				return;
			}

			try {
				const parsed = JSON.parse(initialStoreData);
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
			setLoading(false);
		}, [initialStoreData]);

		// Expose API to parent
		const handleAPI = useCallback(
			(apiInstance: ExcalidrawImperativeAPI) => {
				apiRef.current = apiInstance;
				onAPIReady?.(apiInstance);
			},
			[onAPIReady],
		);

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

				// Update selected elements
				const appState = api.getAppState();
				const selectedIds = appState.selectedElementIds || {};
				const elements = api.getSceneElements();
				const hasSelected = elements.some((el: any) => selectedIds[el.id]);

				if (hasSelected) {
					api.updateScene({
						elements: elements.map((el: any) =>
							selectedIds[el.id]
								? { ...el, [colorProp]: color, version: (el.version || 0) + 1 }
								: el,
						),
					});
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
					const res = await fetch(url);
					if (!res.ok) throw new Error("Failed to convert data URL");
					blob = await res.blob();
				} else if (url.startsWith("blob:")) {
					const res = await fetch(url);
					if (!res.ok) throw new Error("Failed to fetch blob URL");
					blob = await res.blob();
				} else {
					// Use server-side proxy to bypass CORS
					const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(fetchUrl)}`;
					const res = await fetch(proxyUrl, { credentials: "include" });
					if (!res.ok) {
						const errData = await res.json().catch(() => null);
						throw new Error(errData?.error || `HTTP ${res.status}`);
					}
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

				// Save image URL to database for future export
				fetch(`/api/canvases/${canvasId}/images`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					credentials: "include",
					body: JSON.stringify({
						url,
						name: url,
						width: img.naturalWidth,
						height: img.naturalHeight,
						positionX: x,
						positionY: y,
					}),
				}).catch((err) => console.error("[ImageInsert] Failed to save image to DB:", err));

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

		// Notify parent on changes
		const handleChange = useCallback(
			(_elements: readonly any[], _appState: Record<string, any>, _files: Record<string, any>) => {
				onChange?.();
			},
			[onChange],
		);

		if (loading || !initialData) {
			return (
				<div
					className="excalidraw-wrapper"
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						background: "#1b1b1a",
					}}
				>
					<div className="loader-canvas">
						<svg
							viewBox="0 0 48 48"
							fill="none"
							stroke="#928f89"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
							style={{ width: 48, height: 48 }}
						>
							<rect x="6" y="6" width="36" height="36" rx="4" className="loader-border" />
							<circle cx="15" cy="15" r="2" className="loader-dot-1" />
							<polyline points="30 20 22 28 14 36" className="loader-stroke" />
						</svg>
					</div>
					<span
						className="loader-text"
						style={{ color: "#928f89", fontSize: "14px", marginTop: 16 }}
					>
						Cargando lienzo...
					</span>
					<style>{`
						.loader-canvas { animation: loader-float 2s ease-in-out infinite; }
						.loader-border {
							stroke-dasharray: 144;
							stroke-dashoffset: 144;
							animation: loader-draw 1.8s ease-in-out infinite;
						}
						.loader-dot-1 { animation: loader-pulse 1.4s ease-in-out infinite; }
						.loader-stroke {
							stroke-dasharray: 40;
							stroke-dashoffset: 40;
							animation: loader-draw 1.8s ease-in-out 0.3s infinite;
						}
						.loader-text { animation: loader-fade 1.4s ease-in-out infinite alternate; }
						@keyframes loader-float {
							0%, 100% { transform: translateY(0); }
							50% { transform: translateY(-4px); }
						}
						@keyframes loader-draw {
							0% { stroke-dashoffset: 144; opacity: 0.3; }
							50% { stroke-dashoffset: 0; opacity: 1; }
							100% { stroke-dashoffset: -144; opacity: 0.3; }
						}
						@keyframes loader-pulse {
							0%, 100% { opacity: 0.3; }
							50% { opacity: 1; }
						}
						@keyframes loader-fade {
							0% { opacity: 0.4; }
							100% { opacity: 1; }
						}
					`}</style>
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
				{/* Color Picker Popup */}
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
	},
);

export type { ExcalidrawImperativeAPI };
