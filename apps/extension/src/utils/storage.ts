/**
 * Canvas Grab — Storage wrapper
 * Type-safe storage using browser.storage.local
 */

import type { AppConfig, Canvas } from "./messages";

const DEFAULT_BASE_URL = "http://localhost:4321";

export { DEFAULT_BASE_URL };

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ── Config ──────────────────────────────────────────

export async function getConfig(): Promise<AppConfig> {
	const data = (await browser.storage.local.get(["apiKey", "baseUrl"])) as Record<string, string>;
	return {
		apiKey: data.apiKey || "",
		baseUrl: data.baseUrl || DEFAULT_BASE_URL,
	};
}

export async function setConfig(apiKey: string, baseUrl: string): Promise<void> {
	await browser.storage.local.set({
		apiKey,
		baseUrl: baseUrl || DEFAULT_BASE_URL,
	});
}

export async function hasApiKey(): Promise<boolean> {
	const config = await getConfig();
	return config.apiKey.length > 0;
}

// ── Canvas Cache ────────────────────────────────────

interface CanvasCache {
	canvases: Canvas[];
	timestamp: number;
}

export async function getCachedCanvases(): Promise<Canvas[] | null> {
	const data = (await browser.storage.local.get("canvasCache")) as {
		canvasCache?: CanvasCache;
	};
	const cache = data.canvasCache;
	if (!cache) return null;

	const age = Date.now() - cache.timestamp;
	if (age > CACHE_TTL) return null;

	return cache.canvases;
}

export async function setCachedCanvases(canvases: Canvas[]): Promise<void> {
	const cache: CanvasCache = { canvases, timestamp: Date.now() };
	await browser.storage.local.set({ canvasCache: cache });
}

export async function invalidateCanvasCache(): Promise<void> {
	await browser.storage.local.remove("canvasCache");
}

// ── Connection Cache ─────────────────────────────────

const CONNECTION_TTL = 2 * 60 * 1000; // 2 minutes

interface ConnectionCache {
	connected: boolean;
	timestamp: number;
}

export async function getCachedConnection(): Promise<boolean | null> {
	const data = (await browser.storage.local.get("connectionCache")) as {
		connectionCache?: ConnectionCache;
	};
	const cache = data.connectionCache;
	if (!cache) return null;

	const age = Date.now() - cache.timestamp;
	if (age > CONNECTION_TTL) return null;

	return cache.connected;
}

export async function setCachedConnection(connected: boolean): Promise<void> {
	const cache: ConnectionCache = { connected, timestamp: Date.now() };
	await browser.storage.local.set({ connectionCache: cache });
}

// ── Active Canvas ───────────────────────────────────

export async function getActiveCanvasId(): Promise<string | null> {
	const data = (await browser.storage.local.get("activeCanvasId")) as Record<string, string>;
	return data.activeCanvasId || null;
}

export async function setActiveCanvasId(canvasId: string): Promise<void> {
	await browser.storage.local.set({ activeCanvasId: canvasId });
}
