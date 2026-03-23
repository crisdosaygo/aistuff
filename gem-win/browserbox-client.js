/**
 * browserbox-client.js
 * Client for the BrowserBox Demo Server API.
 */

export class BrowserBoxClient {
    constructor(serverBaseUrl = '') {
        this.baseUrl = serverBaseUrl;
    }

    /**
     * Create a new BrowserBox session.
     * @param {{clientIP?: string|null}=} options
     * @returns {Promise<{loginUrl: string, region: string, remainingMs: number, sessionId: string}>}
     */
    async createSession(options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000);

        try {
            const payload = {};
            if (options.clientIP && typeof options.clientIP === 'string') {
                payload.clientIP = options.clientIP;
            }

            const response = await fetch(`${this.baseUrl}/api/session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to create session');
            }
            return data;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Check status of the active session for current browser cookie.
     */
    async checkStatus() {
        const response = await fetch(`${this.baseUrl}/api/status`);
        if (!response.ok) {
            console.warn('Failed to check status', response.status);
            return null;
        }
        return response.json();
    }

    /**
     * Keep the remote session alive while client is connected.
     * @param {string} sessionId
     */
    async sendHeartbeat(sessionId) {
        if (!sessionId) {
            return;
        }
        try {
            await fetch(`${this.baseUrl}/api/session/heartbeat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId }),
                keepalive: true,
            });
        } catch {
            // Heartbeat failures are tolerated; server-side timeout handles cleanup.
        }
    }

    /**
     * Notify server that the page is disconnecting.
     * @param {string} sessionId
     */
    async notifyDisconnect(sessionId) {
        if (!sessionId) {
            return;
        }

        const url = `${this.baseUrl}/api/session/disconnect`;
        const payload = JSON.stringify({ sessionId });

        if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
            try {
                const blob = new Blob([payload], { type: 'application/json' });
                navigator.sendBeacon(url, blob);
                return;
            } catch {
                // Fall back to fetch keepalive.
            }
        }

        try {
            await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payload,
                keepalive: true,
            });
        } catch {
            // Disconnect failures are tolerated.
        }
    }
}
