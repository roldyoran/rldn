import { useState, useEffect, useRef, useCallback } from "react";
import IconPhoto from "@tabler/icons/outline/photo.svg?react";

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
			className="relative z-50 w-[260px] max-w-[calc(100vw-2rem)] rounded-xl border border-[#373634] bg-[#232322] p-3 shadow-2xl sm:left-[50px]"
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
							<IconPhoto width={14} height={14} />
							Insertar
						</>
					)}
				</button>
			</form>
		</div>
	);
}
