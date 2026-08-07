/**
 * Canvas Grab — Status Indicator Component
 * Shows connection status with a colored dot
 */

import React from "react";

interface StatusIndicatorProps {
	isConnected: boolean | null;
}

export function StatusIndicator({ isConnected }: StatusIndicatorProps) {
	if (isConnected === null) {
		return (
			<div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
				<span className="connection-dot checking" />
				<span style={{ fontSize: 11, color: "var(--muted)" }}>Verificando conexión...</span>
			</div>
		);
	}

	return (
		<div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
			<span className={`connection-dot ${isConnected ? "connected" : "disconnected"}`} />
			<span style={{ fontSize: 11, color: "var(--muted)" }}>
				{isConnected ? "Conectado" : "Backend no disponible"}
			</span>
		</div>
	);
}
