/**
 * browserbox-client.js
 * Client for the BrowserBox Demo Server API
 */

export class BrowserBoxClient {
    constructor(serverBaseUrl = '') {
        // serverBaseUrl can be empty if serving from same origin
        this.baseUrl = serverBaseUrl; 
    }

    /**
     * Create a new browser session
     * @returns {Promise<{loginUrl: string, region: string, remainingMs: number, sessionId: string}>}
     */
    async createSession() {
        // geo-deploy can take 30-60s for Cloud Run cold start
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout
        
        try {
            const response = await fetch(`${this.baseUrl}/api/session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal
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
     * Check status of existing session
     * @returns {Promise<{activeSession: object|null, canCreateSession: boolean, ...}>}
     */
    async checkStatus() {
        const response = await fetch(`${this.baseUrl}/api/status`);
        if (!response.ok) {
             // Fallback or throw? For status, we might just want null
             console.warn('Failed to check status', response.status);
             return null;
        }
        return await response.json();
    }
}
