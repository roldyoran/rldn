/**
 * Canvas Grab — App Component
 * Main popup component with minimalist design
 */

import React, { useState, useEffect, useCallback } from "react";
import type { Canvas, AppConfig } from "../utils/messages";
import { DEFAULT_BASE_URL } from "../utils/storage";
import { Header } from "./Header";
import { CanvasSelector } from "./CanvasSelector";
import { CaptureButton } from "./CaptureButton";
import { SettingsView } from "./SettingsView";
import { StatusIndicator } from "./StatusIndicator";

type ViewState = "main" | "settings";

interface State {
	view: ViewState;
	canvases: Canvas[];
	selectedCanvasId: string;
	isLoading: boolean;
	isConnected: boolean | null; // null = checking
	config: AppConfig;
	statusMessage: string;
	statusType: "success" | "error" | null;
}

export function App() {
	const [state, setState] = useState<State>({
		view: "main",
		canvases: [],
		selectedCanvasId: "",
		isLoading: true,
		isConnected: null,
		config: { apiKey: "", baseUrl: DEFAULT_BASE_URL },
		statusMessage: "",
		statusType: null,
	});

	// ── Init ────────────────────────────────────────

	useEffect(() => {
		init();
	}, []);

	const init = async () => {
		// Get config from background
		const config = await sendMessage<AppConfig>({ type: "GET_CONFIG" });
		setState((s) => ({ ...s, config }));

		if (!config.apiKey) {
			setState((s) => ({ ...s, view: "settings", isLoading: false }));
			return;
		}

		// Get cached connection status (instant, no network)
		const cached = await sendMessage<{ ok: boolean; cached: boolean }>({
			type: "CHECK_CONNECTION",
		});

		// Show cached status immediately — no "Verificando..." state
		setState((s) => ({ ...s, isConnected: cached.ok }));

		if (!cached.ok) {
			setState((s) => ({
				...s,
				isLoading: false,
				statusMessage: "No se pudo conectar al backend",
				statusType: "error",
			}));
			return;
		}

		// Load canvases
		await loadCanvases();

		// Background verify — update if status changed
		if (cached.cached) {
			const fresh = await sendMessage<{ ok: boolean }>({ type: "VERIFY_CONNECTION" });
			if (fresh.ok !== cached.ok) {
				setState((s) => ({ ...s, isConnected: fresh.ok }));
			}
		}
	};

	const loadCanvases = async (useCache = true) => {
		setState((s) => ({ ...s, isLoading: true }));

		const canvases = await sendMessage<Canvas[]>({ type: "GET_CANVASES" });

		setState((s) => ({
			...s,
			canvases,
			isLoading: false,
			selectedCanvasId: s.selectedCanvasId || (canvases.length > 0 ? canvases[0].id : ""),
		}));
	};

	// ── Handlers ────────────────────────────────────

	const handleRefresh = useCallback(async () => {
		await sendMessage({ type: "INVALIDATE_CACHE" });
		await loadCanvases(false);
	}, []);

	const handleCapture = useCallback(() => {
		const { selectedCanvasId } = state;
		if (!selectedCanvasId) {
			showStatus("Selecciona un lienzo primero", "error");
			return;
		}

		browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
			if (!tabs?.[0]) {
				showStatus("No hay pestaña activa", "error");
				return;
			}

			browser.runtime.sendMessage({
				type: "START_CAPTURE",
				tabId: tabs[0].id,
				canvasId: selectedCanvasId,
			});

			window.close();
		});
	}, [state.selectedCanvasId]);

	const handleSaveConfig = useCallback(async (apiKey: string, baseUrl: string) => {
		await sendMessage({ type: "SAVE_CONFIG", apiKey, baseUrl });

		const conn = await sendMessage<{ ok: boolean }>({ type: "VERIFY_CONNECTION" });
		setState((s) => ({ ...s, isConnected: conn.ok }));

		if (!conn.ok) {
			showStatus("No se pudo conectar con esa URL", "error");
			return;
		}

		setState((s) => ({
			...s,
			config: { apiKey, baseUrl },
			view: "main",
		}));

		await loadCanvases(false);
		showStatus("Configuración guardada", "success");
	}, []);

	const handleOpenDashboard = useCallback(() => {
		const url = state.config.baseUrl || DEFAULT_BASE_URL;
		browser.tabs.create({ url: `${url}/dashboard` });
	}, [state.config.baseUrl]);

	// ── Helpers ─────────────────────────────────────

	const showStatus = (message: string, type: "success" | "error") => {
		setState((s) => ({ ...s, statusMessage: message, statusType: type }));
		setTimeout(() => {
			setState((s) => ({ ...s, statusMessage: "", statusType: null }));
		}, 3000);
	};

	// ── Render ──────────────────────────────────────

	if (state.view === "settings") {
		return (
			<SettingsView
				initialApiKey={state.config.apiKey}
				initialBaseUrl={state.config.baseUrl}
				onSave={handleSaveConfig}
				onBack={
					state.config.apiKey
						? () => setState((s) => ({ ...s, view: "main" }))
						: undefined
				}
			/>
		);
	}

	return (
		<div>
			<Header
				onRefresh={handleRefresh}
				onSettings={() => setState((s) => ({ ...s, view: "settings" }))}
			/>

			<div className="section">
				<StatusIndicator isConnected={state.isConnected} />
				<label className="label">Lienzo</label>
				{state.isLoading ? (
					<div className="skeleton" />
				) : (
					<CanvasSelector
						canvases={state.canvases}
						selectedId={state.selectedCanvasId}
						onChange={(id) => setState((s) => ({ ...s, selectedCanvasId: id }))}
					/>
				)}
			</div>

			<div className="section">
				<CaptureButton
					onClick={handleCapture}
					disabled={!state.selectedCanvasId || state.isLoading}
				/>
			</div>

			{state.statusMessage && (
				<div className={`status ${state.statusType}`}>
					{state.statusMessage}
				</div>
			)}

			<footer className="footer">
				<a
					href="#"
					className="footer-link"
					onClick={(e) => {
						e.preventDefault();
						handleOpenDashboard();
					}}
				>
					Abrir dashboard
				</a>
			</footer>
		</div>
	);
}

// ── Message helper ──────────────────────────────────

function sendMessage<T>(msg: Record<string, unknown>): Promise<T> {
	return browser.runtime.sendMessage(msg);
}
