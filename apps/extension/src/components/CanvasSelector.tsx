/**
 * Canvas Grab — Canvas Selector Component
 */

import React from "react";
import type { Canvas } from "../utils/messages";

interface CanvasSelectorProps {
	canvases: Canvas[];
	selectedId: string;
	onChange: (id: string) => void;
}

export function CanvasSelector({ canvases, selectedId, onChange }: CanvasSelectorProps) {
	if (canvases.length === 0) {
		return (
			<div className="select-wrapper">
				<select className="select" disabled>
					<option value="">No hay lienzos</option>
				</select>
			</div>
		);
	}

	return (
		<div className="select-wrapper">
			<select
				className="select"
				value={selectedId}
				onChange={(e) => onChange(e.target.value)}
			>
				<option value="">Seleccionar lienzo...</option>
				{canvases.map((c) => (
					<option key={c.id} value={c.id}>
						{c.name || "Sin título"}
						{c.imageCount ? ` (${c.imageCount})` : ""}
					</option>
				))}
			</select>
			<div className="select-arrow">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
					<polyline points="6 9 12 15 18 9" />
				</svg>
			</div>
		</div>
	);
}
