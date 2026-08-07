/**
 * Canvas Grab — API helpers
 * Typed fetch wrappers for the backend
 */

import type { Canvas } from "./messages";
import { getConfig } from "./storage";

export async function apiFetch(
	path: string,
	options: RequestInit = {},
): Promise<Response> {
	const config = await getConfig();
	const url = config.baseUrl + path;
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		...(options.headers as Record<string, string>),
	};
	if (config.apiKey) {
		headers["x-api-key"] = config.apiKey;
	}
	return fetch(url, { ...options, headers });
}

export async function listCanvases(): Promise<Canvas[]> {
	const res = await apiFetch("/api/canvases");
	if (!res.ok) throw new Error("Error " + res.status);
	return res.json();
}

export async function saveImage(
	canvasId: string,
	data: { url: string; name: string; width: number | null; height: number | null },
): Promise<void> {
	const res = await apiFetch(`/api/canvases/${canvasId}/images`, {
		method: "POST",
		body: JSON.stringify({
			url: data.url,
			name: data.name,
			width: data.width,
			height: data.height,
		}),
	});
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(body.error || "Error " + res.status);
	}
}

export async function getCanvasName(canvasId: string): Promise<string> {
	try {
		const res = await apiFetch(`/api/canvases/${canvasId}`);
		if (res.ok) {
			const d = await res.json();
			return d.name || "Sin título";
		}
	} catch {}
	return "";
}

export async function checkConnection(): Promise<boolean> {
	try {
		const res = await apiFetch("/api/canvases");
		return res.ok;
	} catch {
		return false;
	}
}
