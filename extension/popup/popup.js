/**
 * Canvas Grab - Popup Script
 * Manages UI state, canvas list, and capture mode
 */

// ── DOM Elements ──────────────────────────────────────

var viewMain = document.getElementById("view-main");
var viewSettings = document.getElementById("view-settings");
var btnSettings = document.getElementById("btn-settings");
var btnBack = document.getElementById("btn-back");
var canvasSelect = document.getElementById("canvas-select");
var btnCapture = document.getElementById("btn-capture");
var statusEl = document.getElementById("status");
var configStatusEl = document.getElementById("config-status");
var recentList = document.getElementById("recent-list");
var btnClearRecent = document.getElementById("btn-clear-recent");
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
			// No API key → show settings directly
			viewMain.classList.add("hidden");
			viewSettings.classList.remove("hidden");
			return;
		}

		// Has API key → load canvases and recent
		btnCapture.disabled = false;
		loadCanvases();
		loadRecent();
	});
}

// ── Canvases ──────────────────────────────────────────

function loadCanvases() {
	getConfig().then(function (config) {
		if (!config.apiKey) {
			canvasSelect.innerHTML = '<option value="">Configura tu API key primero</option>';
			return;
		}

		listCanvases().then(function (canvases) {
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
		}).catch(function () {
			canvasSelect.innerHTML = '<option value="">Error al cargar lienzos</option>';
			showStatus(statusEl, "error", "No se pudieron cargar los lienzos");
		});
	});
}

// ── Capture Mode ──────────────────────────────────────

function startCaptureMode() {
	var selectedCanvas = canvasSelect.value;
	if (!selectedCanvas) {
		showStatus(statusEl, "error", "Selecciona un lienzo primero");
		return;
	}

	chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
		if (!tabs || !tabs[0]) {
			showStatus(statusEl, "error", "No hay pestaña activa");
			return;
		}

		chrome.runtime.sendMessage({
			type: "START_CAPTURE",
			tabId: tabs[0].id,
			canvasId: selectedCanvas,
		});

		window.close();
	});
}

// ── Recent ────────────────────────────────────────────

function loadRecent() {
	chrome.storage.local.get("recent").then(function (data) {
		var recent = data.recent || [];
		renderRecent(recent);
	});
}

function renderRecent(items) {
	if (!items.length) {
		recentList.innerHTML = '<p class="empty-text">Sin capturas recientes</p>';
		return;
	}

	recentList.innerHTML = "";
	var sliced = items.slice(-5).reverse();
	for (var i = 0; i < sliced.length; i++) {
		var item = sliced[i];
		var div = document.createElement("div");
		div.className = "recent-item";
		div.innerHTML =
			'<span class="recent-icon">' +
			'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
			'<polyline points="20 6 9 17 4 12"></polyline></svg></span>' +
			'<span class="recent-name">' + escapeHtml(item.name) + '</span>' +
			'<span class="recent-canvas">' + escapeHtml(item.canvasName || "") + '</span>';
		recentList.appendChild(div);
	}
}

function addRecent(name, canvasName) {
	chrome.storage.local.get("recent").then(function (data) {
		var recent = data.recent || [];
		recent.push({ name: name, canvasName: canvasName, timestamp: Date.now() });
		if (recent.length > 20) recent.splice(0, recent.length - 20);
		return chrome.storage.local.set({ recent: recent });
	}).then(function () {
		loadRecent();
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

// ── Helpers ───────────────────────────────────────────

function escapeHtml(str) {
	var div = document.createElement("div");
	div.textContent = str;
	return div.innerHTML;
}

// ── Event Listeners ───────────────────────────────────

function bindEvents() {
	btnSettings.addEventListener("click", function () {
		viewMain.classList.add("hidden");
		viewSettings.classList.remove("hidden");
	});

	btnBack.addEventListener("click", function () {
		viewSettings.classList.add("hidden");
		viewMain.classList.remove("hidden");
		loadCanvases();
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
		});
	});

	btnClearRecent.addEventListener("click", function () {
		chrome.storage.local.set({ recent: [] }).then(function () {
			loadRecent();
		});
	});

	linkDashboard.addEventListener("click", function (e) {
		e.preventDefault();
		var url = inputBaseUrl.value || "http://localhost:4321";
		chrome.tabs.create({ url: url + "/dashboard" });
	});

	chrome.runtime.onMessage.addListener(function (msg) {
		if (msg.type === "CAPTURE_SUCCESS") {
			addRecent(msg.imageName, msg.canvasName);
		}
	});
}

// ── Start ─────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", init);
