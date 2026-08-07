/**
 * Canvas Grab — Message types for inter-context communication
 * Typed message passing between popup, background, and content script
 */

// ── Popup → Background ──────────────────────────────

export interface StartCaptureMessage {
	type: "START_CAPTURE";
	tabId: number;
	canvasId: string;
}

// ── Content Script → Background ─────────────────────

export interface ImageCapturedMessage {
	type: "IMAGE_CAPTURED";
	imageData: ImageData;
}

// ── Background → Content Script ─────────────────────

export interface ActivateCaptureMessage {
	type: "ACTIVATE_CAPTURE";
}

export interface DeactivateCaptureMessage {
	type: "DEACTIVATE_CAPTURE";
}

// ── Background → Popup ──────────────────────────────

export interface CaptureSuccessMessage {
	type: "CAPTURE_SUCCESS";
	imageName: string;
	canvasName: string;
}

// ── Shared Types ────────────────────────────────────

export interface ImageData {
	url: string;
	name: string;
	width: number | null;
	height: number | null;
}

export interface Canvas {
	id: string;
	name: string;
	description: string | null;
	createdAt: number;
	updatedAt: number;
	elementCount?: number;
	imageCount?: number;
}

export interface AppConfig {
	apiKey: string;
	baseUrl: string;
}

export type Message =
	| StartCaptureMessage
	| ImageCapturedMessage
	| ActivateCaptureMessage
	| DeactivateCaptureMessage
	| CaptureSuccessMessage;
