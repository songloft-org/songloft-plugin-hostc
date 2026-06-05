/**
 * Songloft 插件前端 — 公共 API 工具模块
 */

const API_BASE = '.';

export function getAuthToken() {
    try {
        const authData = localStorage.getItem('songloft-auth');
        if (authData) {
            const auth = JSON.parse(authData);
            return auth.accessToken || '';
        }
    } catch (e) {
        console.error('获取 Token 失败:', e);
    }
    return '';
}

function buildHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    const token = getAuthToken();
    if (token) {
        headers['Authorization'] = 'Bearer ' + token;
    }
    return headers;
}

async function parseResponse(response) {
    if (!response.ok) {
        let msg = response.statusText || `HTTP ${response.status}`;
        try {
            const body = await response.json();
            if (body && (body.message || body.error)) {
                msg = body.message || body.error;
            }
        } catch (_) {}
        throw new Error(msg);
    }
    const text = await response.text();
    if (!text) return null;
    return JSON.parse(text);
}

export function apiGet(path) {
    return fetch(API_BASE + path, {
        method: 'GET',
        headers: buildHeaders()
    }).then(parseResponse);
}

export function apiPost(path, body) {
    return fetch(API_BASE + path, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify(body)
    }).then(parseResponse);
}

export function apiPut(path, body) {
    return fetch(API_BASE + path, {
        method: 'PUT',
        headers: buildHeaders(),
        body: JSON.stringify(body)
    }).then(parseResponse);
}
