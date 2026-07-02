/// <reference types="@songloft/plugin-sdk" />
import { jsonResponse, createRouter } from "@songloft/plugin-sdk";
import { HostcClient } from "./vendor/client/index.js";
import { createSongloftUpstreamAdapter } from "./hostc-adapter.js";

const router = createRouter();

const STORAGE_KEY_SERVER_URL = "hostc_server_url";
const STORAGE_KEY_DATA_CHANNELS = "hostc_data_channels";
const DEFAULT_SERVER_URL = "https://hostc.dev";
const DEFAULT_DATA_CHANNELS = 2;
const LEGACY_SERVER_HOSTS = new Set(["api", "hostc.net"]);

let client: HostcClient | null = null;
let lastPublicUrl = "";
let lastError = "";

async function getConfig(): Promise<{ serverUrl: string; dataChannels: number }> {
	const storedServerUrl = await songloft.storage.get(STORAGE_KEY_SERVER_URL);
	const serverUrl = normalizeServerUrl(storedServerUrl);
	if (storedServerUrl && serverUrl !== storedServerUrl) {
		await songloft.storage.set(STORAGE_KEY_SERVER_URL, serverUrl);
		clearObsoleteServerUrlError();
	}
	const channelsStr = await songloft.storage.get(STORAGE_KEY_DATA_CHANNELS);
	const dataChannels =
		typeof channelsStr === "string"
			? parseInt(channelsStr, 10)
			: DEFAULT_DATA_CHANNELS;
	return { serverUrl, dataChannels: normalizeDataChannels(dataChannels) };
}

async function saveConfig(config: {
	serverUrl?: string;
	dataChannels?: number;
}): Promise<void> {
	if (config.serverUrl !== undefined) {
		await songloft.storage.set(
			STORAGE_KEY_SERVER_URL,
			normalizeServerUrl(config.serverUrl),
		);
	}
	if (config.dataChannels !== undefined) {
		await songloft.storage.set(
			STORAGE_KEY_DATA_CHANNELS,
			String(normalizeDataChannels(config.dataChannels)),
		);
	}
}

function normalizeServerUrl(value: unknown): string {
	const input = typeof value === "string" ? value.trim() : "";
	if (!input) {
		return DEFAULT_SERVER_URL;
	}

	try {
		const url = new URL(input);
		if (
			(url.protocol !== "http:" && url.protocol !== "https:") ||
			LEGACY_SERVER_HOSTS.has(url.hostname)
		) {
			return DEFAULT_SERVER_URL;
		}
		url.pathname = "/";
		url.search = "";
		url.hash = "";
		return url.toString().replace(/\/$/, "");
	} catch {
		return DEFAULT_SERVER_URL;
	}
}

function normalizeDataChannels(value: unknown): number {
	const parsed =
		typeof value === "number" ? value : parseInt(String(value ?? ""), 10);
	if (!Number.isFinite(parsed)) {
		return DEFAULT_DATA_CHANNELS;
	}
	return Math.min(8, Math.max(1, Math.trunc(parsed)));
}

function clearObsoleteServerUrlError(): void {
	if (lastError.includes('Post "https://api/')) {
		lastError = "";
	}
}

function getState(): string {
	if (!client) return "idle";
	return client.getSnapshot().state;
}

router.get("/api/status", () => {
	clearObsoleteServerUrlError();
	const snapshot = client?.getSnapshot();
	return jsonResponse({
		state: snapshot?.state ?? "idle",
		publicUrl: snapshot?.publicUrl ?? lastPublicUrl ?? null,
		tunnelId: snapshot?.tunnelId ?? null,
		dataChannels: snapshot?.dataChannels ?? DEFAULT_DATA_CHANNELS,
		lastError,
	});
});

router.post("/api/start", async (req) => {
	if (client && getState() !== "idle" && getState() !== "closed") {
		return jsonResponse({ error: "隧道已在运行中" }, 409);
	}

	const body = req.body ? JSON.parse(String(req.body)) : {};
	const config = await getConfig();
	const serverUrl = normalizeServerUrl(body.serverUrl || config.serverUrl);
	const dataChannels = normalizeDataChannels(body.dataChannels || config.dataChannels);

	const upstream = createSongloftUpstreamAdapter(
		() => songloft.plugin.getHostUrl(),
		() => songloft.plugin.getToken(),
		(message) => {
			lastError = message;
			songloft.log.warn(message);
		},
	);

	lastError = "";
	lastPublicUrl = "";

	client = new HostcClient({
		serverUrl,
		upstream,
		dataChannels,
	});

	client.on("ready", (event) => {
		lastPublicUrl = event.publicUrl;
		songloft.log.info(
			`hostc 隧道已就绪: ${event.publicUrl}`,
		);
	});

	client.on("error", (error) => {
		lastError = error.message;
		songloft.log.warn(`hostc 错误: ${error.message}`);
	});

	client.on("reconnecting", (event) => {
		songloft.log.info(
			`hostc 重连中 (第${event.attempt}次, ${event.reason})`,
		);
	});

	client.on("log", (event) => {
		switch (event.level) {
			case "error":
				songloft.log.error(event.message);
				break;
			case "warn":
				songloft.log.warn(event.message);
				break;
			case "info":
				songloft.log.info(event.message);
				break;
			default:
				songloft.log.info(event.message);
				break;
		}
	});

	client.start().catch((err) => {
		lastError = err.message || String(err);
		songloft.log.error(`hostc 启动失败: ${lastError}`);
		client = null;
	});

	return jsonResponse({ message: "隧道启动中" });
});

router.post("/api/stop", async () => {
	if (!client) {
		return jsonResponse({ error: "隧道未运行" }, 400);
	}
	await client.stop();
	client = null;
	songloft.log.info("hostc 隧道已停止");
	return jsonResponse({ message: "隧道已停止" });
});

router.get("/api/config", async () => {
	const config = await getConfig();
	return jsonResponse(config);
});

router.put("/api/config", async (req) => {
	const body = req.body ? JSON.parse(String(req.body)) : {};
	await saveConfig(body);
	const config = await getConfig();
	return jsonResponse(config);
});

async function onInit(): Promise<void> {
	await getConfig();
	clearObsoleteServerUrlError();
	songloft.log.info("Hostc 隧道插件已初始化");
}

async function onDeinit(): Promise<void> {
	if (client) {
		try {
			await client.stop();
		} catch (_) {
			/* best effort */
		}
		client = null;
	}
	songloft.log.info("Hostc 隧道插件已卸载");
}

async function onHTTPRequest(req: HTTPRequest): Promise<HTTPResponse> {
	return await router.handle(req);
}

globalThis.onInit = onInit;
globalThis.onDeinit = onDeinit;
globalThis.onHTTPRequest = onHTTPRequest;
