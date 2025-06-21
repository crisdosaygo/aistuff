// browser-config.js - Configuration for BrowserBox RBI integration

export const BrowserBoxConfig = {
    // Default BrowserBox RBI endpoint - can be overridden
    defaultEndpoint: 'https://MacBook-Air.local:9222',
    
    // Default token - should be configurable
    defaultToken: '95b70ea4aa25f9567e9946f7663e4a82',
    
    // UI mode for BrowserBox (false = headless mode)
    uiMode: false,
    
    // Connection timeout in milliseconds
    connectionTimeout: 10000,
    
    // Retry configuration
    retryAttempts: 3,
    retryDelay: 1000,
    
    // Feature flags
    features: {
        enableTabs: true,
        enableNavigation: true,
        enableDownloads: true,
        enablePrinting: false,
        enableDevTools: false
    },
    
    // UI customization
    ui: {
        showStatusBar: true,
        showAddressBar: true,
        showTabBar: true,
        showToolbar: true,
        showMenuBar: true
    },
    
    // Security settings
    security: {
        allowPopups: true,
        allowDownloads: true,
        allowForms: true,
        allowModals: true,
        allowPointerLock: true,
        allowFullscreen: true
    }
};

// Helper function to build BrowserBox URL
export function buildBrowserBoxUrl(config = {}) {
    const endpoint = config.endpoint || BrowserBoxConfig.defaultEndpoint;
    const token = config.token || BrowserBoxConfig.defaultToken;
    const ui = config.ui !== undefined ? config.ui : BrowserBoxConfig.uiMode;
    
    return `${endpoint}/login?token=${token}&ui=${ui}`;
}

// Helper function to validate BrowserBox configuration
export function validateBrowserBoxConfig(config) {
    const errors = [];
    
    if (!config.endpoint && !BrowserBoxConfig.defaultEndpoint) {
        errors.push('BrowserBox endpoint is required');
    }
    
    if (!config.token && !BrowserBoxConfig.defaultToken) {
        errors.push('BrowserBox token is required');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

// Environment-based configuration
export function getEnvironmentConfig() {
    // Check for environment variables or URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    
    return {
        endpoint: urlParams.get('browserbox_endpoint') || 
                  localStorage.getItem('browserbox_endpoint') || 
                  BrowserBoxConfig.defaultEndpoint,
        token: urlParams.get('browserbox_token') || 
               localStorage.getItem('browserbox_token') || 
               BrowserBoxConfig.defaultToken,
        ui: urlParams.get('browserbox_ui') === 'true' || 
            localStorage.getItem('browserbox_ui') === 'true' || 
            BrowserBoxConfig.uiMode
    };
} 