export const PROTOCOL_VERSION = 4;

export const TUNNEL_KIND_EPHEMERAL = "ephemeral" as const;

export const TUNNELS_API_PATH = "/api/tunnels";
export const EPHEMERAL_TUNNELS_API_PATH = "/api/tunnels/ephemeral";

export const DEFAULT_DATA_CHANNELS = 2;
export const MAX_DATA_CHANNELS = 8;

export const DEFAULT_MAX_WEBSOCKET_MESSAGE_BYTES = 1024 * 1024;
export const DEFAULT_MAX_FRAME_BYTES = DEFAULT_MAX_WEBSOCKET_MESSAGE_BYTES;
export const DEFAULT_MAX_METADATA_BYTES = 64 * 1024;
export const DEFAULT_STREAM_CREDIT_BYTES = DEFAULT_MAX_WEBSOCKET_MESSAGE_BYTES;
export const DEFAULT_CHANNEL_CREDIT_BYTES =
	4 * DEFAULT_MAX_WEBSOCKET_MESSAGE_BYTES;
export const DEFAULT_PENDING_DATA_BYTES = DEFAULT_CHANNEL_CREDIT_BYTES;
export const DEFAULT_PENDING_DATA_TIMEOUT_MS = 120_000;
export const MAX_CREDIT_BYTES = Number.MAX_SAFE_INTEGER;

export const FRAME_MAGIC_0 = 0x48; // H
export const FRAME_MAGIC_1 = 0x43; // C
export const FRAME_HEADER_BYTES = 25;

export const FRAME_CODE_REQUEST_START = 0x10;
export const FRAME_CODE_REQUEST_DATA = 0x11;
export const FRAME_CODE_REQUEST_END = 0x12;
export const FRAME_CODE_REQUEST_ABORT = 0x13;
export const FRAME_CODE_RESPONSE_START = 0x20;
export const FRAME_CODE_RESPONSE_DATA = 0x21;
export const FRAME_CODE_RESPONSE_END = 0x22;
export const FRAME_CODE_RESPONSE_ABORT = 0x23;
export const FRAME_CODE_STREAM_CREDIT = 0x30;
export const FRAME_CODE_CHANNEL_CREDIT = 0x31;

export const FRAME_TYPE_REQUEST_START = "request.start" as const;
export const FRAME_TYPE_REQUEST_DATA = "request.data" as const;
export const FRAME_TYPE_REQUEST_END = "request.end" as const;
export const FRAME_TYPE_REQUEST_ABORT = "request.abort" as const;
export const FRAME_TYPE_RESPONSE_START = "response.start" as const;
export const FRAME_TYPE_RESPONSE_DATA = "response.data" as const;
export const FRAME_TYPE_RESPONSE_END = "response.end" as const;
export const FRAME_TYPE_RESPONSE_ABORT = "response.abort" as const;
export const FRAME_TYPE_STREAM_CREDIT = "stream.credit" as const;
export const FRAME_TYPE_CHANNEL_CREDIT = "channel.credit" as const;

export const FRAME_FLAG_NONE = 0x00;
export const FRAME_FLAG_WS_TEXT = 0x01;
export const FRAME_FLAG_WS_BINARY = 0x02;

export const CLOSE_NORMAL = 1000;
export const CLOSE_GOING_AWAY = 1001;
export const CLOSE_UNSUPPORTED_DATA = 1003;
export const CLOSE_PROTOCOL_ERROR = 1002;
export const CLOSE_MESSAGE_TOO_BIG = 1009;
export const CLOSE_INTERNAL_ERROR = 1011;

export const MAX_TUNNEL_ID_BYTES = 128;
export const MAX_CLIENT_CONNECTION_ID_BYTES = 128;
export const MAX_CONNECT_TOKEN_BYTES = 4096;
export const MAX_URL_BYTES = 8192;
export const MAX_HEADER_COUNT = 256;
export const MAX_HEADER_NAME_BYTES = 128;
export const MAX_HEADER_VALUE_BYTES = 16 * 1024;
export const MAX_HEADERS_BYTES = 128 * 1024;
export const MAX_CLOSE_REASON_BYTES = 123;

const MAX_UINT32 = 0xffff_ffff;
const MAX_UINT64 = (1n << 64n) - 1n;
const ID_RE = /^[A-Za-z0-9](?:[A-Za-z0-9_-]{1,126}[A-Za-z0-9])?$/;
const HTTP_TOKEN_RE = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
const CONNECT_TOKEN_RE = /^[A-Za-z0-9._~-]+$/;

const HOP_BY_HOP_HEADERS = new Set([
	"connection",
	"keep-alive",
	"proxy-authenticate",
	"proxy-authorization",
	"te",
	"trailer",
	"transfer-encoding",
	"upgrade",
]);

export type HeaderEntry = readonly [name: string, value: string];
export type StreamId = bigint;

export type FrameType =
	| typeof FRAME_TYPE_REQUEST_START
	| typeof FRAME_TYPE_REQUEST_DATA
	| typeof FRAME_TYPE_REQUEST_END
	| typeof FRAME_TYPE_REQUEST_ABORT
	| typeof FRAME_TYPE_RESPONSE_START
	| typeof FRAME_TYPE_RESPONSE_DATA
	| typeof FRAME_TYPE_RESPONSE_END
	| typeof FRAME_TYPE_RESPONSE_ABORT
	| typeof FRAME_TYPE_STREAM_CREDIT
	| typeof FRAME_TYPE_CHANNEL_CREDIT;

export type FrameDirection = "server-to-client" | "client-to-server" | "both";
export type RequestKind = "http" | "websocket";
export type DataKind =
	| "request.body"
	| "response.body"
	| "ws.client"
	| "ws.server";

export interface TunnelLimits {
	readonly maxFrameBytes: number;
	readonly maxMetadataBytes: number;
	readonly maxWebSocketMessageBytes: number;
	readonly streamCreditBytes: number;
	readonly channelCreditBytes: number;
	readonly pendingDataBytes: number;
	readonly pendingDataTimeoutMs: number;
}

export interface CreateEphemeralTunnelResponse {
	readonly kind: typeof TUNNEL_KIND_EPHEMERAL;
	readonly protocolVersion: typeof PROTOCOL_VERSION;
	readonly tunnelId: string;
	readonly publicUrl: string;
	readonly clientConnectionId: string;
	readonly dataUrl: string;
	readonly connectToken: string;
	readonly dataChannels: number;
	readonly limits: TunnelLimits;
}

export interface RequestStartMetadata {
	readonly kind: RequestKind;
	readonly method: string;
	readonly target: string;
	readonly headers: readonly HeaderEntry[];
	readonly hasBody: boolean;
	readonly protocols?: readonly string[];
}

export interface RequestEndMetadata {
	readonly kind: "request.body" | "ws.client";
	readonly lastSeq: number;
	readonly code?: number;
	readonly reason?: string;
}

export interface RequestAbortMetadata {
	readonly reason: string;
}

export interface ResponseStartMetadata {
	readonly status: number;
	readonly headers: readonly HeaderEntry[];
	readonly hasBody: boolean;
	readonly protocol?: string;
}

export interface ResponseEndMetadata {
	readonly kind: "response.body" | "ws.server";
	readonly lastSeq: number;
	readonly code?: number;
	readonly reason?: string;
}

export interface ResponseAbortMetadata {
	readonly reason: string;
}

export interface StreamCreditMetadata {
	readonly kind: DataKind;
	readonly bytes: number;
}

export interface ChannelCreditMetadata {
	readonly bytes: number;
}

export type Metadata =
	| RequestStartMetadata
	| RequestEndMetadata
	| RequestAbortMetadata
	| ResponseStartMetadata
	| ResponseEndMetadata
	| ResponseAbortMetadata
	| StreamCreditMetadata
	| ChannelCreditMetadata;

export interface Frame {
	readonly frameType: FrameType;
	readonly streamId: StreamId;
	readonly seq: bigint;
	readonly flags?: number;
	readonly payload?: Uint8Array;
}

export interface DecodedFrame {
	readonly frameType: FrameType;
	readonly streamId: StreamId;
	readonly seq: bigint;
	readonly flags: number;
	readonly payload: Uint8Array;
}

export interface FrameHeader {
	readonly frameType: FrameType;
	readonly streamId: StreamId;
	readonly seq: bigint;
	readonly flags: number;
	readonly payloadLength: number;
}

export interface FrameCodecOptions {
	readonly maxFrameBytes?: number;
}

export interface MetadataCodecOptions {
	readonly maxMetadataBytes?: number;
}

const FRAME_TYPE_TO_CODE = new Map<FrameType, number>([
	[FRAME_TYPE_REQUEST_START, FRAME_CODE_REQUEST_START],
	[FRAME_TYPE_REQUEST_DATA, FRAME_CODE_REQUEST_DATA],
	[FRAME_TYPE_REQUEST_END, FRAME_CODE_REQUEST_END],
	[FRAME_TYPE_REQUEST_ABORT, FRAME_CODE_REQUEST_ABORT],
	[FRAME_TYPE_RESPONSE_START, FRAME_CODE_RESPONSE_START],
	[FRAME_TYPE_RESPONSE_DATA, FRAME_CODE_RESPONSE_DATA],
	[FRAME_TYPE_RESPONSE_END, FRAME_CODE_RESPONSE_END],
	[FRAME_TYPE_RESPONSE_ABORT, FRAME_CODE_RESPONSE_ABORT],
	[FRAME_TYPE_STREAM_CREDIT, FRAME_CODE_STREAM_CREDIT],
	[FRAME_TYPE_CHANNEL_CREDIT, FRAME_CODE_CHANNEL_CREDIT],
]);

const FRAME_CODE_TO_TYPE = new Map<number, FrameType>(
	[...FRAME_TYPE_TO_CODE.entries()].map(([frameType, code]) => [
		code,
		frameType,
	]),
);

export function utf8Encode(value: string): Uint8Array {
	return new TextEncoder().encode(value);
}

export function utf8Decode(value: Uint8Array | ArrayBuffer): string {
	return new TextDecoder().decode(asUint8Array(value));
}

function byteLength(value: string): number {
	return utf8Encode(value).byteLength;
}

function getFrameTypeCode(frameType: FrameType): number {
	const code = FRAME_TYPE_TO_CODE.get(frameType);
	if (code === undefined) {
		throw new Error(`unknown frame type: ${String(frameType)}`);
	}
	return code;
}

function getFrameTypeFromCode(code: number): FrameType {
	const frameType = FRAME_CODE_TO_TYPE.get(code);
	if (frameType === undefined) {
		throw new Error(`unknown frame type code: ${code}`);
	}
	return frameType;
}

export function isFrameType(value: unknown): value is FrameType {
	return (
		typeof value === "string" && FRAME_TYPE_TO_CODE.has(value as FrameType)
	);
}

function isRequestFrameType(frameType: FrameType): boolean {
	return frameType.startsWith("request.");
}

function isResponseFrameType(frameType: FrameType): boolean {
	return frameType.startsWith("response.");
}

function isDataFrameType(frameType: FrameType): boolean {
	return (
		frameType === FRAME_TYPE_REQUEST_DATA ||
		frameType === FRAME_TYPE_RESPONSE_DATA
	);
}

function isMetadataFrameType(frameType: FrameType): boolean {
	return !isDataFrameType(frameType);
}

function isChannelFrameType(frameType: FrameType): boolean {
	return frameType === FRAME_TYPE_CHANNEL_CREDIT;
}

function getFrameTypeDirection(frameType: FrameType): FrameDirection {
	if (isRequestFrameType(frameType)) {
		return "server-to-client";
	}
	if (isResponseFrameType(frameType)) {
		return "client-to-server";
	}
	return "both";
}

export function isValidFrameForDirection(
	frameType: FrameType,
	direction: FrameDirection,
): boolean {
	const frameDirection = getFrameTypeDirection(frameType);
	return (
		direction === "both" ||
		frameDirection === "both" ||
		frameDirection === direction
	);
}

function writeBigUint64(view: DataView, offset: number, value: bigint): void {
	const hi = Number((value >> 32n) & 0xFFFFFFFFn);
	const lo = Number(value & 0xFFFFFFFFn);
	view.setUint32(offset, hi, false);
	view.setUint32(offset + 4, lo, false);
}

function readBigUint64(view: DataView, offset: number): bigint {
	const hi = BigInt(view.getUint32(offset, false));
	const lo = BigInt(view.getUint32(offset + 4, false));
	return (hi << 32n) | lo;
}

function assertValidFrameHeader(header: FrameHeader): void {
	if (!isFrameType(header.frameType)) {
		throw new Error("invalid frame type");
	}
	if (typeof header.flags !== "number" || header.flags < 0 || header.flags > 0xff) {
		throw new Error("invalid frame flags");
	}
	if (typeof header.streamId !== "bigint" || header.streamId < 0n || header.streamId > MAX_UINT64) {
		throw new Error("invalid stream id");
	}
	if (typeof header.seq !== "bigint" || header.seq < 0n || header.seq > MAX_UINT64) {
		throw new Error("invalid sequence number");
	}
	if (typeof header.payloadLength !== "number" || header.payloadLength < 0 || header.payloadLength > MAX_UINT32) {
		throw new Error("invalid payload length");
	}

	if (isChannelFrameType(header.frameType)) {
		if (header.streamId !== 0n) {
			throw new Error("channel-level frame must use stream id 0");
		}
		if (header.seq !== 0n) {
			throw new Error("channel-level frame must use sequence number 0");
		}
	} else if (header.streamId === 0n) {
		throw new Error("stream-level frame must use a non-zero stream id");
	}

	if (isMetadataFrameType(header.frameType)) {
		if (header.flags !== FRAME_FLAG_NONE) {
			throw new Error("metadata frame flags must be 0");
		}
		if (header.seq !== 0n) {
			throw new Error("metadata frame sequence number must be 0");
		}
	} else if (
		header.flags !== FRAME_FLAG_NONE &&
		header.flags !== FRAME_FLAG_WS_TEXT &&
		header.flags !== FRAME_FLAG_WS_BINARY
	) {
		throw new Error("invalid data frame flags");
	}
}

export function encodeFrame(
	frame: Frame,
	options: FrameCodecOptions = {},
): Uint8Array {
	const payload = frame.payload ?? new Uint8Array(0);

	const header: FrameHeader = {
		frameType: frame.frameType,
		streamId: frame.streamId,
		seq: frame.seq,
		flags: frame.flags ?? FRAME_FLAG_NONE,
		payloadLength: payload.byteLength,
	};
	assertValidFrameHeader(header);

	const maxFrameBytes = options.maxFrameBytes ?? DEFAULT_MAX_FRAME_BYTES;
	if (payload.byteLength > maxFrameBytes) {
		throw new Error("frame exceeds maxFrameBytes");
	}

	const bytes = new Uint8Array(FRAME_HEADER_BYTES + payload.byteLength);
	const view = new DataView(bytes.buffer);
	view.setUint8(0, FRAME_MAGIC_0);
	view.setUint8(1, FRAME_MAGIC_1);
	view.setUint8(2, PROTOCOL_VERSION);
	view.setUint8(3, getFrameTypeCode(header.frameType));
	view.setUint8(4, header.flags);
	writeBigUint64(view, 5, header.streamId);
	writeBigUint64(view, 13, header.seq);
	view.setUint32(21, header.payloadLength, false);
	bytes.set(payload, FRAME_HEADER_BYTES);
	return bytes;
}

export function decodeFrameView(
	input: Uint8Array | ArrayBuffer,
	options: FrameCodecOptions = {},
): DecodedFrame {
	const bytes = asUint8Array(input);
	if (bytes.byteLength < FRAME_HEADER_BYTES) {
		throw new Error("frame is shorter than header");
	}

	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	if (
		view.getUint8(0) !== FRAME_MAGIC_0 ||
		view.getUint8(1) !== FRAME_MAGIC_1
	) {
		throw new Error("invalid frame magic");
	}
	const version = view.getUint8(2);
	if (version !== PROTOCOL_VERSION) {
		throw new Error(`unsupported protocol version: ${version}`);
	}

	const frameType = getFrameTypeFromCode(view.getUint8(3));
	const flags = view.getUint8(4);
	const streamId = readBigUint64(view, 5);
	const seq = readBigUint64(view, 13);
	const payloadLength = view.getUint32(21, false);

	const header: FrameHeader = { frameType, flags, streamId, seq, payloadLength };
	assertValidFrameHeader(header);

	const maxFrameBytes = options.maxFrameBytes ?? DEFAULT_MAX_FRAME_BYTES;
	if (payloadLength > maxFrameBytes) {
		throw new Error("frame exceeds maxFrameBytes");
	}

	const expectedLength = FRAME_HEADER_BYTES + payloadLength;
	if (bytes.byteLength !== expectedLength) {
		throw new Error("frame payload length mismatch");
	}

	return {
		frameType,
		streamId,
		seq,
		flags,
		payload: bytes.subarray(FRAME_HEADER_BYTES),
	};
}

export function encodeMetadata(
	frameType: FrameType,
	metadata: Metadata,
	options: MetadataCodecOptions = {},
): Uint8Array {
	if (!isMetadataFrameType(frameType)) {
		throw new Error(`${frameType} does not carry JSON metadata`);
	}

	const bytes = utf8Encode(JSON.stringify(metadata));
	const maxMetadataBytes =
		options.maxMetadataBytes ?? DEFAULT_MAX_METADATA_BYTES;
	if (bytes.byteLength > maxMetadataBytes) {
		throw new Error("metadata exceeds maxMetadataBytes");
	}
	return bytes;
}

export function decodeMetadata(
	frameType: FrameType,
	payload: Uint8Array | ArrayBuffer,
): Metadata {
	if (!isMetadataFrameType(frameType)) {
		throw new Error(`${frameType} does not carry JSON metadata`);
	}

	const bytes = asUint8Array(payload);
	let decoded: unknown;
	try {
		decoded = JSON.parse(utf8Decode(bytes));
	} catch (error) {
		throw new Error(
			`invalid metadata JSON: ${error instanceof Error ? error.message : String(error)}`,
		);
	}

	return decoded as Metadata;
}

export function buildDataChannelUrl(
	dataUrl: string,
	channelId: number,
): string {
	const separator = dataUrl.endsWith("/") ? "" : "/";
	return `${dataUrl}${separator}${encodeURIComponent(String(channelId))}`;
}

export function parseCreateEphemeralTunnelResponse(
	value: unknown,
): CreateEphemeralTunnelResponse {
	if (!isRecord(value)) {
		throw new Error("create tunnel returned an invalid v4 response");
	}
	if (value.protocolVersion !== PROTOCOL_VERSION) {
		throw new Error("create tunnel returned an invalid v4 response");
	}
	return value as CreateEphemeralTunnelResponse;
}

export function normalizeWebSocketCloseCode(
	code: unknown,
	fallback = CLOSE_NORMAL,
): number {
	if (
		typeof code === "number" &&
		Number.isInteger(code) &&
		code >= 1000 &&
		code <= 4999 &&
		code !== 1004 &&
		code !== 1005 &&
		code !== 1006
	) {
		return code;
	}
	return fallback;
}

export function normalizeWebSocketCloseReason(reason: unknown): string {
	if (reason === undefined || reason === null) {
		return "";
	}
	const value = String(reason).replace(/[\r\n]/g, " ");
	if (byteLength(value) <= MAX_CLOSE_REASON_BYTES) {
		return value;
	}
	let output = "";
	for (const char of value) {
		const next = output + char;
		if (byteLength(next) > MAX_CLOSE_REASON_BYTES) {
			break;
		}
		output = next;
	}
	return output;
}

export function addCredit(current: number, bytes: number): number {
	return Math.min(MAX_CREDIT_BYTES, current + bytes);
}

export function consumeCredit(current: number, bytes: number): number {
	if (bytes > current) {
		throw new Error("insufficient credit");
	}
	return current - bytes;
}

export function filterHopByHopHeaders(
	headers: readonly HeaderEntry[],
): HeaderEntry[] {
	const connectionTokens = new Set<string>();
	for (const [name, value] of headers) {
		if (name.toLowerCase() === "connection") {
			for (const token of value.split(",")) {
				const normalized = token.trim().toLowerCase();
				if (normalized) {
					connectionTokens.add(normalized);
				}
			}
		}
	}
	return headers.filter(([name]) => {
		const normalized = name.toLowerCase();
		return (
			!HOP_BY_HOP_HEADERS.has(normalized) && !connectionTokens.has(normalized)
		);
	});
}

export function filterResponseHeaders(
	headers: readonly HeaderEntry[],
): HeaderEntry[] {
	return filterHopByHopHeaders(headers).filter(([name]) => {
		const normalized = name.toLowerCase();
		return normalized !== "content-encoding" && normalized !== "content-length";
	});
}

export function filterHttpRequestHeaders(
	headers: readonly HeaderEntry[],
): HeaderEntry[] {
	return filterHopByHopHeaders(headers).filter(([name]) => {
		const normalized = name.toLowerCase();
		return normalized !== "host" && normalized !== "content-length";
	});
}

export function filterWebSocketRequestHeaders(
	headers: readonly HeaderEntry[],
): HeaderEntry[] {
	const websocketHeaders = new Set([
		"sec-websocket-accept",
		"sec-websocket-extensions",
		"sec-websocket-key",
		"sec-websocket-protocol",
		"sec-websocket-version",
	]);
	return filterHttpRequestHeaders(headers).filter(
		([name]) => !websocketHeaders.has(name.toLowerCase()),
	);
}

function asUint8Array(input: Uint8Array | ArrayBuffer): Uint8Array {
	return input instanceof Uint8Array ? input : new Uint8Array(input);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
