import type {
	UpstreamAdapter,
	HostcHttpRequest,
	HostcHttpResponse,
	HostcUpstreamWebSocket,
} from "./vendor/client/index.js";
import {
	filterHttpRequestHeaders,
	filterResponseHeaders,
	filterWebSocketRequestHeaders,
	type HeaderEntry,
} from "./vendor/protocol.js";

export function createSongloftUpstreamAdapter(
	getHostUrl: () => Promise<string>,
	getToken: () => Promise<string>,
	onError?: (message: string) => void,
): UpstreamAdapter {
	return {
		async handleHttp(request: HostcHttpRequest): Promise<HostcHttpResponse> {
			const hostUrl = await getHostUrl();
			const token = await getToken();
			const targetUrl = joinUrlPath(hostUrl, request.target);
			const publicOrigin = originFromUrl(request.publicUrl);
			const localOrigin = originFromUrl(hostUrl);

			const requestHeaders: Record<string, string> = {};
			for (const [name, value] of filterHttpRequestHeaders(
				rewriteLocalRequestHeaders(request.headers, publicOrigin, localOrigin),
			)) {
				requestHeaders[name] = value;
			}
			requestHeaders["Authorization"] = `Bearer ${token}`;

			let resp: Response;
			try {
				resp = await fetch(targetUrl, {
					method: request.method,
					headers: requestHeaders,
					body: request.body ?? undefined,
				});
			} catch (error) {
				const message = `local HTTP fetch failed: ${targetUrl}: ${errorMessage(error)}`;
				onError?.(message);
				throw new Error(message);
			}

			const bodyBuffer = await resp.arrayBuffer();
			const responseHeaders = responseHeadersToEntries(resp.headers);

			return {
				status: resp.status,
				headers: filterResponseHeaders(responseHeaders),
				body: new Uint8Array(bodyBuffer),
			};
		},

		async handleWebSocket(request: {
			method: string;
			target: string;
			headers: HeaderEntry[];
			protocols: string[];
			publicUrl?: string;
		}): Promise<HostcUpstreamWebSocket> {
			const hostUrl = await getHostUrl();
			const token = await getToken();
			const publicOrigin = originFromUrl(request.publicUrl);
			const localOrigin = originFromUrl(hostUrl);

			const wsUrl = joinUrlPath(hostUrl.replace(/^http/, "ws"), request.target);
			const requestHeaders: Record<string, string> = {};
			for (const [name, value] of filterWebSocketRequestHeaders(
				rewriteLocalRequestHeaders(request.headers, publicOrigin, localOrigin),
			)) {
				requestHeaders[name] = value;
			}
			requestHeaders["Authorization"] = `Bearer ${token}`;

			const ws = new WebSocket(wsUrl, {
				headers: requestHeaders,
			} as any);

			return new Promise((resolve, reject) => {
				let settled = false;
				const messageListeners: ((msg: { data: Uint8Array | string; binary: boolean }) => void)[] = [];
				const closeListeners: ((ev: { code: number; reason: string }) => void)[] = [];

				ws.addEventListener("open", () => {
					if (settled) return;
					settled = true;
					resolve({
						get protocol() { return undefined; },
						send(message: Uint8Array | string) {
							ws.send(message);
						},
						close(code?: number, reason?: string) {
							ws.close(code, reason);
						},
						onMessage(listener) {
							messageListeners.push(listener);
						},
						onClose(listener) {
							closeListeners.push(listener);
						},
					});
				});

				ws.addEventListener("message", (event: any) => {
					const data = event.data;
					const isBinary = data instanceof Uint8Array || data instanceof ArrayBuffer;
					const payload = isBinary
						? (data instanceof Uint8Array ? data : new Uint8Array(data))
						: String(data);
					for (const fn of messageListeners) {
						fn({ data: payload, binary: isBinary });
					}
				});

				ws.addEventListener("close", (event: any) => {
					for (const fn of closeListeners) {
						fn({ code: event.code ?? 1006, reason: event.reason ?? "" });
					}
				});

				ws.addEventListener("error", (event: any) => {
					if (!settled) {
						settled = true;
						reject(new Error(event.message || "upstream WebSocket connect failed"));
					}
				});
			});
		},
	};
}

function joinUrlPath(base: string, target: string): string {
	const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
	const normalizedTarget = target.startsWith("/") ? target : `/${target}`;
	return `${normalizedBase}${normalizedTarget}`;
}

function rewriteLocalRequestHeaders(
	headers: readonly HeaderEntry[],
	publicOrigin: string | null,
	localOrigin: string | null,
): HeaderEntry[] {
	let sawAcceptEncoding = false;
	const rewritten: HeaderEntry[] = [];
	for (const [name, value] of headers) {
		const lowerName = name.toLowerCase();
		if (lowerName === "accept-encoding") {
			sawAcceptEncoding = true;
			rewritten.push([name, "identity"]);
			continue;
		}
		if (publicOrigin && localOrigin && lowerName === "origin" && value === publicOrigin) {
			rewritten.push([name, localOrigin]);
			continue;
		}
		if (publicOrigin && localOrigin && lowerName === "referer") {
			rewritten.push([name, rewriteSameOriginUrl(value, publicOrigin, localOrigin)]);
			continue;
		}
		rewritten.push([name, value]);
	}
	if (!sawAcceptEncoding) {
		rewritten.push(["accept-encoding", "identity"]);
	}
	return rewritten;
}

function rewriteSameOriginUrl(
	value: string,
	publicOrigin: string,
	localOrigin: string,
): string {
	if (!value.startsWith(publicOrigin)) {
		return value;
	}
	return `${localOrigin}${value.slice(publicOrigin.length)}`;
}

function originFromUrl(value: string | undefined): string | null {
	if (!value) {
		return null;
	}
	try {
		const url = new URL(value);
		return `${url.protocol}//${url.host}`;
	} catch {
		return null;
	}
}

function responseHeadersToEntries(headers: unknown): HeaderEntry[] {
	const entries: HeaderEntry[] = [];
	if (!headers || typeof headers !== "object") {
		return entries;
	}
	if (typeof (headers as any).entries === "function") {
		for (const [name, value] of (headers as any).entries()) {
			entries.push([String(name), String(value)]);
		}
		return entries;
	}
	for (const [name, value] of Object.entries(headers as Record<string, unknown>)) {
		if (Array.isArray(value)) {
			entries.push([name, value.map(String).join(", ")]);
			continue;
		}
		if (value !== undefined && value !== null) {
			entries.push([name, String(value)]);
		}
	}
	return entries;
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
