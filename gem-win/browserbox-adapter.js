/**
 * browserbox-adapter.js
 * Adapts BrowserBox postMessage protocol to Gem-Win Webview protocol.
 * 
 * NOTE: The full BrowserBox embedding protocol is not yet fully defined in the provided context.
 * This adapter serves as a placeholder and a structural entry point.
 * Currently, it acts as a pass-through or simple specific implementation.
 */

export class BrowserBoxAdapter {
    constructor(iframe, webviewDispatcher) {
        this.iframe = iframe;
        this.dispatch = webviewDispatcher; // Function to dispatch events to Webview/App
        this.logPrefix = '[BrowserBoxAdapter]';
        
        this._setupMessageListener();
    }

    _setupMessageListener() {
        window.addEventListener('message', (event) => {
            // Filter messages from our iframe
            if (event.source !== this.iframe.contentWindow) return;

            const data = event.data;
            // Example BrowserBox event handling (hypothetical)
            // if (data.type === 'bb-navigate') {
            //     this.dispatch('did-navigate', { url: data.url, title: data.title });
            // }
            console.log(this.logPrefix, 'Received message:', data);
        });
    }

    // --- Control Methods (Called by Webview) ---

    loadURL(url) {
        // If BrowserBox supports a 'navigate' message
        // this.postMessage({ type: 'navigate', url });
        
        // OR if we just rely on the iframe loading the cloud browser initially, 
        // and then the user interacting with it.
        // But if the address bar in Gem-Win is used:
        console.log(this.logPrefix, 'loadURL requested:', url);
        
        // Hypothetical command
        this.postMessage({ command: 'navigate', url });
    }

    goBack() {
        this.postMessage({ command: 'goBack' });
    }

    goForward() {
        this.postMessage({ command: 'goForward' });
    }

    reload() {
        this.postMessage({ command: 'reload' });
    }

    // --- Helper ---
    postMessage(msg) {
        if (this.iframe && this.iframe.contentWindow) {
            this.iframe.contentWindow.postMessage(msg, '*'); // Target origin should be restrictive in prod
        }
    }
}
