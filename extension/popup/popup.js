/**
 * Canvas Grab - Popup Script
 * Manages UI state, canvas list, and capture mode
 */

// Firefox/Zen compat
var api = (typeof chrome !== "undefined" && chrome.runtime) ? chrome : (typeof browser !== "undefined" ? browser : null);

// ── DOM Elements ──────────────────────────────────────

var viewMain = document.getElementById("view-main");
var viewSettings = document.getElementById("view-settings");
var btnSettings = document.getElementById("btn-settings");
var btnRefresh = document.getElementById("btn-refresh");
var btnBack = document.getElementById("btn-back");
var canvasSelect = document.getElementById("canvas-select");
var btnCapture = document.getElementById("btn-capture");
var statusEl = document.getElementById("status");
var configStatusEl = document.getElementById("config-status");
var inputApiKey = document.getElementById("input-api-key");
var inputBaseUrl = document.getElementById("input-base-url");
var btnSaveConfig = document.getElementById("btn-save-config");
var linkDashboard = document.getElementById("link-dashboard");

// ── Init ──────────────────────────────────────────────

function init() {
	getConfig().then(function (config) {
		inputApiKey.value = config.apiKey || "";
		inputBaseUrl.value = config.baseUrl || "http://localhost:4321";

		bindEvents();

		if (!config.apiKey) {
			viewMain.classList.add("hidden");
			viewSettings.classList.remove("hidden");
			return;
		}

		btnCapture.disabled = false;
		loadCanvases(true);
	});
}

// ── Canvases (with cache) ─────────────────────────────

function loadCanvases(useCache) {
	getConfig().then(function (config) {
		if (!config.apiKey) {
			canvasSelect.innerHTML = '<option value="">Configura tu API key primero</option>';
			return;
		}

		// Try loading from cache first
		if (useCache) {
			api.storage.local.get(["canvasCache", "canvasCacheTime"]).then(function (data) {
				var cached = data.canvasCache;
				var cacheTime = data.canvasCacheTime || 0;
				var age = Date.now() - cacheTime;

				// Cache valid for 5 minutes
				if (cached && cached.length > 0 && age < 300000) {
					renderCanvases(cached);
					return;
				}
				// Cache expired, fetch fresh
				fetchAndCacheCanvases(config.apiKey);
			});
		} else {
			fetchAndCacheCanvases(config.apiKey);
		}
	});
}

function fetchAndCacheCanvases(apiKey) {
	canvasSelect.innerHTML = '<option value="">Cargando...</option>';

	listCanvases().then(function (canvases) {
		// Save to cache
		api.storage.local.set({
			canvasCache: canvases,
			canvasCacheTime: Date.now(),
		});
		renderCanvases(canvases);
	}).catch(function () {
		canvasSelect.innerHTML = '<option value="">Error al cargar lienzos</option>';
		showStatus(statusEl, "error", "No se pudieron cargar los lienzos");
	});
}

function renderCanvases(canvases) {
	canvasSelect.innerHTML = "";

	if (canvases.length === 0) {
		canvasSelect.innerHTML = '<option value="">No hay lienzos</option>';
		return;
	}

	for (var i = 0; i < canvases.length; i++) {
		var opt = document.createElement("option");
		opt.value = canvases[i].id;
		opt.textContent = canvases[i].name || "Sin título";
		canvasSelect.appendChild(opt);
	}

	btnCapture.disabled = false;
}

function invalidateCanvasCache() {
	api.storage.local.set({ canvasCache: null, canvasCacheTime: 0 });
}

// ── Capture Mode ──────────────────────────────────────

function startCaptureMode() {
	var selectedCanvas = canvasSelect.value;
	if (!selectedCanvas) {
		showStatus(statusEl, "error", "Selecciona un lienzo primero");
		return;
	}

	api.tabs.query({ active: true, currentWindow: true }, function (tabs) {
		if (!tabs || !tabs[0]) {
			showStatus(statusEl, "error", "No hay pestaña activa");
			return;
		}

		api.runtime.sendMessage({
			type: "START_CAPTURE",
			tabId: tabs[0].id,
			canvasId: selectedCanvas,
		});

		window.close();
	});
}

// ── Status ────────────────────────────────────────────

function showStatus(el, type, message) {
	el.className = "status " + type;
	el.textContent = message;
	el.classList.remove("hidden");
	setTimeout(function () {
		el.classList.add("hidden");
	}, 3000);
}

// ── Event Listeners ───────────────────────────────────

function bindEvents() {
	btnSettings.addEventListener("click", function () {
		viewMain.classList.add("hidden");
		viewSettings.classList.remove("hidden");
	});

	btnRefresh.addEventListener("click", function () {
		btnRefresh.classList.add("spinning");
		invalidateCanvasCache();
		loadCanvases(false);
		setTimeout(function () {
			btnRefresh.classList.remove("spinning");
		}, 800);
	});

	btnBack.addEventListener("click", function () {
		viewSettings.classList.add("hidden");
		viewMain.classList.remove("hidden");
		// Refresh canvases when coming back from settings (API key might have changed)
		loadCanvases(false);
	});

	btnCapture.addEventListener("click", startCaptureMode);

	btnSaveConfig.addEventListener("click", function () {
		var key = inputApiKey.value.trim();
		var url = inputBaseUrl.value.trim();

		if (!key) {
			showStatus(configStatusEl, "error", "Ingresa una API key");
			return;
		}

		saveConfig(key, url).then(function () {
			showStatus(configStatusEl, "success", "Configuración guardada");
			btnCapture.disabled = false;
			invalidateCanvasCache();
		});
	});

	linkDashboard.addEventListener("click", function (e) {
		e.preventDefault();
		var url = inputBaseUrl.value || "http://localhost:4321";
		api.tabs.create({ url: url + "/dashboard" });
	});
}

// ── Start ─────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", init);
