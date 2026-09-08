/* =========================================================
   ONEFORGE CUBESAT CONFIGURATION
   =========================================================
   Central device configuration.
   Do NOT hard-code 192.168.4.1 throughout the project.
   ========================================================= */

const ONEFORGE_CONFIG = {
    // Base URL for the CubeSat ESP32 API
    CUBESAT_API_URL: (typeof window !== 'undefined' && window.VITE_CUBESAT_API_URL) || 'http://192.168.4.1',

    // Polling interval in milliseconds
    POLL_INTERVAL: 1000,

    // Wi-Fi Access Point Network SSID
    WIFI_NETWORK: 'OneForge-CubeSat',

    // Default expected Device ID
    DEVICE_ID: 'ONEFORGE-CUBESAT-01',

    // Request timeout in milliseconds
    REQUEST_TIMEOUT_MS: 3000
};

// Also expose CUBESAT_API_URL directly for convenience
const CUBESAT_API_URL = ONEFORGE_CONFIG.CUBESAT_API_URL;
