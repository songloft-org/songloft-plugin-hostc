/**
 * Hostc 隧道 — 前端应用逻辑
 */
import { apiGet, apiPost, apiPut } from './common.js';

const STATE_LABELS = {
    idle: '未启动',
    creatingTunnel: '创建隧道中...',
    connecting: '连接中...',
    ready: '运行中',
    reconnecting: '重连中...',
    closed: '已关闭',
};

let pollTimer = null;

// ============================================
// 初始化
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    history.replaceState({ tab: 'home' }, '', '#home');

    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.tab) {
            window._isPopState = true;
            switchTab(event.state.tab);
            window._isPopState = false;
        }
    });

    document.querySelectorAll('.tab-item').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    document.getElementById('btn-start').addEventListener('click', startTunnel);
    document.getElementById('btn-stop').addEventListener('click', stopTunnel);
    document.getElementById('btn-save-config').addEventListener('click', saveConfig);
    document.getElementById('btn-copy-url').addEventListener('click', copyTunnelUrl);

    await refreshStatus();
});

// ============================================
// Tab 切换
// ============================================

function switchTab(tabName) {
    if (!window._isPopState) {
        history.pushState({ tab: tabName }, '', '#' + tabName);
    }

    document.querySelectorAll('.tab-item').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    document.querySelectorAll('.tab-page').forEach(page => {
        page.classList.toggle('active', page.id === 'tab-' + tabName);
    });

    if (tabName === 'settings') {
        loadConfig();
    }
}

// ============================================
// 首页功能
// ============================================

async function refreshStatus() {
    try {
        const data = await apiGet('/api/status');
        if (data) {
            updateStatusUI(data);
        }
    } catch (e) {
        console.error('获取状态失败:', e);
    }
}

function updateStatusUI(data) {
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    const startBtn = document.getElementById('btn-start');
    const stopBtn = document.getElementById('btn-stop');
    const tunnelCard = document.getElementById('tunnel-card');
    const errorRow = document.getElementById('error-row');
    const errorText = document.getElementById('error-text');

    const state = data.state || 'idle';
    statusText.textContent = STATE_LABELS[state] || state;

    if (state === 'ready') {
        statusDot.className = 'status-dot ready';
    } else if (state === 'connecting' || state === 'creatingTunnel' || state === 'reconnecting') {
        statusDot.className = 'status-dot connecting';
    } else {
        statusDot.className = 'status-dot stopped';
    }

    if (state === 'idle' || state === 'closed') {
        startBtn.classList.remove('hidden');
        startBtn.disabled = false;
        startBtn.innerHTML = '<span class="material-symbols-outlined">play_arrow</span> 启动隧道';
        stopBtn.classList.add('hidden');
    } else {
        startBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');
        stopBtn.disabled = false;
    }

    if (data.publicUrl) {
        tunnelCard.classList.remove('hidden');
        const urlEl = document.getElementById('tunnel-url');
        const linkEl = document.getElementById('tunnel-link');
        linkEl.href = data.publicUrl;
        linkEl.textContent = data.publicUrl;
        urlEl.classList.remove('hidden');
    } else if (state !== 'idle' && state !== 'closed') {
        tunnelCard.classList.remove('hidden');
        document.getElementById('tunnel-url').classList.add('hidden');
    } else {
        tunnelCard.classList.add('hidden');
    }

    if (data.lastError) {
        errorRow.classList.remove('hidden');
        errorText.textContent = data.lastError;
    } else {
        errorRow.classList.add('hidden');
    }

    if (state !== 'idle' && state !== 'closed') {
        startPolling();
    } else {
        stopPolling();
    }
}

async function startTunnel() {
    const btn = document.getElementById('btn-start');
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined">hourglass_empty</span> 启动中...';

    try {
        await apiPost('/api/start', {});
        showSnackbar('隧道启动中');
        setTimeout(refreshStatus, 1000);
    } catch (e) {
        showSnackbar('启动失败: ' + e.message);
        btn.disabled = false;
        btn.innerHTML = '<span class="material-symbols-outlined">play_arrow</span> 启动隧道';
    }
}

async function stopTunnel() {
    const btn = document.getElementById('btn-stop');
    btn.disabled = true;

    try {
        await apiPost('/api/stop', {});
        showSnackbar('隧道已停止');
        stopPolling();
        setTimeout(refreshStatus, 500);
    } catch (e) {
        showSnackbar('停止失败: ' + e.message);
    } finally {
        btn.disabled = false;
    }
}

// ============================================
// 状态轮询
// ============================================

function startPolling() {
    if (pollTimer) return;
    pollTimer = setInterval(refreshStatus, 3000);
}

function stopPolling() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
}

function copyTunnelUrl() {
    const linkEl = document.getElementById('tunnel-link');
    if (linkEl && linkEl.textContent) {
        navigator.clipboard.writeText(linkEl.textContent).then(() => {
            showSnackbar('已复制到剪贴板');
        }).catch(() => {
            showSnackbar('复制失败');
        });
    }
}

// ============================================
// 设置页功能
// ============================================

async function loadConfig() {
    try {
        const data = await apiGet('/api/config');
        if (data) {
            document.getElementById('input-server-url').value = data.serverUrl || '';
            document.getElementById('input-data-channels').value = data.dataChannels || 2;
        }
    } catch (e) {
        console.error('加载配置失败:', e);
    }
}

async function saveConfig() {
    const btn = document.getElementById('btn-save-config');
    btn.disabled = true;

    const serverUrl = document.getElementById('input-server-url').value.trim();
    const dataChannels = parseInt(document.getElementById('input-data-channels').value, 10);

    try {
        await apiPut('/api/config', {
            serverUrl: serverUrl || undefined,
            dataChannels: isNaN(dataChannels) ? undefined : dataChannels,
        });
        showSnackbar('配置已保存');
    } catch (e) {
        showSnackbar('保存失败: ' + e.message);
    } finally {
        btn.disabled = false;
    }
}

// ============================================
// Snackbar
// ============================================

function showSnackbar(message) {
    const snackbar = document.getElementById('snackbar');
    snackbar.textContent = message;
    snackbar.classList.add('show');
    setTimeout(() => {
        snackbar.classList.remove('show');
    }, 3000);
}
