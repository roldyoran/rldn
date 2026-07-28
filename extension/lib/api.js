/**
 * API helpers for Canvas Grab extension
 * Uses .then() chains for Firefox/Zen MV3 compatibility
 */

var DEFAULT_BASE_URL = "http://localhost:4321";

// Firefox/Zen compat
var api = (typeof chrome !== "undefined" && chrome.runtime) ? chrome : (typeof browser !== "undefined" ? browser : null);

function getConfig() {
	return api.storage.local.get(["apiKey", "baseUrl"]).then(function (data) {
		return {
			apiKey: data.apiKey || "",
			baseUrl: data.baseUrl || DEFAULT_BASE_URL,
		};
	});
}

function saveConfig(apiKey, baseUrl) {
	return api.storage.local.set({
		apiKey: apiKey,
		baseUrl: baseUrl || DEFAULT_BASE_URL,
	});
}

function apiFetch(path, options) {
	options = options || {};
	return getConfig().then(function (config) {
		var url = config.baseUrl + path;
		var headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});
		if (config.apiKey) {
			headers["x-api-key"] = config.apiKey;
		}
		return fetch(url, Object.assign({}, options, { headers: headers }));
	});
}

function listCanvases() {
	return apiFetch("/api/canvases").then(function (res) {
		if (!res.ok) throw new Error("Error " + res.status);
		return res.json();
	});
}

function saveImage(canvasId, data) {
	return apiFetch("/api/canvases/" + canvasId + "/images", {
		method: "POST",
		body: JSON.stringify({
			url: data.url,
			name: data.name,
			width: data.width,
			height: data.height,
		}),
	}).then(function (res) {
		if (!res.ok) {
			return res.json().catch(function () { return {}; }).then(function (body) {
				throw new Error(body.error || "Error " + res.status);
			});
		}
		return res.json();
	});
}

function checkConnection() {
	return apiFetch("/api/canvases").then(function (res) {
		return res.ok;
	}).catch(function () {
		return false;
	});
}
