import type { TunnelLimits, HeaderEntry } from "../protocol.js";

export type HostcClientState =
	| "idle"
	| "creatingTunnel"
	| "connecting"
	| "ready"
	| "reconnecting"
	| "closed";

export type HostcTunnelLimits = TunnelLimits;

export type HostcClientSnapshot = {
	state: HostcClientState;
	tunnelId: string | null;
	clientConnectionId: string | null;
	publicUrl: string | null;
	dataChannels: number;
	limits: HostcTunnelLimits | null;
};

export type HostcReadyEvent = {
	tunnelId: string;
	clientConnectionId: string;
	publicUrl: string;
};

export type HostcReconnectEvent = {
	attempt: number;
	delayMs: number;
	reason: string;
};

export type HostcLogEvent = {
	level: "debug" | "info" | "warn" | "error";
	message: string;
	fields?: Record<string, unknown>;
};

export type HostcHttpRequest = {
	method: string;
	target: string;
	headers: HeaderEntry[];
	body: Uint8Array | null;
	publicUrl?: string;
};

export type HostcHttpResponse = {
	status: number;
	headers?: HeaderEntry[];
	body?: Uint8Array | string | null;
};

export type HostcUpstreamWebSocket = {
	readonly protocol?: string;
	send(message: Uint8Array | string): void;
	close(code?: number, reason?: string): void;
	onMessage(listener: (message: { data: Uint8Array | string; binary: boolean }) => void): void;
	onClose(listener: (event: { code: number; reason: string }) => void): void;
};

export type UpstreamAdapter = {
	handleHttp(request: HostcHttpRequest): Promise<HostcHttpResponse>;
	handleWebSocket?(
		request: {
			method: string;
			target: string;
			headers: HeaderEntry[];
			protocols: string[];
			publicUrl?: string;
		},
	): Promise<HostcUpstreamWebSocket>;
};

export type HostcClientOptions = {
	serverUrl: string;
	upstream: UpstreamAdapter;
	dataChannels?: number;
};
