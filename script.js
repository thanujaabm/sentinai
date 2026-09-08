/* =========================================================
   ONEFORGE CUBESAT — MISSION CONTROL DASHBOARD
   AUTONOMOUS HEALTH MONITORING & FDIR CONTROLLER
   =========================================================

   Authoritative Source of Truth: ESP32 Hardware
   Endpoint: http://192.168.4.1/api/telemetry
   ========================================================= */

/* =========================================================
   CONSTANTS & ROLLING DATA BUFFERS
   ========================================================= */
const MAX_POINTS = 60;

const timeLabels    = [];
const faultData     = [];
const severityData  = [];
const recoveryData  = [];
const healthData    = [];
const powerData     = [];
const voltData      = [];
const tempData      = [];

// Initialize 60-point rolling buffers with nominal baseline
for (let i = 0; i < MAX_POINTS; i++) {
    timeLabels.push("");
    faultData.push(18);
    severityData.push(0);
    recoveryData.push(0);
    healthData.push(100);
    powerData.push(1.78);
    voltData.push(7.42);
    tempData.push(28.4);
}


/* =========================================================
   LIVE DUAL CLOCK (LOCAL & UTC)
   ========================================================= */
function updateClock() {
    const now = new Date();

    // Local Time
    const localTime = now.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });

    // UTC Time
    const utcHours   = String(now.getUTCHours()).padStart(2, '0');
    const utcMinutes = String(now.getUTCMinutes()).padStart(2, '0');
    const utcSeconds = String(now.getUTCSeconds()).padStart(2, '0');
    const utcTime    = `${utcHours}:${utcMinutes}:${utcSeconds}`;

    // Date
    const dateStr = now.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "2-digit",
        year: "numeric"
    });

    const clockTimeEl    = document.getElementById("clockTime");
    const clockTimeUtcEl = document.getElementById("clockTimeUtc");
    const clockDateEl    = document.getElementById("clockDate");

    if (clockTimeEl)    clockTimeEl.textContent = localTime;
    if (clockTimeUtcEl) clockTimeUtcEl.textContent = utcTime;
    if (clockDateEl)    clockDateEl.textContent = `${dateStr} • UTC ${now.getTimezoneOffset() <= 0 ? '+' : '-'}${Math.abs(Math.floor(now.getTimezoneOffset() / 60))}`;
}

setInterval(updateClock, 1000);
updateClock();


/* =========================================================
   MOBILE SIDEBAR DRAWER TOGGLE
   ========================================================= */
const mobileNavToggle = document.getElementById("mobileNavToggle");
const appSidebar      = document.getElementById("appSidebar");
if (mobileNavToggle && appSidebar) {
    mobileNavToggle.addEventListener("click", () => {
        appSidebar.classList.toggle("open");
    });
}


/* =========================================================
   CHART.JS GLOBAL CONFIGURATION
   ========================================================= */
Chart.defaults.font.family = "'JetBrains Mono', 'Inter', monospace";
Chart.defaults.color = "#71889a";

const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: {
        intersect: false,
        mode: "index"
    },
    plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
    },
    scales: {
        x: {
            grid: {
                color: "rgba(14, 56, 92, 0.25)",
                borderDash: [3, 3]
            },
            ticks: {
                color: "#5b768a",
                font: { size: 9 },
                maxTicksLimit: 6
            }
        },
        y: {
            grid: {
                color: "rgba(14, 56, 92, 0.25)",
                borderDash: [3, 3]
            },
            ticks: {
                color: "#71889a",
                font: { size: 9 }
            }
        }
    }
};


/* =========================================================
   CHART INSTANCES
   ========================================================= */

// 1. Health Score Trend
let healthChart = null;
const healthCanvas = document.getElementById("healthChart");
if (healthCanvas) {
    healthChart = new Chart(healthCanvas, {
        type: "line",
        data: {
            labels: timeLabels,
            datasets: [{
                label: "Health",
                data: healthData,
                borderColor: "#00e887",
                backgroundColor: "rgba(0, 232, 135, 0.08)",
                borderWidth: 1.8,
                pointRadius: 0,
                tension: 0.25,
                fill: true
            }]
        },
        options: {
            ...commonOptions,
            scales: {
                x: commonOptions.scales.x,
                y: {
                    min: 0,
                    max: 100,
                    grid: commonOptions.scales.y.grid,
                    ticks: {
                        color: "#71889a",
                        font: { size: 9 },
                        stepSize: 25
                    }
                }
            }
        }
    });
}

// 2. Power & Voltage Trend
let powerChart = null;
const powerCanvas = document.getElementById("powerChart");
if (powerCanvas) {
    powerChart = new Chart(powerCanvas, {
        type: "line",
        data: {
            labels: timeLabels,
            datasets: [
                {
                    label: "Voltage (V)",
                    data: voltData,
                    borderColor: "#00e5ff",
                    borderWidth: 1.5,
                    pointRadius: 0,
                    tension: 0.2,
                    yAxisID: "y"
                },
                {
                    label: "Power (W)",
                    data: powerData,
                    borderColor: "#ffb21c",
                    borderWidth: 1.5,
                    pointRadius: 0,
                    tension: 0.2,
                    yAxisID: "y1"
                }
            ]
        },
        options: {
            ...commonOptions,
            scales: {
                x: commonOptions.scales.x,
                y: {
                    position: "left",
                    min: 0,
                    max: 12,
                    grid: commonOptions.scales.y.grid,
                    ticks: { color: "#00e5ff", font: { size: 9 }, stepSize: 3 }
                },
                y1: {
                    position: "right",
                    min: 0,
                    max: 10,
                    grid: { display: false },
                    ticks: { color: "#ffb21c", font: { size: 9 }, stepSize: 2.5 }
                }
            }
        }
    });
}

// 3. Temperature Profile Trend
let tempChart = null;
const tempCanvas = document.getElementById("tempChart");
if (tempCanvas) {
    tempChart = new Chart(tempCanvas, {
        type: "line",
        data: {
            labels: timeLabels,
            datasets: [
                {
                    label: "Temp (°C)",
                    data: tempData,
                    borderColor: "#08a9ff",
                    backgroundColor: "rgba(8, 169, 255, 0.08)",
                    borderWidth: 1.8,
                    pointRadius: 0,
                    tension: 0.3,
                    fill: true
                },
                {
                    label: "Limit",
                    data: Array(MAX_POINTS).fill(40),
                    borderColor: "rgba(255, 62, 77, 0.45)",
                    borderWidth: 1,
                    borderDash: [4, 4],
                    pointRadius: 0,
                    fill: false
                }
            ]
        },
        options: {
            ...commonOptions,
            scales: {
                x: commonOptions.scales.x,
                y: {
                    min: 15,
                    max: 50,
                    grid: commonOptions.scales.y.grid,
                    ticks: { color: "#71889a", font: { size: 9 }, stepSize: 10 }
                }
            }
        }
    });
}

// 4. Fault Activity Waveform (Original preserved)
let faultChart = null;
const faultCanvas = document.getElementById("faultChart");
if (faultCanvas) {
    faultChart = new Chart(faultCanvas, {
        type: "line",
        data: {
            labels: timeLabels,
            datasets: [
                {
                    label: "Fault Activity",
                    data: faultData,
                    borderColor: "#ff3e4d",
                    backgroundColor: "rgba(255, 62, 77, 0.10)",
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.18,
                    fill: true
                },
                {
                    label: "Threshold",
                    data: Array(MAX_POINTS).fill(60),
                    borderColor: "rgba(0, 229, 255, 0.4)",
                    borderWidth: 1,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false
                }
            ]
        },
        options: {
            ...commonOptions,
            scales: {
                x: commonOptions.scales.x,
                y: {
                    min: 0,
                    max: 100,
                    grid: commonOptions.scales.y.grid,
                    ticks: { color: "#71889a", font: { size: 9 }, stepSize: 20 }
                }
            }
        }
    });
}

// 5. Recovery Progress & Severity Chart (Original preserved)
let recoveryChart = null;
const recoveryCanvas = document.getElementById("recoveryChart");
if (recoveryCanvas) {
    recoveryChart = new Chart(recoveryCanvas, {
        type: "line",
        data: {
            labels: timeLabels,
            datasets: [
                {
                    label: "Recovery",
                    data: recoveryData,
                    borderColor: "#00e5ff",
                    backgroundColor: "rgba(0, 229, 255, 0.10)",
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.35,
                    fill: true
                },
                {
                    label: "Severity",
                    data: severityData,
                    borderColor: "#ffb21c",
                    borderWidth: 1.5,
                    borderDash: [3, 3],
                    pointRadius: 0,
                    stepped: true,
                    fill: false
                }
            ]
        },
        options: {
            ...commonOptions,
            scales: {
                x: commonOptions.scales.x,
                y: {
                    min: 0,
                    max: 3,
                    ticks: {
                        stepSize: 1,
                        color: "#7e94a4",
                        font: { size: 9 },
                        callback: function(value) {
                            const labels = ["IDLE / NORM", "DETECT / MED", "ISOLATE / HIGH", "RECOVER / CRIT"];
                            return labels[value] || "";
                        }
                    },
                    grid: commonOptions.scales.y.grid
                }
            }
        }
    });
}


/* =========================================================
   EVENT LOG
   ========================================================= */
function addEvent(message, type = "green") {
    const log = document.getElementById("eventLog");
    if (!log) return;

    const row = document.createElement("div");
    row.className = "event-row";

    const dot = document.createElement("span");
    dot.className = "event-dot " + (
        type === "blue"   ? "blue"   :
        type === "yellow" ? "yellow" :
        type === "red"    ? "red"    : ""
    );

    const text = document.createElement("span");
    text.textContent = message;

    const time = document.createElement("span");
    time.className = "event-time";
    time.textContent = new Date().toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });

    row.appendChild(dot);
    row.appendChild(text);
    row.appendChild(time);

    log.prepend(row);

    while (log.children.length > 30) {
        log.removeChild(log.lastChild);
    }
}


/* =========================================================
   FDIR STATE MACHINE 10-NODE PIPELINE CONTROLLER
   ========================================================= */
const PIPELINE_NODES = [
    { id: "nodeSense",    name: "Sense" },
    { id: "nodeValidate", name: "Validate" },
    { id: "nodeAnalyze",  name: "Analyze" },
    { id: "nodeDetect",   name: "Detect" },
    { id: "nodeClassify", name: "Classify" },
    { id: "nodeIsolate",  name: "Isolate" },
    { id: "nodeRecover",  name: "Recover" },
    { id: "nodeVerify",   name: "Verify" },
    { id: "nodeLog",      name: "Log" },
    { id: "nodeContinue", name: "Continue" }
];

let activeFdirStepIndex = 0;
let fdirSequenceTimer   = null;

function setFdirActiveNode(index, type = "active") {
    activeFdirStepIndex = index;
    const labelEl = document.getElementById("fdirActiveStepLabel");

    PIPELINE_NODES.forEach((node, i) => {
        const el = document.getElementById(node.id);
        if (!el) return;
        el.className = "pipeline-node";

        if (i === index) {
            if (type === "warning") {
                el.classList.add("warning-active");
            } else if (type === "critical") {
                el.classList.add("critical-active");
            } else {
                el.classList.add("active");
            }
        }
    });

    if (labelEl && PIPELINE_NODES[index]) {
        labelEl.textContent = `ACTIVE: ${PIPELINE_NODES[index].name.toUpperCase()}`;
        labelEl.className = `badge-tech ${type === "critical" ? "offline" : type === "warning" ? "sim" : "real"}`;
    }
}


/* =========================================================
   MISSION TIMELINE SEQUENCER
   ========================================================= */
const MISSION_PHASES = [
    { id: 1,  name: "Pre-Launch Readiness" },
    { id: 2,  name: "Ascent & Deployment" },
    { id: 3,  name: "Antenna & Solar Deploy" },
    { id: 4,  name: "Detumble & ADCS Acquisition" },
    { id: 5,  name: "Subsystem Commissioning" },
    { id: 6,  name: "Payload Activation" },
    { id: 7,  name: "Nominal Orbit Operations" },
    { id: 8,  name: "FDIR Anomaly Detection" },
    { id: 9,  name: "Fault Isolation" },
    { id: 10, name: "Subsystem Recovery" },
    { id: 11, name: "Post-Recovery Verification" },
    { id: 12, name: "Payload Re-engagement" },
    { id: 13, name: "Mission Data Downlink" },
    { id: 14, name: "Autonomous Telemetry Logging" },
    { id: 15, name: "Orbit Maintenance" },
    { id: 16, name: "Mission Verification & Complete" }
];

let currentPhaseIndex = 6; // Phase 7
let timelineInterval  = null;
let isTimelineRunning = true;

function updateTimelineUI() {
    const phaseNameEl    = document.getElementById("timelinePhaseName");
    const phaseCounterEl = document.getElementById("timelinePhaseCounter");
    const progressFillEl = document.getElementById("timelineProgressFill");

    const phase = MISSION_PHASES[currentPhaseIndex];
    if (!phase) return;

    if (phaseNameEl) phaseNameEl.textContent = phase.name;
    if (phaseCounterEl) {
        const numStr = String(phase.id).padStart(2, '0');
        phaseCounterEl.textContent = `Phase ${numStr} / 16`;
    }
    if (progressFillEl) {
        const pct = Math.round(((currentPhaseIndex + 1) / 16) * 100);
        progressFillEl.style.width = `${pct}%`;
    }
}

function startTimeline() {
    if (timelineInterval) clearInterval(timelineInterval);
    isTimelineRunning = true;
    const badge = document.getElementById("timelineStateBadge");
    if (badge) {
        badge.textContent = "RUNNING";
        badge.className = "badge-tech real";
    }
    timelineInterval = setInterval(() => {
        currentPhaseIndex = (currentPhaseIndex + 1) % MISSION_PHASES.length;
        updateTimelineUI();
    }, 15000);
    updateTimelineUI();
}

function pauseTimeline() {
    if (timelineInterval) {
        clearInterval(timelineInterval);
        timelineInterval = null;
    }
    isTimelineRunning = false;
    const badge = document.getElementById("timelineStateBadge");
    if (badge) {
        badge.textContent = "PAUSED";
        badge.className = "badge-tech sim";
    }
}

function resetTimeline() {
    pauseTimeline();
    currentPhaseIndex = 6; // Reset to Nominal Orbit Operations
    updateTimelineUI();
}

startTimeline();


/* =========================================================
   HEALTH SCORE CIRCULAR SVG GAUGE UPDATER
   ========================================================= */
function updateHealthGauge(score) {
    const clamped = Math.max(0, Math.min(100, Math.round(score)));
    const circle  = document.getElementById("healthRingCircle");
    const numEl   = document.getElementById("healthScoreNum");

    if (numEl) numEl.textContent = clamped;

    if (circle) {
        // Circumference of r=58 circle is ~364.4 to 377
        const total = 364;
        const offset = total - (total * clamped / 100);
        circle.style.strokeDashoffset = offset;

        if (clamped >= 80) {
            circle.style.stroke = "var(--green)";
        } else if (clamped >= 50) {
            circle.style.stroke = "var(--yellow)";
        } else {
            circle.style.stroke = "var(--red)";
        }
    }
}


/* =========================================================
   SUBSYSTEM HEALTH & STATUS UPDATERS
   ========================================================= */
function updateSubsystemHealth(statusStr, healthScore) {
    let obc = 98, eps = 95, sns = 99, com = 88, fdir = 100, adcs = 94, str = 96;

    if (statusStr === "NORMAL") {
        obc  = 98;
        eps  = 95;
        sns  = 99;
        com  = 88;
        fdir = 100;
        adcs = 94;
        str  = 96;
    } else if (statusStr === "WARNING") {
        obc  = 92;
        eps  = 64;
        sns  = 78;
        com  = 85;
        fdir = 95;
        adcs = 90;
        str  = 92;
    } else if (statusStr === "CRITICAL") {
        obc  = 88;
        eps  = 38; // Heavily degraded due to overcurrent/voltage fault
        sns  = 65;
        com  = 80;
        fdir = 98; // Actively isolating
        adcs = 82;
        str  = 90;
    } else if (statusStr === "RECOVERY") {
        obc  = 95;
        eps  = 86;
        sns  = 92;
        com  = 86;
        fdir = 100;
        adcs = 92;
        str  = 95;
    }

    const setBar = (code, val) => {
        const fill = document.getElementById(`fill${code}`);
        const pct  = document.getElementById(`pct${code}`);
        if (fill) {
            fill.style.width = `${val}%`;
            fill.className = `subsystem-fill ${val < 60 ? "critical" : val < 80 ? "warning" : ""}`;
        }
        if (pct) pct.textContent = `${val}%`;
    };

    setBar("OBC", obc);
    setBar("EPS", eps);
    setBar("SNS", sns);
    setBar("COM", com);
    setBar("FDIR", fdir);
    setBar("ADCS", adcs);
    setBar("STR", str);

    // Subsystem Cards (Grid of 7)
    const setCard = (code, label, statusClass) => {
        const badge = document.getElementById(`subBadge${code}`);
        if (badge) {
            badge.className = `subsystem-status-badge ${statusClass}`;
            badge.innerHTML = `<span class="subsystem-card-dot"></span>${label}`;
        }
    };

    if (statusStr === "NORMAL") {
        setCard("OBC", "Online", "");
        setCard("EPS", "Online", "");
        setCard("SNS", "Online", "");
        setCard("COM", "Active", "");
        setCard("FDIR", "Active", "");
        setCard("ADCS", "Online", "");
        setCard("STR", "OK", "");
    } else if (statusStr === "WARNING") {
        setCard("OBC", "Online", "");
        setCard("EPS", "Degraded", "warning");
        setCard("SNS", "Warning", "warning");
        setCard("COM", "Active", "");
        setCard("FDIR", "Detecting", "warning");
        setCard("ADCS", "Online", "");
        setCard("STR", "OK", "");
    } else if (statusStr === "CRITICAL") {
        setCard("OBC", "Online", "");
        setCard("EPS", "Fault", "critical");
        setCard("SNS", "Isolated", "warning");
        setCard("COM", "Active", "");
        setCard("FDIR", "Isolating", "critical");
        setCard("ADCS", "Online", "");
        setCard("STR", "OK", "");
    } else if (statusStr === "RECOVERY") {
        setCard("OBC", "Online", "");
        setCard("EPS", "Restoring", "");
        setCard("SNS", "Online", "");
        setCard("COM", "Active", "");
        setCard("FDIR", "Recovering", "");
        setCard("ADCS", "Online", "");
        setCard("STR", "OK", "");
    }
}


/* =========================================================
   POWER LOAD SHEDDING PRIORITY CONTROLLER
   ========================================================= */
function updatePowerPriority(statusStr) {
    const p1Item   = document.getElementById("prioP1");
    const p2Item   = document.getElementById("prioP2");
    const p3Item   = document.getElementById("prioP3");
    const p3Status = document.getElementById("statusP3");

    if (statusStr === "CRITICAL") {
        // Shed non-critical P3 payload
        if (p3Item) p3Item.className = "power-priority-item shed";
        if (p3Status) p3Status.textContent = "SHED (OFFLINE)";
    } else if (statusStr === "WARNING") {
        if (p3Item) p3Item.className = "power-priority-item";
        if (p3Status) p3Status.textContent = "THROTTLED";
    } else {
        if (p3Item) p3Item.className = "power-priority-item";
        if (p3Status) p3Status.textContent = "ONLINE";
    }
}


/* =========================================================
   SENSOR VALIDATION MATRIX CALCULATOR
   ========================================================= */
function updateSensorValidation(bmpTemp) {
    const valBmp   = document.getElementById("valSensorBmp");
    const valDht   = document.getElementById("valSensorDht");
    const valDs    = document.getElementById("valSensorDs");
    const banner   = document.getElementById("sensorConsistencyBanner");
    const statusEl = document.getElementById("sensorConsistencyStatus");

    if (typeof bmpTemp === "number") {
        valBmp.textContent = `${bmpTemp.toFixed(1)} °C`;
        const dhtTemp = bmpTemp + 0.3;
        const dsTemp  = bmpTemp - 0.2;
        if (valDht) valDht.textContent = `${dhtTemp.toFixed(1)} °C`;
        if (valDs)  valDs.textContent  = `${dsTemp.toFixed(1)} °C`;

        const diff = Math.abs(dhtTemp - bmpTemp);
        if (diff <= 1.5) {
            if (banner)   banner.className = "sensor-status-banner";
            if (statusEl) statusEl.textContent = "STATUS: CONSISTENT (Δ < 0.5°C)";
        } else {
            if (banner)   banner.className = "sensor-status-banner warning";
            if (statusEl) statusEl.textContent = "STATUS: DEVIATION DETECTED";
        }
    } else {
        if (valBmp) valBmp.textContent = "--.- °C";
        if (banner) banner.className = "sensor-status-banner";
        if (statusEl) statusEl.textContent = "STATUS: AWAITING BMP280";
    }
}


/* =========================================================
   RELATIVE "LAST UPDATE" TIMER
   ========================================================= */
let lastKnownTimestamp = null;

function updateLastUpdateTimer() {
    const devLastUpdate        = document.getElementById("devLastUpdate");
    const comLastContactHeader = document.getElementById("comLastContactHeader");

    if (!lastKnownTimestamp) {
        if (devLastUpdate)        devLastUpdate.textContent = "Last Update: —";
        if (comLastContactHeader) comLastContactHeader.textContent = "Last Contact: --:--:--";
        return;
    }

    const elapsedSec = Math.max(0, Math.floor((Date.now() - lastKnownTimestamp.getTime()) / 1000));
    const timeStr    = lastKnownTimestamp.toLocaleTimeString("en-US", { hour12: false });

    if (devLastUpdate) {
        devLastUpdate.textContent = elapsedSec <= 1 ? "Last Update: Just now" : `Last Update: ${elapsedSec}s ago`;
    }
    if (comLastContactHeader) {
        comLastContactHeader.textContent = `Last Contact: ${timeStr}`;
    }
}

setInterval(updateLastUpdateTimer, 1000);


/* =========================================================
   UPDATE DASHBOARD WITH TELEMETRY (AUTHORITATIVE ESP32 DATA)
   ========================================================= */
function updateDashboardWithTelemetry(telemetry, isLastKnown) {
    if (!telemetry) return;

    // 1. Environment (REAL BMP280 Sensor Readings)
    const tempEl     = document.getElementById("temperature");
    const pressureEl = document.getElementById("pressure");
    const devTemp    = document.getElementById("devTemp");
    const devPress   = document.getElementById("devPressure");

    const tempVal  = telemetry.environment.temperature;
    const pressVal = telemetry.environment.pressure;

    const tempStr  = typeof tempVal === "number" ? tempVal.toFixed(1) : "--.-";
    const pressStr = typeof pressVal === "number" ? pressVal.toFixed(1) : "----.-";

    if (tempEl)     tempEl.textContent = tempStr;
    if (pressureEl) pressureEl.textContent = pressStr;
    if (devTemp)    devTemp.textContent = tempStr;
    if (devPress)   devPress.textContent = pressStr;

    updateSensorValidation(tempVal);

    // 2. Power (SIMULATED INA219 from ESP32 Prototype)
    const voltEl       = document.getElementById("voltage");
    const busVoltEl    = document.getElementById("busVoltage");
    const currEl       = document.getElementById("current");
    const pwrEl        = document.getElementById("power");
    const powerCurrEl  = document.getElementById("powerCurrent");
    const powerPowerEl = document.getElementById("powerPower");

    const devVolt = document.getElementById("devVoltage");
    const devCurr = document.getElementById("devCurrent");
    const devPwr  = document.getElementById("devPower");

    const vVal = telemetry.power.voltage;
    const cVal = telemetry.power.current;
    // Calculate P = V * I if power is not provided
    const pVal = typeof telemetry.power.power === "number" ? telemetry.power.power : (vVal * cVal);

    const vStr = typeof vVal === "number" ? vVal.toFixed(2) : "-.--";
    const cStr = typeof cVal === "number" ? cVal.toFixed(2) : "-.--";
    const pStr = typeof pVal === "number" ? pVal.toFixed(2) : "-.--";

    if (voltEl)       voltEl.textContent = vStr;
    if (busVoltEl)    busVoltEl.textContent = vStr;
    if (currEl)       currEl.textContent = cStr;
    if (pwrEl)        pwrEl.textContent = pStr;
    if (powerCurrEl)  powerCurrEl.textContent = cStr;
    if (powerPowerEl) powerPowerEl.textContent = pStr;

    if (devVolt) devVolt.textContent = vStr;
    if (devCurr) devCurr.textContent = cStr;
    if (devPwr)  devPwr.textContent = pStr;

    // 3. Motion (SIMULATED MPU6050 from ESP32 Prototype)
    const accel = telemetry.motion.accel;
    const gyro  = telemetry.motion.gyro;

    const axEl = document.getElementById("accelX");
    const ayEl = document.getElementById("accelY");
    const azEl = document.getElementById("accelZ");

    const gxEl = document.getElementById("gyroX");
    const gyEl = document.getElementById("gyroY");
    const gzEl = document.getElementById("gyroZ");

    if (axEl) axEl.textContent = accel.x.toFixed(2);
    if (ayEl) ayEl.textContent = accel.y.toFixed(2);
    if (azEl) azEl.textContent = accel.z.toFixed(2);

    if (gxEl) gxEl.textContent = gyro.x.toFixed(2);
    if (gyEl) gyEl.textContent = gyro.y.toFixed(2);
    if (gzEl) gzEl.textContent = gyro.z.toFixed(2);

    const devMotionSummary = document.getElementById("devMotionSummary");
    if (devMotionSummary) {
        devMotionSummary.textContent =
            `A: ${accel.x.toFixed(2)}, ${accel.y.toFixed(2)}, ${accel.z.toFixed(2)} | G: ${gyro.x.toFixed(1)}, ${gyro.y.toFixed(1)}, ${gyro.z.toFixed(1)}`;
    }

    // 4. Device ID & IP
    const devIdEl = document.getElementById("devDeviceId");
    const devIpEl = document.getElementById("devIp");
    if (devIdEl) devIdEl.textContent = telemetry.deviceId || "ONEFORGE-CUBESAT-01";
    if (devIpEl) devIpEl.textContent = (telemetry.system && telemetry.system.ip) || "192.168.4.1";

    // 5. Health Score & Status
    const rawHealth = typeof telemetry.healthScore === "number" ? telemetry.healthScore : 100;
    const devHealth = document.getElementById("devHealth");
    if (devHealth) devHealth.textContent = `${rawHealth}%`;

    updateHealthGauge(rawHealth);

    const statusStr = (telemetry.status || "NORMAL").toUpperCase();
    const faultStr  = telemetry.fault || "SYSTEM NOMINAL";

    updateSubsystemHealth(statusStr, rawHealth);
    updatePowerPriority(statusStr);

    const devStatus = document.getElementById("devStatus");
    if (devStatus) {
        devStatus.textContent = isLastKnown ? `${statusStr} (LAST KNOWN)` : statusStr;
        devStatus.className = "dev-value " + (
            statusStr === "NORMAL"   ? "status-normal"   :
            statusStr === "WARNING"  ? "status-warning"  :
            statusStr === "CRITICAL" ? "status-critical" : "status-recovery"
        );
    }

    // 6. Mission Mode Row Card 1
    const modeStatusEl = document.getElementById("missionModeStatus");
    const modeDescEl   = document.getElementById("missionModeDesc");
    const modeCircleEl = document.getElementById("missionModeCircle");
    const modeIconEl   = document.getElementById("missionModeIcon");
    const modeBadgeEl  = document.getElementById("missionModeBadge");

    if (modeStatusEl && modeDescEl && modeCircleEl) {
        modeStatusEl.textContent = statusStr;
        if (statusStr === "NORMAL") {
            modeDescEl.textContent = "All systems operating nominally";
            modeStatusEl.style.color = "var(--green)";
            modeCircleEl.className = "mode-indicator-circle";
            if (modeIconEl) modeIconEl.textContent = "✓";
            if (modeBadgeEl) { modeBadgeEl.textContent = "NOMINAL"; modeBadgeEl.className = "badge-tech real"; }
        } else if (statusStr === "WARNING") {
            modeDescEl.textContent = faultStr;
            modeStatusEl.style.color = "var(--yellow)";
            modeCircleEl.className = "mode-indicator-circle warning";
            if (modeIconEl) modeIconEl.textContent = "⚠";
            if (modeBadgeEl) { modeBadgeEl.textContent = "WARNING"; modeBadgeEl.className = "badge-tech sim"; }
        } else if (statusStr === "CRITICAL") {
            modeDescEl.textContent = faultStr;
            modeStatusEl.style.color = "var(--red)";
            modeCircleEl.className = "mode-indicator-circle critical";
            if (modeIconEl) modeIconEl.textContent = "✕";
            if (modeBadgeEl) { modeBadgeEl.textContent = "CRITICAL"; modeBadgeEl.className = "badge-tech offline"; }
        } else if (statusStr === "RECOVERY") {
            modeDescEl.textContent = faultStr;
            modeStatusEl.style.color = "var(--blue)";
            modeCircleEl.className = "mode-indicator-circle recovery";
            if (modeIconEl) modeIconEl.textContent = "⚙";
            if (modeBadgeEl) { modeBadgeEl.textContent = "RECOVERY"; modeBadgeEl.className = "badge-tech info"; }
        }
    }

    // 7. System Status Message
    const sysMsgEl = document.getElementById("systemMessage");
    if (sysMsgEl) {
        if (isLastKnown) {
            sysMsgEl.textContent = `DISCONNECTED — LAST KNOWN: ${statusStr}`;
            sysMsgEl.style.color = "var(--yellow)";
        } else if (statusStr === "NORMAL") {
            sysMsgEl.textContent = `✓ ${faultStr}`;
            sysMsgEl.style.color = "var(--green)";
        } else if (statusStr === "WARNING") {
            sysMsgEl.textContent = `⚠ ${faultStr}`;
            sysMsgEl.style.color = "var(--yellow)";
        } else if (statusStr === "CRITICAL") {
            sysMsgEl.textContent = `⚠ ${faultStr}`;
            sysMsgEl.style.color = "var(--red)";
        } else if (statusStr === "RECOVERY") {
            sysMsgEl.textContent = `⚙ ${faultStr}`;
            sysMsgEl.style.color = "var(--cyan)";
        }
    }

    // 8. FDIR Cards & Pipeline Node Highlighting
    const faultStatusEl = document.getElementById("faultStatus");
    const faultDescEl   = document.getElementById("faultDescription");
    const sevStatusEl   = document.getElementById("severityStatus");
    const sevDescEl     = document.getElementById("severityDescription");
    const fdirStateEl   = document.getElementById("fdirState");
    const stateDescEl   = document.getElementById("stateDescription");
    const actionEl      = document.getElementById("actionStatus");
    const actionDescEl  = document.getElementById("actionDescription");
    const recoveryEl    = document.getElementById("recoveryStatus");
    const recDescEl     = document.getElementById("recoveryDescription");

    // Current Anomaly Diagnostic Panel
    const anomBox       = document.getElementById("anomalyHeadlineBox");
    const anomTitle     = document.getElementById("anomalyStatusTitle");
    const anomSub       = document.getElementById("anomalyStatusSub");
    const anomSubsys    = document.getElementById("anomalySubsystem");
    const anomSev       = document.getElementById("anomalySeverity");
    const anomAct       = document.getElementById("anomalyAction");
    const anomRes       = document.getElementById("anomalyResult");
    const anomBadge     = document.getElementById("anomalyBadge");

    let sevLevel = 0;
    let recLevel = 0;
    let chartFaultVal = 18;

    if (statusStr === "NORMAL") {
        sevLevel = 0;
        recLevel = 0;
        chartFaultVal = 18;

        setFdirActiveNode(0, "active"); // Sense

        if (faultStatusEl) { faultStatusEl.textContent = "NORMAL"; faultStatusEl.className = "fdir-value normal-text"; }
        if (faultDescEl)   faultDescEl.textContent = faultStr;
        if (sevStatusEl)   { sevStatusEl.textContent = "NORMAL"; sevStatusEl.className = "fdir-value normal-text"; }
        if (sevDescEl)     sevDescEl.textContent = "System operating normally";
        if (fdirStateEl)   { fdirStateEl.textContent = "MONITOR"; fdirStateEl.className = "fdir-value blue-text"; }
        if (stateDescEl)   stateDescEl.textContent = "Monitoring live ESP32 telemetry";
        if (actionEl)      { actionEl.textContent = "MONITOR"; actionEl.className = "fdir-value blue-text"; }
        if (actionDescEl)  actionDescEl.textContent = "No corrective action required";
        if (recoveryEl)    { recoveryEl.textContent = "IDLE"; recoveryEl.className = "fdir-value success-text"; }
        if (recDescEl)     recDescEl.textContent = "System stable";

        if (anomBox)    anomBox.className = "anomaly-headline";
        if (anomTitle)  anomTitle.textContent = "SYSTEM HEALTHY";
        if (anomSub)    anomSub.textContent = "No active anomalies. Electrical power and thermal systems nominal.";
        if (anomSubsys) anomSubsys.textContent = "NONE (ALL NOMINAL)";
        if (anomSev)    anomSev.textContent = "NORMAL (LEVEL 0)";
        if (anomAct)    anomAct.textContent = "AUTONOMOUS MONITORING";
        if (anomRes)    anomRes.textContent = "STABLE";
        if (anomBadge)  { anomBadge.textContent = "NOMINAL"; anomBadge.className = "badge-tech real"; }

    } else if (statusStr === "WARNING") {
        sevLevel = 1;
        recLevel = 1;
        chartFaultVal = 55;

        setFdirActiveNode(3, "warning"); // Detect

        if (faultStatusEl) { faultStatusEl.textContent = "WARNING"; faultStatusEl.className = "fdir-value warning-text"; }
        if (faultDescEl)   faultDescEl.textContent = faultStr;
        if (sevStatusEl)   { sevStatusEl.textContent = "MEDIUM"; sevStatusEl.className = "fdir-value warning-text"; }
        if (sevDescEl)     sevDescEl.textContent = "Abnormal condition detected by ESP32";
        if (fdirStateEl)   { fdirStateEl.textContent = "DETECT"; fdirStateEl.className = "fdir-value warning-text"; }
        if (stateDescEl)   stateDescEl.textContent = "Fault identification active";
        if (actionEl)      { actionEl.textContent = "ANALYZE"; actionEl.className = "fdir-value warning-text"; }
        if (actionDescEl)  actionDescEl.textContent = "Telemetry outside expected limits";
        if (recoveryEl)    { recoveryEl.textContent = "PENDING"; recoveryEl.className = "fdir-value warning-text"; }
        if (recDescEl)     recDescEl.textContent = "Awaiting recovery action";

        if (anomBox)    anomBox.className = "anomaly-headline warning";
        if (anomTitle)  anomTitle.textContent = "ANOMALY DETECTED";
        if (anomSub)    anomSub.textContent = faultStr;
        if (anomSubsys) anomSubsys.textContent = "EPS / POWER";
        if (anomSev)    anomSev.textContent = "WARNING (LEVEL 1)";
        if (anomAct)    anomAct.textContent = "TELEMETRY VALIDATION";
        if (anomRes)    anomRes.textContent = "PENDING MITIGATION";
        if (anomBadge)  { anomBadge.textContent = "WARNING"; anomBadge.className = "badge-tech sim"; }

    } else if (statusStr === "CRITICAL") {
        sevLevel = 3;
        recLevel = 2;
        chartFaultVal = 85;

        setFdirActiveNode(5, "critical"); // Isolate

        if (faultStatusEl) { faultStatusEl.textContent = "CRITICAL"; faultStatusEl.className = "fdir-value critical-text"; }
        if (faultDescEl)   faultDescEl.textContent = faultStr;
        if (sevStatusEl)   { sevStatusEl.textContent = "CRITICAL"; sevStatusEl.className = "fdir-value critical-text"; }
        if (sevDescEl)     sevDescEl.textContent = "Critical fault condition active";
        if (fdirStateEl)   { fdirStateEl.textContent = "ISOLATE"; fdirStateEl.className = "fdir-value critical-text"; }
        if (stateDescEl)   stateDescEl.textContent = "Isolating affected subsystem load";
        if (actionEl)      { actionEl.textContent = "LOAD SHED"; actionEl.className = "fdir-value critical-text"; }
        if (actionDescEl)  actionDescEl.textContent = "Offending P3 payload load disconnected";
        if (recoveryEl)    { recoveryEl.textContent = "RECOVERING"; recoveryEl.className = "fdir-value blue-text"; }
        if (recDescEl)     recDescEl.textContent = "Autonomous protection triggered";

        if (anomBox)    anomBox.className = "anomaly-headline critical";
        if (anomTitle)  anomTitle.textContent = "CRITICAL FAULT: OVERCURRENT";
        if (anomSub)    anomSub.textContent = "Overcurrent condition in Electrical Power System (EPS). Offending load isolated.";
        if (anomSubsys) anomSubsys.textContent = "EPS (LOAD SHED P3)";
        if (anomSev)    anomSev.textContent = "CRITICAL (LEVEL 3)";
        if (anomAct)    anomAct.textContent = "ISOLATE LOAD & REGULATE";
        if (anomRes)    anomRes.textContent = "CURRENT RESTORATION ACTIVE";
        if (anomBadge)  { anomBadge.textContent = "CRITICAL"; anomBadge.className = "badge-tech offline"; }

    } else if (statusStr === "RECOVERY") {
        sevLevel = 2;
        recLevel = 2.5;
        chartFaultVal = 30;

        setFdirActiveNode(6, "active"); // Recover

        if (faultStatusEl) { faultStatusEl.textContent = "RECOVERY"; faultStatusEl.className = "fdir-value blue-text"; }
        if (faultDescEl)   faultDescEl.textContent = faultStr;
        if (sevStatusEl)   { sevStatusEl.textContent = "HIGH"; sevStatusEl.className = "fdir-value warning-text"; }
        if (sevDescEl)     sevDescEl.textContent = "Subsystem recovery executing";
        if (fdirStateEl)   { fdirStateEl.textContent = "RECOVER"; fdirStateEl.className = "fdir-value blue-text"; }
        if (stateDescEl)   stateDescEl.textContent = "Restoring nominal operating state";
        if (actionEl)      { actionEl.textContent = "RECOVERY"; actionEl.className = "fdir-value blue-text"; }
        if (actionDescEl)  actionDescEl.textContent = "Restoring spacecraft subsystems";
        if (recoveryEl)    { recoveryEl.textContent = "RECOVERING"; recoveryEl.className = "fdir-value blue-text"; }
        if (recDescEl)     recDescEl.textContent = "Returning to nominal parameters";

        if (anomBox)    anomBox.className = "anomaly-headline";
        if (anomTitle)  anomTitle.textContent = "RECOVERY IN PROGRESS";
        if (anomSub)    anomSub.textContent = "Subsystem parameters normalizing. Bus current stabilized.";
        if (anomSubsys) anomSubsys.textContent = "EPS & PAYLOAD";
        if (anomSev)    anomSev.textContent = "MITIGATING (LEVEL 2)";
        if (anomAct)    anomAct.textContent = "RE-ENGAGE CONTROLLERS";
        if (anomRes)    anomRes.textContent = "VERIFYING TELEMETRY";
        if (anomBadge)  { anomBadge.textContent = "RECOVERY"; anomBadge.className = "badge-tech info"; }
    }

    // 9. Update Rolling Chart Buffers
    faultData.push(chartFaultVal);
    faultData.shift();

    severityData.push(sevLevel);
    severityData.shift();

    recoveryData.push(recLevel);
    recoveryData.shift();

    healthData.push(rawHealth);
    healthData.shift();

    powerData.push(typeof pVal === "number" ? pVal : 1.78);
    powerData.shift();

    voltData.push(typeof vVal === "number" ? vVal : 7.42);
    voltData.shift();

    tempData.push(typeof tempVal === "number" ? tempVal : 28.4);
    tempData.shift();

    if (faultChart)    faultChart.update("none");
    if (recoveryChart) recoveryChart.update("none");
    if (healthChart)   healthChart.update("none");
    if (powerChart)    powerChart.update("none");
    if (tempChart)     tempChart.update("none");

    // 10. Update Chart Status Badges
    const faultChartStateEl  = document.getElementById("faultChartState");
    const sevChartStateEl    = document.getElementById("severityChartState");
    const recChartStateEl    = document.getElementById("recoveryChartState");
    const healthChartStateEl = document.getElementById("healthChartState");
    const powerChartStateEl  = document.getElementById("powerChartState");
    const tempChartStateEl   = document.getElementById("tempChartState");

    if (faultChartStateEl) {
        faultChartStateEl.textContent = statusStr === "NORMAL" ? "● IDLE" : `● ${statusStr}`;
        faultChartStateEl.className = "chart-state " + (
            statusStr === "NORMAL"   ? "green-state"    :
            statusStr === "WARNING"  ? "severity-state" : "critical-state"
        );
    }

    if (sevChartStateEl) {
        sevChartStateEl.textContent = `● ${statusStr}`;
        sevChartStateEl.className = "chart-state " + (
            statusStr === "NORMAL"   ? "green-state"    :
            statusStr === "WARNING"  ? "severity-state" : "critical-state"
        );
    }

    if (recChartStateEl) {
        const recNames = ["IDLE", "DETECT", "ISOLATE", "RECOVER"];
        const idx = Math.min(3, Math.floor(recLevel));
        recChartStateEl.textContent = `● ${recNames[idx]}`;
    }

    if (healthChartStateEl) {
        healthChartStateEl.textContent = `● ${rawHealth}%`;
        healthChartStateEl.className = `chart-state ${rawHealth >= 80 ? "green-state" : rawHealth >= 50 ? "severity-state" : "critical-state"}`;
    }

    if (powerChartStateEl) {
        powerChartStateEl.textContent = statusStr === "CRITICAL" ? "● LOAD SHED" : "● NOMINAL";
        powerChartStateEl.className = `chart-state ${statusStr === "CRITICAL" ? "critical-state" : "green-state"}`;
    }

    if (tempChartStateEl) {
        tempChartStateEl.textContent = typeof tempVal === "number" ? `● ${tempVal.toFixed(1)}°C` : "● --.-°C";
    }
}


/* =========================================================
   CONNECTION STATE HANDLER
   ========================================================= */
function updateConnectionUI(connectionStatus, error, isLastKnown) {
    const devConnectionStatus = document.getElementById("devConnectionStatus");
    const devStatusDot        = document.getElementById("devStatusDot");
    const linkBadge           = document.getElementById("linkBadge");
    const devErrorBanner      = document.getElementById("devErrorBanner");
    const devErrorMessage     = document.getElementById("devErrorMessage");
    const sysMsgEl            = document.getElementById("systemMessage");
    const comWifiStatus       = document.getElementById("comWifiStatus");
    const comLoraStatus       = document.getElementById("comLoraStatus");
    const sysOnlineIndicator  = document.getElementById("systemOnlineIndicator");
    const sysOnlineText       = document.getElementById("systemOnlineText");
    const sysDotEl            = document.getElementById("systemStatusDot");

    if (connectionStatus === "CONNECTED") {
        if (devConnectionStatus) {
            devConnectionStatus.textContent = "CONNECTED";
            devConnectionStatus.className = "dev-badge connected";
        }
        if (devStatusDot) {
            devStatusDot.className = "dev-pulse-dot connected";
        }
        if (linkBadge) {
            linkBadge.textContent = "● LINK: CONNECTED";
            linkBadge.className = "badge link connected";
        }
        if (devErrorBanner) {
            devErrorBanner.style.display = "none";
        }
        if (comWifiStatus) {
            comWifiStatus.textContent = "CONNECTED";
            comWifiStatus.className = "badge-tech real";
        }
        if (comLoraStatus) {
            comLoraStatus.textContent = "CONNECTED (GND)";
            comLoraStatus.className = "badge-tech real";
        }
        if (sysOnlineIndicator) {
            sysOnlineIndicator.className = "system-status-indicator online";
        }
        if (sysOnlineText) {
            sysOnlineText.textContent = "SYSTEM ONLINE";
        }
        if (sysDotEl) {
            sysDotEl.className = "status-pulse-dot";
        }
    } else {
        const isConnecting = (connectionStatus === "CONNECTING");
        const statusLabel  = isConnecting ? "CONNECTING" : "OFFLINE";

        if (devConnectionStatus) {
            devConnectionStatus.textContent = statusLabel;
            devConnectionStatus.className = `dev-badge ${statusLabel.toLowerCase()}`;
        }
        if (devStatusDot) {
            devStatusDot.className = `dev-pulse-dot ${statusLabel.toLowerCase()}`;
        }
        if (linkBadge) {
            linkBadge.textContent = isConnecting ? "◌ LINK: CONNECTING..." : "✕ LINK: OFFLINE";
            linkBadge.className = isConnecting ? "badge link connecting" : "badge link offline";
        }
        if (devErrorBanner) {
            devErrorBanner.style.display = "flex";
            if (devErrorMessage) {
                devErrorMessage.innerHTML = error ||
                    "Connect to Wi-Fi network <strong>OneForge-CubeSat</strong> to stream live ESP32 telemetry.";
            }
        }
        if (comWifiStatus) {
            comWifiStatus.textContent = statusLabel;
            comWifiStatus.className = isConnecting ? "badge-tech sim" : "badge-tech offline";
        }
        if (comLoraStatus) {
            comLoraStatus.textContent = "SIMULATED";
            comLoraStatus.className = "badge-tech sim";
        }
        if (sysMsgEl && !isLastKnown) {
            sysMsgEl.textContent = "OFFLINE — AWAITING ESP32";
            sysMsgEl.style.color = "var(--text-muted)";
        }
        if (sysOnlineIndicator) {
            sysOnlineIndicator.className = isConnecting ? "system-status-indicator warning" : "system-status-indicator offline";
        }
        if (sysOnlineText) {
            sysOnlineText.textContent = isConnecting ? "CONNECTING..." : "LINK: OFFLINE";
        }
        if (sysDotEl) {
            sysDotEl.className = isConnecting ? "status-pulse-dot warning" : "status-pulse-dot offline";
        }
    }
}


/* =========================================================
   WIRE TELEMETRY SERVICE (AUTHORITATIVE ESP32 LINK)
   ========================================================= */
if (typeof telemetryService !== "undefined") {

    // 1. Telemetry Packet Subscription
    telemetryService.subscribe(({ telemetry, connectionStatus, lastUpdated, error, isLastKnown }) => {
        lastKnownTimestamp = lastUpdated;

        updateConnectionUI(connectionStatus, error, isLastKnown);

        if (telemetry) {
            updateDashboardWithTelemetry(telemetry, isLastKnown);
        }
    });

    // 2. State-Change Event Log (Fires ONLY on real state transitions)
    telemetryService.onStateChange(({ timestamp, previousState, newState, fault }) => {
        const dotColor = (
            newState === "NORMAL"   ? "green"  :
            newState === "WARNING"  ? "yellow" :
            newState === "CRITICAL" ? "red"    : "blue"
        );

        addEvent(`${timestamp} — ${newState}: ${fault}`, dotColor);
    });

    // Start 1000ms polling to ESP32
    telemetryService.startPolling(1000);

} else {
    console.warn("[OneForge] telemetryService is not defined. Ensure telemetryService.js is loaded.");
}


/* =========================================================
   PROTOTYPE CONTROLS & FDIR DEMO SIMULATION
   =========================================================
   Full autonomous progression:
   Detect -> Classify -> Isolate -> Recover -> Verify
   ========================================================= */

function injectOvercurrent() {
    if (telemetryService && telemetryService.getState().connectionStatus === "CONNECTED") {
        addEvent("ESP32 Connected: State is controlled directly by ESP32 sensors", "blue");
        return;
    }

    if (fdirSequenceTimer) clearTimeout(fdirSequenceTimer);

    addEvent("Prototype Injection: High Overcurrent condition detected on EPS Bus", "red");
    setFdirActiveNode(3, "critical"); // Detect

    // 1. Transition to CRITICAL (Detect & Isolate)
    updateDashboardWithTelemetry({
        deviceId: "ONEFORGE-CUBESAT-01",
        status: "CRITICAL",
        healthScore: 42,
        fault: "OVERCURRENT: EPS BUS > 1.25A",
        environment: { temperature: 36.8, pressure: 1011.0 },
        motion: { accel: { x: 0.12, y: -0.18, z: 1.08 }, gyro: { x: 0.8, y: -0.4, z: 0.2 } },
        power: { voltage: 6.80, current: 1.34, power: 9.11 },
        system: { uptime: 120, ip: "192.168.4.1", ssid: "OneForge-CubeSat" }
    }, true);

    // Step through FDIR State Sequence: Classify -> Isolate -> Recover -> Verify
    fdirSequenceTimer = setTimeout(() => {
        setFdirActiveNode(4, "critical"); // Classify
        addEvent("FDIR Classification: Fault categorized as EPS Primary Load Overcurrent", "yellow");

        fdirSequenceTimer = setTimeout(() => {
            setFdirActiveNode(5, "critical"); // Isolate
            addEvent("FDIR Isolation: Disconnecting non-critical P3 payload circuit", "red");

            fdirSequenceTimer = setTimeout(() => {
                showSuccess(); // Trigger recovery sequence
            }, 3000);

        }, 2500);

    }, 2000);
}

function forceNormal() {
    if (fdirSequenceTimer) clearTimeout(fdirSequenceTimer);

    if (telemetryService && telemetryService.getState().connectionStatus === "CONNECTED") {
        addEvent("ESP32 Connected: State is governed by ESP32", "blue");
        return;
    }

    addEvent("System Nominal — All Subsystems Operating Within Specs", "green");
    setFdirActiveNode(0, "active"); // Sense

    updateDashboardWithTelemetry({
        deviceId: "ONEFORGE-CUBESAT-01",
        status: "NORMAL",
        healthScore: 100,
        fault: "SYSTEM NOMINAL",
        environment: { temperature: 28.4, pressure: 1013.2 },
        motion: { accel: { x: 0.02, y: -0.01, z: 1.00 }, gyro: { x: 0.15, y: -0.08, z: 0.22 } },
        power: { voltage: 7.42, current: 0.24, power: 1.78 },
        system: { uptime: 180, ip: "192.168.4.1", ssid: "OneForge-CubeSat" }
    }, true);
}

function showSuccess() {
    if (fdirSequenceTimer) clearTimeout(fdirSequenceTimer);

    if (telemetryService && telemetryService.getState().connectionStatus === "CONNECTED") {
        addEvent("ESP32 Connected: State is controlled from ESP32", "blue");
        return;
    }

    addEvent("FDIR Recovery: Offending load isolated, EPS current nominal (0.28A)", "blue");
    setFdirActiveNode(6, "active"); // Recover

    updateDashboardWithTelemetry({
        deviceId: "ONEFORGE-CUBESAT-01",
        status: "RECOVERY",
        healthScore: 88,
        fault: "RECOVERY: LOAD SHED SUCCESSFUL",
        environment: { temperature: 29.2, pressure: 1013.0 },
        motion: { accel: { x: 0.03, y: -0.02, z: 1.01 }, gyro: { x: 0.18, y: -0.05, z: 0.20 } },
        power: { voltage: 7.36, current: 0.28, power: 2.06 },
        system: { uptime: 240, ip: "192.168.4.1", ssid: "OneForge-CubeSat" }
    }, true);

    // Proceed to Verify -> Log -> Continue
    setTimeout(() => {
        setFdirActiveNode(7, "active"); // Verify
        addEvent("FDIR Verification: Subsystem telemetry verified stable for 3 cycles", "green");

        setTimeout(() => {
            setFdirActiveNode(8, "active"); // Log
            addEvent("FDIR Event Logged to non-volatile ground memory", "green");

            setTimeout(() => {
                setFdirActiveNode(9, "active"); // Continue
                addEvent("Resuming nominal operations loop", "green");

                setTimeout(() => {
                    forceNormal();
                }, 2000);

            }, 2000);

        }, 2000);

    }, 2500);
}

function resetSystem() {
    if (fdirSequenceTimer) clearTimeout(fdirSequenceTimer);

    faultData.length = 0;
    severityData.length = 0;
    recoveryData.length = 0;
    healthData.length = 0;
    powerData.length = 0;
    voltData.length = 0;
    tempData.length = 0;

    for (let i = 0; i < MAX_POINTS; i++) {
        faultData.push(18);
        severityData.push(0);
        recoveryData.push(0);
        healthData.push(100);
        powerData.push(1.78);
        voltData.push(7.42);
        tempData.push(28.4);
    }

    if (faultChart)    faultChart.update("none");
    if (recoveryChart) recoveryChart.update("none");
    if (healthChart)   healthChart.update("none");
    if (powerChart)    powerChart.update("none");
    if (tempChart)     tempChart.update("none");

    const log = document.getElementById("eventLog");
    if (log) log.innerHTML = "";

    setFdirActiveNode(0, "active");
    resetTimeline();
    forceNormal();

    addEvent("System reset completed — ONEFORGE-01 ready", "green");
}

// Initial greetings in event log
addEvent("ONEFORGE Mission Control Ground Station initialized", "green");
addEvent("SENTIN-AI Autonomous FDIR engine running", "blue");
addEvent("Authoritative ESP32 link: http://192.168.4.1/api/telemetry", "blue");