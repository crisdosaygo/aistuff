class BrowserBoxWebview extends HTMLElement {
  static get observedAttributes() {
    return ['login-link', 'width', 'height', 'parent-origin', 'request-timeout-ms'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this.iframe = document.createElement('iframe');
    this.iframe.allowFullscreen = true;
    this.iframe.setAttribute(
      'allow',
      'accelerometer; camera; encrypted-media; display-capture; geolocation; gyroscope; microphone; midi; clipboard-read; clipboard-write; web-share; fullscreen'
    );
    this.iframe.setAttribute(
      'sandbox',
      'allow-same-origin allow-forms allow-scripts allow-top-navigation allow-top-navigation-by-user-activation allow-storage-access-by-user-activation allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals allow-pointer-lock'
    );

    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: block;
        margin: 0;
        padding: 0;
        overflow: hidden;
      }
      iframe {
        border: none;
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        display: block;
      }
    `;

    this.shadowRoot.append(style, this.iframe);

    this._requestSeq = 0;
    this._pending = new Map();
    this._apiMethods = [];
    this._isReady = false;
    this._readyPromise = Promise.resolve(true);
    this._initPingTimer = null;
    this._transportMode = 'unknown';
    this._legacyTabsCache = [];

    this._boundMessage = this._handleMessage.bind(this);
    this._boundLoad = this._handleLoad.bind(this);
    this._resetReadyPromise();
  }

  connectedCallback() {
    window.addEventListener('message', this._boundMessage);
    this.iframe.addEventListener('load', this._boundLoad);
    this.updateIframe();
  }

  disconnectedCallback() {
    window.removeEventListener('message', this._boundMessage);
    this.iframe.removeEventListener('load', this._boundLoad);
    this._stopInitPing();
    this._rejectPending(new Error('browserbox-webview disconnected'));
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) {
      return;
    }
    if (name === 'login-link') {
      this._isReady = false;
      this._apiMethods = [];
      this._transportMode = 'unknown';
      this._legacyTabsCache = [];
      this._resetReadyPromise();
      this._rejectPending(new Error('browserbox-webview source changed'));
    }
    this.updateIframe();
  }

  _resetReadyPromise() {
    this._readyPromise = new Promise((resolve) => {
      this._resolveReady = resolve;
    });
  }

  _setReady() {
    if (!this._isReady) {
      this._isReady = true;
      this._stopInitPing();
      if (typeof this._resolveReady === 'function') {
        this._resolveReady(true);
      }
    }
  }

  _rejectPending(error) {
    for (const pending of this._pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this._pending.clear();
  }

  _handleLoad() {
    this._isReady = false;
    this._apiMethods = [];
    this._transportMode = 'unknown';
    this._legacyTabsCache = [];
    this._resetReadyPromise();
    this._startInitPing();
  }

  _startInitPing() {
    this._stopInitPing();
    this._postRaw({ type: 'init' });
    this._initPingTimer = setInterval(() => {
      if (this._isReady) {
        this._stopInitPing();
        return;
      }
      this._postRaw({ type: 'init' });
    }, 1000);
  }

  _stopInitPing() {
    if (this._initPingTimer) {
      clearInterval(this._initPingTimer);
      this._initPingTimer = null;
    }
  }

  _allowedOrigin() {
    const configured = this.parentOrigin;
    if (configured && configured !== '*') {
      return configured;
    }
    try {
      if (this.iframe.src) {
        return new URL(this.iframe.src, window.location.href).origin;
      }
    } catch {
      return '*';
    }
    return '*';
  }

  _validateIncomingOrigin(origin) {
    const allowed = this._allowedOrigin();
    return allowed === '*' || origin === allowed;
  }

  _handleMessage(event) {
    if (event.source !== this.iframe.contentWindow) {
      return;
    }
    if (!this._validateIncomingOrigin(event.origin)) {
      return;
    }

    const payload = event.data || {};
    if (typeof payload.type !== 'string') {
      return;
    }

    if (payload.requestId && this._pending.has(payload.requestId)) {
      const pending = this._pending.get(payload.requestId);
      clearTimeout(pending.timer);
      this._pending.delete(payload.requestId);
      if (payload.error) {
        pending.reject(new Error(payload.error));
      } else {
        pending.resolve(payload.data);
      }
      return;
    }

    if (payload.type === 'tab-api-ready') {
      this._setReady();
      this.dispatchEvent(new CustomEvent('ready', { detail: { type: payload.type } }));
      return;
    }

    if (payload.type === 'bbx-api-ready') {
      if (Array.isArray(payload.data?.methods)) {
        this._apiMethods = payload.data.methods.slice();
      }
      this._setReady();
      this.dispatchEvent(new CustomEvent('api-ready', { detail: payload.data || {} }));
      return;
    }

    this.dispatchEvent(new CustomEvent(payload.type, { detail: payload.data || {} }));
  }

  _request(type, data = {}, options = {}) {
    if (!this.iframe.contentWindow) {
      return Promise.reject(new Error('browserbox-webview iframe is not ready.'));
    }

    const timeoutMs = Number.isFinite(options.timeoutMs)
      ? Math.max(100, Math.round(options.timeoutMs))
      : this.requestTimeoutMs;

    const requestId = `bbx-${Date.now()}-${++this._requestSeq}`;
    const message = { type, requestId, data, ...(options.messageExtras || {}) };
    const targetOrigin = this._allowedOrigin();

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this._pending.delete(requestId);
        reject(new Error(`browserbox-webview request timed out (${type}) after ${timeoutMs}ms`));
      }, timeoutMs);

      this._pending.set(requestId, { resolve, reject, timer });
      this.iframe.contentWindow.postMessage(message, targetOrigin);
    });
  }

  _postRaw(message) {
    if (!this.iframe.contentWindow) {
      return;
    }
    this.iframe.contentWindow.postMessage(message, this._allowedOrigin());
  }

  async whenReady({ timeoutMs = this.requestTimeoutMs } = {}) {
    if (this._isReady) {
      return true;
    }

    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`browserbox-webview ready timeout after ${timeoutMs}ms`)), timeoutMs);
    });

    await Promise.race([this._readyPromise, timeout]);
    return true;
  }

  async _ensureReadyForApi() {
    if (this._isReady) {
      return true;
    }
    const softTimeoutMs = Math.min(this.requestTimeoutMs, 8000);
    try {
      await this.whenReady({ timeoutMs: softTimeoutMs });
      return true;
    } catch (error) {
      this._setReady();
      this.dispatchEvent(new CustomEvent('ready-timeout', {
        detail: {
          timeoutMs: softTimeoutMs,
          error: error instanceof Error ? error.message : String(error),
        },
      }));
      return false;
    }
  }

  _legacyMethodList() {
    return [
      'getTabs',
      'getActiveTabIndex',
      'getTabCount',
      'createTab',
      'createTabs',
      'closeTab',
      'closeAllTabs',
      'switchToTab',
      'navigateTo',
      'navigateTab',
      'submitOmnibox',
      'reload',
      'evaluate',
      'waitForTabCount',
      'waitForTabUrl',
    ];
  }

  async listApiMethods(options = {}) {
    if (this._apiMethods.length > 0) {
      return this._apiMethods.slice();
    }
    await this._ensureReadyForApi();
    if (this._transportMode === 'legacy') {
      this._apiMethods = this._legacyMethodList();
      return this._apiMethods.slice();
    }
    try {
      const methods = await this._request('bbx-api-list', {}, {
        ...options,
        timeoutMs: Number.isFinite(options.timeoutMs)
          ? options.timeoutMs
          : Math.min(this.requestTimeoutMs, 2000),
      });
      this._apiMethods = Array.isArray(methods) ? methods.slice() : [];
      this._transportMode = 'modern';
    } catch {
      this._transportMode = 'legacy';
      this._apiMethods = this._legacyMethodList();
    }
    return this._apiMethods.slice();
  }

  async callApi(method, ...args) {
    if (typeof method !== 'string' || method.trim().length === 0) {
      throw new Error('callApi(method, ...args) requires a non-empty method string.');
    }
    await this._ensureReadyForApi();
    const normalizedMethod = method.trim();
    if (this._transportMode === 'legacy') {
      return this._legacyCall(normalizedMethod, args);
    }
    try {
      const result = await this._request('bbx-api-call', { method: normalizedMethod, args }, {
        timeoutMs: Math.min(this.requestTimeoutMs, 2000),
      });
      this._transportMode = 'modern';
      return result;
    } catch (error) {
      this._transportMode = 'legacy';
      return this._legacyCall(normalizedMethod, args, error);
    }
  }

  async _legacyCall(method, args = [], originalError = null) {
    const fail = (message) => {
      const detail = originalError?.message ? ` (${originalError.message})` : '';
      throw new Error(`${message}${detail}`);
    };

    if (method === 'getTabs') {
      let tabs = [];
      try {
        tabs = await this._request('getTabs', {});
      } catch {
        tabs = this._legacyTabsCache.slice();
      }
      if (!Array.isArray(tabs)) {
        return this._legacyTabsCache.slice();
      }
      const normalizedTabs = tabs.map((tab, index) => ({ index, ...tab }));
      this._legacyTabsCache = normalizedTabs.slice();
      return normalizedTabs;
    }

    if (method === 'getActiveTabIndex') {
      const [tabs, activeTab] = await Promise.all([
        this._legacyCall('getTabs', []),
        this._request('getActiveTab', {}).catch(() => null),
      ]);
      if (!activeTab || !Array.isArray(tabs)) {
        return -1;
      }
      const activeId = activeTab.id || activeTab.targetId || null;
      return tabs.findIndex((tab) => (tab.id || tab.targetId) === activeId);
    }

    if (method === 'createTab') {
      const url = typeof args[0] === 'string' ? args[0] : '';
      this._postRaw({ type: 'createTab', data: { url } });
      return true;
    }

    if (method === 'createTabs') {
      const count = Number.isInteger(args[0]) && args[0] > 0 ? args[0] : 0;
      const opts = args[1] || {};
      const url = typeof opts.url === 'string' ? opts.url : '';
      for (let i = 0; i < count; i += 1) {
        this._postRaw({ type: 'createTab', data: { url } });
      }
      return true;
    }

    const resolveTabId = async (indexArg = null) => {
      if (typeof indexArg === 'string' && indexArg.trim().length > 0) {
        return indexArg.trim();
      }
      const tabs = await this._legacyCall('getTabs', []);
      if (Array.isArray(tabs) && tabs.length > 0) {
        const requested = Number.isInteger(indexArg) ? indexArg : 0;
        const normalized = requested < 0 ? tabs.length + requested : requested;
        const safeIndex = Math.max(0, Math.min(tabs.length - 1, normalized));
        const tab = tabs[safeIndex];
        return tab?.id || tab?.targetId || null;
      }
      const activeTab = await this._request('getActiveTab', {}).catch(() => null);
      return activeTab?.id || activeTab?.targetId || null;
    };

    if (method === 'closeTab') {
      const tabId = await resolveTabId(args[0]);
      if (!tabId) fail('Legacy closeTab failed: no target tab');
      this._postRaw({ type: 'closeTab', tabId, data: {} });
      return true;
    }

    if (method === 'closeAllTabs') {
      const opts = args[0] || {};
      const keep = Number.isInteger(opts.keep) ? Math.max(0, opts.keep) : 0;
      const tabs = await this._legacyCall('getTabs', []);
      if (!Array.isArray(tabs) || tabs.length <= keep) {
        return tabs?.length || 0;
      }
      for (let i = tabs.length - 1; i >= keep; i -= 1) {
        const tabId = tabs[i]?.id || tabs[i]?.targetId;
        if (!tabId) continue;
        this._postRaw({ type: 'closeTab', tabId, data: {} });
      }
      return Math.max(keep, 0);
    }

    if (method === 'switchToTab') {
      const tabId = await resolveTabId(args[0]);
      if (!tabId) fail('Legacy switchToTab failed: no target tab');
      this._postRaw({ type: 'setActiveTab', tabId, data: {} });
      return true;
    }

    if (method === 'navigateTo') {
      const url = typeof args[0] === 'string' ? args[0] : '';
      const tabId = await resolveTabId(null);
      if (!tabId) fail('Legacy navigateTo failed: no active tab');
      this._postRaw({ type: 'loadURL', tabId, data: { url } });
      return true;
    }

    if (method === 'navigateTab') {
      const tabId = await resolveTabId(args[0]);
      const url = typeof args[1] === 'string' ? args[1] : '';
      if (!tabId) fail('Legacy navigateTab failed: no target tab');
      this._postRaw({ type: 'setActiveTab', tabId, data: {} });
      this._postRaw({ type: 'loadURL', tabId, data: { url } });
      return true;
    }

    if (method === 'submitOmnibox') {
      const query = typeof args[0] === 'string' ? args[0] : '';
      return this._legacyCall('navigateTo', [query], originalError);
    }

    if (method === 'reload') {
      const tabId = await resolveTabId(null);
      if (!tabId) fail('Legacy reload failed: no active tab');
      this._postRaw({ type: 'reload', tabId, data: {} });
      return true;
    }

    if (method === 'evaluate') {
      const expression = typeof args[0] === 'string' ? args[0] : '';
      const tabId = await resolveTabId(null);
      if (!tabId) fail('Legacy evaluate failed: no active tab');
      if (expression.includes('history.back')) {
        this._postRaw({ type: 'goBack', tabId, data: {} });
        return true;
      }
      if (expression.includes('history.forward')) {
        this._postRaw({ type: 'goForward', tabId, data: {} });
        return true;
      }
      if (expression.includes('window.stop')) {
        this._postRaw({ type: 'stop', tabId, data: {} });
        return true;
      }
      fail('Legacy evaluate only supports history.back, history.forward, and window.stop');
    }

    if (method === 'getTabCount') {
      const tabs = await this._legacyCall('getTabs', []);
      return Array.isArray(tabs) ? tabs.length : 0;
    }

    if (method === 'waitForTabCount') {
      const expectedCount = Number.isInteger(args[0]) ? args[0] : 0;
      const opts = args[1] || {};
      const timeoutMs = Number.isFinite(opts.timeoutMs) ? opts.timeoutMs : this.requestTimeoutMs;
      const pollMs = Number.isFinite(opts.pollMs) ? Math.max(50, opts.pollMs) : 150;
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const tabs = await this._legacyCall('getTabs', []);
        if (tabs.length === expectedCount) {
          return tabs.length;
        }
        await new Promise((resolve) => setTimeout(resolve, pollMs));
      }
      fail(`Legacy waitForTabCount timed out waiting for ${expectedCount}`);
    }

    if (method === 'waitForTabUrl') {
      const tabIndex = Number.isInteger(args[0]) ? args[0] : 0;
      const opts = args[1] || {};
      const timeoutMs = Number.isFinite(opts.timeoutMs) ? opts.timeoutMs : this.requestTimeoutMs;
      const pollMs = Number.isFinite(opts.pollMs) ? Math.max(50, opts.pollMs) : 150;
      const expectIncludes = typeof opts.expectIncludes === 'string' ? opts.expectIncludes : '';
      const allowBlank = Boolean(opts.allowBlank);
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const tabs = await this._legacyCall('getTabs', []);
        if (Array.isArray(tabs) && tabs.length > 0) {
          const safeIndex = Math.max(0, Math.min(tabs.length - 1, tabIndex));
          const url = tabs[safeIndex]?.url || '';
          if (allowBlank || url) {
            if (!expectIncludes || url.includes(expectIncludes)) {
              return { index: safeIndex, id: tabs[safeIndex]?.id || tabs[safeIndex]?.targetId, url };
            }
          }
        }
        await new Promise((resolve) => setTimeout(resolve, pollMs));
      }
      fail(`Legacy waitForTabUrl timed out for tab ${tabIndex}`);
    }

    fail(`No legacy fallback for API method '${method}'`);
  }

  // Canonical BrowserBox API wrappers
  switchToTab(index) { return this.callApi('switchToTab', index); }
  navigateTo(url, opts = {}) { return this.callApi('navigateTo', url, opts); }
  navigateTab(index, url, opts = {}) { return this.callApi('navigateTab', index, url, opts); }
  submitOmnibox(query, opts = {}) { return this.callApi('submitOmnibox', query, opts); }
  createTab(url = '') { return this.callApi('createTab', url); }
  createTabs(count, opts = {}) { return this.callApi('createTabs', count, opts); }
  closeTab(index = null) { return this.callApi('closeTab', index); }
  closeAllTabs(opts = {}) { return this.callApi('closeAllTabs', opts); }
  getTabs() { return this.callApi('getTabs'); }
  getFavicons() { return this.callApi('getFavicons'); }
  waitForNonDefaultFavicon(index, opts = {}) { return this.callApi('waitForNonDefaultFavicon', index, opts); }
  waitForTabCount(expectedCount, opts = {}) { return this.callApi('waitForTabCount', expectedCount, opts); }
  waitForTabUrl(index, opts = {}) { return this.callApi('waitForTabUrl', index, opts); }
  getActiveTabIndex() { return this.callApi('getActiveTabIndex'); }
  getTabCount() { return this.callApi('getTabCount'); }
  reload() { return this.callApi('reload'); }
  getScreenMetrics() { return this.callApi('getScreenMetrics'); }
  getTransportDiagnostics() { return this.callApi('getTransportDiagnostics'); }

  // Automation surface
  waitForSelector(selector, opts = {}) { return this.callApi('waitForSelector', selector, opts); }
  click(selector, opts = {}) { return this.callApi('click', selector, opts); }
  type(selector, text, opts = {}) { return this.callApi('type', selector, text, opts); }
  evaluate(expression, opts = {}) { return this.callApi('evaluate', expression, opts); }
  waitForNavigation(opts = {}) { return this.callApi('waitForNavigation', opts); }

  refresh() {
    if (this.iframe.src) {
      const currentSrc = this.iframe.src;
      this.iframe.src = currentSrc;
    }
  }

  updateIframe() {
    const loginLink = this.getAttribute('login-link');
    const width = this.getAttribute('width') || '100%';
    const height = this.getAttribute('height') || '400px';

    if (loginLink) {
      this.iframe.src = loginLink;
    }

    this.style.width = /^\d+$/.test(width) ? `${width}px` : width;
    this.style.height = /^\d+$/.test(height) ? `${height}px` : height;
  }

  get loginLink() {
    return this.getAttribute('login-link');
  }

  set loginLink(value) {
    if (value) this.setAttribute('login-link', value);
    else this.removeAttribute('login-link');
  }

  get width() {
    return this.getAttribute('width');
  }

  set width(value) {
    if (value) this.setAttribute('width', value);
    else this.removeAttribute('width');
  }

  get height() {
    return this.getAttribute('height');
  }

  set height(value) {
    if (value) this.setAttribute('height', value);
    else this.removeAttribute('height');
  }

  get parentOrigin() {
    return this.getAttribute('parent-origin') || '*';
  }

  set parentOrigin(value) {
    if (value) this.setAttribute('parent-origin', value);
    else this.removeAttribute('parent-origin');
  }

  get requestTimeoutMs() {
    const raw = this.getAttribute('request-timeout-ms');
    const parsed = Number.parseInt(raw || '30000', 10);
    if (!Number.isFinite(parsed) || parsed < 100) {
      return 30000;
    }
    return parsed;
  }

  set requestTimeoutMs(value) {
    if (value === null || value === undefined) {
      this.removeAttribute('request-timeout-ms');
      return;
    }
    this.setAttribute('request-timeout-ms', String(value));
  }
}

if (!customElements.get('browserbox-webview')) {
  customElements.define('browserbox-webview', BrowserBoxWebview);
}
