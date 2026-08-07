/**
 * Canvas Grab — Settings View Component
 */

import React, { useState } from "react";
import { DEFAULT_BASE_URL } from "../utils/storage";

interface SettingsViewProps {
	initialApiKey: string;
	initialBaseUrl: string;
	onSave: (apiKey: string, baseUrl: string) => void;
	onBack?: () => void;
}

export function SettingsView({
	initialApiKey,
	initialBaseUrl,
	onSave,
	onBack,
}: SettingsViewProps) {
	const [apiKey, setApiKey] = useState(initialApiKey);
	const [baseUrl, setBaseUrl] = useState(initialBaseUrl || DEFAULT_BASE_URL);
	const [error, setError] = useState("");

	const handleSave = () => {
		if (!apiKey.trim()) {
			setError("Ingresa una API key");
			return;
		}
		onSave(apiKey.trim(), baseUrl.trim());
	};

	return (
		<div>
			<header className="header">
				<div className="header-left">
					{onBack && (
						<button className="icon-btn" title="Volver" onClick={onBack}>
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
								<polyline points="15 18 9 12 15 6" />
							</svg>
						</button>
					)}
					<span className="header-title">Configuración</span>
				</div>
			</header>

			<div className="section">
				<label className="label" htmlFor="input-api-key">
					API Key
				</label>
				<input
					id="input-api-key"
					type="password"
					className="input mono"
					placeholder="rldn_..."
					spellCheck={false}
					autoComplete="off"
					value={apiKey}
					onChange={(e) => setApiKey(e.target.value)}
				/>
				<p className="hint">Créala en tu dashboard → API Keys</p>
			</div>

			<div className="section">
				<label className="label" htmlFor="input-base-url">
					Backend URL
				</label>
				<input
					id="input-base-url"
					type="url"
					className="input mono"
					placeholder="http://localhost:4321"
					spellCheck={false}
					value={baseUrl}
					onChange={(e) => setBaseUrl(e.target.value)}
				/>
			</div>

			<div className="section">
				<button className="btn-primary" onClick={handleSave}>
					Guardar
				</button>
			</div>

			{error && <div className="status error">{error}</div>}
		</div>
	);
}
