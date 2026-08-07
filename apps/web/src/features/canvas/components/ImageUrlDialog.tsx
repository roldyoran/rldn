import { useState, useEffect, useRef, useCallback } from "react";

interface ImageUrlDialogProps {
	onInsert: (url: string) => void;
	onClose: () => void;
	error: string | null;
	loading: boolean;
}

export function ImageUrlDialog({ onInsert, onClose, error, loading }: ImageUrlDialogProps) {
	const [url, setUrl] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);
	const dialogRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	// Close on click outside
	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
				onClose();
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [onClose]);

	// Close on Escape
	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
		}
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [onClose]);

	const handleSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();
			const trimmed = url.trim();
			if (trimmed) {
				onInsert(trimmed);
			}
		},
		[url, onInsert],
	);

	return (
		<div
			ref={dialogRef}
			className="absolute left-[50px] z-50 w-[260px] rounded-xl border border-[#373634] bg-[#232322] p-3 shadow-2xl"
			style={{ top: 0 }}
		>
			<div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#928f89]">
				Insertar imagen
			</div>

			<form onSubmit={handleSubmit}>
				<input
					ref={inputRef}
					type="text"
					value={url}
					onChange={(e) => setUrl(e.target.value)}
					placeholder="Pega un link de imagen..."
					className="mb-2 w-full rounded-lg border border-[#373634] bg-[#1b1b1a] px-2.5 py-1.5 text-xs text-[#eae8e4] outline-none placeholder:text-[#5a5856] focus:border-[#928f89]"
					disabled={loading}
				/>

				{error && (
					<div className="mb-2 rounded-md border border-[#ff6b6b33] bg-[#ff6b6b11] px-2 py-1.5 text-[11px] text-[#ff6b6b]">
						{error}
					</div>
				)}

				<button
					type="submit"
					disabled={loading || !url.trim()}
					className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#373634] bg-[#2a2926] px-3 py-1.5 text-xs text-[#eae8e4] transition-colors hover:bg-[#373634] disabled:cursor-not-allowed disabled:opacity-40"
				>
					{loading ? (
						<>
							<span className="inline-block h-3 w-3 rounded-full border-2 border-[#928f89] border-t-transparent animate-[save-spin_0.6s_linear_infinite]" />
							Cargando...
						</>
					) : (
						<>
							<svg
								className="h-3.5 w-3.5"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
								<circle cx="8.5" cy="8.5" r="1.5" />
								<polyline points="21 15 16 10 5 21" />
							</svg>
							Insertar
						</>
					)}
				</button>
			</form>
		</div>
	);
}
