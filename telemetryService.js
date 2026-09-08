/* =========================================================
   ONEFORGE CUBESAT TELEMETRY SERVICE
   =========================================================
   Centralized telemetry service.
   The ESP32 is the AUTHORITATIVE SOURCE OF TRUTH.
   No frontend simulation or randomization is performed
   when connected.

   Handles:
     - getTelemetry(): single HTTP GET to /api/telemetry
     - Validates and normalizes ESP32 JSON schema
     - Flexible mapping for accel/gyro properties (accelX or accel.x)
     - Continuous ~1000ms polling with single timer & cleanup
     - Connection states: CONNECTING, CONNECTED, OFFLINE, ERROR
     - Friendly error reporting for local Wi-Fi context
     - State-change detection (triggers events ONLY on transitions)
     - Preserves last known values on disconnect without inventing fake data
   ========================================================= */

(function (global) {

    // Connection States
    const CONNECTION_STATUS = {
        CONNECTING: 'CONNECTING',
        CONNECTED:  'CONNECTED',
        OFFLINE:    'OFFLINE',
        ERROR:      'ERROR'
    };

    // User-facing friendly error messages
    const USER_ERRORS = {
        UNABLE_TO_CONNECT: 'Unable to connect to OneForge CubeSat.',
        WIFI_UNREACHABLE:  'Connect to Wi-Fi network OneForge-CubeSat.',
        INVALID_PACKET:    'Invalid telemetry packet received.'
    };

    // Internal state
    let state = {
        telemetry: null,
        previousState: null,
        connectionStatus: CONNECTION_STATUS.OFFLINE,
        lastUpdated: null,
        error: null,
        consecutiveErrors: 0,
        isLastKnown: false
    };

    const listeners = new Set();
    const stateChangeListeners = new Set();
    let pollTimer = null;
    let isPolling = false;

    /**
     * Notify all telemetry subscribers
     */
    function notifyListeners() {
        const snapshot = getTelemetryState();
        listeners.forEach(fn => {
            try {
                fn(snapshot);
            } catch (err) {
                console.error('[OneForge Telemetry] Listener error:', err);
            }
        });
    }

    /**
     * Notify state-change subscribers only when ESP32 status changes
     */
    function notifyStateChange(changeEvent) {
        stateChangeListeners.forEach(fn => {
            try {
                fn(changeEvent);
            } catch (err) {
                console.error('[OneForge Telemetry] State change listener error:', err);
            }
        });
    }

    /**
     * Normalize ESP32 JSON telemetry response.
     * Supports both nested (motion.accel.x) and flat (motion.accelX) variants.
     * Maps sensor sources accurately (BMP280 = REAL, MPU/INA = SIMULATED).
     */
    function normalizeTelemetry(raw) {
        if (!raw || typeof raw !== 'object') {
            throw new Error(USER_ERRORS.INVALID_PACKET);
        }

        const env    = raw.environment || {};
        const motion = raw.motion || {};
        const accel  = motion.accel || {};
        const gyro   = motion.gyro || {};
        const power  = raw.power || {};
        const sens   = raw.sensors || {};
        const sys    = raw.system || {};

        // Resolve acceleration X/Y/Z (support both formats from ESP32 firmware)
        const accelX = typeof accel.x === 'number' ? accel.x :
                       typeof motion.accelX === 'number' ? motion.accelX :
                       typeof raw.accelX === 'number' ? raw.accelX : 0;
        const accelY = typeof accel.y === 'number' ? accel.y :
                       typeof motion.accelY === 'number' ? motion.accelY :
                       typeof raw.accelY === 'number' ? raw.accelY : 0;
        const accelZ = typeof accel.z === 'number' ? accel.z :
                       typeof motion.accelZ === 'number' ? motion.accelZ :
                       typeof raw.accelZ === 'number' ? raw.accelZ : 0;

        // Resolve gyroscope X/Y/Z
        const gyroX = typeof gyro.x === 'number' ? gyro.x :
                      typeof motion.gyroX === 'number' ? motion.gyroX :
                      typeof raw.gyroX === 'number' ? raw.gyroX : 0;
        const gyroY = typeof gyro.y === 'number' ? gyro.y :
                      typeof motion.gyroY === 'number' ? motion.gyroY :
                      typeof raw.gyroY === 'number' ? raw.gyroY : 0;
        const gyroZ = typeof gyro.z === 'number' ? gyro.z :
                      typeof motion.gyroZ === 'number' ? motion.gyroZ :
                      typeof raw.gyroZ === 'number' ? raw.gyroZ : 0;

        // Resolve power (voltage, current, power)
        const voltage = typeof power.voltage === 'number' ? power.voltage :
                        typeof raw.voltage === 'number' ? raw.voltage : 0;
        const current = typeof power.current === 'number' ? power.current :
                        typeof raw.current === 'number' ? raw.current : 0;
        const pwrVal  = typeof power.power === 'number' ? power.power :
                        typeof raw.power === 'number' ? raw.power : (voltage * current);

        // Resolve temperature & pressure (REAL from BMP280)
        const temperature = typeof env.temperature === 'number' ? env.temperature :
                            typeof raw.temperature === 'number' ? raw.temperature : null;
        const pressure    = typeof env.pressure === 'number' ? env.pressure :
                            typeof raw.pressure === 'number' ? raw.pressure : null;

        // Status & Health Score directly from ESP32
        const status = (raw.status || raw.health || 'NORMAL').toUpperCase();
        let healthScore = 100;
        if (typeof raw.healthScore === 'number') {
            healthScore = raw.healthScore;
        } else if (typeof raw.health === 'number') {
            healthScore = raw.health;
        } else if (status === 'NORMAL') {
            healthScore = 100;
        } else if (status === 'WARNING') {
            healthScore = 68;
        } else if (status === 'CRITICAL') {
            healthScore = 25;
        } else if (status === 'RECOVERY') {
            healthScore = 75;
        }

        // Fault message directly from ESP32
        let fault = raw.fault || 'SYSTEM NOMINAL';
        if (typeof fault === 'object' && fault !== null) {
            fault = fault.type || (fault.active ? 'FAULT ACTIVE' : 'SYSTEM NOMINAL');
        }

        return {
            deviceId: raw.deviceId || 'ONEFORGE-CUBESAT-01',
            status: status,
            healthScore: healthScore,
            fault: fault,

            // REAL BMP280 measurements
            environment: {
                source: 'REAL • BMP280',
                isReal: true,
                temperature: temperature,
                pressure: pressure
            },

            // SIMULATED MPU6050 motion values from ESP32
            motion: {
                source: motion.source || 'SIMULATED • ESP32 PROTOTYPE',
                isReal: false,
                accel: { x: accelX, y: accelY, z: accelZ },
                gyro:  { x: gyroX,  y: gyroY,  z: gyroZ  }
            },

            // SIMULATED INA219 power values from ESP32
            power: {
                source: power.source || 'SIMULATED • ESP32 PROTOTYPE',
                isReal: false,
                voltage: voltage,
                current: current,
                power: pwrVal
            },

            // Sensor hardware/simulation status flags
            sensors: {
                bmp280: sens.bmp280 !== false,
                mpu6050: sens.mpu6050 || 'SIMULATED',
                ina219: sens.ina219 || 'SIMULATED'
            },

            // ESP32 system info
            system: {
                uptime: typeof sys.uptime === 'number' ? sys.uptime : 0,
                ip: sys.ip || '192.168.4.1',
                ssid: sys.ssid || 'OneForge-CubeSat'
            },

            _raw: raw
        };
    }

    /**
     * Fetch /api/telemetry from ESP32
     */
    async function getTelemetry(overrideUrl) {
        const baseUrl = overrideUrl ||
            (typeof ONEFORGE_CONFIG !== 'undefined' ? ONEFORGE_CONFIG.CUBESAT_API_URL : 'http://192.168.4.1');
        const timeoutMs =
            (typeof ONEFORGE_CONFIG !== 'undefined' ? ONEFORGE_CONFIG.REQUEST_TIMEOUT_MS : 3000);

        const url = `${baseUrl.replace(/\/$/, '')}/api/telemetry`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(url, {
                method: 'GET',
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json'
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            let json;
            try {
                json = await response.json();
            } catch (parseErr) {
                throw new Error(USER_ERRORS.INVALID_PACKET);
            }

            return normalizeTelemetry(json);

        } catch (err) {
            clearTimeout(timeoutId);

            if (err.name === 'AbortError') {
                const e = new Error(USER_ERRORS.WIFI_UNREACHABLE);
                e.code = 'TIMEOUT';
                throw e;
            } else if (err.message === USER_ERRORS.INVALID_PACKET) {
                throw err;
            } else if (err.message && err.message.startsWith('HTTP')) {
                const e = new Error(USER_ERRORS.UNABLE_TO_CONNECT);
                e.detail = err.message;
                throw e;
            } else {
                const e = new Error(USER_ERRORS.WIFI_UNREACHABLE);
                e.code = 'NETWORK_ERROR';
                throw e;
            }
        }
    }

    /**
     * Single polling tick
     */
    async function pollOnce() {
        try {
            const data = await getTelemetry();

            // Detect state transitions (only emit when status changes)
            if (state.previousState && state.previousState !== data.status) {
                notifyStateChange({
                    timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
                    previousState: state.previousState,
                    newState: data.status,
                    fault: data.fault,
                    healthScore: data.healthScore
                });
            }
            state.previousState = data.status;

            state.telemetry = data;
            state.connectionStatus = CONNECTION_STATUS.CONNECTED;
            state.lastUpdated = new Date();
            state.error = null;
            state.consecutiveErrors = 0;
            state.isLastKnown = false;

            notifyListeners();
            return data;

        } catch (err) {
            state.consecutiveErrors++;

            if (state.consecutiveErrors >= 2) {
                state.connectionStatus = CONNECTION_STATUS.OFFLINE;
            } else {
                state.connectionStatus = CONNECTION_STATUS.ERROR;
            }

            state.error = err.message || USER_ERRORS.UNABLE_TO_CONNECT;
            state.isLastKnown = (state.telemetry !== null);

            // Log once for debugging without spamming console
            if (state.consecutiveErrors === 1 || state.consecutiveErrors % 10 === 0) {
                console.warn('[OneForge Telemetry] Device connection status:', state.connectionStatus, '-', state.error);
            }

            notifyListeners();
            return null;
        }
    }

    /**
     * Start continuous polling at specified interval (~1000 ms)
     */
    function startPolling(intervalMs) {
        const interval = intervalMs ||
            (typeof ONEFORGE_CONFIG !== 'undefined' ? ONEFORGE_CONFIG.POLL_INTERVAL : 1000);

        if (isPolling) {
            stopPolling();
        }

        isPolling = true;
        state.connectionStatus = CONNECTION_STATUS.CONNECTING;
        state.error = null;
        notifyListeners();

        pollOnce();
        pollTimer = setInterval(pollOnce, interval);
    }

    /**
     * Stop polling
     */
    function stopPolling() {
        if (pollTimer) {
            clearInterval(pollTimer);
            pollTimer = null;
        }
        isPolling = false;
    }

    /**
     * Subscribe to telemetry updates
     */
    function subscribe(callback) {
        listeners.add(callback);
        try {
            callback(getTelemetryState());
        } catch (e) {
            console.error('[OneForge Telemetry] Subscriber initial callback failed:', e);
        }
        return () => listeners.delete(callback);
    }

    /**
     * Subscribe to discrete state changes (e.g. NORMAL -> WARNING)
     */
    function onStateChange(callback) {
        stateChangeListeners.add(callback);
        return () => stateChangeListeners.delete(callback);
    }

    /**
     * Get current snapshot
     */
    function getTelemetryState() {
        return {
            telemetry: state.telemetry,
            connectionStatus: state.connectionStatus,
            lastUpdated: state.lastUpdated,
            error: state.error,
            isLastKnown: state.isLastKnown
        };
    }

    // Public Service API
    const service = {
        CONNECTION_STATUS,
        USER_ERRORS,
        getTelemetry,
        startPolling,
        stopPolling,
        subscribe,
        onStateChange,
        getState: getTelemetryState,
        useTelemetry: subscribe,
        isPolling: () => isPolling
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = service;
    }
    global.telemetryService = service;
    global.useTelemetry = subscribe;

})(typeof window !== 'undefined' ? window : global);
