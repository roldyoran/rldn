import { useState, useEffect, useCallback, useRef } from "react";
import { HexColorPicker, HexColorInput } from "react-colorful";

const PRESET_STROKE_COLORS = [
	"#ffffff",
	"#ff6b6b",
	"#ffa94d",
	"#ffd43b",
	"#69db7c",
	"#4dabf7",
	"#b197fc",
	"#f783ac",
	"#928f89",
	"#1e1e1e",
];

const PRESET_BG_COLORS = [
	"transparent",
	"#ffffff",
	"#ff6b6b",
	"#ffa94d",
	"#ffd43b",
	"#69db7c",
	"#4dabf7",
	"#b197fc",
	"#f783ac",
];

interface ColorPickerPopupProps {
	type: "stroke" | "bg";
	onColorChange: (color: string) => void;
	onClose: () => void;
	initialColor: string;
}

export function ColorPickerPopup({
	type,
	onColorChange,
	onClose,
	initialColor,
}: ColorPickerPopupProps) {
	const [color, setColor] = useState(initialColor);
	const popupRef = useRef<HTMLDivElement>(null);

	const handleChange = useCallback(
		(newColor: string) => {
			setColor(newColor);
			onColorChange(newColor);
		},
		[onColorChange],
	);

	const handlePresetClick = useCallback(
		(presetColor: string) => {
			setColor(presetColor);
			onColorChange(presetColor);
		},
		[onColorChange],
	);

	// Close on click outside
	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
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

	const presets = type === "stroke" ? PRESET_STROKE_COLORS : PRESET_BG_COLORS;

	return (
		<div
			ref={popupRef}
			className="absolute left-[50px] z-50 rounded-xl border border-[#373634] bg-[#232322] p-3 shadow-2xl"
			style={{ top: 0 }}
		>
			<div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#928f89]">
				{type === "stroke" ? "Color de trazo" : "Color de relleno"}
			</div>

			{/* Color Picker */}
			<div className="mb-3 [&_.react-colorful]:h-[140px] [&_.react-colorful]:w-[180px] [&_.react-colorful]:rounded-lg [&_.react-colorful__saturation]:rounded-t-lg [&_.react-colorful__hue]:h-[14px] [&_.react-colorful__hue]:rounded-b-lg">
				<HexColorPicker
					color={color === "transparent" ? "#ffffff" : color}
					onChange={handleChange}
				/>
			</div>

			{/* Hex Input */}
			<div className="mb-2 flex items-center gap-1.5">
				<div
					className="h-[22px] w-[22px] shrink-0 rounded border border-[#373634]"
					style={{
						background:
							color === "transparent"
								? "repeating-conic-gradient(#373634 0% 25%, #1b1b1a 0% 50%) 50% / 8px 8px"
								: color,
					}}
				/>
				<div className="flex items-center gap-0.5 rounded border border-[#373634] bg-[#1b1b1a] px-1.5">
					<span className="text-[10px] text-[#928f89]">#</span>
					<HexColorInput
						color={color === "transparent" ? "ffffff" : color}
						onChange={handleChange}
						className="w-[60px] bg-transparent text-[11px] text-[#eae8e4] outline-none uppercase"
						prefixed={false}
					/>
				</div>
			</div>

			{/* Presets */}
			<div className="flex flex-wrap gap-1">
				{presets.map((presetColor) => (
					<button
						key={presetColor}
						onClick={() => handlePresetClick(presetColor)}
						className="h-[18px] w-[18px] rounded border border-[#4a4846] transition-transform hover:scale-125"
						style={{
							background:
								presetColor === "transparent"
									? "repeating-conic-gradient(#373634 0% 25%, #1b1b1a 0% 50%) 50% / 6px 6px"
									: presetColor,
						}}
						title={presetColor === "transparent" ? "Sin relleno" : presetColor}
					/>
				))}
			</div>
		</div>
	);
}
