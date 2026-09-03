 /* =========================================================
   SENTIN-AI
   LIVE SIMULATED TELEMETRY + FDIR
   ========================================================= */


/* =========================================================
   GLOBAL STATE
   ========================================================= */

let telemetry = {

    voltage: 3.72,
    current: 0.24,
    temperature: 31.2,

    accelX: 0.02,
    accelY: -0.01,
    accelZ: 1.00,

    gyroX: 0.15,
    gyroY: -0.08,
    gyroZ: 0.22
};


let faultActive = false;

let severity = 0;
// 0 = NORMAL
// 1 = MEDIUM
// 2 = HIGH
// 3 = CRITICAL

let fdirState = 0;
// 0 = MONITOR
// 1 = DETECT
// 2 = ISOLATE
// 3 = RECOVER

let recovery = 0;
// 0 = IDLE
// 1 = PENDING
// 2 = RECOVERING
// 3 = SUCCESS

let action = 0;
// 0 = MONITOR
// 1 = FAULT DETECTED
// 2 = LOAD SHED
// 3 = RECOVERY

let faultRunning = false;
let autoDemo = true;

let faultTimers = [];

const MAX_POINTS = 60;


/* =========================================================
   GRAPH DATA
   ========================================================= */

let timeLabels = [];

let faultData = [];
let severityData = [];
let recoveryData = [];


/* =========================================================
   INITIAL GRAPH DATA
   ========================================================= */

for (let i = 0; i < MAX_POINTS; i++) {

    timeLabels.push("");

    /*
       Fault Activity starts around a small nominal signal.
       It is NOT the same as the severity graph.
    */
    faultData.push(
        17 + Math.random() * 5
    );

    /*
       Severity is a discrete FDIR classification.
    */
    severityData.push(0);

    /*
       Recovery remains idle.
    */
    recoveryData.push(0);
}


/* =========================================================
   CLOCK
   ========================================================= */

function updateClock() {

    const now = new Date();

    const time = now.toLocaleTimeString(
        "en-US",
        {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }
    );

    const date = now.toLocaleDateString(
        "en-US",
        {
            month: "short",
            day: "2-digit",
            year: "numeric"
        }
    );

    document.getElementById("clockTime").textContent = time;
    document.getElementById("clockDate").textContent = date;
}

setInterval(updateClock, 1000);
updateClock();


/* =========================================================
   TELEMETRY SIMULATION
   ========================================================= */

function updateTelemetry() {

    if (!faultRunning) {

        telemetry.current =
            0.24 + (Math.random() - 0.5) * 0.025;

    }

    telemetry.voltage =
        3.72 + (Math.random() - 0.5) * 0.035;

    telemetry.temperature =
        31.2 + (Math.random() - 0.5) * 0.35;


    telemetry.accelX =
        0.02 + (Math.random() - 0.5) * 0.08;

    telemetry.accelY =
        -0.01 + (Math.random() - 0.5) * 0.08;

    telemetry.accelZ =
        1.00 + (Math.random() - 0.5) * 0.05;


    telemetry.gyroX =
        0.15 + (Math.random() - 0.5) * 0.18;

    telemetry.gyroY =
        -0.08 + (Math.random() - 0.5) * 0.18;

    telemetry.gyroZ =
        0.22 + (Math.random() - 0.5) * 0.18;


    document.getElementById("voltage").textContent =
        telemetry.voltage.toFixed(2);

    document.getElementById("busVoltage").textContent =
        telemetry.voltage.toFixed(2) + " V";

    document.getElementById("current").textContent =
        telemetry.current.toFixed(2);

    document.getElementById("temperature").textContent =
        telemetry.temperature.toFixed(1);


    document.getElementById("accelX").textContent =
        telemetry.accelX.toFixed(2);

    document.getElementById("accelY").textContent =
        telemetry.accelY.toFixed(2);

    document.getElementById("accelZ").textContent =
        telemetry.accelZ.toFixed(2);


    document.getElementById("gyroX").textContent =
        telemetry.gyroX.toFixed(2);

    document.getElementById("gyroY").textContent =
        telemetry.gyroY.toFixed(2);

    document.getElementById("gyroZ").textContent =
        telemetry.gyroZ.toFixed(2);


    document.getElementById("currentState").textContent =
        faultActive ? "FAULT" : "NOMINAL";
}


/* =========================================================
   CHART CONFIGURATION
   ========================================================= */

Chart.defaults.font.family =
    "Arial, Helvetica, sans-serif";

Chart.defaults.color = "#7890a0";


/* =========================================================
   COMMON CHART OPTIONS
   ========================================================= */

const commonOptions = {

    responsive: true,

    maintainAspectRatio: false,

    animation: false,

    interaction: {
        intersect: false,
        mode: "index"
    },

    plugins: {

        legend: {
            display: false
        },

        tooltip: {
            enabled: false
        }
    },

    scales: {

        x: {

            grid: {
                color: "rgba(70,110,140,0.20)",
                borderDash: [3, 3]
            },

            ticks: {
                color: "#6f8797",
                font: {
                    size: 8
                },
                maxTicksLimit: 5
            }
        },

        y: {

            grid: {
                color: "rgba(70,110,140,0.20)",
                borderDash: [3, 3]
            },

            ticks: {
                color: "#718a9b",
                font: {
                    size: 8
                }
            }
        }
    }
};


/* =========================================================
   FAULT ACTIVITY CHART
   =========================================================
   
   This is a continuous detection waveform.

   NORMAL:
   ~15-25

   FAULT:
   rises above threshold

   It contains small noise so it visually behaves
   like a real detection signal.
   ========================================================= */

const faultChart = new Chart(

    document.getElementById("faultChart"),

    {

        type: "line",

        data: {

            labels: timeLabels,

            datasets: [

                {

                    label: "Fault Detection",

                    data: faultData,

                    borderColor: "#ff4755",

                    backgroundColor: "rgba(255,71,85,0.10)",

                    borderWidth: 2,

                    pointRadius: 0,

                    tension: 0.18,

                    fill: true
                },

                {

                    label: "Threshold",

                    data: Array(MAX_POINTS).fill(60),

                    borderColor: "rgba(0,190,255,0.35)",

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

                    grid: {
                        color: "rgba(70,110,140,0.20)",
                        borderDash: [3, 3]
                    },

                    ticks: {
                        color: "#718a9b",
                        font: {
                            size: 8
                        },

                        callback: function(value) {
                            return value;
                        }
                    }
                }
            }
        }
    }
);


/* =========================================================
   SEVERITY CHART
   =========================================================

   0 = NORMAL
   1 = MEDIUM
   2 = HIGH
   3 = CRITICAL

   STEPPED waveform is intentional because
   severity is a classification, not an analog signal.
   ========================================================= */

const severityChart = new Chart(

    document.getElementById("severityChart"),

    {

        type: "line",

        data: {

            labels: timeLabels,

            datasets: [

                {

                    label: "Severity",

                    data: severityData,

                    borderColor: "#ffb21c",

                    backgroundColor: "rgba(255,178,28,0.08)",

                    borderWidth: 2,

                    pointRadius: 0,

                    stepped: true,

                    fill: true
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

                        color: "#8a9ca8",

                        font: {
                            size: 8
                        },

                        callback: function(value) {

                            const labels = [
                                "NORMAL",
                                "MEDIUM",
                                "HIGH",
                                "CRITICAL"
                            ];

                            return labels[value] || "";
                        }
                    },

                    grid: {
                        color: "rgba(70,110,140,0.20)",
                        borderDash: [3, 3]
                    }
                }
            }
        }
    }
);


/* =========================================================
   RECOVERY CHART
   =========================================================

   0 = IDLE
   1 = PENDING
   2 = RECOVERING
   3 = SUCCESS

   The visual signal rises smoothly to show
   recovery progress.
   ========================================================= */

const recoveryChart = new Chart(

    document.getElementById("recoveryChart"),

    {

        type: "line",

        data: {

            labels: timeLabels,

            datasets: [

                {

                    label: "Recovery",

                    data: recoveryData,

                    borderColor: "#08bfff",

                    backgroundColor: "rgba(8,191,255,0.10)",

                    borderWidth: 2,

                    pointRadius: 0,

                    tension: 0.35,

                    fill: true
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

                        font: {
                            size: 8
                        },

                        callback: function(value) {

                            const labels = [
                                "IDLE",
                                "PENDING",
                                "RECOVERING",
                                "SUCCESS"
                            ];

                            return labels[value] || "";
                        }
                    },

                    grid: {
                        color: "rgba(70,110,140,0.20)",
                        borderDash: [3, 3]
                    }
                }
            }
        }
    }
);


/* =========================================================
   GRAPH UPDATE
   ========================================================= */

function updateGraphs() {

    /* -----------------------------------------
       FAULT DETECTION WAVEFORM
       ----------------------------------------- */

    let newFaultValue;

    if (!faultActive) {

        newFaultValue =
            17 + Math.random() * 6;

    } else {

        /*
           When a fault is active, create a
           realistic noisy high-amplitude signal.
        */

        if (severity === 1) {

            newFaultValue =
                52 + Math.random() * 10;

        } else if (severity === 2) {

            newFaultValue =
                68 + Math.random() * 15;

        } else if (severity === 3) {

            newFaultValue =
                80 + Math.random() * 15;

        } else {

            newFaultValue =
                25 + Math.random() * 8;
        }
    }


    faultData.push(newFaultValue);
    faultData.shift();


    /* -----------------------------------------
       SEVERITY
       ----------------------------------------- */

    severityData.push(severity);
    severityData.shift();


    /* -----------------------------------------
       RECOVERY
       ----------------------------------------- */

    let recoveryValue = recovery;

    /*
       Make recovery look smoother rather than
       an identical staircase.
    */

    if (recovery === 1) {

        recoveryValue = 0.65;

    } else if (recovery === 2) {

        recoveryValue = 1.4 + Math.random() * 0.15;

    } else if (recovery === 3) {

        recoveryValue = 3;

    } else {

        recoveryValue = 0;
    }

    recoveryData.push(recoveryValue);
    recoveryData.shift();


    /* -----------------------------------------
       UPDATE ALL CHARTS
       ----------------------------------------- */

    faultChart.update("none");
    severityChart.update("none");
    recoveryChart.update("none");


    updateChartStatus();
}


/* =========================================================
   CHART STATUS LABELS
   ========================================================= */

function updateChartStatus() {

    const faultLabel =
        document.getElementById("faultChartState");

    const severityLabel =
        document.getElementById("severityChartState");

    const recoveryLabel =
        document.getElementById("recoveryChartState");


    if (faultActive) {

        faultLabel.textContent = "● FAULT";
        faultLabel.style.color = "#ff4755";

    } else {

        faultLabel.textContent = "● IDLE";
        faultLabel.style.color = "#00e887";
    }


    const severityNames = [
        "NORMAL",
        "MEDIUM",
        "HIGH",
        "CRITICAL"
    ];

    severityLabel.textContent =
        "● " + severityNames[severity];


    if (severity === 0) {

        severityLabel.style.color = "#00e887";

    } else if (severity === 1) {

        severityLabel.style.color = "#ffb21c";

    } else if (severity === 2) {

        severityLabel.style.color = "#ff8b16";

    } else {

        severityLabel.style.color = "#ff4755";
    }


    const recoveryNames = [
        "IDLE",
        "PENDING",
        "RECOVERING",
        "SUCCESS"
    ];

    recoveryLabel.textContent =
        "● " + recoveryNames[recovery];
}


/* =========================================================
   FDIR UI UPDATE
   ========================================================= */

function updateFDIRDisplay() {

    const faultStatus =
        document.getElementById("faultStatus");

    const severityStatus =
        document.getElementById("severityStatus");

    const fdirState =
        document.getElementById("fdirState");

    const actionStatus =
        document.getElementById("actionStatus");

    const recoveryStatus =
        document.getElementById("recoveryStatus");


    /* FAULT */

    if (faultActive) {

        faultStatus.textContent = "FAULT";
        faultStatus.className =
            "fdir-value critical-text";

        document.getElementById(
            "faultDescription"
        ).textContent =
            "Overcurrent detected";

    } else {

        faultStatus.textContent = "NORMAL";
        faultStatus.className =
            "fdir-value normal-text";

        document.getElementById(
            "faultDescription"
        ).textContent =
            "No active fault";
    }


    /* SEVERITY */

    const severityNames = [
        "NORMAL",
        "MEDIUM",
        "HIGH",
        "CRITICAL"
    ];

    const severityDescriptions = [
        "System operating normally",
        "Fault condition detected",
        "Fault condition increasing",
        "Critical fault condition"
    ];

    severityStatus.textContent =
        severityNames[severity];

    severityStatus.className =
        "fdir-value " +
        (
            severity === 0
                ? "normal-text"
                : severity === 1
                ? "warning-text"
                : severity === 2
                ? "high-text"
                : "critical-text"
        );

    document.getElementById(
        "severityDescription"
    ).textContent =
        severityDescriptions[severity];


    /* FDIR STATE */

    const stateNames = [
        "MONITOR",
        "DETECT",
        "ISOLATE",
        "RECOVER"
    ];

    const stateDescriptions = [
        "Monitoring telemetry",
        "Fault identification active",
        "Faulty load isolated",
        "Recovery in progress"
    ];

    fdirState.textContent =
        stateNames[fdirStateValue()];

    document.getElementById(
        "stateDescription"
    ).textContent =
        stateDescriptions[fdirStateValue()];


    /* ACTION */

    const actionNames = [
        "MONITOR",
        "FAULT DETECTED",
        "LOAD SHED",
        "RECOVERY"
    ];

    const actionDescriptions = [
        "No corrective action",
        "Fault identified",
        "Faulty load disconnected",
        "Restoring nominal operation"
    ];

    actionStatus.textContent =
        actionNames[action];

    document.getElementById(
        "actionDescription"
    ).textContent =
        actionDescriptions[action];


    /* RECOVERY */

    const recoveryNames = [
        "IDLE",
        "PENDING",
        "RECOVERING",
        "SUCCESS"
    ];

    const recoveryDescriptions = [
        "System stable",
        "Recovery awaiting isolation",
        "System returning to nominal",
        "System recovered successfully"
    ];

    recoveryStatus.textContent =
        recoveryNames[recovery];

    document.getElementById(
        "recoveryDescription"
    ).textContent =
        recoveryDescriptions[recovery];


    updateChartStatus();
}


function fdirStateValue() {
    return fdirState;
}


/* =========================================================
   SYSTEM STATUS
   ========================================================= */

function updateSystemStatus() {

    const message =
        document.getElementById("systemMessage");


    if (faultActive) {

        message.textContent =
            "⚠ FDIR EVENT ACTIVE";

        message.style.color =
            "#ff4755";

    } else {

        message.textContent =
            "✓ ALL SYSTEMS NOMINAL";

        message.style.color =
            "#00e887";
    }
}


/* =========================================================
   EVENT LOG
   ========================================================= */

function addEvent(message, type = "green") {

    const log =
        document.getElementById("eventLog");

    const row =
        document.createElement("div");

    row.className = "event-row";

    const dot =
        document.createElement("span");

    dot.className =
        "event-dot " +
        (
            type === "blue"
                ? "blue"
                : type === "yellow"
                ? "yellow"
                : type === "red"
                ? "red"
                : ""
        );

    const text =
        document.createElement("span");

    text.textContent = message;

    const time =
        document.createElement("span");

    time.className = "event-time";

    time.textContent =
        new Date().toLocaleTimeString(
            "en-US",
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        );


    row.appendChild(dot);
    row.appendChild(text);
    row.appendChild(time);

    log.prepend(row);


    /*
       Keep event log compact.
    */

    while (log.children.length > 12) {

        log.removeChild(
            log.lastChild
        );
    }
}


/* =========================================================
   OVERCURRENT FDIR SEQUENCE
   =========================================================

   0 sec
       Fault detected
       Severity MEDIUM

   1.5 sec
       Severity HIGH

   3 sec
       Severity CRITICAL
       ISOLATE
       LOAD SHED

   5 sec
       RECOVERING

   7.5 sec
       SUCCESS
       NORMAL

   This makes all three graphs visibly different.
   ========================================================= */

function injectOvercurrent() {

    if (faultRunning) {
        return;
    }

    faultRunning = true;

    clearFaultTimers();


    /* -----------------------------------------
       STEP 1 — MEDIUM
       ----------------------------------------- */

    faultActive = true;

    telemetry.current = 0.72;

    severity = 1;

    fdirState = 1;

    action = 1;

    recovery = 1;

    updateFDIRDisplay();
    updateSystemStatus();

    addEvent(
        "Overcurrent detected - Severity: MEDIUM",
        "yellow"
    );


    /* -----------------------------------------
       STEP 2 — HIGH
       ----------------------------------------- */

    faultTimers.push(

        setTimeout(() => {

            telemetry.current = 1.02;

            severity = 2;

            fdirState = 1;

            action = 1;

            recovery = 1;

            updateFDIRDisplay();

            addEvent(
                "Fault escalating - Severity: HIGH",
                "yellow"
            );

        }, 1500)
    );


    /* -----------------------------------------
       STEP 3 — CRITICAL + ISOLATION
       ----------------------------------------- */

    faultTimers.push(

        setTimeout(() => {

            telemetry.current = 1.35;

            severity = 3;

            fdirState = 2;

            action = 2;

            recovery = 1;

            updateFDIRDisplay();
            updateSystemStatus();

            addEvent(
                "Critical overcurrent - Load isolation initiated",
                "red"
            );

        }, 3000)
    );


    /* -----------------------------------------
       STEP 4 — RECOVERY
       ----------------------------------------- */

    faultTimers.push(

        setTimeout(() => {

            telemetry.current = 0.30;

            severity = 2;

            fdirState = 3;

            action = 3;

            recovery = 2;

            updateFDIRDisplay();

            addEvent(
                "Load shed executed - Recovery in progress",
                "blue"
            );

        }, 5000)
    );


    /* -----------------------------------------
       STEP 5 — SUCCESS
       ----------------------------------------- */

    faultTimers.push(

        setTimeout(() => {

            telemetry.current = 0.24;

            faultActive = false;

            severity = 0;

            fdirState = 0;

            action = 0;

            recovery = 3;

            updateFDIRDisplay();
            updateSystemStatus();

            addEvent(
                "Recovery successful - System nominal",
                "green"
            );

        }, 7500)
    );


    /* -----------------------------------------
       STEP 6 — IDLE
       ----------------------------------------- */

    faultTimers.push(

        setTimeout(() => {

            recovery = 0;

            faultRunning = false;

            updateFDIRDisplay();
            updateSystemStatus();

            addEvent(
                "System returned to MONITOR state",
                "green"
            );

        }, 10000)
    );
}


/* =========================================================
   AUTOMATIC DEMO
   ========================================================= */

let autoTimer = null;

function startAutoDemo() {

    if (!autoDemo) {
        return;
    }

    autoTimer =
        setInterval(() => {

            if (!faultRunning) {

                injectOvercurrent();
            }

        }, 23000);
}

startAutoDemo();


/* =========================================================
   NORMAL BUTTON
   ========================================================= */

function forceNormal() {

    clearFaultTimers();

    faultRunning = false;

    faultActive = false;

    telemetry.current = 0.24;

    severity = 0;

    fdirState = 0;

    action = 0;

    recovery = 0;

    updateFDIRDisplay();
    updateSystemStatus();

    addEvent(
        "System forced to nominal operating condition",
        "green"
    );
}


/* =========================================================
   SUCCESS BUTTON
   ========================================================= */

function showSuccess() {

    clearFaultTimers();

    faultRunning = false;

    faultActive = false;

    telemetry.current = 0.24;

    severity = 0;

    fdirState = 0;

    action = 0;

    recovery = 3;

    updateFDIRDisplay();
    updateSystemStatus();

    addEvent(
        "Recovery successful - System nominal",
        "green"
    );

    setTimeout(() => {

        recovery = 0;

        updateFDIRDisplay();

    }, 2500);
}


/* =========================================================
   RESET
   ========================================================= */

function resetSystem() {

    clearFaultTimers();

    faultRunning = false;

    faultActive = false;

    telemetry.current = 0.24;
    telemetry.voltage = 3.72;
    telemetry.temperature = 31.2;

    severity = 0;
    fdirState = 0;
    action = 0;
    recovery = 0;


    /*
       Reset graphs.
    */

    faultData.length = 0;
    severityData.length = 0;
    recoveryData.length = 0;


    for (let i = 0; i < MAX_POINTS; i++) {

        faultData.push(
            17 + Math.random() * 5
        );

        severityData.push(0);

        recoveryData.push(0);
    }


    faultChart.update("none");
    severityChart.update("none");
    recoveryChart.update("none");


    updateTelemetry();
    updateFDIRDisplay();
    updateSystemStatus();


    document.getElementById(
        "eventLog"
    ).innerHTML = "";


    addEvent(
        "System initialized - All telemetry nominal",
        "green"
    );
}


/* =========================================================
   CLEAR TIMERS
   ========================================================= */

function clearFaultTimers() {

    faultTimers.forEach(timer => {
        clearTimeout(timer);
    });

    faultTimers = [];
}


/* =========================================================
   LIVE LOOP
   ========================================================= */

setInterval(() => {

    updateTelemetry();

    updateGraphs();

}, 1000);


/* =========================================================
   INITIAL STATE
   ========================================================= */

addEvent(
    "System initialized - All systems nominal",
    "green"
);

addEvent(
    "Continuous telemetry monitoring active",
    "blue"
);

updateTelemetry();
updateFDIRDisplay();
updateSystemStatus();
updateChartStatus();