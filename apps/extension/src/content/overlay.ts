/**
 * Canvas Grab — Overlay UI
 * Dark overlay, badge with image counter, and toast notifications
 */

// ── Overlay ─────────────────────────────────────────

let overlay: HTMLDivElement | null = null;

export function createOverlay(): void {
	if (overlay) return;
	overlay = document.createElement("div");
	overlay.id = "cg-overlay";
	document.body.appendChild(overlay);
}

export function removeOverlay(): void {
	overlay?.remove();
	overlay = null;
}

// ── Badge ───────────────────────────────────────────

let badge: HTMLDivElement | null = null;
let badgeDot: HTMLSpanElement | null = null;
let badgeText: HTMLSpanElement | null = null;

export function createBadge(imageCount: number = 0): void {
	if (badge) return;

	badge = document.createElement("div");
	badge.id = "cg-badge";

	badgeDot = document.createElement("span");
	badgeDot.className = "cg-badge-dot";

	badgeText = document.createElement("span");
	badgeText.textContent = formatBadgeText(imageCount);

	const esc = document.createElement("span");
	esc.className = "cg-badge-esc";
	esc.textContent = "ESC";

	badge.appendChild(badgeDot);
	badge.appendChild(badgeText);
	badge.appendChild(esc);
	document.body.appendChild(badge);
}

export function updateBadgeCount(count: number): void {
	if (badgeText) {
		badgeText.textContent = formatBadgeText(count);
	}
}

export function setBadgeState(state: "scanning" | "ready" | "saving"): void {
	if (!badgeDot) return;
	badgeDot.className = "cg-badge-dot";
	if (state === "scanning") {
		badgeDot.classList.add("cg-dot-scanning");
	} else if (state === "ready") {
		badgeDot.classList.add("cg-dot-ready");
	} else if (state === "saving") {
		badgeDot.classList.add("cg-dot-saving");
	}
}

export function removeBadge(): void {
	badge?.remove();
	badge = null;
	badgeDot = null;
	badgeText = null;
}

function formatBadgeText(count: number): string {
	if (count === 0) return "Escaneando imágenes...";
	if (count === 1) return "1 imagen detectada — Selecciona una";
	return `${count} imágenes detectadas — Selecciona una`;
}

// ── Toast ───────────────────────────────────────────

type ToastVariant = "success" | "error" | "info";

interface ToastOptions {
	text: string;
	variant: ToastVariant;
	duration?: number;
	x?: number;
	y?: number;
}

const toastContainer = (() => {
	const c = document.createElement("div");
	c.id = "cg-toast-container";
	document.documentElement.appendChild(c);
	return c;
})();

export function showToast(options: ToastOptions): void {
	const { text, variant, duration = 2000, x, y } = options;

	const toast = document.createElement("div");
	toast.className = `cg-toast cg-toast-${variant}`;

	const icon = document.createElement("span");
	icon.className = "cg-toast-icon";
	icon.textContent = variant === "success" ? "✓" : variant === "error" ? "✕" : "ℹ";

	const msg = document.createElement("span");
	msg.className = "cg-toast-msg";
	msg.textContent = text;

	toast.appendChild(icon);
	toast.appendChild(msg);

	// Position
	if (x !== undefined && y !== undefined) {
		toast.style.left = `${x}px`;
		toast.style.top = `${y}px`;
		toast.style.transform = "translateY(-50%)";
	} else {
		// Center bottom of viewport
		toast.style.left = "50%";
		toast.style.bottom = "24px";
		toast.style.transform = "translateX(-50%)";
	}

	toast.style.opacity = "0";
	toastContainer.appendChild(toast);

	// Trigger animation
	requestAnimationFrame(() => {
		toast.style.transition = "opacity 0.25s ease, transform 0.3s cubic-bezier(0.16,1,0.3,1)";
		toast.style.opacity = "1";
		if (x !== undefined && y !== undefined) {
			toast.style.transform = "translateY(-50%) translateX(0)";
		} else {
			toast.style.transform = "translateX(-50%) translateY(0)";
		}
	});

	// Auto dismiss
	setTimeout(() => {
		toast.style.opacity = "0";
		if (x !== undefined && y !== undefined) {
			toast.style.transform = "translateY(-50%) translateX(8px)";
		} else {
			toast.style.transform = "translateX(-50%) translateY(8px)";
		}
		setTimeout(() => toast.remove(), 300);
	}, duration);
}

// ── Styles ──────────────────────────────────────────

let stylesInjected = false;

export function injectStyles(): void {
	if (stylesInjected) return;
	stylesInjected = true;

	const style = document.createElement("style");
	style.id = "canvas-grab-css";
	style.textContent = `
		/* ── Animations ── */
		@keyframes cg-fadeIn {
			from { opacity: 0; transform: translateY(-10px) scale(0.95); }
			to { opacity: 1; transform: translateY(0) scale(1); }
		}
		@keyframes cg-overlayIn {
			from { opacity: 0; }
			to { opacity: 1; }
		}
		@keyframes cg-pulse {
			0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); }
			50% { box-shadow: 0 0 0 8px rgba(59,130,246,0.15); }
		}

		/* ── Overlay ── */
		#cg-overlay {
			position: fixed; inset: 0;
			background: rgba(0,0,0,0.55);
			z-index: 2147483645;
			pointer-events: none;
			animation: cg-overlayIn 0.25s ease;
		}

		/* ── Badge ── */
		#cg-badge {
			position: fixed; top: 20px; left: 50%;
			transform: translateX(-50%);
			z-index: 2147483647;
			background: #111110; color: #eae8e4;
			padding: 12px 20px; border-radius: 14px;
			font-family: 'Space Grotesk', -apple-system, 'Segoe UI', system-ui, sans-serif;
			font-size: 14px; font-weight: 600;
			box-shadow: 0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06);
			pointer-events: none;
			display: flex; align-items: center; gap: 12px;
			animation: cg-fadeIn 0.3s cubic-bezier(0.16,1,0.3,1);
		}
		.cg-badge-dot {
			width: 8px; height: 8px; border-radius: 50%;
			background: #3b82f6;
			animation: cg-pulse 2s ease-in-out infinite;
		}
		.cg-dot-scanning { background: #3b82f6; }
		.cg-dot-ready { background: #22c55e; }
		.cg-dot-saving { background: #eab308; }
		.cg-badge-esc {
			color: #6b7280; font-size: 11px; font-weight: 500;
			background: rgba(255,255,255,0.06);
			padding: 3px 8px; border-radius: 6px; margin-left: 4px;
		}

		/* ── Image highlights ── */
		.cg-img {
			position: relative !important; z-index: 2147483646 !important;
			cursor: pointer !important; border-radius: 6px;
			transition: all 0.2s cubic-bezier(0.16,1,0.3,1) !important;
		}
		.cg-img.cg-hover {
			outline: 3px solid #3b82f6 !important; outline-offset: 3px !important;
			filter: brightness(1.08) !important; transform: scale(1.02);
			box-shadow: 0 0 0 6px rgba(59,130,246,0.15), 0 8px 32px rgba(0,0,0,0.3) !important;
		}
		.cg-img.cg-success {
			outline: 3px solid #22c55e !important; outline-offset: 3px !important;
			filter: brightness(1.05) !important;
			box-shadow: 0 0 0 6px rgba(34,197,94,0.2), 0 8px 32px rgba(0,0,0,0.3) !important;
		}
		.cg-bg {
			position: relative !important; z-index: 2147483646 !important;
			cursor: pointer !important; border-radius: 8px;
			transition: all 0.2s cubic-bezier(0.16,1,0.3,1) !important;
		}
		.cg-bg.cg-hover {
			outline: 3px solid #3b82f6 !important; outline-offset: 3px !important;
			box-shadow: 0 0 0 6px rgba(59,130,246,0.15), 0 8px 32px rgba(0,0,0,0.3) !important;
			transform: scale(1.01);
		}
		.cg-bg.cg-success {
			outline: 3px solid #22c55e !important; outline-offset: 3px !important;
			box-shadow: 0 0 0 6px rgba(34,197,94,0.2), 0 8px 32px rgba(0,0,0,0.3) !important;
		}

		/* ── Toast ── */
		#cg-toast-container {
			position: fixed; inset: 0;
			pointer-events: none; z-index: 2147483647;
		}
		.cg-toast {
			position: absolute; display: inline-flex; align-items: center; gap: 10px;
			padding: 14px 24px; border-radius: 14px;
			font-family: 'Space Grotesk', -apple-system, 'Segoe UI', system-ui, sans-serif;
			font-size: 15px; font-weight: 600;
			pointer-events: none; white-space: nowrap;
			backdrop-filter: blur(12px);
			animation: cg-fadeIn 0.2s cubic-bezier(0.16,1,0.3,1);
		}
		.cg-toast-icon { font-size: 16px; }
		.cg-toast-success {
			background: rgba(17,17,16,0.95); color: #bbf7d0;
			border: 1px solid rgba(34,197,94,0.3);
			box-shadow: 0 12px 48px rgba(0,0,0,0.5);
		}
		.cg-toast-success .cg-toast-icon { color: #22c55e; }
		.cg-toast-error {
			background: rgba(127,29,29,0.92); color: #fca5a5;
			border: 1px solid rgba(239,68,68,0.4);
			box-shadow: 0 12px 48px rgba(0,0,0,0.5);
		}
		.cg-toast-info {
			background: rgba(17,17,16,0.92); color: #eae8e4;
			border: 1px solid rgba(255,255,255,0.08);
			box-shadow: 0 12px 48px rgba(0,0,0,0.5);
		}
	`;
	document.head.appendChild(style);
}

export function removeStyles(): void {
	document.getElementById("canvas-grab-css")?.remove();
	stylesInjected = false;
}
