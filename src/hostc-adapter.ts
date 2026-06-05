import type {
	UpstreamAdapter,
	HostcHttpRequest,
	HostcHttpResponse,
	HostcUpstreamWebSocket,
} from "./vendor/client/index.js";
import { filterResponseHeaders, type HeaderEntry } from "./vendor/protocol.js";

export function createSongloftUpstreamAdapter(
	getHostUrl: () => Promise<string>,
	getToken: () => Promise<string>,
): UpstreamAdapter {
	return {
		async handleHttp(request: HostcHttpRequest): Promise<HostcHttpResponse> {
			const hostUrl = await getHostUrl();
			const token = await getToken();
			const targetUrl = hostUrl + request.target;

			const requestHeaders: Record<string, string> = {};
			for (const [name, value] of request.headers) {
				const lower = name.toLowerCase();
				if (lower === "host" || lower === "content-length") continue;
				requestHeaders[name] = value;
			}
			requestHeaders["Authorization"] = `Bearer ${token}`;

			const resp = await fetch(targetUrl, {
				method: request.method,
				headers: requestHeaders,
				body: request.body ?? undefined,
			});

			const bodyText = await resp.text();
			const responseHeaders: HeaderEntry[] = [];
			const rawHeaders = resp.headers;
			if (rawHeaders) {
				if (typeof (rawHeaders as any).entries === "function") {
					for (const [k, v] of (rawHeaders as any).entries()) {
						responseHeaders.push([k, v]);
					}
				}
			}

			return {
				status: resp.status,
				headers: filterResponseHeaders(responseHeaders),
				body: bodyText,
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

			const wsUrl = hostUrl.replace(/^http/, "ws") + request.target;

			const ws = new WebSocket(wsUrl, {
				headers: { authorization: `Bearer ${token}` },
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
